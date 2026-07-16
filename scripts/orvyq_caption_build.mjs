#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const MAX_WORDS = 7;
const MAX_CHARS = 52;

function cleanToken(token) {
  return String(token || "").replace(/\s+/g, " ").trim();
}

function shouldBreak(text, wordCount, nextWord) {
  if (wordCount >= MAX_WORDS) return true;
  if ((text + " " + nextWord).trim().length > MAX_CHARS) return true;
  return /[.!?…]$/.test(text) && wordCount >= 3;
}

function buildChunks(words) {
  const chunks = [];
  let current = [];
  for (const word of words) {
    const token = cleanToken(word.text);
    if (!token) continue;
    const currentText = current.map((item) => item.text).join(" ");
    if (current.length && shouldBreak(currentText, current.length, token)) {
      chunks.push(current);
      current = [];
    }
    current.push({ ...word, text: token });
    if (/[.!?…]$/.test(token) && current.length >= 3) {
      chunks.push(current);
      current = [];
    }
  }
  if (current.length) chunks.push(current);
  return chunks;
}

export async function buildOrvyqCaptions(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [composition, speechQa] = await Promise.all([
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "qa", "speech_transcript.json")),
  ]);

  if (!speechQa.passed) throw new Error("Cannot build captions from a failed speech transcript");
  if (!Array.isArray(speechQa.words) || !speechQa.words.length) throw new Error("Speech transcript has no word timestamps");

  const previewFrames = Number.parseInt(process.env.ORVYQ_PREVIEW_FRAMES || "0", 10);
  const maxFrame = previewFrames > 0 ? previewFrames : composition.duration_frames;
  const maxSeconds = maxFrame / composition.fps;
  const timedWords = speechQa.words.filter((word) => Number(word.start) < maxSeconds);
  const chunks = buildChunks(timedWords);
  const captions = [];

  chunks.forEach((chunk, index) => {
    const startFrame = Math.max(0, Math.floor(Number(chunk[0].start) * composition.fps));
    const rawEnd = Math.ceil(Number(chunk.at(-1).end) * composition.fps);
    const endFrame = Math.min(maxFrame, Math.max(startFrame + 8, rawEnd));
    if (startFrame >= maxFrame || endFrame <= startFrame) return;
    captions.push({
      caption_id: `caption_${String(index + 1).padStart(3, "0")}`,
      scene_id: null,
      start_frame: startFrame,
      end_frame: endFrame,
      text: chunk.map((item) => item.text).join(" ").replace(/\s+([,.;!?])/g, "$1"),
    });
  });

  const payload = {
    schema_version: "2.0",
    project_id: projectId,
    fps: composition.fps,
    duration_frames: maxFrame,
    source: "qa/speech_transcript.json",
    style: {
      placement: "bottom_safe",
      line_count: 1,
      max_words: MAX_WORDS,
      max_chars: MAX_CHARS,
      font_family: "Arial, Helvetica, sans-serif",
      font_size_px: 36,
      background: "none",
      active_word_effect: false,
    },
    captions,
  };

  await writeJsonAtomic(path.join(dir, "remotion", "captions.json"), payload);
  return { caption_count: captions.length, duration_frames: maxFrame, source: payload.source };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqCaptions().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
