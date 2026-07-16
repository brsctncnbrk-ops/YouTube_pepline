import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type Caption = {
  caption_id: string;
  scene_id?: string | null;
  start_frame: number;
  end_frame: number;
  text: string;
};

export const CaptionLayer: React.FC<{ captions: Caption[] }> = ({ captions }) => {
  const frame = useCurrentFrame();
  const caption = captions.find((item) => frame >= item.start_frame && frame < item.end_frame);
  if (!caption) return null;

  const localFrame = frame - caption.start_frame;
  const duration = Math.max(1, caption.end_frame - caption.start_frame);
  const fadeFrames = Math.min(6, Math.max(3, Math.floor(duration / 6)));
  const opacity = Math.min(
    interpolate(localFrame, [0, fadeFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(localFrame, [duration - fadeFrames, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 58, pointerEvents: "none" }}>
      <div
        style={{
          opacity,
          maxWidth: "86%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "clip",
          textAlign: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 36,
          fontWeight: 600,
          lineHeight: 1.08,
          letterSpacing: "-0.01em",
          color: "#F8F5EE",
          textShadow: "0 2px 4px rgba(0,0,0,.95), 0 0 18px rgba(0,0,0,.85)",
        }}
      >
        {caption.text}
      </div>
    </AbsoluteFill>
  );
};
