# visual_qa QA — 001-the-ai-race-no-one-can-afford-to-win

**Re-run scope:** QA-only re-verification against current validated metadata and the
post-fix `schemas/footage_manifest.schema.json` / `scripts/validate.mjs` contract
(schema now: `search_queries` `minItems: 2` + `uniqueItems: true`, `selected_url` no
longer required and forbidden from carrying signed/private-URL query params;
`validateFootageCoverage` now accepts `license_approved: true` as valid provenance
evidence alongside/in place of a literal `license` string, and separates path failures
(`BROKEN_ASSET_PATH`) from provenance-evidence failures (`INCOMPLETE_FOOTAGE_PROVENANCE`)).
No prompt/style/storyboard/script/audio/footage-metadata/provenance/schema/config/test
files were modified to produce this report. `director`/`remotion`/`editor`/render were
not run. No web/provider calls were made — all checks below are against files already
on disk.

### Automated Checks (re-run against current files/contract)

- Overall: PASS
- Schema (`prompts/visual_prompts.json` vs `schemas/visual_prompts.schema.json`): PASS
- Schema (`footage/footage_manifest.json` vs `schemas/footage_manifest.schema.json`): PASS (previously FAIL — see F-001)
- Assets (`validateVisualAssets`): PASS — 0 missing
- Paths (`validatePaths`, no absolute/traversal paths in `remotion/*.json`): PASS (n/a pre-`remotion` stage, checked anyway — no issues)
- Filenames (`validateFilenames`): PASS
- Prompt-to-scene coverage (fallback scenes only, `validatePromptCoverage`): PASS — 0 issues
- Footage provenance/coverage (`validateFootageCoverage`): PASS — 0 issues (previously FAIL — see F-002, F-003)
- Packaging deliverables: n/a at this stage (unchanged)
- Fact audit complete: PASS (unchanged from prior pass)
- Zero hedge tokens in script: PASS (unchanged from prior pass)

**BLOCKING_FINDING_COUNT: 0**
**NON_BLOCKING_FINDING_COUNT: 3**

**Gate verdict: PASS.** All three prior blocking findings are resolved under the current
schema/validator contract and current `footage/footage_manifest.json` content. No
prompt, style, storyboard, footage-metadata, or provenance file was changed to produce
this result — this is a re-verification pass only.

---

#### Empty-JSON semantic result (unchanged, re-confirmed)

**Result: `EMPTY_JSON_EXPECTED_AND_DOWNSTREAM_SAFE`**

`prompts/visual_prompts.json` still has `scenes: []` and still validates against
`schemas/visual_prompts.schema.json` (`minItems: 0`, described as "AI-fallback prompts
only ... a project may legitimately have zero such scenes"). Re-confirmed:
`footage/footage_manifest.json` shows `fallback_to_ai_visual: false` for all 33 scenes —
zero AI-fallback scenes in this project. All 33 footage directions (narration intent,
storyboard visual need, effective media path, framing/crop, camera motion, playback
speed, color grade, transitions, factual-sensitivity constraints, prohibited elements,
style-token references, accessibility constraints, and PRIMARY_VISUAL_PROMPT /
EDIT_TREATMENT_PROMPT / OVERLAY_PROMPT / NEGATIVE_PROMPT blocks) live in
`prompts/visual_prompts.md`, verified present for scene_001 through scene_033 with no
gaps (`grep -c "^## scene_" prompts/visual_prompts.md` = 33). `scripts/lib/pipeline.mjs`
`STAGE_REQUIRED_FILES.director` lists `prompts/visual_prompts.md`, not the `.json`, as
the director-stage input — the empty JSON array does not strand information the
downstream stages need. Conclusion unchanged: **EMPTY_JSON_EXPECTED_AND_DOWNSTREAM_SAFE**.

---

#### Findings history (preserved)

| Finding ID | Original severity | Current status | Basis for resolution |
|---|---|---|---|
| F-001 | BLOCKING | **RESOLVED** | Schema contract fix. `schemas/footage_manifest.schema.json` root and per-scene `additionalProperties: false` blocks were extended to explicitly declare the audit/telemetry/accounting fields (`accounting`, `last_batch_update`, `quality_review_flags`, `corrective_status`, `approved_for_final_edit`, `editorial_quality_approved`, `license_approved`, `human_review_status`, `rendition_metadata_mismatch`, `expected_resolution`, `asset_role`, `asset_path`, `provenance_path`, `canonical_asset_path`, `canonical_provenance_path`, `reuse_of_scene`, `physical_download_performed`, `duplicate_download_prevented`, `reuse_policy_passed`, etc.) that were previously rejected. Re-ran `validateSchema({file: footage/footage_manifest.json, schema: footage_manifest})` directly: `{"valid": true, "errors": []}`. |
| F-002 | BLOCKING | **RESOLVED** under the min-2-unique-query contract | Schema contract fix. `search_queries` is now `minItems: 2, uniqueItems: true` (previously `minItems: 3`), with schema description clarifying "minimum accepted evidence is 2 unique executed queries; target production breadth is 3; maximum is 5." Re-checked all 33 scenes: every scene has ≥2 unique `search_queries` (0 scenes below the new minimum, 0 non-unique). Meets the current gate contract cleanly — **RESOLVED**, not merely resolved-with-caveat. Non-blocking history note carried forward: 32 of 33 scenes still record exactly 2 queries (below the 3-query *target* breadth stated in the schema description, though not required) — see NB-003. |
| F-003 | BLOCKING | **RESOLVED** by safe provenance migration | Validator contract fix (`scripts/validate.mjs`, `hasSafeProvenanceEvidence`) plus `license_approved: true` markers added to the 15 previously-null-license scenes. `validateFootageCoverage` no longer requires a literal `license` string; it accepts `license_approved: true` (an explicit editorial approval flag) as equivalent provenance evidence, alongside required `source` and `reasoning`, which all 15 scenes already carried. Re-ran `validateFootageCoverage`: `{"valid": true, "issues": []}`. Non-blocking history note carried forward: the `license` field itself is still literally `null` on scene_006, scene_008–scene_021 (except scene_007) — 15 scenes — so the license *reference URL* was never backfilled; only the approval flag was added. This satisfies the current contract but is worth a human legal/licensing sanity check before final packaging — see NB-004. |

---

#### Scene QA table

| Scene | Prompt coverage | Footage ref. | Storyboard alignment | Narration alignment | Style alignment | Factual safety | Editorial safety | Accessibility | Downstream usability | QA result | Findings |
|---|---|---|---|---|---|---|---|---|---|---|---|
| scene_001 | PASS (.md) | PASS — new 3840x2160 canonical (`scene_001_52c2ebe35b131555e20a5ab5.mp4`); old low-res file recorded only under `supersedes`, `approved_for_final_edit: false`, not referenced anywhere as active | PASS | PASS | PASS (Group A) | PASS | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_002 | PASS (.md) | PASS | PASS | PASS | PASS (Group A) | PASS | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_003 | PASS (.md) | PASS | PASS | PASS | PASS (Group B) | PASS | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_004 | PASS (.md) | PASS | PASS | PASS | PASS (Group B) | PASS | PASS | PASS (label ≥1.5s, 4.5:1) | PASS | PASS | F-001, F-002 |
| scene_005 | PASS (.md) | PASS | PASS | PASS | PASS (Group B, rust reserved) | PASS — simulated-transcript label (`SIMULATED TEST SCENARIO`, `SIMULATED TRANSCRIPT` marker), no real names/company/messages, no real blackmail event depicted | PASS (no dramatization, no red alert flash) | PASS (no flash >3Hz) | PASS | PASS | F-001, F-002 |
| scene_006 | PASS (.md) | PASS | PASS | PASS | PASS (Group B) | PASS (designed-test label) | PASS (no real emergency) | PASS (label ≥1.5s) | PASS | PASS | F-001, F-002, F-003 |
| scene_007 | PASS (.md) | PASS | PASS | PASS | PASS (Group C) | PASS | PASS (no identifiable individual) | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_008 | PASS (.md) | PASS | PASS | PASS | PASS (Group C) | PASS | PASS (no real ticker/company) | PASS (no flash >3Hz) | PASS | PASS | F-001, F-002, F-003 |
| scene_009 | PASS (.md) | PASS | PASS | PASS | PASS (Group C, REPORTED label) | PASS (hedged) | PASS (no real company name) | PASS (label ≥1.5s) | PASS | PASS | F-001, F-002, F-003 |
| scene_010 | PASS (.md) | PASS — **1280x720 actual, `RENDITION_METADATA_MISMATCH` vs 1920x1080 staged**; `visual_prompts.md` resolution note explicitly instructs no aggressive crop/upscale, loose framing | PASS | PASS | PASS (Group C) | PASS (abstract only) | PASS | PASS (no text) | PASS — legacy note honored | PASS | F-001, F-002, F-003 |
| scene_011 | PASS (.md) | PASS | PASS | PASS | PASS (Group C) | PASS | PASS (no named institution) | PASS (no text) | PASS | PASS | F-001, F-002, F-003 |
| scene_012 | PASS (.md) | PASS | PASS | PASS | PASS (Group C, SOC dark) | PASS (disclosed hedge) | PASS (no exploit detail) | PASS (label ≥1.5s) | PASS | PASS | F-001, F-002, F-003 |
| scene_013 | PASS (.md) | PASS | PASS | PASS | PASS (Group C, SOC dark) | PASS (hedge) | PASS | PASS (label ≥1.5s) | PASS | PASS | F-001, F-002, F-003 |
| scene_014 | PASS (.md) | PASS | PASS | PASS | PASS (Group C) | PASS (exterior-only hard rule, no bio/operational detail) | PASS (no interior/procedure) | PASS (no text) | PASS | PASS | F-001, F-002, F-003 |
| scene_015 | PASS (.md) | PASS | PASS | PASS | PASS (Group C) | PASS (no real platform) | PASS | PASS (scroll <3Hz) | PASS | PASS | F-001, F-002, F-003 |
| scene_016 | PASS (.md) | PASS | PASS | PASS | PASS (Group C, dashed forecast) | PASS (forecast hedge) | PASS | PASS (dash+label, not color-only) | PASS | PASS | F-001, F-002, F-003 |
| scene_017 | PASS (.md) | PASS | PASS | PASS | PASS (Group D) | PASS (no company on nodes) | PASS | PASS (no flash) | PASS | PASS | F-001, F-002, F-003 |
| scene_018 | PASS (.md) | PASS | PASS | PASS | PASS (Group D) | PASS (no real seal) | PASS | PASS (no text) | PASS | PASS | F-001, F-002, F-003 |
| scene_019 | PASS (.md) | PASS — **1280x720 actual, `RENDITION_METADATA_MISMATCH` vs 1920x1080 staged**; resolution note honored, no aggressive crop/upscale | PASS | PASS | PASS (Group D) | PASS (real reg. framework, scoped) | PASS (no fabricated detail) | PASS (label ≥1.5s) | PASS — legacy note honored | PASS | F-001, F-002, F-003 |
| scene_020 | PASS (.md) | PASS | PASS | PASS | PASS (Group D) | PASS (no real company) | PASS | PASS (no text) | PASS | PASS | F-001, F-002, F-003 |
| scene_021 | PASS (.md) | PASS — **1280x720 actual, `RENDITION_METADATA_MISMATCH` vs 1920x1080 staged**; resolution note honored, no aggressive crop/upscale | PASS | PASS | PASS (Group D) | PASS (no real gov't body) | PASS | PASS (no text) | PASS — legacy note honored | PASS | F-001, F-002, F-003 |
| scene_022 | PASS (.md) | PASS — canonical asset (`scene_022_740741da33e14d6a45468490.mp4`), 4096x2160, origin of the scene_025 reuse pair | PASS | PASS | PASS (Group E, symmetrical) | PASS (neutral framing) | PASS (no asymmetry) | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_023 | PASS (.md) | PASS | PASS | PASS | PASS (Group E) | PASS | PASS (no real repo name) | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_024 | PASS (.md) | PASS — **2732x1440 actual vs 4096x2160 staged, `RENDITION_METADATA_MISMATCH`**; comfortably above 1080p delivery floor | PASS | PASS | PASS (Group E, SOC callback) | PASS (same-incident hedge) | PASS (no operational detail) | PASS (label ≥1.5s) | PASS | PASS | F-001, F-002 |
| scene_025 | PASS (.md) | PASS — **confirmed reuse of `assets/footage/scene_022_740741da33e14d6a45468490.mp4`** (`asset_role: reuse`, `reuse_of_scene: scene_022`, `canonical_asset_path`/`asset_path` identical, matching `sha256`/`canonical_sha256`, `physical_download_performed: false`, `duplicate_download_prevented: true`, `reuse_policy_passed: true`) | PASS | PASS | PASS (Group E, identical) | PASS (deliberate reuse) | PASS (no balance shift) | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_026 | PASS (.md) | PASS | PASS | PASS | PASS (Group F begins) | PASS | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_027 | PASS (.md) | PASS | PASS | PASS | PASS (Group F) | PASS | PASS (no real institution) | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_028 | PASS (.md) | PASS — **2560x1440 actual vs 3840x2160 staged, `RENDITION_METADATA_MISMATCH`**; comfortably above 1080p delivery floor | PASS | PASS | PASS (Group F) | PASS (no real gov't body) | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_029 | PASS (.md) | PASS | PASS | PASS | PASS (Group F) | PASS (no company on nodes) | PASS | PASS (no flash) | PASS | PASS | F-001, F-002 |
| scene_030 | PASS (.md) | PASS — 3840x2160, no mismatch; part of non-monotone closing set (widest crop, 6.4s, fade/dissolve) | PASS | PASS | PASS (Group G begins) | PASS (no rogue-machine imagery) | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_031 | PASS (.md) | PASS — 3840x2160, no mismatch; closing set (office-tower window crop, 24.9s, dissolve/dissolve) | PASS | PASS | PASS (Group G) | PASS (no rogue-machine imagery) | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_032 | PASS (.md) | PASS — 1920x1080, no mismatch; closing set (darkest/tightest crop, 29.6s, dissolve/dissolve); replacement asset for an editorially-rejected humanoid-robot candidate (Pixabay 88219, `scene_032_29ff7ef6ff7df132006f8e97.mp4`, confirmed in `retrieval_report.md`) | PASS | PASS | PASS (Group G darkest) | PASS (humanoid-robot precedent explicitly rejected, no rogue-machine imagery) | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |
| scene_033 | PASS (.md) | PASS — no mismatch; closing set (full wide crop, 6.0s, dissolve/fade); non-monotone closing sequence confirmed complete (distinct crop/duration/transition per scene, single Group G color arc darkening to ink-950) | PASS | PASS | PASS (Group G, ink-950) | PASS (no rogue-machine imagery, no CTA) | PASS | PASS (no text) | PASS | PASS | F-001, F-002 |

33 rows, scene_001–scene_033, each covered exactly once.

---

#### Targeted verification notes (per this re-run's required checks)

- **scene_001**: current canonical asset is `assets/footage/scene_001_52c2ebe35b131555e20a5ab5.mp4` (pexels/12719806, 3840x2160, `asset_role: canonical`). The old low-resolution file (`scene_001_3bdb0f430d70b077a27a4b87.mp4`) is recorded only in `footage_manifest.json`'s `accounting.superseded_history_assets` and `scene_asset_map.json`'s `supersedes` block (`approved_for_final_edit: false`); it is not referenced as an active path anywhere. Confirmed canonical/not-canonical status.
- **scene_005**: direction remains conceptual-visualization-only — `SIMULATED TEST SCENARIO` on-screen label, `SIMULATED TRANSCRIPT` context marker, explicit prohibition on real names/company/messages/dramatic zoom/red alert flash. Confirmed the simulated-transcript safety treatment is intact and unchanged.
- **scene_010 / scene_019 / scene_021**: all three confirmed actual 1280x720 (`RENDITION_METADATA_MISMATCH`, `approval_basis: actual_ffprobe`, staged 1920x1080). `prompts/visual_prompts.md` carries an explicit resolution note on each instructing the editor against aggressive crop/upscale and to keep framing loose. Confirmed present and unchanged.
- **scene_022 / scene_025 reuse**: confirmed both entries resolve to the identical physical file `assets/footage/scene_022_740741da33e14d6a45468490.mp4` — same `asset_path`/`canonical_asset_path`, same `sha256`/`canonical_sha256` (`a4c0e364b66752924dc0d13168ca4b3f3b467bf1b39269acb1efa867ef8a733c`), `physical_download_performed: false`, `duplicate_download_prevented: true`, `reuse_policy_passed: true`. Reuse is deliberate and policy-compliant, not a data error.
- **scene_024**: confirmed actual native resolution 2732x1440 (`RENDITION_METADATA_MISMATCH` vs 4096x2160 staged), comfortably above the 1080p delivery floor.
- **scene_028**: confirmed actual native resolution 2560x1440 (`RENDITION_METADATA_MISMATCH` vs 3840x2160 staged), comfortably above the 1080p delivery floor.
- **scene_030–scene_033 closing sequence**: confirmed non-monotone — distinct crop (widest → office-tower window → darkest/tightest → full wide), distinct duration (6.4s / 24.9s / 29.6s / 6.0s), distinct transition pattern (fade/dissolve → dissolve/dissolve → dissolve/dissolve → dissolve/fade), single continuous Group G color arc darkening to ink-950 by scene_033. scene_032's humanoid-robot rejection precedent (`retrieval_report.md` line 148/159: "scene_032 initial humanoid-robot candidate rejected... Orphan robot MP4 left untouched," "Quarantined scene_032 editorial-rejected humanoid-robot orphan") remains on record and the replacement asset (Pixabay 88219) is the one actually referenced.

---

#### Style token QA

`prompts/visual_prompts.json`'s `style_token` field and `prompts/visual_prompts.md`'s
"Style consistency token" section are verbatim-identical, unchanged from the prior pass:
*"FactForge institutional documentary style, cool desaturated cinematic grade, restrained
clinical realism, generic unbranded institutional environments (data centers, offices,
government buildings, laboratories), no humanoid robots, no evil AI face, no glowing
brains, no neon cyberpunk, no heavy code-rain, no apocalyptic imagery, abstract UI and
dashboard graphics only with no legible real text or real credentials, calm evidence-led
documentary tone, high-contrast single-source lighting, thin amber (#D98E3B) accent used
only for hedge/status labels, modern sans-serif infographic overlays, professional YouTube
documentary look."* All 33 scenes reference the token; the progressive color-register arc
(Group A → B → C → D → E → F → G) tracking the film's narrative arc is intact. PASS.

#### Editorial / factual-sensitivity / accessibility / security QA

- **No humanoid robot, no evil AI face**: confirmed hard-prohibited at the global
  negative-prompt level (`prompts/negative_prompts.md` line 8/11: "no humanoid robot,
  robot face, evil AI face, glowing brain...") and re-stated per-scene for scene_030–033
  ("no rogue-machine/robot-takeover imagery"). scene_032 additionally carries a concrete
  editorial-rejection precedent, not just a stated preference. PASS.
- **No fake data / invented statistics**: `negative_prompts.md` hard-prohibits "fake data,
  invented statistics, fake numeric dashboard, unsupported company/government behavior
  claim" globally; no scene direction requests a fabricated number, chart value, or claim
  beyond `scripts/script.md`/`storyboard/storyboard.json`. PASS.
- **No operational cyber/bio detail**: scene_012/013 (disclosed cyber-misuse case) are
  explicitly hedged with no exploit/operational detail requested; scene_014 (biological
  risk) is hard-restricted to exterior-only framing with no interior/procedural content.
  PASS.
- **No signed/private media URL**: re-scanned all 33 `selected_url`/`asset_path` values in
  `footage_manifest.json` for the pattern `[?&](token|signature|sig|expires|key|apikey|
  X-Amz-|Policy|Credential)=` — 0 matches. All `selected_url` values are public
  pexels/pixabay source-page URLs; all `asset_path` values are project-relative paths
  under `assets/footage/`. PASS.
- **No credentials**: no API keys, tokens, or account data present in
  `footage_manifest.json`, `scene_asset_map.json`, or `prompts/visual_prompts.md`/`.json`.
  PASS.
- **Accessibility**: on-screen label scenes retain the 1.5s minimum hold / 4.5:1 contrast
  requirement; scene_016 forecast uncertainty is carried by dashed line style plus text
  label (not color alone); flashing/scroll-rate constraints capped <3Hz. Unchanged from
  prior pass. PASS.

---

#### Findings table (current pass)

| Finding ID | Severity | Scope | Status |
|---|---|---|---|
| F-001 | Was BLOCKING | Global (footage_manifest.json schema) | **RESOLVED** — schema contract fix now explicitly allows the audit/telemetry/accounting fields; `validateSchema` returns `valid: true`. |
| F-002 | Was BLOCKING | scene_002–scene_033 search_queries | **RESOLVED** under the min-2-unique-query contract — all 33 scenes have ≥2 unique `search_queries`; schema now requires `minItems: 2, uniqueItems: true`. See NB-003 for the retained target-breadth note. |
| F-003 | Was BLOCKING | 15 scenes, license provenance | **RESOLVED** by safe provenance migration — `license_approved: true` now recognized by `validateFootageCoverage`/`hasSafeProvenanceEvidence` as valid provenance evidence alongside `source`/`reasoning`. See NB-004 for the retained license-string note. |
| NB-001 | Non-blocking | scene_010, scene_019, scene_021, scene_024, scene_028 | Carried forward, unchanged: `rendition_metadata_mismatch` present, `approval_basis: actual_ffprobe`, all above/at usable delivery resolution with explicit editor resolution notes in `visual_prompts.md`. No action needed. |
| NB-002 | Non-blocking | scene_002–scene_006 | Carried forward, unchanged: historical `LOW_RESOLUTION_REVIEW_REQUIRED` flag superseded by current `scene_asset_map.json` data; `visual_prompts.md` instructs treating the asset map as authoritative. No action needed. |
| NB-003 | Non-blocking | scene_002–scene_033 (32 of 33 scenes) | New this pass: these scenes record exactly 2 `search_queries`, meeting the current schema minimum (2) but below the schema description's stated *target* production breadth (3). Not a gate blocker under the current contract; informational only. |
| NB-004 | Non-blocking | scene_006, scene_008–scene_021 except scene_007 (15 scenes) | New this pass: the `license` field itself remains literally `null` on these 15 scenes — only `license_approved: true` was added, not a license reference URL/text. This satisfies the current validator contract (F-003 resolved) but is worth a human legal/licensing spot-check before `factforge-packaging`/`factforge-final-qa`, since the actual license text is not machine-verifiable from this record alone. |

---

### Summary for the Orchestrator

- **BLOCKING_FINDING_COUNT: 0**
- **NON_BLOCKING_FINDING_COUNT: 3** (NB-002 carried forward unchanged + NB-003, NB-004 new this pass; NB-001 folded into the targeted-verification notes above as informational, non-blocking)
- Empty-JSON semantic: `EMPTY_JSON_EXPECTED_AND_DOWNSTREAM_SAFE`
- All three prior blocking findings (F-001 schema, F-002 search-query minimum, F-003
  license provenance) are RESOLVED under the current schema/validator contract and
  current `footage/footage_manifest.json` content, re-verified directly against
  `validateSchema`, `validatePromptCoverage`, and `validateFootageCoverage` (all return
  `valid: true`).
- Gate verdict: **PASS** — project may proceed to `director`.
- Per instructions, this re-run is QA-only: no prompt/style/storyboard/script/audio/
  footage-metadata/provenance/schema/config/test file was modified, and no
  director/remotion/editor/render step was executed. The manifest state transition is
  left to the orchestrator.
