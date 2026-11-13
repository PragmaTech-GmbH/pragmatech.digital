import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { loadFont as loadMonoFont } from '@remotion/google-fonts/JetBrainsMono';
import { CANVAS_HEIGHT, CANVAS_WIDTH, clamp01, colors, lerp, mixColors, smoothstep } from './theme';

const { fontFamily: monoFont } = loadMonoFont('normal', { weights: ['400', '700'], subsets: ['latin'] });

// Seamless loop: five changes fall in turn. Healthy ones slip through the net and turn green,
// broken ones are blocked, turn red and stay in the net for a while before they fade out.
export const SAFETY_NET_DURATION = 150;

const NET_LEFT_X = 60;
const NET_RIGHT_X = 1140;
const NET_END_Y = 350;
const NET_SAG = 60;
const NET_THICKNESS = 84;
const CHECK_Y = 622;
const FALL_FRAMES = 30;
const PASS_FRAMES = 18;
const BLOCKED_FADE_START = FALL_FRAMES + 85;
const SEGMENT_COUNT = 48;

const GRAY = { fill: '#1e293b', stroke: '#94a3b8', text: '#cbd5e1' };
const GREEN = { fill: '#0c2a24', stroke: colors.emerald, text: colors.white };
const RED = { fill: '#341822', stroke: colors.rose, text: '#fecdd3' };

type ChangeEvent = {
  x: number;
  offset: number;
  kind: 'pass' | 'block';
  label: string;
  caughtLabel?: string;
};

const changeEvents: ChangeEvent[] = [
  { x: 200, offset: 0, kind: 'block', label: 'feat: payment retry', caughtLabel: 'Outage prevented' },
  { x: 800, offset: 30, kind: 'pass', label: 'feat: Flyway V12' },
  { x: 600, offset: 60, kind: 'block', label: 'fix: discount calc', caughtLabel: 'Regression found' },
  { x: 400, offset: 90, kind: 'pass', label: 'fix: pagination' },
  { x: 1000, offset: 120, kind: 'block', label: 'feat: user import', caughtLabel: 'Bug caught' },
];

const localFrameOf = (frame: number, offset: number) =>
  (((frame - offset) % SAFETY_NET_DURATION) + SAFETY_NET_DURATION) % SAFETY_NET_DURATION;

// Springy dent that starts when a broken change hits the net
const impactDent = (frame: number, offset: number) => {
  const sinceImpact = localFrameOf(frame, offset) - FALL_FRAMES;
  if (sinceImpact < 0 || sinceImpact > 60) return 0;
  return 20 * Math.exp(-sinceImpact / 11) * Math.cos(sinceImpact * 0.55);
};

const netTopAt = (x: number, frame: number) => {
  const progress = (x - NET_LEFT_X) / (NET_RIGHT_X - NET_LEFT_X);
  const sag = NET_SAG * 4 * progress * (1 - progress);
  const dent = changeEvents.reduce((sum, event) => {
    if (event.kind !== 'block') return sum;
    const distance = (x - event.x) / 130;
    return sum + impactDent(frame, event.offset) * Math.exp(-distance * distance);
  }, 0);
  return NET_END_Y + sag + dent;
};

const pillWidth = (label: string) => label.length * 11 + 36;

type PillProps = {
  x: number;
  y: number;
  label: string;
  palette: { fill: string; stroke: string; text: string };
  rotation?: number;
  opacity?: number;
};

const Pill: React.FC<PillProps> = ({ x, y, label, palette, rotation = 0, opacity = 1 }) => {
  const width = pillWidth(label);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation})`} opacity={opacity}>
      <rect x={-width / 2} y={-20} width={width} height={40} rx={9} fill={palette.fill} stroke={palette.stroke} strokeWidth={2.5} />
      <text x={0} y={6} textAnchor="middle" fontFamily={monoFont} fontWeight={700} fontSize={18} fill={palette.text}>
        {label}
      </text>
    </g>
  );
};

const mixPalette = (from: typeof GRAY, to: typeof GRAY, progress: number) => ({
  fill: mixColors(from.fill, to.fill, progress),
  stroke: mixColors(from.stroke, to.stroke, progress),
  text: mixColors(from.text, to.text, progress),
});

export const SafetyNet: React.FC = () => {
  const frame = useCurrentFrame();
  const segmentXs = Array.from({ length: SEGMENT_COUNT + 1 }, (_, index) => lerp(NET_LEFT_X, NET_RIGHT_X, index / SEGMENT_COUNT));
  const topPoints = segmentXs.map((x) => [x, netTopAt(x, frame)]);
  const bottomPoints = topPoints.map(([x, y]) => [x, y + NET_THICKNESS]);
  const toPolyline = (points: number[][]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // Diamond lattice between the top and bottom rope
  const latticeLines: React.ReactNode[] = [];
  for (let index = 0; index + 2 <= SEGMENT_COUNT; index += 2) {
    const [leftX, leftTopY] = topPoints[index];
    const [rightX, rightTopY] = topPoints[index + 2];
    const leftBottomY = bottomPoints[index][1];
    const rightBottomY = bottomPoints[index + 2][1];
    latticeLines.push(
      <line key={`down-${index}`} x1={leftX} y1={leftTopY} x2={rightX} y2={rightBottomY} />,
      <line key={`up-${index}`} x1={leftX} y1={leftBottomY} x2={rightX} y2={rightTopY} />,
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: colors.background }}>
      <svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT} viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
        <defs>
          <pattern id="net-dots" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.4" fill={colors.grid} />
          </pattern>
          <filter id="net-glow" x="-20%" y="-60%" width="140%" height="220%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
          <radialGradient id="floor-glow" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor={colors.emerald} stopOpacity={0.22} />
            <stop offset="100%" stopColor={colors.emerald} stopOpacity={0} />
          </radialGradient>
        </defs>
        <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill="url(#net-dots)" />
        <rect y={CANVAS_HEIGHT - 260} width={CANVAS_WIDTH} height={260} fill="url(#floor-glow)" />

        {/* Dashed lanes: healthy ones continue to the check mark, broken ones end at the net */}
        {changeEvents.map((event) => (
          <line
            key={`line-${event.x}`}
            x1={event.x}
            y1={0}
            x2={event.x}
            y2={event.kind === 'pass' ? CHECK_Y - 28 : netTopAt(event.x, 0)}
            stroke={event.kind === 'pass' ? colors.emerald : colors.rose}
            strokeOpacity={event.kind === 'pass' ? 0.6 : 0.4}
            strokeWidth={3}
            strokeDasharray="7 9"
          />
        ))}

        {/* Net glow, lattice and ropes */}
        <g opacity={0.5} filter="url(#net-glow)" stroke={colors.emerald} strokeWidth={6} fill="none">
          <polyline points={toPolyline(topPoints)} />
          <polyline points={toPolyline(bottomPoints)} />
        </g>
        <g stroke={colors.emerald} strokeOpacity={0.75} strokeWidth={3}>{latticeLines}</g>
        <g fill="none" stroke="#4ade80" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
          <polyline points={toPolyline(topPoints)} />
          <polyline points={toPolyline(bottomPoints)} />
        </g>
        {[topPoints[0], topPoints[SEGMENT_COUNT]].map(([x, y], index) => (
          <g key={`post-${index}`}>
            <line x1={x} y1={y} x2={x} y2={y + NET_THICKNESS} stroke="#4ade80" strokeWidth={7} strokeLinecap="round" />
            <circle cx={x} cy={y} r={11} fill="#4ade80" />
            <circle cx={x} cy={y + NET_THICKNESS} r={11} fill="#4ade80" />
          </g>
        ))}

        {/* Changes: gray while falling, then green (passed) or red (blocked, stays in the net) */}
        {changeEvents.map((event) => {
          const localFrame = localFrameOf(frame, event.offset);
          const hitY = netTopAt(event.x, frame) - 24;
          const fallProgress = clamp01(localFrame / FALL_FRAMES);
          const fallY = lerp(-40, NET_END_Y + NET_SAG - 24, fallProgress * fallProgress);
          const fadeIn = clamp01(localFrame / 5);

          if (event.kind === 'pass') {
            const passProgress = clamp01((localFrame - FALL_FRAMES) / PASS_FRAMES);
            const slideY = lerp(NET_END_Y + NET_SAG - 24, CHECK_Y - 62, smoothstep(0, 1, passProgress));
            const pillY = localFrame < FALL_FRAMES ? fallY : slideY;
            const greenProgress = smoothstep(FALL_FRAMES - 4, FALL_FRAMES + 8, localFrame);
            const pillOpacity = fadeIn * (1 - smoothstep(FALL_FRAMES + PASS_FRAMES + 14, FALL_FRAMES + PASS_FRAMES + 28, localFrame));
            const checkProgress = smoothstep(FALL_FRAMES + PASS_FRAMES - 4, FALL_FRAMES + PASS_FRAMES + 10, localFrame);
            const checkFade = 1 - smoothstep(SAFETY_NET_DURATION - 22, SAFETY_NET_DURATION - 6, localFrame);
            const checkScale = (0.4 + 0.6 * checkProgress) * (1 + 0.12 * Math.sin(checkProgress * Math.PI));
            return (
              <g key={`event-${event.x}`}>
                <g transform={`translate(${event.x} ${CHECK_Y}) scale(${checkScale})`} opacity={checkProgress * checkFade}>
                  <circle r={30} fill="#22c55e" opacity={0.45} filter="url(#net-glow)" />
                  <circle r={24} fill="#22c55e" />
                  <path d="M -10 1 L -3 8 L 11 -8" fill="none" stroke={colors.background} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
                </g>
                <Pill x={event.x} y={pillY} label={event.label} palette={mixPalette(GRAY, GREEN, greenProgress)} opacity={pillOpacity} />
              </g>
            );
          }

          const redProgress = smoothstep(FALL_FRAMES, FALL_FRAMES + 6, localFrame);
          const settleProgress = smoothstep(FALL_FRAMES + 2, FALL_FRAMES + 16, localFrame);
          const restingY = netTopAt(event.x, frame) + NET_THICKNESS / 2;
          const slopeY = netTopAt(event.x + 10, frame) - netTopAt(event.x - 10, frame);
          const slopeAngle = (Math.atan2(slopeY, 20) * 180) / Math.PI;
          const sway = 1.6 * Math.sin((2 * Math.PI * (localFrame - FALL_FRAMES)) / 60);
          const bob = 3 * Math.sin((2 * Math.PI * (localFrame - FALL_FRAMES)) / 60);
          const pillY = localFrame < FALL_FRAMES ? fallY : lerp(hitY, restingY + bob, settleProgress);
          const rotation = localFrame < FALL_FRAMES ? 0 : (slopeAngle - 2 + sway) * settleProgress;
          const pillOpacity = fadeIn * (1 - smoothstep(BLOCKED_FADE_START, BLOCKED_FADE_START + 15, localFrame));
          const label = localFrame < FALL_FRAMES + 3 ? event.label : event.caughtLabel ?? event.label;
          return (
            <Pill
              key={`event-${event.x}`}
              x={event.x}
              y={pillY}
              label={label}
              palette={mixPalette(GRAY, RED, redProgress)}
              rotation={rotation}
              opacity={pillOpacity}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
