#!/usr/bin/env node
/**
 * Deterministic caption/subtitle generator. There is no forced-alignment
 * (ASR) step anywhere in this pipeline, so caption timing is derived the
 * same way scripts/script.md's own section timestamps already are (see its
 * provenance note): word-count-proportional distribution against a known
 * total duration, not a measured audio waveform.
 *
 * Reads scripts/script.md's `## <title> (M:SS-M:SS)` section headers plus
 * their body prose, and remotion/composition.json's fps/duration_frames.
 * Rescales the script's section boundaries so the last one lands exactly on
 * duration_frames/fps (script.md's timestamps are estimates; composition.json
 * is the authoritative duration), splits each section's text into short
 * (~4-8 word) caption chunks, and distributes each chunk's on-screen window
 * proportionally by word count within its section. Chunks are then merged/
 * split so every caption's on-screen duration falls within [minSec, maxSec] -
 * short enough to stay "sürükleyici" (snappy), long enough to read.
 *
 * Writes remotion/captions.json ({ captions: [{text,start_frame,end_frame}] }),
 * schema-validated by schemas/captions.schema.json. Mechanical, no LLM
 * judgment - lives here, not in a skill, same rationale as remotion_build.mjs.
 */
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  projectDir,
  pathExists,
  readJson,
  writeJsonAtomic,
  parseArgs,
  printJson,
  CliError,
} from "./lib/fs-utils.mjs";

const DEFAULT_MIN_SEC = 0.9;
const DEFAULT_MAX_SEC = 3.2;
const DEFAULT_GAP_FRAMES = 3;
const MIN_WORDS_PER_CHUNK = 3;
const MAX_WORDS_PER_CHUNK = 8;

function timeToSec(mm, ss) {
  return Number.parseInt(mm, 10) * 60 + Number.parseInt(ss, 10);
}

/** Parses script.md into ordered { startSec, endSec, text } sections from its "(M:SS-M:SS)" headers. */
function parseScriptSections(raw) {
  const lines = raw.split(/\r?\n/);
  const headerRe = /^#{1,2}\s+.*\((\d+):(\d{2})-(\d+):(\d{2})\)\s*$/;
  const sections = [];
  let current = null;
  for (const line of lines) {
    const m = line.match(headerRe);
    if (m) {
      if (current) sections.push(current);
      current = { startSec: timeToSec(m[1], m[2]), endSec: timeToSec(m[3], m[4]), bodyLines: [] };
      continue;
    }
    if (current) current.bodyLines.push(line);
  }
  if (current) sections.push(current);
  return sections.map((s) => ({ startSec: s.startSec, endSec: s.endSec, text: cleanBody(s.bodyLines.join("\n")) }));
}

/** Strips blockquotes, standalone italic technique/CTA notes, thematic breaks, and markdown emphasis markers. */
function cleanBody(body) {
  const kept = body
    .split(/\r?\n/)
    .filter((line) => {
      const t = line.trim();
      if (t.startsWith(">")) return false; // provenance/blockquote notes
      if (/^\*\(.*\)\*$/.test(t)) return false; // *(Technique: ...)* / *(CTA: ...)* notes
      if (/^-{3,}$/.test(t)) return false; // --- thematic breaks
      return true;
    })
    .join(" ");
  return kept
    .replace(/\*\*/g, "")
    .replace(/(^|\s)\*(\S)/g, "$1$2")
    .replace(/(\S)\*(\s|$)/g, "$1$2")
    .replace(/_/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Greedily groups words into ~4-8 word chunks, preferring to break at sentence/clause punctuation. */
function chunkWords(words) {
  const chunks = [];
  let current = [];
  for (const word of words) {
    current.push(word);
    const endsClause = /[.!?]["')]?$/.test(word);
    const endsComma = /[,;—]["')]?$/.test(word);
    const atMax = current.length >= MAX_WORDS_PER_CHUNK;
    const atMinWithBreak = current.length >= MIN_WORDS_PER_CHUNK && (endsClause || endsComma);
    if (atMax || atMinWithBreak) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) {
    // Fold a short trailing remainder into the previous chunk rather than
    // leaving a sub-MIN_WORDS_PER_CHUNK sliver on screen by itself.
    if (chunks.length && current.length < MIN_WORDS_PER_CHUNK) {
      chunks[chunks.length - 1] = chunks[chunks.length - 1].concat(current);
    } else {
      chunks.push(current);
    }
  }
  return chunks;
}

/** Splits an overlong (duration > maxSec) chunk into near-equal word-count pieces, each re-windowed proportionally. */
function splitOverlongChunk(chunk, maxSec) {
  const pieces = Math.max(2, Math.ceil(chunk.durationSec / maxSec));
  const words = chunk.words;
  const per = Math.ceil(words.length / pieces);
  const out = [];
  let wordStart = 0;
  let secCursor = chunk.startSec;
  const secPerWord = chunk.durationSec / words.length;
  while (wordStart < words.length) {
    const wordEnd = Math.min(words.length, wordStart + per);
    const pieceWords = words.slice(wordStart, wordEnd);
    const startSec = secCursor;
    const endSec = wordStart + per >= words.length ? chunk.endSec : secCursor + secPerWord * pieceWords.length;
    out.push({ words: pieceWords, startSec, endSec, durationSec: endSec - startSec });
    secCursor = endSec;
    wordStart = wordEnd;
  }
  return out;
}

export async function generateCaptions({
  projectId,
  minSec = DEFAULT_MIN_SEC,
  maxSec = DEFAULT_MAX_SEC,
  gapFrames = DEFAULT_GAP_FRAMES,
}) {
  const dir = projectDir(projectId);
  const scriptPath = path.join(dir, "scripts", "script.md");
  const compositionPath = path.join(dir, "remotion", "composition.json");

  if (!(await pathExists(scriptPath))) {
    throw new CliError(`scripts/script.md not found for ${projectId}`, "RENDER_CONFIG_MISSING");
  }
  if (!(await pathExists(compositionPath))) {
    throw new CliError(`remotion/composition.json not found for ${projectId} - run factforge-motion first`, "RENDER_CONFIG_MISSING");
  }

  const composition = await readJson(compositionPath);
  const fps = composition.fps;
  const totalDurationSec = composition.duration_frames / fps;

  const scriptRaw = await fs.readFile(scriptPath, "utf8");
  const sections = parseScriptSections(scriptRaw).filter((s) => s.text.length > 0);
  if (sections.length === 0) {
    throw new CliError("No timestamped sections found in scripts/script.md", "INVALID_JSON");
  }

  // script.md's section timestamps are word-count-proportional estimates,
  // not measured from the audio - rescale so the last section's end lands
  // exactly on the authoritative composition.json duration.
  const rawLastEnd = sections[sections.length - 1].endSec;
  const scale = rawLastEnd > 0 ? totalDurationSec / rawLastEnd : 1;

  const allChunks = [];
  for (const section of sections) {
    const startSec = section.startSec * scale;
    const endSec = section.endSec * scale;
    const words = section.text.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    const wordChunks = chunkWords(words);
    const totalWords = words.length;
    let cumWords = 0;
    const sectionDur = endSec - startSec;
    let sectionChunks = [];
    for (const chunkWordsArr of wordChunks) {
      const before = cumWords;
      cumWords += chunkWordsArr.length;
      const cStart = startSec + sectionDur * (before / totalWords);
      const cEnd = startSec + sectionDur * (cumWords / totalWords);
      sectionChunks.push({ words: chunkWordsArr, startSec: cStart, endSec: cEnd, durationSec: cEnd - cStart });
    }

    // Merge chunks shorter than minSec forward into their neighbor.
    const merged = [];
    for (const c of sectionChunks) {
      const prev = merged[merged.length - 1];
      if (prev && prev.durationSec < minSec) {
        prev.words = prev.words.concat(c.words);
        prev.endSec = c.endSec;
        prev.durationSec = prev.endSec - prev.startSec;
      } else {
        merged.push({ ...c });
      }
    }
    if (merged.length > 1 && merged[merged.length - 1].durationSec < minSec) {
      const last = merged.pop();
      const prev = merged[merged.length - 1];
      prev.words = prev.words.concat(last.words);
      prev.endSec = last.endSec;
      prev.durationSec = prev.endSec - prev.startSec;
    }

    // Split chunks longer than maxSec into near-equal word-count pieces.
    sectionChunks = [];
    for (const c of merged) {
      if (c.durationSec > maxSec && c.words.length > MIN_WORDS_PER_CHUNK) {
        sectionChunks.push(...splitOverlongChunk(c, maxSec));
      } else {
        sectionChunks.push(c);
      }
    }

    allChunks.push(...sectionChunks);
  }

  const captions = [];
  let prevEndFrame = 0;
  for (const c of allChunks) {
    const text = c.words.join(" ").trim();
    if (!text) continue;
    let startFrame = Math.max(prevEndFrame, Math.round(c.startSec * fps));
    let endFrame = Math.round(c.endSec * fps) - gapFrames;
    if (endFrame < startFrame + 8) endFrame = startFrame + 8; // floor so a caption never collapses to ~0 frames
    captions.push({ text, start_frame: startFrame, end_frame: endFrame });
    prevEndFrame = endFrame + gapFrames;
  }

  const output = { captions };
  await writeJsonAtomic(path.join(dir, "remotion", "captions.json"), output);

  const durations = captions.map((c) => (c.end_frame - c.start_frame) / fps);
  return {
    project_id: projectId,
    written: "remotion/captions.json",
    caption_count: captions.length,
    avg_duration_sec: durations.length ? Math.round((durations.reduce((a, b) => a + b, 0) / durations.length) * 100) / 100 : 0,
    min_duration_sec: durations.length ? Math.round(Math.min(...durations) * 100) / 100 : 0,
    max_duration_sec: durations.length ? Math.round(Math.max(...durations) * 100) / 100 : 0,
  };
}

async function main() {
  const [subcommand, ...rest] = process.argv.slice(2);
  if (subcommand !== "generate") {
    console.log("Usage: node scripts/generate_captions.mjs generate --project-id <id> [--min-sec 0.9] [--max-sec 3.2] [--gap-frames 3]");
    process.exitCode = subcommand ? 1 : 0;
    return;
  }
  const args = parseArgs(rest);
  try {
    const result = await generateCaptions({
      projectId: args["project-id"],
      minSec: args["min-sec"] ? Number.parseFloat(args["min-sec"]) : undefined,
      maxSec: args["max-sec"] ? Number.parseFloat(args["max-sec"]) : undefined,
      gapFrames: args["gap-frames"] ? Number.parseInt(args["gap-frames"], 10) : undefined,
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
