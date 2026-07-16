import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export type OrvyqGraphicSpec = {
  type: string;
  kicker?: string;
  title: string;
  subtitle?: string;
  labels?: string[];
};

const ink = "#F3ECDD";
const mutedInk = "#B9B1A1";
const signal = "#D84B4B";
const signalSoft = "#F0A45D";
const panel = "#111826";

const Grid: React.FC<{ opacity?: number }> = ({ opacity = 0.26 }) => (
  <AbsoluteFill
    style={{
      opacity,
      backgroundImage:
        "linear-gradient(rgba(244, 236, 221, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(244, 236, 221, 0.08) 1px, transparent 1px)",
      backgroundSize: "72px 72px",
      maskImage: "radial-gradient(ellipse at center, black 0%, transparent 78%)",
    }}
  />
);

const Mark: React.FC = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, fontFamily: "Arial, Helvetica, sans-serif", letterSpacing: "0.3em", fontSize: 22, color: ink }}>
    <span style={{ display: "inline-block", width: 12, height: 12, background: signal, borderRadius: 99 }} />
    ORVYQ
  </div>
);

const Chart: React.FC<{ kind: string; progress: number }> = ({ kind, progress }) => {
  const draw = interpolate(progress, [0.06, 0.78], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dash = 520 * (1 - draw);
  const isForecast = kind === "forecast" || kind === "forecast_diverge";
  const isNetwork = kind === "concentration" || kind === "incident_map" || kind === "systemic_risk";

  if (isNetwork) {
    const nodes = [
      [130, 310, 18], [280, 160, 14], [430, 350, 14], [590, 190, 16], [760, 330, 14], [930, 150, 14], [1080, 300, 18],
    ];
    const links = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]];
    return (
      <svg viewBox="0 0 1200 520" style={{ width: "100%", maxWidth: 1240, overflow: "visible" }}>
        {links.map(([from, to], index) => {
          const a = nodes[from];
          const b = nodes[to];
          return <line key={index} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={signalSoft} strokeWidth={2} opacity={0.26 + draw * 0.44} />;
        })}
        {nodes.map(([x, y, r], index) => (
          <circle key={index} cx={x} cy={y} r={r * (0.7 + draw * 0.3)} fill={index === 3 ? signal : panel} stroke={ink} strokeWidth={2} />
        ))}
      </svg>
    );
  }

  if (kind === "open_closed") {
    return (
      <div style={{ display: "flex", width: "100%", height: 380, gap: 36, alignItems: "stretch" }}>
        {["OPEN", "CLOSED"].map((label, index) => (
          <div key={label} style={{ flex: 1, border: `1px solid ${index === 0 ? signalSoft : ink}`, background: "rgba(8, 13, 24, 0.65)", padding: 38, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <span style={{ color: index === 0 ? signalSoft : ink, letterSpacing: "0.2em", fontSize: 22 }}>{label}</span>
            <div style={{ display: "flex", gap: 9, flexWrap: "wrap", opacity: 0.6 + draw * 0.4 }}>
              {Array.from({ length: 12 }).map((_, i) => <span key={i} style={{ width: 40, height: 22, border: `1px solid ${mutedInk}`, opacity: i % 3 === 0 ? 1 : 0.45 }} />)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "safeguards" || kind === "compliance_stack") {
    const rows = kind === "safeguards" ? ["CONSTRAIN", "AUDIT", "REPORT", "VERIFY"] : ["EVALUATE", "REPORT", "COMPLY", "REVIEW"];
    return (
      <div style={{ width: "100%", maxWidth: 1040, display: "grid", gap: 20 }}>
        {rows.map((row, index) => (
          <div key={row} style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 22, alignItems: "center" }}>
            <span style={{ color: mutedInk, letterSpacing: "0.14em", fontSize: 22 }}>{row}</span>
            <div style={{ height: 20, background: "rgba(243,236,221,0.12)", overflow: "hidden" }}>
              <div style={{ width: `${interpolate(draw, [0, 1], [0, 45 + index * 13])}%`, height: "100%", background: index % 2 ? signalSoft : signal }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <svg viewBox="0 0 1200 520" style={{ width: "100%", maxWidth: 1240, overflow: "visible" }}>
      <line x1="80" y1="430" x2="1140" y2="430" stroke="rgba(243,236,221,0.42)" />
      <line x1="80" y1="70" x2="80" y2="430" stroke="rgba(243,236,221,0.42)" />
      {[0, 1, 2, 3].map((i) => <line key={i} x1="80" y1={120 + i * 78} x2="1140" y2={120 + i * 78} stroke="rgba(243,236,221,0.08)" />)}
      <path d="M 100 385 C 250 350, 300 330, 420 285 S 650 210, 810 165 S 1000 115, 1120 84" fill="none" stroke={signal} strokeWidth="8" strokeDasharray="520" strokeDashoffset={dash} />
      {isForecast ? <path d="M 100 390 C 260 360, 400 310, 560 250 S 860 170, 1120 120" fill="none" stroke={signalSoft} strokeWidth="6" strokeDasharray="14 18" opacity={0.92} /> : null}
      {kind === "benchmark" ? <path d="M 100 340 C 360 345, 520 320, 650 208 S 990 152, 1120 150" fill="none" stroke={ink} strokeWidth="6" strokeDasharray="520" strokeDashoffset={dash * 0.8} /> : null}
      <circle cx="1120" cy={isForecast ? "120" : "84"} r={10 + draw * 6} fill={signalSoft} />
    </svg>
  );
};

export const OrvyqGraphic: React.FC<{ spec: OrvyqGraphicSpec; durationInFrames: number }> = ({ spec, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = interpolate(frame, [0, Math.max(1, durationInFrames - 1)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const reveal = interpolate(frame, [Math.min(8, durationInFrames / 5), Math.min(fps, durationInFrames / 2)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const closing = spec.type === "brand_close";
  const opening = spec.type === "brand_open";

  return (
    <AbsoluteFill style={{ background: "radial-gradient(circle at 72% 20%, #1B314A 0%, #0A101A 42%, #05070C 100%)", color: ink, overflow: "hidden" }}>
      <Grid />
      <AbsoluteFill style={{ padding: "6.4%", justifyContent: "space-between" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <Mark />
          <span style={{ color: mutedInk, fontFamily: "Arial, Helvetica, sans-serif", fontSize: 16, letterSpacing: "0.16em" }}>ORVYQ VISUAL ESSAY</span>
        </div>

        <div style={{ transform: `translateY(${interpolate(reveal, [0, 1], [38, 0])}px)`, opacity: reveal, maxWidth: opening || closing ? "100%" : "86%" }}>
          <div style={{ color: signalSoft, fontFamily: "Arial, Helvetica, sans-serif", fontSize: 20, letterSpacing: "0.2em", marginBottom: 24 }}>
            {spec.kicker || (closing ? "A HUMAN QUESTION" : "ORVYQ ANALYSIS")}
          </div>
          <div style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: opening || closing ? 118 : 72, fontWeight: 700, lineHeight: 0.96, letterSpacing: opening || closing ? "0.06em" : "-0.02em", textTransform: opening || closing ? "uppercase" : "none" }}>
            {spec.title}
          </div>
          {spec.subtitle ? <div style={{ color: mutedInk, fontFamily: "Arial, Helvetica, sans-serif", fontSize: 30, lineHeight: 1.35, marginTop: 28, maxWidth: 900 }}>{spec.subtitle}</div> : null}
        </div>

        {opening || closing ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", opacity: 0.7 + progress * 0.3 }}>
            <span style={{ fontFamily: "Arial, Helvetica, sans-serif", color: mutedInk, letterSpacing: "0.16em", fontSize: 20 }}>{closing ? "BEYOND THE KNOWN" : "THE AI RACE NO ONE CAN AFFORD TO WIN"}</span>
            <span style={{ color: signal, fontFamily: "Arial, Helvetica, sans-serif", fontSize: 18, letterSpacing: "0.18em" }}>{closing ? "ORVYQ STUDIO" : "001"}</span>
          </div>
        ) : (
          <div style={{ minHeight: 300, display: "flex", alignItems: "flex-end" }}>
            <Chart kind={spec.type} progress={progress} />
          </div>
        )}
      </AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 8, background: "rgba(243,236,221,0.12)" }}>
        <div style={{ width: `${progress * 100}%`, height: "100%", background: signal }} />
      </div>
    </AbsoluteFill>
  );
};
