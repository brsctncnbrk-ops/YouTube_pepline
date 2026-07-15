# Footage Retrieval Report — 001-the-ai-race-no-one-can-afford-to-win

- Run ID: `20260711T153404Z`
- Scope: footage_retrieval only
- Pipeline wrapper used: footage-only retrieve wrapper
- Scenes processed: 33
- Production candidates: 33
- Canary/test candidate IDs excluded: 4
- Unique assets acquired: 1
- Human-review scene mappings: 31
- Missing assets: 0
- Visual style bible started: NO
- Visual prompts generated: NO

## Editorial note
A single licensed server/database footage asset was acquired and mapped as a reusable generic infrastructure metaphor. Scene-specific relevance remains marked for human review where appropriate; no captions or new factual claims were introduced.


## Batch resume 20260711T205558Z: scene_002-scene_009

- Downloaded new assets: 0
- Reused existing asset: `assets/footage/scene_001_3bdb0f430d70b077a27a4b87.mp4`
- Scenes processed: scene_002, scene_003, scene_004, scene_005, scene_006, scene_007, scene_008, scene_009
- Quality flag applied: `LOW_RESOLUTION_REVIEW_REQUIRED`
- Stage advanced: NO
- Active USER_APPROVAL_REQUIRED preserved: YES


## Corrective batch 20260711T214052Z: scene_002-scene_005

- Scene-specific searches executed: YES
- Queries per scene: 2
- Old low-resolution generic mappings superseded: 4
- New candidates evaluated: 16
- Assets downloaded: 0
- Stage advanced: NO
- Active USER_APPROVAL_REQUIRED preserved: YES


## Provider-fix corrective rerun 20260711T231354Z: scene_002-scene_005

- Pexels/Pixabay attempted per scene: YES
- Queries per scene: 2
- Provider failures: []
- Unique candidates: 29
- Staged occurrences: 32
- Assets downloaded: 4
- Old low-resolution mappings superseded: 4
- Stage advanced: NO
- Active USER_APPROVAL_REQUIRED preserved: YES


## Provider-fix corrective rerun 20260712T014047Z: scene_006-scene_009

- Pexels/Pixabay attempted per scene: YES
- Queries per scene: 2
- Provider failures: 0
- Unique candidates: 4 selected / 32 staged occurrences
- Assets downloaded: 4
- Old low-resolution mappings superseded: 4
- Stage advanced: NO
- Active USER_APPROVAL_REQUIRED preserved: YES
- Visual style bible started: NO


### Scene_007 landscape adjustment 20260712T014047Z

- Replaced portrait boardroom selection in project mappings with landscape 3840x2160 scene-specific Pexels asset.
- Previous scene_007 portrait file left on disk as superseded artifact; canonical mappings use the landscape asset.


## Provider-fix corrective rerun 20260712T015753Z: scene_010-scene_013

- Pexels/Pixabay attempted per scene: YES
- Queries per scene: 2
- Provider failures: 0
- Assets downloaded: 4
- Human-review/missing scenes: 0
- Old generic mappings superseded: 4
- Stage advanced: NO
- Active USER_APPROVAL_REQUIRED preserved: YES
- Visual style bible started: NO


## Provider-fix corrective rerun 20260712T021722Z: scene_014-scene_017

- Pexels/Pixabay attempted per scene: YES
- Queries per scene: 2
- Provider failures: 0
- Unique candidates evaluated: 32 staged occurrences
- Assets downloaded: 4
- Human-review/missing scenes: 0
- Reuse decisions: none; one new primary asset per scene
- Over-reuse prevented: YES
- RENDITION_METADATA_MISMATCH_NON_BLOCKING: scene_010 prior observation retained; no scene_010 artifact changed in this batch
- RENDITION_METADATA_MISMATCH in this batch: none
- Stage advanced: NO
- Active USER_APPROVAL_REQUIRED preserved: YES
- Visual style bible started: NO


## Provider-fix corrective rerun 20260712T022345Z: scene_018-scene_021

- Pexels/Pixabay attempted per scene: YES
- Queries per scene: 2
- Provider failures: 0
- Unique candidates evaluated: 32 staged occurrences
- Assets downloaded: 4
- Human-review/missing scenes: 0
- Reuse decisions: none; one new primary asset per scene
- Over-reuse prevented: YES
- RENDITION_METADATA_MISMATCH in this batch: [{"scene": "scene_019", "code": "RENDITION_METADATA_MISMATCH", "staged": "1920x1080", "actual": "1280x720", "approval_basis": "actual_ffprobe"}, {"scene": "scene_021", "code": "RENDITION_METADATA_MISMATCH", "staged": "1920x1080", "actual": "1280x720", "approval_basis": "actual_ffprobe"}]
- Stage advanced: NO
- Active USER_APPROVAL_REQUIRED preserved: YES
- Visual style bible started: NO

## Corrective batch 20260712T163309Z_scene_022_025

Scenes: scene_022-scene_025
Exact selected-rendition binding enforced; ffprobe actual dimensions authoritative.

- scene_022: pexels 6804117 candidate 740741da33e14d6a45468490 expected 4096x2160 actual 4096x2160 binding_verified=True
- scene_023: pexels 853919 candidate dbe758e1473aee29a155377a expected 1920x1080 actual 1920x1080 binding_verified=True
- scene_024: pexels 7255101 candidate 6e6f4af26cad60cc78930d6d expected 4096x2160 actual 2732x1440 binding_verified=True
- scene_025: pexels 6804117 candidate 740741da33e14d6a45468490 expected 4096x2160 actual 4096x2160 binding_verified=True

Old fallback mappings superseded for scene_022-scene_025 by 20260712T163309Z_scene_022_025
- scene_022-scene_025 previous scene_001 low-resolution fallback mapping: superseded, low_resolution, rejected_for_editorial_quality, replaced_by_corrective_search; not counted as completion.

## Corrective batch 20260712T164911Z_scene_026_029

Scenes: scene_026-scene_029
Exact binding + canonical reuse/dedup enabled.
- scene_026: pexels 33810505 candidate 8a460acd7183fb80baaa455e role canonical expected 3840x2160 actual 3840x2160 binding_verified=True physical_download=True
- scene_027: pexels 7579340 candidate 57a43a4f4b65321112dfb0bf role canonical expected 4096x2160 actual 4096x2160 binding_verified=True physical_download=True
- scene_028: pexels 6952221 candidate d4c7a6d60c700cc3f1dddeff role canonical expected 3840x2160 actual 2560x1440 binding_verified=True physical_download=True
- scene_029: pexels 8134446 candidate 94d5bdac38165c3c273344f7 role canonical expected 4096x2160 actual 4096x2160 binding_verified=True physical_download=True

## Corrective batch 20260712T165227Z_scene_030_033

Scenes: scene_030-scene_033
Exact binding + canonical reuse/dedup enabled.
- scene_030: pexels 35581160 candidate 3bee64eb585a0f8f6b6895c0 role canonical expected 3840x2160 actual 3840x2160 binding_verified=True physical_download=True
- scene_031: pexels 36926169 candidate 12e168b42df0ef02be3b9707 role canonical expected 3840x2160 actual 3840x2160 binding_verified=True physical_download=True
- scene_032: pexels 29724125 candidate e312080768bdd277a7e1ea67 role canonical expected 3840x2160 actual 3840x2160 binding_verified=True physical_download=True
- scene_033: pexels 30346632 candidate 1b2f289c850d35e4a6e96dc4 role canonical expected 3840x2160 actual 3840x2160 binding_verified=True physical_download=True

Editorial correction 20260712T165227Z_scene_030_033_editorial_correction: scene_032 initial humanoid-robot candidate rejected; oversized skyline candidate not downloaded; replaced with Pixabay 88219, candidate 29ff7ef6ff7df132006f8e97, actual 1920x1080. Orphan robot MP4 left untouched.

## Corrective batch 20260712T185035Z_scene_001_replacement

- scene_001 replacement: pexels 12719806 candidate 52c2ebe35b131555e20a5ab5; asset assets/footage/scene_001_52c2ebe35b131555e20a5ab5.mp4; expected 3840x2160; actual 3840x2160; binding_verified=true.
- Old low-resolution asset preserved as SUPERSEDED_HISTORY: assets/footage/scene_001_3bdb0f430d70b077a27a4b87.mp4; sha a32519868f8180f1206761fd189a67022a72ad2bc3e373b2e11e366c32b4d7af; completion_counted=false; approved_for_final_edit=false.
- SUPPLEMENTAL_MONTAGE_RECOMMENDED: single primary clip selected for opening pressure motif; editor may add montage support for data-center/office/government cross-cuts if schema later supports multi-asset scenes.

## Cleanup / canonical reuse migration 20260712T190418Z

- Quarantined scene_007 unreferenced portrait orphan.
- Quarantined scene_032 editorial-rejected humanoid-robot orphan.
- Migrated scene_025 duplicate byte-copy to reuse of scene_022 canonical asset.
- scene_025 effective media path: assets/footage/scene_022_740741da33e14d6a45468490.mp4.
- Accounting normalized: scenes_with_final_assets=33, unique_physical_canonical_assets=32, reuse_occurrences=1, duplicate_byte_copies_remaining=0, active_orphan_media=0.
- scene_001 old low-resolution asset preserved as SUPERSEDED_HISTORY: assets/footage/scene_001_3bdb0f430d70b077a27a4b87.mp4.

## Stage completion metadata 2026-07-12T21:32:30.856Z

- footage_retrieval marked completed after completion-gate QA.
- QA reference: completion-gate QA: SAFE_TO_COMPLETE_FOOTAGE_RETRIEVAL_NOW=YES (latest read-only gate)
- Cleanup audit reference: /root/factforge-footage-cleanup-audits/20260712T190418Z/reports/final_report.json
- Next stage set to visual_style_bible; execution NOT_STARTED.
- USER_APPROVAL_REQUIRED / footage_retrieval cleared from active manifest errors only; historical logs preserved.
