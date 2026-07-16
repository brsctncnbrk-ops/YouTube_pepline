import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { OrvyqGraphic, OrvyqGraphicSpec } from "./OrvyqGraphic";

export type CameraMotion = { type: string; params: Record<string, number | string> };

type SceneProps = {
  assetType: "footage" | "ai_fallback" | "graphic";
  // ai_fallback only:
  imageSrc?: string;
  cameraMotion?: CameraMotion;
  // footage only:
  videoSrc?: string;
  trimInSec?: number;
  trimOutSec?: number;
  // ORVYQ native graphic only:
  graphic?: OrvyqGraphicSpec;
  durationInFrames: number;
  textOverlay: string | null;
  transitionIn: string;
  transitionOut: string;
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
  assetType,
  imageSrc,
  cameraMotion,
  videoSrc,
  trimInSec,
  trimOutSec,
  graphic,
  durationInFrames,
  textOverlay,
  transitionIn,
  transitionOut,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fadeFrames = Math.min(15, Math.max(1, Math.floor(durationInFrames / 4)));

  let opacity = 1;
  if (transitionIn === "fade" || transitionIn === "dissolve") {
    opacity *= interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  if (transitionOut === "fade" || transitionOut === "dissolve") {
    opacity *= interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  }

  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity }}>
        {assetType === "graphic" && graphic ? (
          <OrvyqGraphic spec={graphic} durationInFrames={durationInFrames} />
        ) : assetType === "footage" && videoSrc ? (
          // Real footage is the primary visual source since the migration -
          // no Ken Burns pan/zoom (that's scoped to ai_fallback stills only),
          // just a subtle hold scale to avoid edge artifacts from cover-fit.
          <OffthreadVideo
            src={videoSrc}
            muted
            startFrom={Math.round((trimInSec ?? 0) * fps)}
            endAt={Math.round((trimOutSec ?? (trimInSec ?? 0) + durationInFrames / fps) * fps)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.02)" }}
          />
        ) : (
          <Img
            src={imageSrc ?? ""}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: computeTransform(cameraMotion ?? { type: "static", params: {} }, progress),
            }}
          />
        )}
      </AbsoluteFill>
      {textOverlay ? (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "6%",
            opacity,
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
