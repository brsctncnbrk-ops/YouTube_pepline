import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";

export type OverlayEffect = { type: string; params: Record<string, number | string> };

function num(params: Record<string, number | string>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" ? v : fallback;
}

function GlowLayer({ params }: { params: Record<string, number | string> }) {
  const intensity = num(params, "intensity", 0.35);
  const cx = num(params, "cx", 50);
  const cy = num(params, "cy", 40);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${cx}% ${cy}%, rgba(255,244,214,${intensity}) 0%, rgba(255,244,214,0) 60%)`,
        mixBlendMode: "screen",
      }}
    />
  );
}

function VignetteLayer({ params }: { params: Record<string, number | string> }) {
  const strength = num(params, "strength", 0.65);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,${strength}) 100%)`,
      }}
    />
  );
}

/**
 * Grain texture via inline SVG feTurbulence. The turbulence seed is derived
 * from Remotion's seeded `random()`, keyed by scene + a coarse frame bucket -
 * never Math.random(), since GitHub Actions renders frames across parallel
 * workers and non-deterministic randomness would flicker between them.
 */
function NoiseLayer({ sceneId, frame, params }: { sceneId: string; frame: number; params: Record<string, number | string> }) {
  const opacity = num(params, "opacity", 0.06);
  const seed = Math.floor(random(`${sceneId}-noise-${Math.floor(frame / 2)}`) * 1000);
  const filterId = `noise-${sceneId}`;
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%">
        <filter id={filterId}>
          <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={seed} stitchTiles="stitch" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.5 0" />
        </filter>
        <rect width="100%" height="100%" filter={`url(#${filterId})`} />
      </svg>
    </AbsoluteFill>
  );
}

/** Small drifting dots, positions/timing seeded per-particle so every worker renders identical frames. */
function ParticlesLayer({
  sceneId,
  frame,
  durationInFrames,
  params,
}: {
  sceneId: string;
  frame: number;
  durationInFrames: number;
  params: Record<string, number | string>;
}) {
  const count = Math.round(num(params, "count", 18));
  const particles = Array.from({ length: count }, (_, i) => {
    const seed = `${sceneId}-particle-${i}`;
    const x = random(`${seed}-x`) * 100;
    const drift = random(`${seed}-drift`) * 30 + 10;
    const size = random(`${seed}-size`) * 3 + 1;
    const speedOffset = random(`${seed}-speed`) * durationInFrames;
    const progress = ((frame + speedOffset) % durationInFrames) / durationInFrames;
    const y = 100 - progress * drift - 10;
    const opacity = interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);
    return <circle key={i} cx={`${x}%`} cy={`${y}%`} r={size} fill="rgba(255,255,255,0.55)" opacity={opacity} />;
  });
  return (
    <AbsoluteFill>
      <svg width="100%" height="100%">
        {particles}
      </svg>
    </AbsoluteFill>
  );
}

type OverlayEffectsLayerProps = {
  effects: OverlayEffect[];
  sceneId: string;
  frame: number;
  durationInFrames: number;
};

export const OverlayEffectsLayer: React.FC<OverlayEffectsLayerProps> = ({ effects, sceneId, frame, durationInFrames }) => {
  if (!effects || effects.length === 0) return null;
  return (
    <>
      {effects.map((effect, i) => {
        const key = `${sceneId}-overlay-${i}`;
        const params = effect.params || {};
        switch (effect.type) {
          case "glow":
            return <GlowLayer key={key} params={params} />;
          case "vignette":
            return <VignetteLayer key={key} params={params} />;
          case "noise":
            return <NoiseLayer key={key} sceneId={sceneId} frame={frame} params={params} />;
          case "particles":
            return <ParticlesLayer key={key} sceneId={sceneId} frame={frame} durationInFrames={durationInFrames} params={params} />;
          default:
            return null;
        }
      })}
    </>
  );
};
