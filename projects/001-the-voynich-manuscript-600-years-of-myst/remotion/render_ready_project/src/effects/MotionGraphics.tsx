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
 * Schematic, not geographic - 7 continent/region-level blobs on a flattened
 * 1000x500 canvas, roughly positioned relative to each other. Not real
 * coastlines; good enough for a documentary-style "this happened around
 * here" beat, not a cartography tool.
 */
const REGIONS: { name: string; x: number; y: number; width: number; height: number; rx: number }[] = [
  { name: "north_america", x: 60, y: 40, width: 220, height: 160, rx: 30 },
  { name: "south_america", x: 180, y: 230, width: 130, height: 200, rx: 30 },
  { name: "europe", x: 430, y: 40, width: 120, height: 90, rx: 20 },
  { name: "africa", x: 430, y: 160, width: 150, height: 220, rx: 25 },
  { name: "middle_east", x: 560, y: 140, width: 80, height: 70, rx: 15 },
  { name: "asia", x: 620, y: 30, width: 320, height: 220, rx: 35 },
  { name: "oceania", x: 780, y: 300, width: 160, height: 110, rx: 25 },
];

function MapHighlightLayer({ frame, params }: { frame: number; params: Record<string, number | string> }) {
  const region = str(params, "region", "");
  const label = str(params, "label", "");
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 46);
  const scale = num(params, "scale", 1);
  // A single shared pulse, deterministic from frame - no per-instance
  // randomness needed here (unlike particles/noise), since there's only
  // ever one highlighted region per graphic.
  const pulse = 0.6 + 0.4 * Math.sin(frame / 10);
  return (
    <AbsoluteFill>
      <svg
        viewBox="-40 -40 1080 580"
        style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, width: `${58 * scale}%`, transform: "translate(-50%, -50%)" }}
      >
        {/* Backing card so the schematic map reads as a floating overlay against any
            background, including a fully-detailed photo, rather than washing out into it. */}
        <rect x={-40} y={-40} width={1080} height={580} rx={28} fill="rgba(15,18,30,0.92)" />
        {REGIONS.map((r) => {
          const active = r.name === region;
          return (
            <rect
              key={r.name}
              x={r.x}
              y={r.y}
              width={r.width}
              height={r.height}
              rx={r.rx}
              fill={active ? "rgba(255,196,84,1)" : "rgba(220,228,238,0.4)"}
              opacity={active ? pulse : 1}
            />
          );
        })}
      </svg>
      {label ? (
        <div
          style={{
            position: "absolute",
            left: `${cx}%`,
            top: `${cy + 30 * scale}%`,
            transform: "translate(-50%, 0)",
            color: "#f5efe0",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 700,
            fontSize: "1.6rem",
            textShadow: TEXT_SHADOW,
          }}
        >
          {label}
        </div>
      ) : null}
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
          default:
            return null;
        }
      })}
    </>
  );
};
