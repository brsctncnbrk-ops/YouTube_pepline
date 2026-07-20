#!/usr/bin/env node
import path from 'node:path';
import {
  projectDir,
  readJson,
  writeJsonAtomic,
} from './lib/fs-utils.mjs';

const PROJECT_ID = '001-the-ai-race-no-one-can-afford-to-win';

export async function bindSourceBackedBridge(projectId = PROJECT_ID) {
  const dir = projectDir(projectId);
  const planPath = path.join(dir, 'direction', 'production_plan.json');
  const plan = await readJson(planPath);
  const shot = plan.shots.find(
    (entry) => entry.motif === 'section_bridge_controlled_test_limit',
  );
  if (!shot || shot.asset_type !== 'graphic') {
    throw new Error('Controlled-test section bridge graphic was not found');
  }
  shot.graphic = {
    ...shot.graphic,
    source:
      'Anthropic · Agentic Misalignment: How LLMs Could Be Insider Threats · controlled evaluation and stated limitations',
    source_ids: ['SRC_ANTHROPIC_AGENTIC_MISALIGNMENT_2025'],
    source_backed: true,
    provenance_mode: 'source_derived_graphic',
  };
  plan.generated_at = new Date().toISOString();
  await writeJsonAtomic(planPath, plan);
  console.log(
    JSON.stringify({
      ok: true,
      project_id: projectId,
      shot_id: shot.shot_id,
      source_ids: shot.graphic.source_ids,
      source_backed: true,
    }),
  );
  return shot;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  bindSourceBackedBridge(process.argv[2] || PROJECT_ID).catch((error) => {
    console.error(JSON.stringify({ ok: false, error: error.message }));
    process.exitCode = 1;
  });
}
