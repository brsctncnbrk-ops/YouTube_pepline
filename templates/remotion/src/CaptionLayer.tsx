import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";

type Caption = {
  caption_id: string;
  scene_id: string;
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
  const fadeFrames = Math.min(7, Math.max(3, Math.floor(duration / 5)));
  const opacity = Math.min(
    interpolate(localFrame, [0, fadeFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(localFrame, [duration - fadeFrames, duration], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
  );
  const rise = interpolate(localFrame, [0, fadeFrames], [12, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const words = caption.text.split(/\s+/);
  const activeWord = Math.min(words.length - 1, Math.floor((localFrame / duration) * words.length));

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 66, pointerEvents: "none" }}>
      <div
        style={{
          opacity,
          transform: `translateY(${rise}px)`,
          maxWidth: 1420,
          padding: "16px 28px 18px",
          borderRadius: 18,
          background: "linear-gradient(180deg, rgba(5,7,12,0.58), rgba(5,7,12,0.88))",
          border: "1px solid rgba(243,236,221,0.16)",
          boxShadow: "0 14px 48px rgba(0,0,0,0.48)",
          textAlign: "center",
          fontFamily: "Arial, Helvetica, sans-serif",
          fontSize: 48,
          fontWeight: 750,
          lineHeight: 1.18,
          letterSpacing: "-0.018em",
          textShadow: "0 3px 14px rgba(0,0,0,0.9)",
        }}
      >
        {words.map((word, index) => (
          <React.Fragment key={`${caption.caption_id}-${index}`}>
            <span style={{ color: index === activeWord ? "#F0A45D" : "#F8F3E8" }}>{word}</span>
            {index < words.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};
