import path from 'node:path';
import {
  projectDir,
  readJson,
  writeJsonAtomic,
} from './fs-utils.mjs';

export async function bindCompiledEditPlanToCanonicalTimeline(
  projectId,
  { mode } = {},
) {
  const dir = projectDir(projectId);
  const [editPlan, plan, timeline] = await Promise.all([
    readJson(path.join(dir, 'direction', 'edit_plan.json')),
    readJson(path.join(dir, 'direction', 'production_plan.json')),
    readJson(path.join(dir, 'direction', 'narration_timeline.json')),
  ]);
  const resolvedMode = mode || editPlan.render_mode;
  if (!['proof', 'full'].includes(resolvedMode)) {
    throw new Error(`Unsupported edit-plan mode: ${resolvedMode}`);
  }
  if (resolvedMode === 'full') {
    if (Number(editPlan.duration_frames) !== Number(plan.duration_frames)) {
      throw new Error('Full edit plan does not cover the canonical production duration');
    }
    if (Number(editPlan.duration_frames) !== Number(timeline.full_duration_frames)) {
      throw new Error('Full edit plan does not match the canonical narration timeline');
    }
  }
  if (editPlan.shots?.at(-1)?.end_frame !== editPlan.duration_frames) {
    throw new Error('Compiled edit shots do not cover the rendered duration');
  }
  editPlan.narration_timeline_asset = 'direction/narration_timeline.json';
  editPlan.quality_policy = {
    ...(editPlan.quality_policy || {}),
    audio_visual_timeline_identity_required: true,
    proof_requires_complete_paragraph: true,
    terminal_graphic_only_at_final_frame: true,
    proof_duration_is_minimum_not_cap: true,
  };
  await writeJsonAtomic(
    path.join(dir, 'direction', 'edit_plan.json'),
    editPlan,
  );
  return editPlan;
}
