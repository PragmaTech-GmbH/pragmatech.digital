import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { loadFont as loadMonoFont } from '@remotion/google-fonts/JetBrainsMono';
import { CANVAS_HEIGHT, CANVAS_WIDTH, clamp01, colors, lerp, mixColors, smoothstep } from './theme';

const { fontFamily: monoFont } = loadMonoFont('normal', { weights: ['400', '700'], subsets: ['latin'] });

// Seamless loop: 12 particles, one every 10 frames, each lives less than the 120 frame cycle.
export const FEEDBACK_ENGINE_DURATION = 120;

const CENTER_Y = 340;
const SOURCE_X = 90;
const LANE_START_X = 160;
const ENGINE_ENTRY_X = 450;
const ENGINE_X = 600;
const PARTICLE_COUNT = 12;
const SPAWN_INTERVAL = 10;
const CYCLE_FRAMES = PARTICLE_COUNT * SPAWN_INTERVAL;

// Failing change loops back over the top, gets fixed, and re-enters the engine
const RETURN_ARC = { p0: [ENGINE_X, CENTER_Y], p1: [ENGINE_X, 10], p2: [LANE_START_X, 10], p3: [LANE_START_X, CENTER_Y] };
const OUTCOME_PATH = [
  [ENGINE_X, CENTER_Y],
  [780, 334],
  [850, 302],
  [920, 272],
  [1000, 226],
  [1090, 166],
];

const cubicBezier = (u: number) => {
  const inverse = 1 - u;
  const weight0 = inverse * inverse * inverse;
  const weight1 = 3 * inverse * inverse * u;
  const weight2 = 3 * inverse * u * u;
  const weight3 = u * u * u;
  return {
    x: weight0 * RETURN_ARC.p0[0] + weight1 * RETURN_ARC.p1[0] + weight2 * RETURN_ARC.p2[0] + weight3 * RETURN_ARC.p3[0],
    y: weight0 * RETURN_ARC.p0[1] + weight1 * RETURN_ARC.p1[1] + weight2 * RETURN_ARC.p2[1] + weight3 * RETURN_ARC.p3[1],
  };
};

const outcomeAt = (u: number) => {
  const scaled = clamp01(u) * (OUTCOME_PATH.length - 1);
  const segment = Math.min(OUTCOME_PATH.length - 2, Math.floor(scaled));
  const local = scaled - segment;
  return {
    x: lerp(OUTCOME_PATH[segment][0], OUTCOME_PATH[segment + 1][0], local),
    y: lerp(OUTCOME_PATH[segment][1], OUTCOME_PATH[segment + 1][1], local),
  };
};

type ParticleState = { x: number; y: number; color: string; opacity: number; size: number } | null;

const particleStateAt = (particleIndex: number, frame: number): ParticleState => {
  const localFrame = (((frame - particleIndex * SPAWN_INTERVAL) % CYCLE_FRAMES) + CYCLE_FRAMES) % CYCLE_FRAMES;
  const willFail = particleIndex % 3 === 1;
  const fadeIn = clamp01(localFrame / 4);
  const base = { size: 16, opacity: fadeIn };

  if (localFrame < 28) {
    return { ...base, x: lerp(LANE_START_X, ENGINE_ENTRY_X, localFrame / 28), y: CENTER_Y, color: colors.brandLight };
  }
  if (localFrame < 40) {
    const progress = (localFrame - 28) / 12;
    return { ...base, x: lerp(ENGINE_ENTRY_X, ENGINE_X, progress), y: CENTER_Y, color: mixColors(colors.brandLight, colors.white, progress), size: 16 - 4 * progress };
  }

  if (!willFail) {
    if (localFrame > 60) return null;
    const progress = (localFrame - 40) / 20;
    const point = outcomeAt(progress);
    return { ...base, ...point, color: colors.emerald, opacity: 1 - smoothstep(0.8, 1, progress), size: 12 + 4 * progress };
  }

  if (localFrame < 66) {
    const progress = (localFrame - 40) / 26;
    const point = cubicBezier(progress);
    const fixedProgress = smoothstep(0.5, 0.7, progress);
    return { ...base, ...point, color: mixColors(colors.rose, colors.emerald, fixedProgress), size: 12 + 4 * fixedProgress };
  }
  if (localFrame < 82) {
    return { ...base, x: lerp(LANE_START_X, ENGINE_ENTRY_X, (localFrame - 66) / 16), y: CENTER_Y, color: colors.emerald };
  }
  if (localFrame < 94) {
    return { ...base, x: lerp(ENGINE_ENTRY_X, ENGINE_X, (localFrame - 82) / 12), y: CENTER_Y, color: colors.emerald, size: 14 };
  }
  if (localFrame < 114) {
    const progress = (localFrame - 94) / 20;
    const point = outcomeAt(progress);
    return { ...base, ...point, color: colors.emerald, opacity: 1 - smoothstep(0.8, 1, progress), size: 12 + 4 * progress };
  }
  return null;
};

export const FeedbackEngine: React.FC = () => {
  const frame = useCurrentFrame();
  const corePulse = 1 + 0.08 * Math.cos((2 * Math.PI * frame) / SPAWN_INTERVAL);
  const outerRotation = (frame / CYCLE_FRAMES) * 360;
  const innerRotation = -(frame / CYCLE_FRAMES) * 720;
  const outcomePolyline = OUTCOME_PATH.map(([x, y]) => `${x},${y}`).join(' ');
  const returnArcPath = `M ${RETURN_ARC.p0[0]} ${RETURN_ARC.p0[1]} C ${RETURN_ARC.p1[0]} ${RETURN_ARC.p1[1]}, ${RETURN_ARC.p2[0]} ${RETURN_ARC.p2[1]}, ${RETURN_ARC.p3[0]} ${RETURN_ARC.p3[1]}`;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
        <defs>
          <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill={colors.grid} />
          </pattern>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="14" />
          </filter>
        </defs>
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#dots)" />

        {/* Lanes */}
        <line x1={SOURCE_X + 34} y1={CENTER_Y} x2={ENGINE_X} y2={CENTER_Y} stroke={colors.border} strokeWidth={2} strokeDasharray="4 8" />
        <path d={returnArcPath} fill="none" stroke={colors.rose} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="6 8" />
        <polyline points={outcomePolyline} fill="none" stroke={colors.emerald} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="6 8" />

        {/* Source */}
        <circle cx={SOURCE_X} cy={CENTER_Y} r={30} fill={colors.panel} stroke={colors.brandLight} strokeWidth={3} />
        <circle cx={SOURCE_X} cy={CENTER_Y} r={9} fill={colors.brandLight} />
        <text x={SOURCE_X} y={CENTER_Y + 76} textAnchor="middle" fontFamily={monoFont} fontSize={20} fill={colors.white}>
          AI AGENTS
        </text>

        {/* Engine */}
        <circle cx={ENGINE_X} cy={CENTER_Y} r={120} fill={colors.brand} opacity={0.16} filter="url(#glow)" />
        <g transform={`rotate(${outerRotation} ${ENGINE_X} ${CENTER_Y})`}>
          <circle cx={ENGINE_X} cy={CENTER_Y} r={150} fill="none" stroke={colors.brandLight} strokeWidth={3} strokeDasharray="38 22" opacity={0.75} />
        </g>
        <g transform={`rotate(${innerRotation} ${ENGINE_X} ${CENTER_Y})`}>
          <circle cx={ENGINE_X} cy={CENTER_Y} r={106} fill="none" stroke={colors.emerald} strokeWidth={3} strokeDasharray="14 18" opacity={0.7} />
        </g>
        <circle cx={ENGINE_X} cy={CENTER_Y} r={64 * corePulse} fill={colors.panel} stroke={colors.brand} strokeWidth={4} />
        <circle cx={ENGINE_X} cy={CENTER_Y} r={22 * corePulse} fill={colors.brandLight} />
        <text x={ENGINE_X} y={CENTER_Y + 205} textAnchor="middle" fontFamily={monoFont} fontSize={20} fill={colors.white}>
          FEEDBACK ENGINE
        </text>

        {/* Outcome */}
        <circle cx={OUTCOME_PATH[OUTCOME_PATH.length - 1][0]} cy={OUTCOME_PATH[OUTCOME_PATH.length - 1][1]} r={18} fill={colors.emerald} opacity={0.5} filter="url(#glow)" />
        <text x={CANVAS_WIDTH - 48} y={CANVAS_HEIGHT - 52} textAnchor="end" fontFamily={monoFont} fontSize={20} fill={colors.white}>
          VALUE SHIPPED
        </text>
        <text x={(ENGINE_X + LANE_START_X) / 2} y={52} textAnchor="middle" fontFamily={monoFont} fontSize={20} fill={colors.rose} opacity={0.85}>
          caught in seconds, fixed before it ships
        </text>

        {/* Particles */}
        {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
          const state = particleStateAt(index, frame);
          if (!state) return null;
          return (
            <rect
              key={index}
              x={state.x - state.size / 2}
              y={state.y - state.size / 2}
              width={state.size}
              height={state.size}
              rx={4}
              fill={state.color}
              opacity={state.opacity}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
