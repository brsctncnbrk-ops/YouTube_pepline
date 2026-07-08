import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, useCurrentFrame } from "remotion";
import { combineTransitionStyles, computeEntryStyle, computeExitStyle, lightFlashOpacity } from "./effects/transitions";
import { OverlayEffectsLayer, OverlayEffect } from "./effects/Overlays";
import { MotionGraphicsLayer, MotionGraphicsElement } from "./effects/MotionGraphics";

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
  motionGraphics: MotionGraphicsElement[];
};

function num(params: Record<string, number | string>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : fallback;
}

/**
 * Translates the storyboard's camera_motion vocabulary into a CSS transform.
 * Unknown types fall back to a gentle static hold, so a new motion type in
 * the data never crashes the render - it just renders without motion.
 *
 * The 13 pseudo-3D types below (dolly/crane/orbit/handheld/shake/rack_focus/
 * tilt/rotation/perspective_shift/dynamic_zoom) are CSS tricks on this SAME
 * single flat image - there is no depth/parallax separation, since every
 * scene is still exactly one Leonardo-generated PNG. handheld_simulation and
 * camera_shake are pure functions of `frame` (layered sine waves at
 * different frequencies/amplitudes), not Remotion's seeded random() - no
 * per-instance randomness is needed here, unlike Overlays.tsx's particles.
 */
function computeTransform(motion: CameraMotion, progress: number, frame: number): string {
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
    case "dolly_left": {
      const magnitude = num(p, "magnitude", 6);
      const zoom = num(p, "zoom", 0.08);
      const tx = interpolate(progress, [0, 1], [2, -magnitude]);
      const scale = interpolate(progress, [0, 1], [1.02, 1.02 + zoom]);
      return `perspective(1200px) translateX(${tx}%) scale(${scale})`;
    }
    case "dolly_right": {
      const magnitude = num(p, "magnitude", 6);
      const zoom = num(p, "zoom", 0.08);
      const tx = interpolate(progress, [0, 1], [-magnitude, 2]);
      const scale = interpolate(progress, [0, 1], [1.02, 1.02 + zoom]);
      return `perspective(1200px) translateX(${tx}%) scale(${scale})`;
    }
    case "crane_up": {
      const magnitude = num(p, "magnitude", 5);
      const tilt = num(p, "tilt", 3);
      const ty = interpolate(progress, [0, 1], [magnitude, -magnitude]);
      const rx = interpolate(progress, [0, 1], [tilt, -tilt]);
      return `perspective(1200px) translateY(${ty}%) rotateX(${rx}deg) scale(1.06)`;
    }
    case "crane_down": {
      const magnitude = num(p, "magnitude", 5);
      const tilt = num(p, "tilt", 3);
      const ty = interpolate(progress, [0, 1], [-magnitude, magnitude]);
      const rx = interpolate(progress, [0, 1], [-tilt, tilt]);
      return `perspective(1200px) translateY(${ty}%) rotateX(${rx}deg) scale(1.06)`;
    }
    case "orbit": {
      const angle = num(p, "angle", 8);
      const pulse = num(p, "pulse", 0.03);
      const ry = Math.sin(progress * Math.PI) * angle;
      const scale = 1.05 + pulse * Math.sin(progress * Math.PI);
      return `perspective(1000px) rotateY(${ry}deg) scale(${scale})`;
    }
    case "handheld_simulation": {
      const amplitude = num(p, "amplitude", 1.5);
      const frequency = num(p, "frequency", 0.05);
      const tx = Math.sin(frame * frequency) * amplitude + Math.sin(frame * frequency * 2.6) * amplitude * 0.3;
      const ty = Math.cos(frame * frequency * 0.8) * amplitude * 0.6;
      const rot = Math.sin(frame * frequency * 0.7) * amplitude * 0.25;
      return `translateX(${tx}%) translateY(${ty}%) rotate(${rot}deg) scale(1.04)`;
    }
    case "camera_shake": {
      const amplitude = num(p, "amplitude", 0.8);
      const frequency = num(p, "frequency", 0.4);
      const tx = Math.sin(frame * frequency) * amplitude;
      const ty = Math.sin(frame * frequency * 1.4 + 1) * amplitude * 0.7;
      const rot = Math.sin(frame * frequency * 1.6) * amplitude * 0.3;
      return `translateX(${tx}%) translateY(${ty}%) rotate(${rot}deg) scale(1.05)`;
    }
    case "rack_focus":
      // blur handled separately by computeFilter - transform just holds a gentle scale
      return "scale(1.04)";
    case "tilt_up": {
      const angle = num(p, "angle", 6);
      const magnitude = num(p, "magnitude", 3);
      const rx = interpolate(progress, [0, 1], [-angle, angle]);
      const ty = interpolate(progress, [0, 1], [magnitude, -magnitude]);
      return `perspective(1000px) rotateX(${rx}deg) translateY(${ty}%) scale(1.08)`;
    }
    case "tilt_down": {
      const angle = num(p, "angle", 6);
      const magnitude = num(p, "magnitude", 3);
      const rx = interpolate(progress, [0, 1], [angle, -angle]);
      const ty = interpolate(progress, [0, 1], [-magnitude, magnitude]);
      return `perspective(1000px) rotateX(${rx}deg) translateY(${ty}%) scale(1.08)`;
    }
    case "rotation": {
      const angle = num(p, "angle", 3);
      const rot = interpolate(progress, [0, 1], [-angle, angle]);
      return `rotate(${rot}deg) scale(1.1)`;
    }
    case "perspective_shift": {
      const angle = num(p, "angle", 10);
      const magnitude = num(p, "magnitude", 2);
      const ry = interpolate(progress, [0, 1], [-angle, angle]);
      const tx = interpolate(progress, [0, 1], [-magnitude, magnitude]);
      return `perspective(900px) rotateY(${ry}deg) translateX(${tx}%) scale(1.07)`;
    }
    case "dynamic_zoom": {
      const from = num(p, "from", 1.0);
      const to = num(p, "to", 1.15);
      const scale = interpolate(progress, [0, 1], [from, to], { easing: Easing.inOut(Easing.cubic) });
      return `scale(${scale})`;
    }
    case "static":
    default:
      return "scale(1.03)";
  }
}

/**
 * Mid-scene blur pulse for "rack_focus" only - distinct from the transition
 * layer's edge-only blur (which fires just inside the fade window at scene
 * boundaries). Every other motion type renders with no filter.
 */
function computeFilter(motion: CameraMotion, progress: number): string {
  if (motion.type !== "rack_focus") return "none";
  const p = motion.params || {};
  const maxBlur = num(p, "max_blur", 6);
  const peak = Math.min(0.85, Math.max(0.15, num(p, "peak", 0.5)));
  const blur = interpolate(progress, [0, peak - 0.1, peak, peak + 0.1, 1], [0, 0, maxBlur, 0, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return `blur(${blur}px)`;
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
  motionGraphics,
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
  const transform = computeTransform(cameraMotion, progress, frame);
  const imgFilter = computeFilter(cameraMotion, progress);

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
        <Img src={imageSrc} style={{ width: "100%", height: "100%", objectFit: "cover", transform, filter: imgFilter }} />
      </AbsoluteFill>
      <OverlayEffectsLayer effects={overlayEffects} sceneId={sceneId} frame={frame} durationInFrames={durationInFrames} />
      <MotionGraphicsLayer motionGraphics={motionGraphics} sceneId={sceneId} frame={frame} durationInFrames={durationInFrames} />
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
