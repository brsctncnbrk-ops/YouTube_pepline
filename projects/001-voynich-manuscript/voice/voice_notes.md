# Voice Notes — 001-voynich-manuscript

For whoever is pasting `voice_script.txt` into ElevenLabs and generating
`final_voice.mp3`.

## Pronunciation guide

ElevenLabs usually gets these right, but double-check the generated audio
against these before accepting the take:

- **Voynich** — "VOY-nich" (rhymes with "toy" + "nich," not "voy-NEEK").
  Said many times throughout; if the model mispronounces it on the first
  occurrence, it will likely repeat the error every time — worth
  regenerating rather than living with it.
- **Voynichese** — "voy-nich-EEZ," the coined term for the script/language.
- **Athanasius Kircher** — "ath-uh-NAY-shus KEER-ker."
- **Jan Marek Marci** — "yahn MAH-rek MAR-tsee." Minor historical figure,
  only said once — if the model stumbles, it's low-stakes.
- **Rudolf the Second** — spelled out as words in the script (not "Rudolf
  II") specifically so the model reads "the Second" instead of "two" or
  "eye-eye."
- **ducats** — "DUCK-its."
- **Naibbe** (the proposed cipher name) — "NIGH-bee." Uncommon coined term,
  worth a listen-check.
- **vellum** — "VEL-um."
- Numbers were spelled out as words throughout (e.g. "sixteen sixty-six,"
  "nineteen twelve," "fourteen-oh-four") rather than left as digits, since
  TTS engines are inconsistent about reading years as dates vs. plain
  numbers.

## Pause markers

- Blank lines between paragraphs mark natural breath/beat pauses — paste
  the text with paragraph breaks intact rather than flattening into one
  block, so ElevenLabs' natural pause handling kicks in between them.
- Ellipses (`...`) mark intentional dramatic beats, not just trailing
  thoughts — e.g. "if it means something... or nothing at all," and "he
  didn't fake the page it's written on" section. If the generated read
  rushes through these, consider using ElevenLabs' break/pause controls (or
  regenerating with a lower stability setting) to let them land.
- Short one-line paragraphs ("Kircher failed.") are deliberate hard stops
  for pacing/emphasis — don't merge them with neighboring paragraphs when
  reviewing.

## Structural notes

- This is a straight adaptation of `scripts/script.md` — same content, same
  order, same six sections plus hook and closing. Nothing was cut or added;
  sentences were only split shorter and years/numbers spelled out for
  reliable TTS reading.
- Section headings from `script.md` were intentionally removed — none of
  that structure should be spoken aloud, so `voice_script.txt` contains only
  narration text, no markdown.
- Total length matches the QA-approved script (~1,551 words, ~620s at
  conversational pace) — no further trimming needed before generating audio.

## Before recording

1. Paste `voice_script.txt` (this file's sibling) directly into ElevenLabs —
   no edits needed.
2. Generate, listen for the pronunciation items above, and regenerate if
   "Voynich" itself is mangled (it's said too often to let slide).
3. Export and save the result as `assets/audio/final_voice.mp3`, then tell
   the orchestrator you're `ready` so the audio gate can run.
