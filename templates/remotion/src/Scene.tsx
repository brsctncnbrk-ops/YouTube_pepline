import React from "react";
import { AbsoluteFill, Img, interpolate, useCurrentFrame } from "remotion";
import { combineTransitionStyles, computeEntryStyle, computeExitStyle, lightFlashOpacity } from "./effects/transitions";
import { OverlayEffectsLayer, OverlayEffect } from "./effects/Overlays";

export type CameraMotion = { type: string; params: Record<string, number | string> };

type SceneProps = {
  sceneId: string;
  imageSrc: string;
  durationInFrames: number;
  cameraMotion: CameraMotion;
  textOverlay: string | null;
  transitionIn: string;
  transitionOut: string;
  overlayEffects: OverlayEffect[];
};

function num(params: Record<string, number | string>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : fallback;
}

/**
 * Translates the storyboard's camera_motion vocabulary into a CSS transform.
 * Unknown types fall back to a gentle static hold, so a new motion type in
 * the data never crashes the render - it just renders without motion.
 */
function computeTransform(motion: CameraMotion, progress: number): string {
  const p = motion.params || {};
  switch (motion.type) {
    case "zoom_in": {
      const from = num(p, "from", 1.0);
      const to = num(p, "to", 1.12);
      return `scale(${interpolate(progress, [0, 1], [from, to])})`;
    }
    case "zoom_out": {
      const from = num(p, "from", 1.12);
      const to = num(p, "to", 1.0);
      return `scale(${interpolate(progress, [0, 1], [from, to])})`;
    }
    case "pan_left":
      return `scale(1.1) translateX(${interpolate(progress, [0, 1], [num(p, "magnitude", 4), -num(p, "magnitude", 4)])}%)`;
    case "pan_right":
      return `scale(1.1) translateX(${interpolate(progress, [0, 1], [-num(p, "magnitude", 4), num(p, "magnitude", 4)])}%)`;
    case "pan_up":
      return `scale(1.1) translateY(${interpolate(progress, [0, 1], [num(p, "magnitude", 4), -num(p, "magnitude", 4)])}%)`;
    case "pan_down":
      return `scale(1.1) translateY(${interpolate(progress, [0, 1], [-num(p, "magnitude", 4), num(p, "magnitude", 4)])}%)`;
    case "static":
    default:
      return "scale(1.03)";
  }
}

export const Scene: React.FC<SceneProps> = ({
  sceneId,
  imageSrc,
  durationInFrames,
  cameraMotion,
  textOverlay,
  transitionIn,
  transitionOut,
  overlayEffects,
}) => {
  const frame = useCurrentFrame();
  const fadeFrames = Math.min(15, Math.max(1, Math.floor(durationInFrames / 4)));

  // Transition styling lives on its own wrapper layer, independent of the
  // camera-motion transform applied to <Img> below, so e.g. "slide" and
  // "zoom_in" never clobber each other.
  const entryStyle = computeEntryStyle(transitionIn, frame, fadeFrames);
  const exitStyle = computeExitStyle(transitionOut, frame, durationInFrames, fadeFrames);
  const transitionStyle = combineTransitionStyles(entryStyle, exitStyle);
  const flashOpacity = lightFlashOpacity(transitionIn, transitionOut, frame, durationInFrames, fadeFrames);

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const transform = computeTransform(cameraMotion, progress);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill
        style={{
          opacity: transitionStyle.opacity,
          transform: transitionStyle.transform,
          filter: transitionStyle.filter,
          clipPath: transitionStyle.clipPath,
        }}
      >
        <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform }} />
      </AbsoluteFill>
      <OverlayEffectsLayer effects={overlayEffects} sceneId={sceneId} frame={frame} durationInFrames={durationInFrames} />
      {flashOpacity > 0 ? <AbsoluteFill style={{ backgroundColor: "white", opacity: flashOpacity }} /> : null}
      {textOverlay ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "6%",
            opacity: transitionStyle.opacity,
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(20, 24, 40, 0.82)",
              color: "#f5efe0",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "3.2rem",
              fontWeight: 700,
              lineHeight: 1.2,
              padding: "0.6em 0.9em",
              borderRadius: "0.2em",
              textAlign: "center",
              maxWidth: "80%",
            }}
          >
            {textOverlay}
          </div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
