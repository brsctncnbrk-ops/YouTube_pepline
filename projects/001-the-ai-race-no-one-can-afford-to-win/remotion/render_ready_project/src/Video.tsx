import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { OrvyqGraphicSpec } from "./OrvyqGraphic";
import { Scene } from "./Scene";
import assetMap from "./data/asset_map.json";
import editPlan from "./data/edit_plan.json";

type FootageShot = {
  shot_id: string;
  scene_id: string;
  start_frame: number;
  end_frame: number;
  asset_type: "footage";
  video_asset: string;
  trim_in_sec: number;
  trim_out_sec: number;
  text_overlay?: string | null;
  transition_in?: string;
  transition_out?: string;
  sound_cue?: string | null;
};

type GraphicShot = {
  shot_id: string;
  scene_id: string;
  start_frame: number;
  end_frame: number;
  asset_type: "graphic";
  graphic: OrvyqGraphicSpec;
  text_overlay?: string | null;
  transition_in?: string;
  transition_out?: string;
  sound_cue?: string | null;
};

type EditPlan = {
  audio_mix_asset?: string;
  shots: Array<FootageShot | GraphicShot>;
};

/**
 * The editorial plan is intentionally shot-based rather than scene-based.
 * Narration scenes can last 20–35 seconds; every visual plan is instead a
 * 4–7.5 second unit with a validated source window or an ORVYQ native
 * graphic. That removes black clip tails and gives the edit a documentary
 * rhythm without altering narration timing.
 */
export const FactForgeVideo: React.FC = () => {
  const plan = editPlan as unknown as EditPlan;
  const audioSrc = plan.audio_mix_asset || assetMap.audio_asset;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05070C" }}>
      <Audio src={staticFile(audioSrc)} />
      {plan.shots.map((shot) => {
        const durationInFrames = Math.max(1, shot.end_frame - shot.start_frame);
        const transitionIn = shot.transition_in || "cut";
        const transitionOut = shot.transition_out || "cut";

        return (
          <Sequence key={shot.shot_id} from={shot.start_frame} durationInFrames={durationInFrames}>
            {shot.asset_type === "graphic" ? (
              <Scene
                assetType="graphic"
                graphic={shot.graphic}
                durationInFrames={durationInFrames}
                textOverlay={shot.text_overlay || null}
                transitionIn={transitionIn}
                transitionOut={transitionOut}
              />
            ) : (
              <Scene
                assetType="footage"
                videoSrc={staticFile(shot.video_asset)}
                trimInSec={shot.trim_in_sec}
                trimOutSec={shot.trim_out_sec}
                durationInFrames={durationInFrames}
                textOverlay={shot.text_overlay || null}
                transitionIn={transitionIn}
                transitionOut={transitionOut}
              />
            )}
            {shot.sound_cue === "pulse" ? <Audio src={staticFile("assets/sfx/orvyq-pulse.wav")} volume={0.035} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
