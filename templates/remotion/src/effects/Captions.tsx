import React from "react";
import { AbsoluteFill, interpolate } from "remotion";

export type Caption = { text: string; start_frame: number; end_frame: number };

const DEFAULT_FADE_FRAMES = 4;

/**
 * Captions span the whole timeline independently of scene boundaries (a
 * caption can cross a scene cut), so this does a global linear scan by
 * absolute frame rather than living inside any per-scene Sequence. The list
 * is short-lived, non-overlapping, chronological bursts (scripts/
 * generate_captions.mjs + validate.mjs's captions gate guarantee that), so a
 * linear scan per rendered frame is cheap and simple.
 */
function findActiveCaption(captions: Caption[], frame: number): Caption | null {
  for (const c of captions) {
    if (frame >= c.start_frame && frame < c.end_frame) return c;
  }
  return null;
}

export const CaptionLayer: React.FC<{ captions: Caption[]; frame: number }> = ({ captions, frame }) => {
  const active = findActiveCaption(captions, frame);
  if (!active) return null;

  // Fade window shrinks for very short captions so the four interpolate
  // breakpoints stay strictly increasing (Remotion throws otherwise).
  const duration = active.end_frame - active.start_frame;
  const fade = Math.max(1, Math.min(DEFAULT_FADE_FRAMES, Math.floor(duration / 3)));
  const opacity = interpolate(
    frame,
    [active.start_frame, active.start_frame + fade, active.end_frame - fade, active.end_frame],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: "0 6% 4%" }}>
      <div
        style={{
          opacity,
          backgroundColor: "rgba(10, 12, 20, 0.72)",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: "2.4rem",
          fontWeight: 600,
          lineHeight: 1.25,
          padding: "0.35em 0.8em",
          borderRadius: "0.25em",
          textAlign: "center",
          maxWidth: "88%",
        }}
      >
        {active.text}
      </div>
    </AbsoluteFill>
  );
};
