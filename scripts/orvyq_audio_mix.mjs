#!/usr/bin/env node
import { buildOrvyqAudioMix } from "./orvyq_audio_mix_v2.mjs";

export { buildOrvyqAudioMix };

if (import.meta.url === `file://${process.argv[1]}`) {
  buildOrvyqAudioMix()
    .then((result) => console.log(JSON.stringify({ ok: true, ...result })))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
