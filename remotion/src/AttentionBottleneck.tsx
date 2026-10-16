import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';
import { loadFont as loadMonoFont } from '@remotion/google-fonts/JetBrainsMono';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  clamp01,
  colors,
  mixColors,
  smoothstep,
} from './theme';

const { fontFamily: monoFont } = loadMonoFont('normal', { weights: ['400', '700'], subsets: ['latin'] });

// Plays once and holds the last frame. Abstract story: code floods in, human review is the narrow gate.
export const ATTENTION_BOTTLENECK_DURATION = 270;

const CENTER_Y = 340;
const SOURCE_X = 90;
const HUMAN_X = 90;
const HUMAN_Y = 440;
const AI_Y = 240;
const SPAWN_X = 160;
const GATE_X = 700;
const QUEUE_HEAD_X = GATE_X - 46;
const QUEUE_SPACING = 24;
const GATE_GAP = 60;
const INBOUND_SPEED = 14;
const OUTBOUND_SPEED = 12;
const FIRST_PASS_FRAME = 60;
const FRAMES_PER_REVIEW = 12;
const PARTICLE_COUNT = 52;
const LANE_OFFSETS = [-64, 0, 64];
const WAIT_FRAMES_UNTIL_ROSE = 110;

// A few rushed reviews let a bug through: the shipped change takes production down.
const OUTAGE_PARTICLES = [3, 8, 12];
const OUTAGE_X = 940;
const OUTAGE_EVENT_FRAMES = 40;
const outageFrameOf = (particleIndex: number) =>
  passFrameOf(particleIndex) + (OUTAGE_X - QUEUE_HEAD_X) / OUTBOUND_SPEED;

// Spawn rate accelerates: the supply of AI generated code keeps growing.
const spawnFrameOf = (particleIndex: number) =>
  Math.round(8 + 4.2 * particleIndex - 0.02 * particleIndex * particleIndex);
const passFrameOf = (particleIndex: number) => FIRST_PASS_FRAME + particleIndex * FRAMES_PER_REVIEW;

const laneSpread = (x: number) => {
  if (x < QUEUE_HEAD_X) return 1 - 0.75 * smoothstep(300, QUEUE_HEAD_X, x);
  return 0.25 * (1 - smoothstep(QUEUE_HEAD_X, QUEUE_HEAD_X + 66, x));
};

type ParticleState = { x: number; y: number; color: string; opacity: number } | null;

const particleStateAt = (particleIndex: number, frame: number): ParticleState => {
  const spawnFrame = spawnFrameOf(particleIndex);
  if (frame < spawnFrame) return null;
  const passFrame = passFrameOf(particleIndex);
  const hasPassed = frame >= passFrame;

  let x: number;
  if (hasPassed) {
    x = QUEUE_HEAD_X + (frame - passFrame) * OUTBOUND_SPEED;
  } else {
    const slotsAhead = (passFrame - frame) / FRAMES_PER_REVIEW;
    const queueX = QUEUE_HEAD_X - (slotsAhead / 3) * QUEUE_SPACING;
    const travelX = SPAWN_X + INBOUND_SPEED * (frame - spawnFrame);
    x = Math.min(queueX, travelX);
  }
  if (x > CANVAS_WIDTH - 60) return null;

  const originY = particleIndex % 2 === 0 ? AI_Y : HUMAN_Y;
  const laneY = CENTER_Y + LANE_OFFSETS[particleIndex % 3] * laneSpread(x);
  const y = originY + (laneY - originY) * smoothstep(SPAWN_X, 340, x);

  let color: string;
  if (hasPassed) {
    color = OUTAGE_PARTICLES.includes(particleIndex)
      ? mixColors(colors.emerald, colors.rose, smoothstep(OUTAGE_X - 60, OUTAGE_X, x))
      : colors.emerald;
  } else {
    const waitProgress = clamp01((frame - spawnFrame) / WAIT_FRAMES_UNTIL_ROSE);
    color =
      waitProgress < 0.5
        ? mixColors(colors.brandLight, colors.amber, waitProgress * 2)
        : mixColors(colors.amber, colors.rose, (waitProgress - 0.5) * 2);
  }

  const fadeIn = clamp01((frame - spawnFrame) / 4);
  const fadeOut = hasPassed ? 1 - smoothstep(960, 1080, x) : 1;
  return { x, y, color, opacity: fadeIn * fadeOut };
};

export const AttentionBottleneck: React.FC = () => {
  const frame = useCurrentFrame();

  const opened = Array.from({ length: PARTICLE_COUNT }, (_, index) => index).filter(
    (index) => frame >= spawnFrameOf(index),
  ).length;
  const reviewed = Array.from({ length: PARTICLE_COUNT }, (_, index) => index).filter(
    (index) => frame >= passFrameOf(index) && frame >= spawnFrameOf(index),
  ).length;
  const backlog = opened - reviewed;
  const stress = clamp01(backlog / 30);
  const gateColor = mixColors(colors.brandLight, colors.rose, stress);
  const pulseRadius = 30 + ((frame % 36) / 36) * 34;
  const pulseOpacity = 0.5 * (1 - (frame % 36) / 36);
  const sceneOpacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const backlogOpacity = smoothstep(2, 8, backlog);

  const outageEvents = OUTAGE_PARTICLES.map((index) => (frame - outageFrameOf(index)) / OUTAGE_EVENT_FRAMES).filter(
    (progress) => progress >= 0 && progress <= 1,
  );

  const gateTopHeight = CENTER_Y - GATE_GAP / 2 - 120;
  const gateBottomY = CENTER_Y + GATE_GAP / 2;

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background, opacity: sceneOpacity }}>
      <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
        <defs>
          <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill={colors.grid} />
          </pattern>
          <filter id="glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#dots)" />

        {/* AI source */}
        <circle cx={SOURCE_X} cy={AI_Y} r={pulseRadius} fill="none" stroke={colors.brand} opacity={pulseOpacity} strokeWidth={2} />
        <circle cx={SOURCE_X} cy={AI_Y} r={30} fill={colors.panel} stroke={colors.brandLight} strokeWidth={3} />
        <circle cx={SOURCE_X} cy={AI_Y} r={9} fill={colors.brandLight} />
        <text x={SOURCE_X} y={AI_Y + 76} textAnchor="middle" fontFamily={monoFont} fontSize={20} fill={colors.textMuted}>
          AI AGENTS
        </text>

        {/* Human developers ship code too */}
        <circle cx={HUMAN_X} cy={HUMAN_Y} r={30} fill={colors.panel} stroke={colors.brandLight} strokeWidth={3} />
        <circle cx={HUMAN_X} cy={HUMAN_Y - 8} r={7} fill={colors.brandLight} />
        <path d={`M ${HUMAN_X - 14} ${HUMAN_Y + 15} C ${HUMAN_X - 14} ${HUMAN_Y + 1}, ${HUMAN_X + 14} ${HUMAN_Y + 1}, ${HUMAN_X + 14} ${HUMAN_Y + 15} Z`} fill={colors.brandLight} />
        <text x={HUMAN_X} y={HUMAN_Y + 76} textAnchor="middle" fontFamily={monoFont} fontSize={20} fill={colors.textMuted}>
          HUMAN
        </text>

        {/* Review gate */}
        <rect x={GATE_X - 90} y={120} width={180} height={CANVAS_HEIGHT - 240} rx={20} fill={gateColor} opacity={0.05 + 0.1 * stress} filter="url(#glow)" />
        <rect x={GATE_X - 7} y={120} width={14} height={gateTopHeight} rx={7} fill={gateColor} />
        <rect x={GATE_X - 7} y={gateBottomY} width={14} height={CANVAS_HEIGHT - 120 - gateBottomY - 40} rx={7} fill={gateColor} />
        <text x={GATE_X} y={CANVAS_HEIGHT - 52} textAnchor="middle" fontFamily={monoFont} fontSize={20} fill={colors.textMuted}>
          HUMAN REVIEW
        </text>

        {/* Particles = code changes waiting for a human */}
        {Array.from({ length: PARTICLE_COUNT }, (_, index) => {
          const state = particleStateAt(index, frame);
          if (!state) return null;
          return (
            <rect
              key={index}
              x={state.x - 8}
              y={state.y - 8}
              width={16}
              height={16}
              rx={4}
              fill={state.color}
              opacity={state.opacity}
            />
          );
        })}

        {/* Production outage events */}
        {outageEvents.map((progress, eventIndex) => (
          <g key={eventIndex}>
            <circle cx={OUTAGE_X + 20} cy={CENTER_Y} r={20 + 70 * progress} fill="none" stroke={colors.rose} strokeWidth={4} opacity={1 - progress} />
            <circle cx={OUTAGE_X + 20} cy={CENTER_Y} r={12} fill={colors.rose} opacity={1 - smoothstep(0.6, 1, progress)} />
            <text x={OUTAGE_X + 20} y={CENTER_Y - 110} textAnchor="middle" fontFamily={monoFont} fontSize={22} fontWeight={700} fill={colors.rose} opacity={smoothstep(0, 0.15, progress) * (1 - smoothstep(0.75, 1, progress))}>
              PRODUCTION OUTAGE
            </text>
          </g>
        ))}

        {/* Counters */}
        <text x={48} y={64} fontFamily={monoFont} fontSize={24} fill={colors.textMuted}>
          code changes <tspan fill={colors.brandLight} fontWeight={700}>{opened}</tspan>
        </text>
        <text x={CANVAS_WIDTH - 48} y={64} textAnchor="end" fontFamily={monoFont} fontSize={24} fill={colors.textMuted}>
          reviewed <tspan fill={colors.emerald} fontWeight={700}>{reviewed}</tspan>
        </text>
        <g opacity={backlogOpacity}>
          <text x={260} y={CANVAS_HEIGHT - 96} fontFamily={monoFont} fontSize={72} fontWeight={700} fill={mixColors(colors.amber, colors.rose, stress)}>
            {backlog}
          </text>
          <text x={262} y={CANVAS_HEIGHT - 56} fontFamily={monoFont} fontSize={24} fill={colors.textMuted}>
            PRs waiting
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
