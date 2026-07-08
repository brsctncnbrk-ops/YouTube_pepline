#!/usr/bin/env node
/**
 * Converts a captions.json-shaped file ({ captions: [{text,start_frame,end_frame}] },
 * see schemas/captions.schema.json) into a standard SubRip (.srt) file, using
 * an fps to convert frames to timestamps. Generic - works for any language's
 * caption list (the English auto-generated one, a hand-translated one, etc.),
 * not just remotion/captions.json. This is what YouTube's own closed-caption
 * system (searchable, toggleable, auto-translatable) actually consumes - the
 * burned-in caption bar in the rendered video is a separate, purely visual
 * thing and isn't a substitute for it.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import { readJson, parseArgs, printJson, CliError } from "./lib/fs-utils.mjs";

function framesToTimestamp(frame, fps) {
  const totalMs = Math.round((frame / fps) * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const totalMin = Math.floor(totalSec / 60);
  const m = totalMin % 60;
  const h = Math.floor(totalMin / 60);
  const pad = (n, len = 2) => String(n).padStart(len, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
}

export async function generateSrt({ captionsFile, fps, outFile }) {
  if (!captionsFile) throw new CliError("--captions-file is required", "UNKNOWN_ERROR");
  if (!fps) throw new CliError("--fps is required", "UNKNOWN_ERROR");
  if (!outFile) throw new CliError("--out is required", "UNKNOWN_ERROR");

  const data = await readJson(captionsFile);
  const captions = data.captions ?? [];
  if (captions.length === 0) throw new CliError(`No captions found in ${captionsFile}`, "INVALID_JSON");

  const blocks = captions.map((c, i) => {
    const start = framesToTimestamp(c.start_frame, fps);
    const end = framesToTimestamp(c.end_frame, fps);
    return `${i + 1}\n${start} --> ${end}\n${c.text}\n`;
  });

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, blocks.join("\n"), "utf8");

  return { written: outFile, caption_count: captions.length };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  try {
    const result = await generateSrt({
      captionsFile: args["captions-file"],
      fps: args.fps ? Number.parseFloat(args.fps) : undefined,
      outFile: args.out,
    });
    printJson({ ok: true, ...result });
  } catch (err) {
    printJson({ ok: false, error_code: err.code || "UNKNOWN_ERROR", message: err.message });
    process.exitCode = 1;
  }
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  main();
}
