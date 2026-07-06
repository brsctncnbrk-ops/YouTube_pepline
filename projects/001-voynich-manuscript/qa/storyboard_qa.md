# storyboard_qa QA — 001-voynich-manuscript

### Automated Checks

- Overall: PASS
- Schema (storyboard/storyboard.json): PASS
- Assets: PASS
- Scene filenames/numbering: PASS
- Prompt-to-scene coverage: PASS
- Packaging deliverables: PASS

### Judgment-Based Checks

**Verdict: PASS**

- **Duration match**: `total_duration_sec` is 656 vs `target_duration_sec`
  600 (a 56s / 9.3% delta). This is expected and acceptable: 656 was pulled
  directly from `final_voice.mp3` via `mutagen` (real recorded audio, used
  as ground truth per the skill's own instructions), not re-derived from
  the word-count estimate. The gap reflects natural speaking pace in the
  actual recording, not a scripting problem — scene timings were scaled
  proportionally from the QA-approved script's section word counts, so the
  full 656s is accounted for with no padding.
- **Visual-need concreteness**: Every scene's `visual_need` names concrete
  subjects, textures, camera moves, and palette cues (e.g. scene_005:
  "tubes and vessel networks connecting small figures in pools of
  green-tinted liquid... painterly, tasteful documentary-illustration
  style... moody teal-green lighting") — specific enough for
  `factforge-visual-prompt` to act on directly, not vague filler like
  "relevant historical imagery."
- **On-screen text**: Present on every scene, each a short factual tag
  (dates, page counts, section names) that reinforces rather than repeats
  the narration verbatim — e.g. scene_012's "Radiocarbon dated: 1404–1438"
  supports the spoken claim without restating it word-for-word.
  Non-redundant throughout.
- **Transitions**: Mostly cuts for pacing within the informational middle
  (scenes 3-6, 8-9, 11), dissolves at section-to-tone shifts (into the
  herbal section, into the disappearance/gap, into the statistical-evidence
  pivot), and fades reserved for the biggest structural breaks (hook open,
  provenance-era opening, final closing). This matches a documentary pace
  without overusing any one transition type.
- **Tiling**: Scenes are contiguous and gap-free (0→29→88→128→152→182→216→
  301→381→469→514→544→588→656), matching the mechanical check's own
  filename/gap validation. No dead air or overlap.

No fixes required. Cleared to proceed to `visual_style_bible`.
