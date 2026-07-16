import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { OrvyqGraphic, OrvyqGraphicSpec } from "./OrvyqGraphic";

export type CameraMotion = { type: string; params: Record<string, number | string> };
export type FootageMotion = "hold" | "push" | "pull" | "drift_left" | "drift_right";

type SceneProps = {
  assetType: "footage" | "ai_fallback" | "graphic";
  imageSrc?: string;
  cameraMotion?: CameraMotion;
  videoSrc?: string;
  trimInSec?: number;
  trimOutSec?: number;
  motionVariant?: FootageMotion;
  graphic?: OrvyqGraphicSpec;
  durationInFrames: number;
  textOverlay: string | null;
  transitionIn: string;
  transitionOut: string;
};

function num(params: Record<string, number | string>, key: string, fallback: number): number {
  const value = params[key];
  return typeof value === "number" ? value : fallback;
}

function computeTransform(motion: CameraMotion, progress: number): string {
  const params = motion.params || {};
  switch (motion.type) {
    case "zoom_in":
      return `scale(${interpolate(progress, [0, 1], [num(params, "from", 1), num(params, "to", 1.12)])})`;
    case "zoom_out":
      return `scale(${interpolate(progress, [0, 1], [num(params, "from", 1.12), num(params, "to", 1)])})`;
    case "pan_left":
      return `scale(1.1) translateX(${interpolate(progress, [0, 1], [num(params, "magnitude", 4), -num(params, "magnitude", 4)])}%)`;
    case "pan_right":
      return `scale(1.1) translateX(${interpolate(progress, [0, 1], [-num(params, "magnitude", 4), num(params, "magnitude", 4)])}%)`;
    case "pan_up":
      return `scale(1.1) translateY(${interpolate(progress, [0, 1], [num(params, "magnitude", 4), -num(params, "magnitude", 4)])}%)`;
    case "pan_down":
      return `scale(1.1) translateY(${interpolate(progress, [0, 1], [-num(params, "magnitude", 4), num(params, "magnitude", 4)])}%)`;
    default:
      return "scale(1.03)";
  }
}

function footageTransform(variant: FootageMotion, progress: number): string {
  switch (variant) {
    case "push":
      return `scale(${interpolate(progress, [0, 1], [1.025, 1.085])})`;
    case "pull":
      return `scale(${interpolate(progress, [0, 1], [1.085, 1.025])})`;
    case "drift_left":
      return `scale(1.075) translateX(${interpolate(progress, [0, 1], [1.8, -1.8])}%)`;
    case "drift_right":
      return `scale(1.075) translateX(${interpolate(progress, [0, 1], [-1.8, 1.8])}%)`;
    default:
      return "scale(1.035)";
  }
}

export const Scene: React.FC<SceneProps> = ({
  assetType,
  imageSrc,
  cameraMotion,
  videoSrc,
  trimInSec,
  trimOutSec,
  motionVariant = "hold",
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
    opacity *= interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  }
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <AbsoluteFill style={{ opacity }}>
        {assetType === "graphic" && graphic ? (
          <OrvyqGraphic spec={graphic} durationInFrames={durationInFrames} />
        ) : assetType === "footage" && videoSrc ? (
          <OffthreadVideo
            src={videoSrc}
            muted
            startFrom={Math.round((trimInSec ?? 0) * fps)}
            endAt={Math.round((trimOutSec ?? (trimInSec ?? 0) + durationInFrames / fps) * fps)}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: footageTransform(motionVariant, progress) }}
          />
        ) : (
          <Img
            src={imageSrc ?? ""}
            style={{ width: "100%", height: "100%", objectFit: "cover", transform: computeTransform(cameraMotion ?? { type: "static", params: {} }, progress) }}
          />
        )}
      </AbsoluteFill>
      {textOverlay ? (
        <div
          style={{
            position: "absolute",
            left: 74,
            top: 78,
            opacity,
            backgroundColor: "rgba(5,7,12,0.78)",
            color: "#F0A45D",
            borderLeft: "5px solid #D84B4B",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontSize: 25,
            fontWeight: 750,
            letterSpacing: "0.11em",
            lineHeight: 1.2,
            padding: "16px 22px",
            maxWidth: 920,
            boxShadow: "0 12px 30px rgba(0,0,0,0.36)",
          }}
        >
          {textOverlay}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
