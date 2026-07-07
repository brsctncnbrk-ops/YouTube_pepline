import { interpolate } from "remotion";

/**
 * Per-scene entry/exit transition styles. Transitions are intra-scene
 * effects applied on top of (never replacing) the scene's own camera-motion
 * transform - scenes stay contiguous, non-overlapping Sequences (see
 * Video.tsx), so no cross-scene compositing or Sequence overlap is needed.
 */

export type TransitionLayerStyle = {
  opacity: number;
  transform: string;
  filter: string;
  clipPath: string;
};

const IDENTITY: TransitionLayerStyle = { opacity: 1, transform: "none", filter: "none", clipPath: "none" };

/** t: 0 = transition not started, 1 = transition fully complete (scene fully revealed/hidden). */
function applyTransition(type: string, t: number, direction: "in" | "out"): TransitionLayerStyle {
  const reveal = direction === "in" ? t : 1 - t; // 1 = fully shown, 0 = fully hidden/exited
  switch (type) {
    case "fade":
    case "dissolve":
      return { ...IDENTITY, opacity: reveal };
    case "wipe": {
      const hiddenPct = (1 - reveal) * 100;
      return { ...IDENTITY, clipPath: `inset(0 ${hiddenPct}% 0 0)` };
    }
    case "slide": {
      const offsetPct = (1 - reveal) * 100 * (direction === "in" ? 1 : -1);
      return { ...IDENTITY, transform: `translateX(${offsetPct}%)` };
    }
    case "blur": {
      const px = (1 - reveal) * 24;
      return { ...IDENTITY, filter: `blur(${px}px)` };
    }
    case "zoom_through": {
      const scale = 1 + (1 - reveal) * 0.6;
      return { ...IDENTITY, transform: `scale(${scale})`, opacity: reveal };
    }
    case "light_flash":
      // Rendered separately as a white flash overlay (lightFlashOpacity below),
      // not as a style on the image itself.
      return IDENTITY;
    case "cut":
    default:
      return IDENTITY;
  }
}

export function computeEntryStyle(type: string, frame: number, fadeFrames: number): TransitionLayerStyle {
  const t = interpolate(frame, [0, fadeFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return applyTransition(type, t, "in");
}

export function computeExitStyle(type: string, frame: number, durationInFrames: number, fadeFrames: number): TransitionLayerStyle {
  const t = interpolate(frame, [durationInFrames - fadeFrames, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return applyTransition(type, t, "out");
}

/** Composes independent entry/exit styles - opacity multiplies, transforms chain, filters stack, clip-path prefers whichever is active. */
export function combineTransitionStyles(a: TransitionLayerStyle, b: TransitionLayerStyle): TransitionLayerStyle {
  const transformParts = [a.transform, b.transform].filter((v) => v && v !== "none");
  const filterParts = [a.filter, b.filter].filter((v) => v && v !== "none");
  const clipParts = [a.clipPath, b.clipPath].filter((v) => v && v !== "none");
  return {
    opacity: a.opacity * b.opacity,
    transform: transformParts.length ? transformParts.join(" ") : "none",
    filter: filterParts.length ? filterParts.join(" ") : "none",
    clipPath: clipParts.length ? clipParts[0] : "none",
  };
}

/** Opacity of the whole-frame white flash used by the "light_flash" transition; 0 outside its active window. */
export function lightFlashOpacity(
  transitionIn: string,
  transitionOut: string,
  frame: number,
  durationInFrames: number,
  fadeFrames: number
): number {
  let opacity = 0;
  if (transitionIn === "light_flash") {
    opacity = Math.max(
      opacity,
      interpolate(frame, [0, fadeFrames / 2, fadeFrames], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    );
  }
  if (transitionOut === "light_flash") {
    const start = durationInFrames - fadeFrames;
    opacity = Math.max(
      opacity,
      interpolate(frame, [start, start + fadeFrames / 2, durationInFrames], [0, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    );
  }
  return opacity;
}
