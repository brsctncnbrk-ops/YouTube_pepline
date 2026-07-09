import React from "react";
import { AbsoluteFill, interpolate } from "remotion";

export type MotionGraphicsElement = { type: string; params: Record<string, number | string> };

function num(params: Record<string, number | string>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : fallback;
}

function str(params: Record<string, number | string>, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === "string" ? v : fallback;
}

const TEXT_SHADOW = "0 2px 6px rgba(0,0,0,0.6)";
const ACCENT = "#ffc454";

function CounterLayer({
  frame,
  durationInFrames,
  params,
}: {
  frame: number;
  durationInFrames: number;
  params: Record<string, number | string>;
}) {
  const from = num(params, "from", 0);
  const to = num(params, "to", 100);
  const decimals = num(params, "decimals", 0);
  const prefix = str(params, "prefix", "");
  const suffix = str(params, "suffix", "");
  const label = str(params, "label", "");
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 42);
  const countFrames = Math.min(45, Math.max(1, Math.round(durationInFrames * 0.5)));
  const value = interpolate(frame, [0, countFrames], [from, to], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const formatted = value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)", textAlign: "center" }}>
        <div style={{ color: "#f5efe0", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 800, fontSize: "5rem", textShadow: TEXT_SHADOW }}>
          {prefix}
          {formatted}
          {suffix}
        </div>
        {label ? (
          <div style={{ color: "#f5efe0", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 600, fontSize: "1.4rem", marginTop: "0.3em", textShadow: TEXT_SHADOW }}>
            {label}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}

function ProgressBarLayer({
  frame,
  durationInFrames,
  params,
}: {
  frame: number;
  durationInFrames: number;
  params: Record<string, number | string>;
}) {
  const value = Math.max(0, Math.min(100, num(params, "value", 50)));
  const label = str(params, "label", "");
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 60);
  const widthPct = num(params, "width_pct", 60);
  const color = str(params, "color", ACCENT);
  const fillFrames = Math.min(45, Math.max(1, Math.round(durationInFrames * 0.5)));
  const fill = interpolate(frame, [0, fillFrames], [0, value], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, width: `${widthPct}%`, transform: "translate(-50%, -50%)" }}>
        {label ? (
          <div style={{ color: "#f5efe0", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 700, fontSize: "1.3rem", marginBottom: "0.4em", textShadow: TEXT_SHADOW }}>
            {label}
          </div>
        ) : null}
        <div style={{ height: "1.6rem", borderRadius: "0.8rem", backgroundColor: "rgba(20,24,40,0.55)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${fill}%`, backgroundColor: color, borderRadius: "0.8rem" }} />
        </div>
      </div>
    </AbsoluteFill>
  );
}

function TimelineLayer({
  frame,
  durationInFrames,
  params,
}: {
  frame: number;
  durationInFrames: number;
  params: Record<string, number | string>;
}) {
  const date = str(params, "date", "");
  const label = str(params, "label", "");
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 75);
  const introFrames = Math.min(15, Math.max(1, Math.round(durationInFrames * 0.3)));
  const reveal = interpolate(frame, [0, introFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, width: "50%", transform: "translate(-50%, -50%)" }}>
        <div style={{ height: "0.25rem", backgroundColor: "rgba(245,239,224,0.4)", borderRadius: "0.2rem", position: "relative" }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: `${1.1 * reveal}rem`,
              height: `${1.1 * reveal}rem`,
              borderRadius: "50%",
              backgroundColor: ACCENT,
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>
        <div style={{ textAlign: "center", marginTop: "0.6em", opacity: reveal }}>
          <div style={{ color: "#f5efe0", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 800, fontSize: "1.6rem", textShadow: TEXT_SHADOW }}>{date}</div>
          {label ? (
            <div style={{ color: "#f5efe0", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 500, fontSize: "1.1rem", textShadow: TEXT_SHADOW }}>{label}</div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
}

/**
 * Human-readable names for the 7-region vocabulary. There is no attempt at
 * an actual world map here (an earlier version drew 7 abstract rounded-rect
 * "continents", which read as a meaningless grid of boxes at video scale,
 * not as a map) - a location pin + region name reads unambiguously instead.
 */
const REGION_LABELS: Record<string, string> = {
  north_america: "North America",
  south_america: "South America",
  europe: "Europe",
  africa: "Africa",
  middle_east: "Middle East",
  asia: "Asia",
  oceania: "Oceania",
};

function MapHighlightLayer({ frame, params }: { frame: number; params: Record<string, number | string> }) {
  const region = str(params, "region", "");
  const label = str(params, "label", "");
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 46);
  const scale = num(params, "scale", 1);
  const regionName = REGION_LABELS[region] ?? region;
  // Gentle deterministic pulse on the pin icon - no per-instance randomness
  // needed here (unlike particles/noise), since there's only ever one pin.
  const pulse = 0.92 + 0.08 * Math.sin(frame / 12);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: `${cx}%`,
          top: `${cy}%`,
          transform: "translate(-50%, -50%)",
          display: "flex",
          alignItems: "center",
          gap: `${0.9 * scale}rem`,
          backgroundColor: "rgba(15,18,30,0.92)",
          borderRadius: "0.9rem",
          padding: `${0.9 * scale}rem ${1.3 * scale}rem`,
        }}
      >
        <svg width={38 * scale} height={38 * scale} viewBox="0 0 24 24" style={{ transform: `scale(${pulse})`, flexShrink: 0 }}>
          <path
            d="M12 2C7.6 2 4 5.6 4 10c0 5.5 7 11.5 7.3 11.8.2.2.5.3.7.3s.5-.1.7-.3C13 21.5 20 15.5 20 10c0-4.4-3.6-8-8-8z"
            fill={ACCENT}
            stroke="rgba(15,18,30,0.6)"
            strokeWidth={0.6}
          />
          <circle cx={12} cy={10} r={3.4} fill="rgba(15,18,30,0.9)" />
        </svg>
        <div>
          {regionName ? (
            <div
              style={{
                color: "#f5efe0",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontWeight: 800,
                fontSize: `${1.55 * scale}rem`,
                textShadow: TEXT_SHADOW,
                lineHeight: 1.1,
              }}
            >
              {regionName}
            </div>
          ) : null}
          {label ? (
            <div
              style={{
                color: "#f5efe0",
                fontFamily: "Arial, Helvetica, sans-serif",
                fontWeight: 600,
                fontSize: `${1.05 * scale}rem`,
                textShadow: TEXT_SHADOW,
                marginTop: "0.2em",
                opacity: 0.9,
              }}
            >
              {label}
            </div>
          ) : null}
        </div>
      </div>
    </AbsoluteFill>
  );
}

// Base path (below) is an arrow shape pointing up (tip at the top), so "up" is the identity rotation.
const ARROW_ROTATION: Record<string, number> = { up: 0, right: 90, down: 180, left: -90 };

function ArrowCalloutLayer({ frame, params }: { frame: number; params: Record<string, number | string> }) {
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 50);
  const shape = str(params, "shape", "circle");
  const direction = str(params, "direction", "down");
  const label = str(params, "label", "");
  const reveal = interpolate(frame, [0, 15], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const pulse = 0.85 + 0.15 * Math.sin(frame / 8);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)", opacity: reveal, textAlign: "center" }}>
        {shape === "arrow" ? (
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: `rotate(${ARROW_ROTATION[direction] ?? 0}deg) scale(${pulse})` }}>
            <path d="M32 4 L54 34 L40 34 L40 60 L24 60 L24 34 L10 34 Z" fill={ACCENT} stroke="rgba(20,24,40,0.7)" strokeWidth={2} />
          </svg>
        ) : (
          <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: `scale(${pulse})` }}>
            <circle cx={32} cy={32} r={24} fill="none" stroke={ACCENT} strokeWidth={4} />
          </svg>
        )}
        {label ? (
          <div style={{ marginTop: "0.4em", color: "#f5efe0", fontFamily: "Arial, Helvetica, sans-serif", fontWeight: 700, fontSize: "1.2rem", textShadow: TEXT_SHADOW }}>
            {label}
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}

function LikePromptLayer({
  frame,
  durationInFrames,
  params,
}: {
  frame: number;
  durationInFrames: number;
  params: Record<string, number | string>;
}) {
  const cx = num(params, "cx", 80);
  const cy = num(params, "cy", 18);
  const label = str(params, "label", "Like this video");
  const introFrames = Math.min(18, Math.max(1, Math.round(durationInFrames * 0.3)));
  const reveal = interpolate(frame, [0, introFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Deterministic overshoot-then-settle bounce for the entrance, then a gentle idle pulse - no spring dependency needed.
  const bounce = interpolate(frame, [0, introFrames * 0.6, introFrames], [0.4, 1.18, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const idlePulse = 1 + 0.04 * Math.sin(frame / 8);
  const scale = frame < introFrames ? bounce : idlePulse;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: "translate(-50%, -50%)", opacity: reveal, textAlign: "center" }}>
        <svg width="72" height="72" viewBox="0 0 24 24" style={{ transform: `scale(${scale})` }}>
          <path
            d="M2 21h3V10H2v11zm19-10c0-1.1-.9-2-2-2h-5.6l.8-4.1.03-.32c0-.42-.17-.8-.44-1.08L13.17 2 7.6 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h8c.83 0 1.54-.5 1.84-1.22l3.02-7.05c.09-.23.14-.47.14-.73v-1.91l-.01-.01L21 11z"
            fill={ACCENT}
            stroke="rgba(15,18,30,0.65)"
            strokeWidth={0.4}
          />
        </svg>
        <div
          style={{
            marginTop: "0.35em",
            color: "#f5efe0",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 800,
            fontSize: "1.35rem",
            textShadow: TEXT_SHADOW,
            backgroundColor: "rgba(15,18,30,0.72)",
            padding: "0.25em 0.7em",
            borderRadius: "0.5em",
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
}

function SubscribePromptLayer({
  frame,
  durationInFrames,
  params,
}: {
  frame: number;
  durationInFrames: number;
  params: Record<string, number | string>;
}) {
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 16);
  const label = str(params, "label", "Subscribe");
  const introFrames = Math.min(18, Math.max(1, Math.round(durationInFrames * 0.25)));
  const reveal = interpolate(frame, [0, introFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rise = interpolate(frame, [0, introFrames], [16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Bell "ring": a few damped oscillations right after the entrance, then still - deterministic from frame.
  const ringT = Math.max(0, frame - introFrames);
  const ring = Math.sin(ringT / 3) * Math.exp(-ringT / 20) * 14;
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: `${cx}%`,
          top: `${cy}%`,
          transform: `translate(-50%, -50%) translateY(${rise}px)`,
          opacity: reveal,
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          backgroundColor: "#e6231e",
          padding: "0.6em 1.3em",
          borderRadius: "2em",
          boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
        }}
      >
        <svg width="30" height="30" viewBox="0 0 24 24" style={{ transform: `rotate(${ring}deg)`, transformOrigin: "50% 10%" }}>
          <path
            d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"
            fill="#ffffff"
          />
        </svg>
        <div
          style={{
            color: "#ffffff",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 800,
            fontSize: "1.5rem",
            letterSpacing: "0.03em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
      </div>
    </AbsoluteFill>
  );
}

type MotionGraphicsLayerProps = {
  motionGraphics: MotionGraphicsElement[];
  sceneId: string;
  frame: number;
  durationInFrames: number;
};

export const MotionGraphicsLayer: React.FC<MotionGraphicsLayerProps> = ({ motionGraphics, sceneId, frame, durationInFrames }) => {
  if (!motionGraphics || motionGraphics.length === 0) return null;
  return (
    <>
      {motionGraphics.map((item, i) => {
        const key = `${sceneId}-motion-graphic-${i}`;
        const params = item.params || {};
        switch (item.type) {
          case "counter":
            return <CounterLayer key={key} frame={frame} durationInFrames={durationInFrames} params={params} />;
          case "progress_bar":
            return <ProgressBarLayer key={key} frame={frame} durationInFrames={durationInFrames} params={params} />;
          case "timeline":
            return <TimelineLayer key={key} frame={frame} durationInFrames={durationInFrames} params={params} />;
          case "map_highlight":
            return <MapHighlightLayer key={key} frame={frame} params={params} />;
          case "arrow_callout":
            return <ArrowCalloutLayer key={key} frame={frame} params={params} />;
          case "like_prompt":
            return <LikePromptLayer key={key} frame={frame} durationInFrames={durationInFrames} params={params} />;
          case "subscribe_prompt":
            return <SubscribePromptLayer key={key} frame={frame} durationInFrames={durationInFrames} params={params} />;
          default:
            return null;
        }
      })}
    </>
  );
};
