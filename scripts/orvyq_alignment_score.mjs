#!/usr/bin/env node
import path from "node:path";
import { projectDir, readJson, writeJsonAtomic } from "./lib/fs-utils.mjs";

const PROJECT_ID = "001-the-ai-race-no-one-can-afford-to-win";

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export async function buildAlignmentReadiness(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const [evidence, semantic, pacing, mobile, speech, audio, plan] = await Promise.all([
    readJson(path.join(dir, "qa", "evidence_coverage.json")),
    readJson(path.join(dir, "qa", "semantic_visual_audit.json")),
    readJson(path.join(dir, "qa", "pacing_audit.json")),
    readJson(path.join(dir, "qa", "mobile_legibility_audit.json")),
    readJson(path.join(dir, "qa", "speech_transcript.json")),
    readJson(path.join(dir, "assets", "audio", "final_mix.metadata.json")),
    readJson(path.join(dir, "direction", "edit_plan.json")),
  ]);

  const categories = {
    narration_and_script: {
      weight: 15,
      score: clamp01((speech.script_similarity || 0) / 0.98) * 15,
      evidence: { script_similarity: speech.script_similarity, opening: String(speech.transcript || "").toLowerCase().startsWith("every major ai lab") },
    },
    source_and_evidence: {
      weight: 20,
      score: clamp01(Math.min(evidence.weighted_supported_coverage, evidence.weighted_visual_evidence_coverage)) * 20,
      evidence: { supported: evidence.weighted_supported_coverage, visual: evidence.weighted_visual_evidence_coverage },
    },
    semantic_visual_match: {
      weight: 18,
      score: semantic.pass ? 18 : Math.max(0, 18 - semantic.failures.length * 3),
      evidence: { generic_stock_fraction: semantic.generic_stock_fraction, evidence_archive_fraction: semantic.evidence_archive_fraction },
    },
    pacing_and_edit_structure: {
      weight: 14,
      score: pacing.pass ? Math.max(11, 14 - pacing.warnings.length) : Math.max(0, 10 - pacing.failures.length * 2),
      evidence: { average_shot_seconds: pacing.average_shot_seconds, variants: pacing.duration_variants },
    },
    graphics_and_mobile_legibility: {
      weight: 12,
      score: mobile.pass ? Math.max(10, 12 - mobile.warnings.length) : Math.max(0, 8 - mobile.failures.length * 2),
      evidence: { overlays: mobile.overlays.length, failures: mobile.failures },
    },
    music_and_sound_structure: {
      weight: 10,
      score: audio.music_profile === "approved_licensed_bed" ? 9 : audio.music_sections?.length >= 3 ? 8 : 5,
      evidence: { profile: audio.music_profile, sections: audio.music_sections || [], loudness: audio.measured },
    },
    cinematic_cohesion_policy: {
      weight: 6,
      score: semantic.generic_stock_fraction <= 0.2 && semantic.full_screen_graphic_fraction <= 0.1 ? 5 : 3,
      evidence: { art_direction: plan.art_direction, full_screen_graphic_fraction: semantic.full_screen_graphic_fraction },
    },
    technical_readiness: {
      weight: 5,
      score: speech.passed && evidence.pass && semantic.pass && pacing.pass && mobile.pass ? 5 : 0,
      evidence: { speech_pass: speech.passed, evidence_pass: evidence.pass, semantic_pass: semantic.pass, pacing_pass: pacing.pass, mobile_pass: mobile.pass },
    },
  };

  const automatedScore = Object.values(categories).reduce((sum, category) => sum + category.score, 0);
  const unresolvedHumanReview = {
    required: true,
    status: "pending",
    dimensions: [
      "actual visual meaning and emotional resonance",
      "Aperture-level cinematic composition",
      "music arc and section transitions in the rendered video",
      "mobile readability from rendered frames",
      "whether the film feels directed rather than assembled"
    ],
  };

  const minimumAutomatedReadiness = plan.preview ? 85 : 92;
  const pass = automatedScore >= minimumAutomatedReadiness
    && Object.values(categories).every((category) => category.score >= category.weight * 0.65);

  const report = {
    schema_version: "1.0",
    project_id: projectId,
    preview: Boolean(plan.preview),
    categories,
    automated_readiness_score: automatedScore,
    minimum_automated_readiness: minimumAutomatedReadiness,
    human_review: unresolvedHumanReview,
    final_aperture_alignment_score: null,
    note: "Automated readiness is not the final Aperture alignment score. A rendered-video human review is mandatory before any 95% claim.",
    pass,
  };

  await writeJsonAtomic(path.join(dir, "qa", "alignment_readiness.json"), report);
  if (!pass) throw new Error(`ORVYQ automated readiness ${automatedScore.toFixed(1)} is below ${minimumAutomatedReadiness}`);
  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildAlignmentReadiness().then((report) => console.log(JSON.stringify({ ok: true, ...report }))).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
