#!/usr/bin/env python3
import argparse
import hashlib
import json
import math
import re
import subprocess
import tempfile
from difflib import SequenceMatcher
from pathlib import Path

from faster_whisper import WhisperModel


def norm_token(value: str) -> str:
    return re.sub(r"[^a-z0-9']+", "", value.lower())


def ffprobe_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", str(path)],
        check=True,
        capture_output=True,
        text=True,
    )
    value = float(result.stdout.strip())
    if not math.isfinite(value) or value <= 0:
        raise RuntimeError(f"Invalid narration duration: {value}")
    return value


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def prepare_voice(project: Path, source: Path, temp_dir: Path) -> tuple[Path, dict | None]:
    repair_path = project / "voice" / "audio_repair.json"
    if not repair_path.exists():
        return source, None
    repair = json.loads(repair_path.read_text(encoding="utf-8"))
    if repair.get("operation") != "rotate":
        raise RuntimeError(f"Unsupported narrator repair operation: {repair.get('operation')}")
    source_duration = ffprobe_duration(source)
    rotate_at = float(repair.get("rotate_at_seconds", 0))
    if not 0 < rotate_at < source_duration:
        raise RuntimeError(f"Invalid rotate_at_seconds: {rotate_at}")
    output = temp_dir / "prepared_voice.wav"
    filter_graph = (
        f"[0:a]atrim=start={rotate_at},asetpts=PTS-STARTPTS[first];"
        f"[0:a]atrim=end={rotate_at},asetpts=PTS-STARTPTS[second];"
        "[first][second]concat=n=2:v=0:a=1[out]"
    )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(source),
         "-filter_complex", filter_graph, "-map", "[out]", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(output)],
        check=True,
    )
    return output, {"operation": "rotate", "rotate_at_seconds": rotate_at, "config": "voice/audio_repair.json"}


def find_phrase(tokens: list[str], phrase: list[str], start: int) -> tuple[int, float]:
    if not phrase:
        raise RuntimeError("Cannot align an empty paragraph")
    stop = len(tokens) - len(phrase) + 1
    for index in range(start, max(start, stop)):
        if tokens[index:index + len(phrase)] == phrase:
            return index + len(phrase) - 1, 1.0
    best_end = -1
    best_ratio = 0.0
    window = len(phrase)
    lower = max(0, start - 12)
    upper = min(len(tokens) - window + 1, start + 180)
    phrase_text = " ".join(phrase)
    for index in range(lower, max(lower, upper)):
        candidate = " ".join(tokens[index:index + window])
        ratio = SequenceMatcher(None, candidate, phrase_text).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_end = index + window - 1
    if best_end < 0 or best_ratio < 0.78:
        raise RuntimeError(f"Could not align paragraph ending phrase: {' '.join(phrase)} (best={best_ratio:.3f})")
    return best_end, best_ratio


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-id", required=True)
    parser.add_argument("--model", default="tiny.en")
    parser.add_argument("--fps", type=int, default=30)
    parser.add_argument("--minimum-output-seconds", type=float, default=0)
    parser.add_argument("--analysis-source-seconds", type=float, default=220)
    args = parser.parse_args()

    project = Path("projects") / args.project_id
    source = project / "assets" / "audio" / "final_voice.mp3"
    script_path = project / "voice" / "voice_script.txt"
    pause_map_path = project / "direction" / "editorial_pause_map.json"
    if not source.exists() or not script_path.exists() or not pause_map_path.exists():
        raise SystemExit("Narration timeline requires final_voice.mp3, voice_script.txt and editorial_pause_map.json")

    pause_map = json.loads(pause_map_path.read_text(encoding="utf-8"))
    configured = pause_map.get("timeline_pauses") or pause_map.get("proof", {}).get("pauses") or []
    pauses = sorted(configured, key=lambda item: float(item["source_time_seconds"]))
    minimum_output = args.minimum_output_seconds or float(
        pause_map.get("proof", {}).get("proof_duration_seconds") or 150
    )

    with tempfile.TemporaryDirectory(prefix="orvyq-timeline-") as temp_name:
        prepared, repair = prepare_voice(project, source, Path(temp_name))
        full_source_duration = ffprobe_duration(prepared)
        analysis_seconds = min(full_source_duration, max(args.analysis_source_seconds, minimum_output + 60))
        analysis_wav = Path(temp_name) / "proof_source.wav"
        subprocess.run(
            ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(prepared), "-t", str(analysis_seconds),
             "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", str(analysis_wav)],
            check=True,
        )
        model = WhisperModel(args.model, device="cpu", compute_type="int8")
        segments, info = model.transcribe(
            str(analysis_wav), language="en", beam_size=3, vad_filter=True,
            word_timestamps=True, condition_on_previous_text=True,
        )
        transcript_parts: list[str] = []
        words: list[dict] = []
        for segment in segments:
            transcript_parts.append(segment.text.strip())
            for word in segment.words or []:
                text = word.word.strip()
                token = norm_token(text)
                if token:
                    words.append({
                        "text": text,
                        "token": token,
                        "start": round(float(word.start), 3),
                        "end": round(float(word.end), 3),
                        "probability": round(float(word.probability), 4),
                    })
        if not words:
            raise RuntimeError("Narration timeline transcription returned no words")

        transcript_tokens = [item["token"] for item in words]
        paragraphs = [part.strip() for part in re.split(r"\n\s*\n", script_path.read_text(encoding="utf-8")) if part.strip()]
        paragraph_boundaries = []
        search_cursor = 0
        for paragraph_index, paragraph in enumerate(paragraphs):
            paragraph_tokens = [norm_token(token) for token in paragraph.split()]
            paragraph_tokens = [token for token in paragraph_tokens if token]
            tail = paragraph_tokens[-min(9, len(paragraph_tokens)):]
            end_index, confidence = find_phrase(transcript_tokens, tail, search_cursor)
            source_end = float(words[end_index]["end"])
            inserted = sum(float(p["duration_seconds"]) for p in pauses if float(p["source_time_seconds"]) <= source_end + 1e-6)
            output_end = source_end + inserted
            paragraph_boundaries.append({
                "paragraph_index": paragraph_index,
                "source_end_seconds": round(source_end, 3),
                "output_end_seconds": round(output_end, 3),
                "terminal_text": words[end_index]["text"],
                "alignment_confidence": round(confidence, 4),
                "paragraph": paragraph,
            })
            search_cursor = max(search_cursor, end_index + 1)
            if output_end >= minimum_output:
                break

        eligible = [entry for entry in paragraph_boundaries if entry["output_end_seconds"] >= minimum_output]
        if not eligible:
            raise RuntimeError(f"No complete paragraph boundary found after {minimum_output}s")
        proof_boundary = eligible[0]
        if not re.search(r"[.!?…][\"')\]]*$", proof_boundary["terminal_text"]):
            raise RuntimeError(f"Resolved proof boundary is not terminal punctuation: {proof_boundary['terminal_text']}")

        canonical_pauses = []
        inserted = 0.0
        for pause in pauses:
            source_time = float(pause["source_time_seconds"])
            duration = float(pause["duration_seconds"])
            if not 0 < source_time < full_source_duration or duration <= 0:
                raise RuntimeError(f"Invalid canonical pause: {pause}")
            output_start = source_time + inserted
            canonical_pauses.append({
                **pause,
                "source_time_seconds": round(source_time, 3),
                "duration_seconds": round(duration, 3),
                "output_start_seconds": round(output_start, 3),
                "output_end_seconds": round(output_start + duration, 3),
            })
            inserted += duration

        full_output_duration = full_source_duration + inserted
        payload = {
            "schema_version": "1.0-canonical-narration-timeline",
            "project_id": args.project_id,
            "generated_by": "scripts/orvyq_narration_timeline.py",
            "voice_source": "assets/audio/final_voice.mp3",
            "voice_source_sha256": sha256_file(source),
            "voice_repair": repair,
            "fps": args.fps,
            "source_duration_seconds": round(full_source_duration, 3),
            "source_duration_frames": round(full_source_duration * args.fps),
            "canonical_pauses": canonical_pauses,
            "editorial_pause_seconds": round(inserted, 3),
            "full_output_duration_seconds": round(full_output_duration, 3),
            "full_duration_frames": round(full_output_duration * args.fps),
            "proof": {
                "minimum_output_seconds": round(minimum_output, 3),
                "source_end_seconds": proof_boundary["source_end_seconds"],
                "speech_output_end_seconds": proof_boundary["output_end_seconds"],
                "paragraph_index": proof_boundary["paragraph_index"],
                "paragraph": proof_boundary["paragraph"],
                "terminal_text": proof_boundary["terminal_text"],
                "alignment_confidence": proof_boundary["alignment_confidence"],
                "boundary_policy": "first_complete_script_paragraph_at_or_after_minimum_output_duration"
            }
        }
        output = project / "direction" / "narration_timeline.json"
        output.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        qa_output = project / "qa" / "proof_source_speech.json"
        qa_output.parent.mkdir(parents=True, exist_ok=True)
        qa_output.write_text(json.dumps({
            "schema_version": "1.0-proof-source-transcript",
            "project_id": args.project_id,
            "language": info.language,
            "analyzed_duration_seconds": round(analysis_seconds, 3),
            "transcript": " ".join(part for part in transcript_parts if part).strip(),
            "words": [{k: v for k, v in item.items() if k != "token"} for item in words],
            "paragraph_boundaries": paragraph_boundaries,
            "resolved_proof_boundary": proof_boundary
        }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(json.dumps({
            "ok": True,
            "timeline": str(output),
            "proof_source_end_seconds": payload["proof"]["source_end_seconds"],
            "proof_speech_output_end_seconds": payload["proof"]["speech_output_end_seconds"],
            "full_output_duration_seconds": payload["full_output_duration_seconds"],
            "full_duration_frames": payload["full_duration_frames"]
        }))


if __name__ == "__main__":
    main()
