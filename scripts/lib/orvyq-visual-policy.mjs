const MODES = new Set(["evidence_strict", "cinematic_contextual"]);

const finiteNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export function isApprovedContextualFootage(shot) {
  return Boolean(
    shot?.asset_type === "footage" &&
      shot.contextual_footage === true &&
      shot.provenance_mode === "approved_contextual_footage" &&
      shot.hook_footage !== true,
  );
}

export function isOpeningHookFootage(shot) {
  return Boolean(shot?.asset_type === "footage" && shot.hook_footage === true);
}

export function resolveEditorialMode(plan) {
  const policy = plan?.quality_policy || {};
  const declared = String(policy.editorial_mode || "").trim();
  const approvedContextualCount = (plan?.shots || []).filter(
    isApprovedContextualFootage,
  ).length;
  const inferred =
    policy.cinematic_body_footage === true || approvedContextualCount > 0
      ? "cinematic_contextual"
      : "evidence_strict";
  const mode = MODES.has(declared) ? declared : inferred;
  return {
    mode,
    declared_mode: MODES.has(declared) ? declared : null,
    inferred_mode: inferred,
    declaration_matches_timeline:
      !MODES.has(declared) || declared === inferred,
    approved_contextual_footage_count: approvedContextualCount,
    allows_contextual_body_footage: mode === "cinematic_contextual",
  };
}

export function resolveVisualThresholds(plan) {
  const policy = plan?.quality_policy || {};
  const editorial = resolveEditorialMode(plan);
  const cinematic = editorial.mode === "cinematic_contextual";
  const declaredGenericLimit = finiteNumber(
    policy.generic_stock_fraction_max,
    plan?.preview ? 0.12 : 0.25,
  );
  return {
    editorial,
    motion_hook_fraction_max: finiteNumber(
      policy.motion_hook_fraction_max,
      0.12,
    ),
    contextual_body_footage_fraction_min: finiteNumber(
      policy.contextual_body_footage_fraction_min,
      cinematic ? 0.25 : 0,
    ),
    contextual_body_footage_fraction_max: finiteNumber(
      policy.contextual_body_footage_fraction_max,
      cinematic ? 0.4 : 0,
    ),
    official_capture_fraction_min: finiteNumber(
      policy.official_capture_fraction_min,
      cinematic ? 0.3 : 0.55,
    ),
    evidence_asset_fraction_min: finiteNumber(
      policy.evidence_asset_fraction_min,
      cinematic ? 0.6 : 0.75,
    ),
    generic_stock_fraction_max: plan?.preview
      ? Math.min(declaredGenericLimit, 0.12)
      : declaredGenericLimit,
    full_screen_graphic_fraction_max: finiteNumber(
      policy.full_screen_graphic_fraction_max,
      0.1,
    ),
    maximum_uninterrupted_evidence_seconds: finiteNumber(
      policy.maximum_uninterrupted_evidence_seconds,
      15,
    ),
  };
}

export function measureVisualMix(plan, classifyEvidence) {
  const durationFrames = Math.max(1, Number(plan?.duration_frames || 0));
  const totals = {
    opening_hook_frames: 0,
    contextual_body_frames: 0,
    other_footage_frames: 0,
    official_capture_frames: 0,
    source_derived_frames: 0,
    generic_stock_frames: 0,
    full_screen_graphic_frames: 0,
  };
  for (const shot of plan?.shots || []) {
    const frames = Math.max(0, Number(shot.end_frame) - Number(shot.start_frame));
    if (isOpeningHookFootage(shot)) totals.opening_hook_frames += frames;
    else if (isApprovedContextualFootage(shot)) {
      totals.contextual_body_frames += frames;
    } else if (shot.asset_type === "footage") {
      totals.other_footage_frames += frames;
    }
    if (shot.generic_stock === true) totals.generic_stock_frames += frames;
    if (shot.asset_type === "graphic") totals.full_screen_graphic_frames += frames;
    const evidenceClass = classifyEvidence?.(shot) || null;
    if (evidenceClass === "official") totals.official_capture_frames += frames;
    if (evidenceClass === "derived") totals.source_derived_frames += frames;
  }
  const fraction = (frames) => frames / durationFrames;
  return {
    duration_frames: durationFrames,
    ...totals,
    opening_hook_fraction: fraction(totals.opening_hook_frames),
    contextual_body_footage_fraction: fraction(totals.contextual_body_frames),
    unapproved_footage_fraction: fraction(totals.other_footage_frames),
    official_primary_capture_fraction: fraction(totals.official_capture_frames),
    source_derived_graphic_fraction: fraction(totals.source_derived_frames),
    evidence_archive_fraction: fraction(
      totals.official_capture_frames + totals.source_derived_frames,
    ),
    generic_stock_fraction: fraction(totals.generic_stock_frames),
    full_screen_graphic_fraction: fraction(totals.full_screen_graphic_frames),
    total_footage_fraction: fraction(
      totals.opening_hook_frames +
        totals.contextual_body_frames +
        totals.other_footage_frames,
    ),
  };
}
