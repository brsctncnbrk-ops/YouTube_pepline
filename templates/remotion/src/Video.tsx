import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Scene } from "./Scene";
import sceneConfig from "./data/scene_config.json";
import assetMap from "./data/asset_map.json";

type AssetMapEntry = { image: string; audio_offset_sec: number };

/**
 * Lays the narration audio across the whole timeline and places each scene as
 * an absolutely-positioned Sequence at its storyboard frame offset. Scenes
 * are contiguous and non-overlapping (transitions are done as opacity fades
 * inside each Scene), so the summed frames exactly equal duration_frames -
 * no transition-overlap math is needed here.
 */
export const FactForgeVideo: React.FC = () => {
  const assetLookup = assetMap.asset_map as Record<string, AssetMapEntry>;

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Audio src={staticFile(assetMap.audio_asset)} />
      {sceneConfig.scenes.map((scene) => {
        const durationInFrames = Math.max(1, scene.end_frame - scene.start_frame);
        const asset = assetLookup[scene.scene_id];
        if (!asset) return null;
        return (
          <Sequence key={scene.scene_id} from={scene.start_frame} durationInFrames={durationInFrames}>
            <Scene
              imageSrc={staticFile(asset.image)}
              durationInFrames={durationInFrames}
              cameraMotion={scene.camera_motion}
              textOverlay={scene.text_overlay}
              transitionIn={scene.transition_in}
              transitionOut={scene.transition_out}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
