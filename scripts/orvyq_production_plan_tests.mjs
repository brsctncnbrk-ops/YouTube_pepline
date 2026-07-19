#!/usr/bin/env node
import path from "node:path";
import { promises as fs } from "node:fs";
import {
  projectDir,
  writeJsonAtomic,
  readJson,
} from "./lib/fs-utils.mjs";
import {
  validateProductionPlan,
  finalizeProductionPlan,
  writeProofApproval,
  validateProofApproval,
  buildEditPlanFromProduction,
} from "./lib/orvyq-production.mjs";
import { generateProductionPlan } from "./orvyq_generate_production_plan.mjs";

const PROJECT_ID = "998-orvyq-production-test";
const dir = projectDir(PROJECT_ID);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createFixture() {
  await fs.rm(dir, { recursive: true, force: true });
  await Promise.all([
    fs.mkdir(path.join(dir, "direction"), { recursive: true }),
    fs.mkdir(path.join(dir, "research"), { recursive: true }),
    fs.mkdir(path.join(dir, "remotion"), { recursive: true }),
    fs.mkdir(path.join(dir, "qa"), { recursive: true }),
    fs.mkdir(path.join(dir, "storyboard"), { recursive: true }),
    fs.mkdir(path.join(dir, "assets", "images"), { recursive: true }),
  ]);
  await fs.writeFile(path.join(dir, "assets", "images", "scene_001.png"), "fixture-image-a");
  await fs.writeFile(path.join(dir, "assets", "images", "scene_002.png"), "fixture-image-b");

  await writeJsonAtomic(path.join(dir, "remotion", "composition.json"), {
    schema_version: "2.0",
    fps: 30,
    width: 1920,
    height: 1080,
    duration_frames: 3600,
    audio_asset: "assets/audio/final_voice.mp3",
    scenes: [
      {
        scene_id: "scene_001",
        start_frame: 0,
        end_frame: 1800,
        asset_type: "ai_fallback",
        image_asset: "assets/images/scene_001.png",
        camera_motion: { type: "static", params: {} },
        text_overlay: null,
        transition_in: "fade",
        transition_out: "cut"
      },
      {
        scene_id: "scene_002",
        start_frame: 1800,
        end_frame: 3600,
        asset_type: "ai_fallback",
        image_asset: "assets/images/scene_002.png",
        camera_motion: { type: "static", params: {} },
        text_overlay: null,
        transition_in: "cut",
        transition_out: "fade"
      }
    ],
    asset_map: {},
    render: { codec: "h264", crf: 18, output_filename: "final_video.mp4" }
  });

  await writeJsonAtomic(path.join(dir, "storyboard", "storyboard.json"), {
    schema_version: "3.0",
    project_id: PROJECT_ID,
    target_duration_sec: 120,
    total_duration_sec: 120,
    scene_count: 2,
    generated_at: new Date().toISOString(),
    scenes: [
      {
        scene_id: "scene_001",
        section_id: "SEC_A",
        start_sec: 0,
        end_sec: 60,
        duration_sec: 60,
        purpose: "Establish the first bounded claim with visible evidence.",
        visual_need: "A source-led explanation alternating with restrained contextual imagery.",
        mood: "tense",
        on_screen_text: null,
        transition_in: "fade",
        transition_out: "cut",
        voice_line_ref: "Fixture narration A"
      },
      {
        scene_id: "scene_002",
        section_id: "SEC_B",
        start_sec: 60,
        end_sec: 120,
        duration_sec: 60,
        purpose: "Resolve the second bounded claim with visible evidence.",
        visual_need: "A source-led resolution with a calm branded release.",
        mood: "reflective",
        on_screen_text: null,
        transition_in: "cut",
        transition_out: "fade",
        voice_line_ref: "Fixture narration B"
      }
    ]
  });

  await writeJsonAtomic(path.join(dir, "research", "evidence_map.json"), {
    schema_version: "1.0",
    source_catalog: [
      {
        source_id: "SRC_TEST_A",
        publisher: "Test Authority",
        title: "Primary Fixture A",
        publication_date: "2026-01-01",
        url: "https://example.com/a",
        official: true
      },
      {
        source_id: "SRC_TEST_B",
        publisher: "Test Authority",
        title: "Primary Fixture B",
        publication_date: "2026-01-02",
        url: "https://example.com/b",
        official: true
      }
    ],
    sections: [
      {
        section_id: "SEC_A",
        dramatic_function: "Establish the first bounded claim with visible evidence."
      },
      {
        section_id: "SEC_B",
        dramatic_function: "Resolve the second bounded claim with visible evidence."
      }
    ],
    claims: [
      {
        claim_id: "CLM_A",
        section_id: "SEC_A",
        status: "verified",
        source_ids: ["SRC_TEST_A"],
        narration_excerpt: "Fixture claim A"
      },
      {
        claim_id: "CLM_B",
        section_id: "SEC_B",
        status: "verified",
        source_ids: ["SRC_TEST_B"],
        narration_excerpt: "Fixture claim B"
      }
    ]
  });

  await generateProductionPlan(PROJECT_ID, { proofSeconds: 60 });

}

try {
  await createFixture();

  const draft = await validateProductionPlan({
    projectId: PROJECT_ID,
    requireReady: false,
  });
  assert(draft.valid, `Draft plan failed: ${JSON.stringify(draft.issues)}`);

  const finalized = await finalizeProductionPlan({ projectId: PROJECT_ID });
  assert(finalized.valid && finalized.status === "ready", "Finalization did not produce a ready plan");

  const ready = await validateProductionPlan({ projectId: PROJECT_ID });
  assert(ready.valid, `Ready plan failed: ${JSON.stringify(ready.issues)}`);

  const missingApproval = await validateProofApproval({ projectId: PROJECT_ID });
  assert(!missingApproval.valid, "Missing proof approval was accepted");

  const approval = await writeProofApproval({
    projectId: PROJECT_ID,
    proofRunId: "123456",
    humanScore: 97,
    renderSourceSha: "a".repeat(40),
    reviewNotes: "Fixture approval",
  });
  assert(approval.production_plan_sha256 === ready.plan_sha256, "Approval hash does not match the ready plan");

  const approved = await validateProofApproval({ projectId: PROJECT_ID });
  assert(approved.valid, `Approval failed: ${JSON.stringify(approved.issues)}`);

  const proof = await buildEditPlanFromProduction({
    projectId: PROJECT_ID,
    mode: "proof",
  });
  const readyPlan = await readJson(path.join(dir, "direction", "production_plan.json"));
  assert(proof.duration_frames === readyPlan.proof.duration_frames, "Proof did not use the canonical prefix boundary");
  assert(proof.shots.at(-1).end_frame === readyPlan.proof.duration_frames, "Proof prefix ended inside a shot");

  const full = await buildEditPlanFromProduction({
    projectId: PROJECT_ID,
    mode: "full",
  });
  assert(full.duration_frames === 3600, "Full plan did not cover the complete timeline");
  assert(full.shots.length === readyPlan.shots.length, "Full plan shot count drifted");
  assert(full.shots.at(-1).end_frame === 3600, "Full plan did not end at the composition boundary");

  const driftedPlan = await readJson(path.join(dir, "direction", "production_plan.json"));
  driftedPlan.sections[1].music_state = "changed_after_approval";
  await writeJsonAtomic(path.join(dir, "direction", "production_plan.json"), driftedPlan);
  const drifted = await validateProofApproval({ projectId: PROJECT_ID });
  assert(!drifted.valid && drifted.error_code === "PROOF_PLAN_DRIFT", "Plan drift did not invalidate proof approval");

  console.log(
    JSON.stringify(
      {
        ok: true,
        generated_from_storyboard_and_composition: true,
        draft_validated: true,
        finalized: true,
        missing_approval_blocked: true,
        approval_hash_bound: true,
        proof_prefix_verified: true,
        full_timeline_verified: true,
        plan_drift_blocked: true
      },
      null,
      2,
    ),
  );
} finally {
  await fs.rm(dir, { recursive: true, force: true });
}
