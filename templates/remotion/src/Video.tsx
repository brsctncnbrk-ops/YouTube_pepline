import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { CaptionLayer } from "./CaptionLayer";
import { OrvyqGraphicSpec } from "./OrvyqGraphic";
import { FootageMotion, Scene } from "./Scene";
import assetMap from "./data/asset_map.json";
import captionsData from "./data/captions.json";
import editPlan from "./data/edit_plan.json";

type SoundCue = "pulse" | "impact" | "whoosh" | "riser" | "glitch" | "tick" | "low_boom" | null;

type FootageShot = {
  shot_id: string;
  scene_id: string;
  start_frame: number;
  end_frame: number;
  asset_type: "footage";
  video_asset: string;
  trim_in_sec: number;
  trim_out_sec: number;
  motion_variant?: FootageMotion;
  text_overlay?: string | null;
  transition_in?: string;
  transition_out?: string;
  sound_cue?: SoundCue;
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
  sound_cue?: SoundCue;
};

type EditPlan = {
  audio_mix_asset?: string;
  shots: Array<FootageShot | GraphicShot>;
};

type CaptionsFile = {
  captions: Array<{ caption_id: string; scene_id: string; start_frame: number; end_frame: number; text: string }>;
};

const cueConfig: Record<Exclude<SoundCue, null>, { file: string; volume: number }> = {
  pulse: { file: "assets/sfx/orvyq-pulse.wav", volume: 0.2 },
  impact: { file: "assets/sfx/orvyq-impact.wav", volume: 0.27 },
  whoosh: { file: "assets/sfx/orvyq-whoosh.wav", volume: 0.24 },
  riser: { file: "assets/sfx/orvyq-riser.wav", volume: 0.21 },
  glitch: { file: "assets/sfx/orvyq-glitch.wav", volume: 0.18 },
  tick: { file: "assets/sfx/orvyq-tick.wav", volume: 0.22 },
  low_boom: { file: "assets/sfx/orvyq-low-boom.wav", volume: 0.3 },
};

const Cue: React.FC<{ cue: SoundCue }> = ({ cue }) => {
  if (!cue) return null;
  const config = cueConfig[cue];
  return <Audio src={staticFile(config.file)} volume={config.volume} />;
};

export const FactForgeVideo: React.FC = () => {
  const plan = editPlan as unknown as EditPlan;
  const captions = captionsData as unknown as CaptionsFile;
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
                motionVariant={shot.motion_variant || "hold"}
                durationInFrames={durationInFrames}
                textOverlay={shot.text_overlay || null}
                transitionIn={transitionIn}
                transitionOut={transitionOut}
              />
            )}
            <Cue cue={shot.sound_cue || null} />
          </Sequence>
        );
      })}
      <CaptionLayer captions={captions.captions} />
    </AbsoluteFill>
  );
};
