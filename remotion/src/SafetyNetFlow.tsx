import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { loadFont as loadMonoFont } from '@remotion/google-fonts/JetBrainsMono';
import { CANVAS_HEIGHT, CANVAS_WIDTH, clamp01, colors, lerp, mixColors, smoothstep } from './theme';

const { fontFamily: monoFont } = loadMonoFont('normal', { weights: ['400', '700'], subsets: ['latin'] });

// The "perfect world": agents ship a steady stream of changes. A fast and comprehensive safety net
// catches the broken ones in seconds, the fix goes back through, and everything else flows to
// production, any day of the week. Seamless loop: 16 changes, one every 15 frames, 240 frame cycle.
export const SAFETY_NET_FLOW_DURATION = 240;

const CENTER_Y = 330;
const SOURCE_X = 110;
const NET_X = 600;
const PRODUCTION_X = 1030;
const CHANGE_COUNT = 16;
const SPAWN_INTERVAL = 15;
const CYCLE_FRAMES = CHANGE_COUNT * SPAWN_INTERVAL;
const BUG_EVERY = 4;
const BUG_OFFSET = 2;
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const DAY_FRAMES = CYCLE_FRAMES / WEEKDAYS.length;

type ChangeState = { x: number; y: number; color: string; opacity: number; size: number };

const returnArcAt = (progress: number) => {
  // Failing change loops back over the top to the agents: the feedback loop is short
  const p0 = [NET_X, CENTER_Y];
  const p1 = [NET_X, 120];
  const p2 = [SOURCE_X + 40, 120];
  const p3 = [SOURCE_X + 40, CENTER_Y];
  const inverse = 1 - progress;
  const weight0 = inverse * inverse * inverse;
  const weight1 = 3 * inverse * inverse * progress;
  const weight2 = 3 * inverse * progress * progress;
  const weight3 = progress * progress * progress;
  return {
    x: weight0 * p0[0] + weight1 * p1[0] + weight2 * p2[0] + weight3 * p3[0],
    y: weight0 * p0[1] + weight1 * p1[1] + weight2 * p2[1] + weight3 * p3[1],
  };
};

const changeStateAt = (index: number, frame: number): ChangeState | null => {
  const localFrame = (frame - index * SPAWN_INTERVAL + CYCLE_FRAMES) % CYCLE_FRAMES;
  const isBroken = index % BUG_EVERY === BUG_OFFSET;
  const fadeIn = smoothstep(0, 8, localFrame);
  const base = { y: CENTER_Y, opacity: fadeIn, size: 16 };

  // Source -> net, fast and steady
  if (localFrame < 40) {
    return { ...base, x: lerp(SOURCE_X + 40, NET_X - 20, smoothstep(0, 40, localFrame)), color: colors.brandLight };
  }

  if (isBroken && localFrame < 100) {
    // Caught at the net within a few frames, sent back, fixed at the source
    if (localFrame < 52) {
      return { ...base, x: NET_X - 20 + (localFrame - 40) * 0.8, color: mixColors(colors.brandLight, colors.rose, (localFrame - 40) / 8), size: 16 + (localFrame - 40) };
    }
    if (localFrame < 84) {
      const point = returnArcAt(smoothstep(52, 84, localFrame));
      return { ...base, ...point, color: colors.rose, size: 16 };
    }
    return { ...base, x: SOURCE_X + 40, color: mixColors(colors.rose, colors.emerald, (localFrame - 84) / 12), size: 16 };
  }

  // Second pass for fixed changes starts at frame 100 and mirrors the first pass
  const passFrame = isBroken ? localFrame - 100 : localFrame;
  if (isBroken && localFrame < 140) {
    return { ...base, x: lerp(SOURCE_X + 40, NET_X - 20, smoothstep(0, 40, localFrame - 100)), color: colors.emerald };
  }
  if (passFrame < 52) {
    const pulse = smoothstep(40, 46, passFrame) * (1 - smoothstep(46, 52, passFrame));
    return { ...base, x: lerp(NET_X - 20, NET_X + 20, smoothstep(40, 52, passFrame)), color: mixColors(colors.brandLight, colors.emerald, smoothstep(40, 52, passFrame)), size: 16 + 6 * pulse };
  }
  if (passFrame < 100) {
    const progress = smoothstep(52, 100, passFrame);
    const fade = 1 - smoothstep(0.85, 1, progress);
    return { ...base, x: lerp(NET_X + 20, PRODUCTION_X - 30, progress), color: colors.emerald, opacity: fadeIn * fade, size: 16 };
  }
  return null;
};

export const SafetyNetFlow: React.FC = () => {
  const frame = useCurrentFrame();
  const corePulse = 1 + 0.06 * Math.cos((2 * Math.PI * frame) / SPAWN_INTERVAL);
  const ringRotation = (frame / CYCLE_FRAMES) * 360 * 2;
  const activeDay = Math.floor((frame % CYCLE_FRAMES) / DAY_FRAMES);
  const arcPath = `M ${NET_X} ${CENTER_Y} C ${NET_X} 120, ${SOURCE_X + 40} 120, ${SOURCE_X + 40} ${CENTER_Y}`;

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
        <line x1={SOURCE_X + 40} y1={CENTER_Y} x2={PRODUCTION_X - 30} y2={CENTER_Y} stroke={colors.border} strokeWidth={2} strokeDasharray="4 8" />
        <path d={arcPath} fill="none" stroke={colors.rose} strokeOpacity={0.35} strokeWidth={2} strokeDasharray="6 8" />
        <text x={(NET_X + SOURCE_X) / 2} y={96} textAnchor="middle" fontFamily={monoFont} fontSize={18} fill={colors.rose} opacity={0.9}>
          broken change caught in seconds
        </text>

        {/* Agents */}
        <circle cx={SOURCE_X} cy={CENTER_Y} r={30} fill={colors.panel} stroke={colors.brandLight} strokeWidth={3} />
        <circle cx={SOURCE_X} cy={CENTER_Y} r={9} fill={colors.brandLight} />
        <text x={SOURCE_X} y={CENTER_Y + 76} textAnchor="middle" fontFamily={monoFont} fontSize={18} fill={colors.white}>
          AI AGENTS
        </text>

        {/* Safety net: fast and comprehensive */}
        <circle cx={NET_X} cy={CENTER_Y} r={110} fill={colors.brand} opacity={0.16} filter="url(#glow)" />
        <g transform={`rotate(${ringRotation} ${NET_X} ${CENTER_Y})`}>
          <circle cx={NET_X} cy={CENTER_Y} r={96} fill="none" stroke={colors.brandLight} strokeWidth={3} strokeDasharray="30 18" opacity={0.75} />
        </g>
        <circle cx={NET_X} cy={CENTER_Y} r={56 * corePulse} fill={colors.panel} stroke={colors.brand} strokeWidth={4} />
        <path d={`M ${NET_X - 20} ${CENTER_Y + 2} l 14 14 l 28 -30`} fill="none" stroke={colors.emerald} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <text x={NET_X} y={CENTER_Y + 160} textAnchor="middle" fontFamily={monoFont} fontSize={20} fontWeight={700} fill={colors.white}>
          FAST + COMPREHENSIVE SAFETY NET
        </text>
        <text x={NET_X} y={CENTER_Y + 188} textAnchor="middle" fontFamily={monoFont} fontSize={16} fill={colors.textMuted}>
          fast feedback
        </text>

        {/* Production, any day of the week */}
        <circle cx={PRODUCTION_X} cy={CENTER_Y} r={34} fill={colors.emerald} opacity={0.35} filter="url(#glow)" />
        <rect x={PRODUCTION_X - 30} y={CENTER_Y - 30} width={60} height={60} rx={14} fill={colors.panel} stroke={colors.emerald} strokeWidth={3} />
        <text x={PRODUCTION_X} y={CENTER_Y + 8} textAnchor="middle" fontFamily={monoFont} fontSize={22} fontWeight={700} fill={colors.emerald}>
          PROD
        </text>
        <text x={PRODUCTION_X} y={CENTER_Y + 76} textAnchor="middle" fontFamily={monoFont} fontSize={18} fill={colors.white}>
          DEPLOY ANY DAY
        </text>
        {WEEKDAYS.map((day, dayIndex) => {
          const isActive = dayIndex === activeDay;
          const x = PRODUCTION_X - 104 + dayIndex * 52;
          return (
            <g key={day}>
              <rect x={x - 22} y={CENTER_Y + 100} width={44} height={26} rx={6} fill={isActive ? colors.emerald : colors.panel} stroke={isActive ? colors.emerald : colors.border} strokeWidth={2} />
              <text x={x} y={CENTER_Y + 119} textAnchor="middle" fontFamily={monoFont} fontSize={14} fontWeight={700} fill={isActive ? colors.background : colors.textMuted}>
                {day}
              </text>
            </g>
          );
        })}

        {/* Flow label along the lane */}
        <text x={(NET_X + PRODUCTION_X) / 2} y={CENTER_Y - 50} textAnchor="middle" fontFamily={monoFont} fontSize={18} fill={colors.emerald} opacity={0.9}>
          fast flow, no queue
        </text>

        {/* Changes */}
        {Array.from({ length: CHANGE_COUNT }, (_, index) => {
          const state = changeStateAt(index, frame);
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
              opacity={clamp01(state.opacity)}
            />
          );
        })}

        {/* Headline strip */}
        <text x={48} y={CANVAS_HEIGHT - 40} fontFamily={monoFont} fontSize={20} fill={colors.text}>
          fast feedback + fast flow = deploy any day with confidence
        </text>
      </svg>
    </AbsoluteFill>
  );
};
