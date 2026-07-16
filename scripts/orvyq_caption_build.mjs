#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";
const MAX_WORDS = 8;

function splitSentences(text) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?…])\s+/)
    .filter(Boolean);
}

function chunkSentence(sentence, maxWords = MAX_WORDS) {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return [words.join(" ")];
  const chunks = [];
  let cursor = 0;
  while (cursor < words.length) {
    let end = Math.min(words.length, cursor + maxWords);
    if (end < words.length) {
      for (let i = end; i > Math.max(cursor + 3, end - 3); i -= 1) {
        if (/[,;:—-]$/.test(words[i - 1])) {
          end = i;
          break;
        }
      }
    }
    chunks.push(words.slice(cursor, end).join(" "));
    cursor = end;
  }
  return chunks;
}

function captionChunks(text) {
  return splitSentences(text).flatMap((sentence) => chunkSentence(sentence));
}

function paragraphRange(ref) {
  const match = String(ref || "").match(/para\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
  if (!match) throw new Error(`Could not parse paragraph range from: ${ref}`);
  const start = Number(match[1]);
  const end = Number(match[2] || match[1]);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start) {
    throw new Error(`Invalid paragraph range in: ${ref}`);
  }
  return { start, end };
}

function allocateFrames(chunks, startFrame, endFrame) {
  const totalFrames = endFrame - startFrame;
  const weights = chunks.map((text) => Math.max(1, text.split(/\s+/).length));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const raw = weights.map((weight) => Math.max(1, Math.floor((totalFrames * weight) / totalWeight)));
  let diff = totalFrames - raw.reduce((sum, value) => sum + value, 0);
  let index = raw.length - 1;
  while (diff > 0 && raw.length) {
    raw[index] += 1;
    diff -= 1;
    index = index === 0 ? raw.length - 1 : index - 1;
  }
  return raw;
}

export async function buildOrvyqCaptions(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [composition, storyboard, voiceText] = await Promise.all([
    readJson(path.join(dir, "remotion", "composition.json")),
    readJson(path.join(dir, "storyboard", "storyboard.json")),
    fs.readFile(path.join(dir, "voice", "voice_script.txt"), "utf8"),
  ]);
  const paragraphs = voiceText.split(/\r?\n\s*\r?\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter(Boolean);
  const sceneById = new Map(composition.scenes.map((scene) => [scene.scene_id, scene]));
  const captions = [];
  let captionNumber = 1;

  for (const boardScene of storyboard.scenes) {
    const scene = sceneById.get(boardScene.scene_id);
    if (!scene) throw new Error(`Storyboard scene missing from composition: ${boardScene.scene_id}`);
    const { start, end } = paragraphRange(boardScene.voice_line_ref);
    const text = paragraphs.slice(start - 1, end).join(" ");
    if (!text) throw new Error(`No voice text for ${boardScene.scene_id} paragraphs ${start}-${end}`);
    const chunks = captionChunks(text);
    const durations = allocateFrames(chunks, scene.start_frame, scene.end_frame);
    let cursor = scene.start_frame;
    chunks.forEach((chunk, index) => {
      const endFrame = index === chunks.length - 1 ? scene.end_frame : cursor + durations[index];
      captions.push({
        caption_id: `caption_${String(captionNumber).padStart(3, "0")}`,
        scene_id: scene.scene_id,
        start_frame: cursor,
        end_frame: endFrame,
        text: chunk,
      });
      cursor = endFrame;
      captionNumber += 1;
    });
  }

  const payload = {
    schema_version: "1.0",
    project_id: projectId,
    fps: composition.fps,
    duration_frames: composition.duration_frames,
    style: {
      placement: "bottom_safe",
      max_words: MAX_WORDS,
      font_family: "Arial, Helvetica, sans-serif",
      font_size_px: 48,
      active_accent: "#F0A45D",
    },
    captions,
  };
  await writeJsonAtomic(path.join(dir, "remotion", "captions.json"), payload);
  return { caption_count: captions.length, duration_frames: composition.duration_frames };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqCaptions().then((result) => console.log(JSON.stringify({ ok: true, ...result }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
