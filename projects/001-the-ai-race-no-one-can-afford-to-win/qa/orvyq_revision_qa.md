# ORVYQ Revision QA

## Release decision

**Ready for GitHub Actions final render.** The release workflow now blocks
artifact delivery unless the decoded final MP4 passes black-frame, silence,
loudness, and true-peak checks.

## Editorial repair

- Replaced the old 33 long visual holds with **109 contiguous shots**.
- Shot duration range: **4.07–7.47 seconds**; every footage trim is validated
  against its decoded source duration before render.
- Added **23 native ORVYQ graphics** for concepts that stock footage could not
  accurately explain: controlled evaluations, forecasts, concentration,
  open/closed trade-offs, safeguards, and the systemic-risk closing.
- Excluded the rejected cyclist, car, elevator, rural-facility, insurance,
  restaurant, and humanoid-robot clips. The closing therefore reinforces the
  human/systemic thesis rather than depicting a rogue machine.

## Audio

- `assets/audio/final_voice.mp3` remains unchanged.
- New `assets/audio/final_mix.mp3` combines that narration with original
  procedural ORVYQ ambience and is measured at approximately **−14.33 LUFS**
  and **−1.55 dBTP** before final encode.
- Original low-level graphic transition cue: `assets/sfx/orvyq-pulse.wav`.

## Evidence gates

- `npm run orvyq:plan` — passed: 109 shots, 23 graphics, contiguous timeline,
  safe source trims, and no rejected source references.
- `node scripts/validate.mjs render-ready` — passed.
- `npm run ci:smoke` — passed.
- `node scripts/remotion_infra_tests.mjs` — passed: 16/16.
- Remotion TypeScript check — passed.
- `qa/license_audit.json` — 22 unique footage assets with official provider
  license URLs; all ORVYQ graphics/music/SFX are original.

## Final media gate

The GitHub Actions render must pass `scripts/orvyq_media_qa.mjs` on the real
MP4 before its artifact is published. It rejects non-terminal black segments,
silence of at least one second, loudness outside −15.5 to −12.5 LUFS, and
peaks above −1 dBTP.
