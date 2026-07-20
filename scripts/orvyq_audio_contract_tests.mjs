#!/usr/bin/env node
import fs from "node:fs";
import assert from "node:assert/strict";

const recovery = fs.readFileSync(
  ".github/workflows/orvyq-full-plan-rebalance.yml",
  "utf8",
);
const render = fs.readFileSync(".github/workflows/render.yml", "utf8");
const mixer = fs.readFileSync("scripts/orvyq_audio_mix_v2.mjs", "utf8");
const wrapper = fs.readFileSync("scripts/orvyq_audio_mix.mjs", "utf8");
const finalizer = fs.readFileSync(
  "scripts/orvyq_finalize_audio_contract.mjs",
  "utf8",
);
const metadataFinalizer = fs.readFileSync(
  "scripts/orvyq_finalize_rendered_audio_metadata.mjs",
  "utf8",
);
const speechQa = fs.readFileSync("scripts/orvyq_speech_qa.py", "utf8");
const musicAudit = fs.readFileSync("scripts/orvyq_music_cue_audit.mjs", "utf8");
const licenseAudit = fs.readFileSync("scripts/orvyq_license_audit.mjs", "utf8");

assert.match(wrapper, /orvyq_audio_mix_v2\.mjs/, "Legacy mixer entry point must route to v2");
assert.match(wrapper, /drop_duplicate_prefix_and_retime/, "Mixer wrapper must remove the duplicated narrator prefix before final mixing");
assert.match(wrapper, /atrim=start=\$\{rotateAt\}/, "Canonical narrator repair must trim at the configured splice point");
assert.match(wrapper, /atempo=\$\{tempo\}/, "Canonical narrator repair must preserve the approved full narration duration without silence padding");
assert.match(wrapper, /finally \{/, "Runtime narrator substitution must always restore the immutable source asset");
assert.match(wrapper, /fs\.rename\(sourceBackup, voice\)/, "Raw narrator source must be restored after mixing");
assert.match(wrapper, /canonical_narrator_reconstruction = true/, "Final metadata must disclose canonical narrator reconstruction");
assert.match(mixer, /section_specific_energy_and_narration_ducking/, "Mixer must author section-specific cue energy");
assert.match(mixer, /cueSheet\.full_cues/, "Mixer must read canonical full cues");
assert.match(mixer, /original_synthesized_sfx/, "Mixer must generate original SFX");
assert.match(finalizer, /require_sound_design_sfx: true/, "Canonical plan must explicitly require sound design");
assert.match(finalizer, /status: "ready"/, "Canonical cue finalizer must mark every cue ready");
assert.match(finalizer, /plan\.sections/, "Canonical cues must derive from production sections");
assert.match(metadataFinalizer, /\.provenance\.json/, "Rendered SFX must receive provenance sidecars");
assert.match(metadataFinalizer, /deterministic_recipe/, "SFX provenance must include a deterministic recipe");
assert.match(metadataFinalizer, /approved_for_final_edit: true/, "SFX provenance must explicitly approve final edit use");
assert.match(speechQa, /reference_for_media/, "Speech QA must resolve the reference order from the analyzed media");
assert.match(speechQa, /audio_repaired_to_canonical_script_order/, "Repaired final media must compare directly with canonical script order");
assert.match(speechQa, /double_rotation_forbidden/, "Speech QA must forbid rotating the canonical reference twice");
assert.match(speechQa, /is_raw_unrepaired_voice/, "Only raw source-voice diagnostics may transform the script into supplied audio order");
assert.match(speechQa, /default=0\.85/, "Full speech QA similarity floor must remain 0.85");
assert.match(musicAudit, /section_specific_energy_arc/, "Music audit must verify the actual section energy arc");
assert.match(musicAudit, /sfx_provenance/, "Music audit must require SFX provenance");
assert.match(licenseAudit, /deterministic_recipe/, "License audit must validate deterministic SFX recipes");
assert.match(licenseAudit, /require_sound_design_sfx/, "License audit must honor the explicit full-film sound-design contract");

const finalizeIndex = recovery.indexOf(
  'node scripts/orvyq_finalize_audio_contract.mjs "$PROJECT_ID"',
);
const approvalIndex = recovery.indexOf(
  'node scripts/orvyq_refresh_approval_for_unchanged_prefix.mjs "$PROJECT_ID"',
);
const mixIndex = recovery.indexOf("const result = await buildOrvyqAudioMix");
const metadataIndex = recovery.indexOf(
  'node scripts/orvyq_finalize_rendered_audio_metadata.mjs "$PROJECT_ID"',
);
const speechIndex = recovery.indexOf(
  'python scripts/orvyq_speech_qa.py --project-id "$PROJECT_ID" --min-similarity 0.85',
);
assert.ok(finalizeIndex >= 0, "Recovery must finalize audio contract");
assert.ok(approvalIndex > finalizeIndex, "Proof approval continuity must bind the finalized audio contract plan hash");
assert.ok(mixIndex > approvalIndex, "Full audio mix must run after approval continuity refresh");
assert.ok(metadataIndex > mixIndex, "Rendered metadata/provenance finalization must follow audio generation");
assert.ok(speechIndex > metadataIndex, "Speech QA must inspect the finalized canonical mix");

assert.match(render, /orvyq_finalize_rendered_audio_metadata\.mjs/, "Render must finalize and verify generated SFX provenance");
assert.match(render, /--min-similarity 0\.85/, "Render speech gate must retain the 0.85 similarity floor");
assert.doesNotMatch(
  render,
  /orvyq_finalize_audio_contract\.mjs/,
  "Immutable render must not mutate the committed plan-level audio contract",
);

console.log(
  JSON.stringify({
    ok: true,
    contract: "orvyq-canonical-audio-v4.2-duplicate-prefix-reconstruction",
    cue_source: "production_plan.sections",
    minimum_script_similarity: 0.85,
    original_sfx_provenance_required: true,
    repaired_media_reference_order: "canonical_script_order",
    duplicate_prefix_regression_gate: true,
  }),
);
