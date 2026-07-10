import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { Scene, CameraMotion } from "./Scene";
import sceneConfig from "./data/scene_config.json";
import assetMap from "./data/asset_map.json";

type ImageAssetMapEntry = { image: string; audio_offset_sec: number };
type VideoAssetMapEntry = { video: string; audio_offset_sec: number; trim_in_sec: number; trim_out_sec: number };
type AssetMapEntry = ImageAssetMapEntry | VideoAssetMapEntry;

function isVideoEntry(entry: AssetMapEntry): entry is VideoAssetMapEntry {
  return "video" in entry;
}

type SceneConfigEntryBase = {
  scene_id: string;
  start_frame: number;
  end_frame: number;
  asset_type: "footage" | "ai_fallback";
  text_overlay: string | null;
  transition_in: string;
  transition_out: string;
};
type FootageSceneConfigEntry = SceneConfigEntryBase & { asset_type: "footage"; trim_in_sec: number; trim_out_sec: number };
type FallbackSceneConfigEntry = SceneConfigEntryBase & { asset_type: "ai_fallback"; camera_motion: CameraMotion };
type SceneConfigEntry = FootageSceneConfigEntry | FallbackSceneConfigEntry;

/**
 * Lays the narration audio across the whole timeline and places each scene as
 * an absolutely-positioned Sequence at its storyboard frame offset. Scenes
 * are contiguous and non-overlapping (transitions are done as opacity fades
 * inside each Scene), so the summed frames exactly equal duration_frames -
 * no transition-overlap math is needed here. Each scene's asset_type decides
 * whether it renders as trimmed footage or a Ken-Burns-panned fallback still.
 */
export const FactForgeVideo: React.FC = () => {
  const assetLookup = assetMap.asset_map as Record<string, AssetMapEntry>;
  const scenes = sceneConfig.scenes as unknown as SceneConfigEntry[];

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Audio src={staticFile(assetMap.audio_asset)} />
      {scenes.map((scene) => {
        const durationInFrames = Math.max(1, scene.end_frame - scene.start_frame);
        const asset = assetLookup[scene.scene_id];
        if (!asset) return null;

        return (
          <Sequence key={scene.scene_id} from={scene.start_frame} durationInFrames={durationInFrames}>
            {isVideoEntry(asset) ? (
              <Scene
                assetType="footage"
                videoSrc={staticFile(asset.video)}
                trimInSec={asset.trim_in_sec}
                trimOutSec={asset.trim_out_sec}
                durationInFrames={durationInFrames}
                textOverlay={scene.text_overlay}
                transitionIn={scene.transition_in}
                transitionOut={scene.transition_out}
              />
            ) : (
              <Scene
                assetType="ai_fallback"
                imageSrc={staticFile(asset.image)}
                cameraMotion={scene.asset_type === "ai_fallback" ? scene.camera_motion : undefined}
                durationInFrames={durationInFrames}
                textOverlay={scene.text_overlay}
                transitionIn={scene.transition_in}
                transitionOut={scene.transition_out}
              />
            )}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
