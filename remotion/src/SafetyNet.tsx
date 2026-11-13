import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { loadFont as loadMonoFont } from '@remotion/google-fonts/JetBrainsMono';
import { CANVAS_HEIGHT, CANVAS_WIDTH, clamp01, colors, lerp, smoothstep } from './theme';

const { fontFamily: monoFont } = loadMonoFont('normal', { weights: ['400', '700'], subsets: ['latin'] });

// Seamless loop: every lane repeats once per cycle, the net settles before the cycle ends.
export const SAFETY_NET_DURATION = 120;

const NET_LEFT_X = 60;
const NET_RIGHT_X = 1140;
const NET_END_Y = 350;
const NET_SAG = 60;
const NET_THICKNESS = 84;
const CHECK_Y = 622;
const FALL_FRAMES = 32;
const SEGMENT_COUNT = 48;

const lanes = [
  { x: 330, offset: 0, label: 'feat: Flyway V12' },
  { x: 660, offset: 40, label: 'fix: pagination' },
  { x: 990, offset: 80, label: 'feat: order export' },
];

const catchPills = [
  { x: 190, label: 'Outage prevented', phase: 0 },
  { x: 500, label: 'Regression found', phase: 1.7 },
  { x: 830, label: 'Bug caught', phase: 3.4 },
];

const localFrameOf = (frame: number, offset: number) =>
  (((frame - offset) % SAFETY_NET_DURATION) + SAFETY_NET_DURATION) % SAFETY_NET_DURATION;

// Springy dent that starts when a change lands on the net
const impactDent = (frame: number, offset: number) => {
  const sinceImpact = localFrameOf(frame, offset) - FALL_FRAMES;
  if (sinceImpact < 0 || sinceImpact > 60) return 0;
  return 20 * Math.exp(-sinceImpact / 11) * Math.cos(sinceImpact * 0.55);
};

const netTopAt = (x: number, frame: number) => {
  const progress = (x - NET_LEFT_X) / (NET_RIGHT_X - NET_LEFT_X);
  const sag = NET_SAG * 4 * progress * (1 - progress);
  const dent = lanes.reduce((sum, lane) => {
    const distance = (x - lane.x) / 130;
    return sum + impactDent(frame, lane.offset) * Math.exp(-distance * distance);
  }, 0);
  return NET_END_Y + sag + dent;
};

const pillWidth = (label: string, tone: 'good' | 'bad') => label.length * 12.2 + (tone === 'good' ? 68 : 36);

type PillProps = {
  x: number;
  y: number;
  label: string;
  tone: 'good' | 'bad';
  rotation?: number;
  opacity?: number;
  scale?: number;
};

const Pill: React.FC<PillProps> = ({ x, y, label, tone, rotation = 0, opacity = 1, scale = 1 }) => {
  const width = pillWidth(label, tone);
  const stroke = tone === 'good' ? colors.emerald : colors.rose;
  const fill = tone === 'good' ? '#0c2a24' : '#341822';
  const textColor = tone === 'good' ? colors.white : '#fecdd3';
  return (
    <g transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`} opacity={opacity}>
      <rect x={-width / 2} y={-21} width={width} height={42} rx={9} fill={fill} stroke={stroke} strokeWidth={2.5} />
      <text x={tone === 'good' ? -14 : 0} y={7} textAnchor="middle" fontFamily={monoFont} fontWeight={700} fontSize={20} fill={textColor}>
        {label}
      </text>
      {tone === 'good' ? (
        <text x={width / 2 - 26} y={7} textAnchor="middle" fontFamily={monoFont} fontWeight={700} fontSize={20} fill={colors.emerald}>
          ✔
        </text>
      ) : null}
    </g>
  );
};

export const SafetyNet: React.FC = () => {
  const frame = useCurrentFrame();
  const segmentXs = Array.from({ length: SEGMENT_COUNT + 1 }, (_, index) => lerp(NET_LEFT_X, NET_RIGHT_X, index / SEGMENT_COUNT));
  const topPoints = segmentXs.map((x) => [x, netTopAt(x, frame)]);
  const bottomPoints = topPoints.map(([x, y]) => [x, y + NET_THICKNESS]);
  const toPolyline = (points: number[][]) => points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

  // Diamond lattice between the top and bottom rope, one diamond every two segments
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

        {/* Dashed delivery lines, from the top through the net down to the check marks */}
        {lanes.map((lane) => (
          <line key={`line-${lane.x}`} x1={lane.x} y1={0} x2={lane.x} y2={CHECK_Y - 28} stroke={colors.emerald} strokeOpacity={0.6} strokeWidth={3} strokeDasharray="7 9" />
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

        {/* Problems caught in the net */}
        {catchPills.map((pill) => {
          const centerY = netTopAt(pill.x, frame) + NET_THICKNESS / 2;
          const slopeY = netTopAt(pill.x + 10, frame) - netTopAt(pill.x - 10, frame);
          const slopeAngle = (Math.atan2(slopeY, 20) * 180) / Math.PI;
          const sway = 1.6 * Math.sin((2 * Math.PI * frame) / SAFETY_NET_DURATION + pill.phase);
          const bob = 3 * Math.sin((2 * Math.PI * frame) / SAFETY_NET_DURATION + pill.phase);
          return <Pill key={pill.label} x={pill.x} y={centerY + bob} label={pill.label} tone="bad" rotation={slopeAngle - 2 + sway} />;
        })}

        {/* Shipped changes: fall, land on the net, pass through as a check mark */}
        {lanes.map((lane) => {
          const localFrame = localFrameOf(frame, lane.offset);
          const landingY = netTopAt(lane.x, frame) - 26;
          const fallProgress = clamp01(localFrame / FALL_FRAMES);
          const fallY = lerp(-40, NET_END_Y + NET_SAG - 26, fallProgress * fallProgress);
          const pillY = localFrame < FALL_FRAMES ? fallY : landingY;
          const pillOpacity = localFrame < FALL_FRAMES ? clamp01(localFrame / 5) : 1 - smoothstep(FALL_FRAMES + 14, FALL_FRAMES + 28, localFrame);
          const checkProgress = smoothstep(FALL_FRAMES + 6, FALL_FRAMES + 20, localFrame);
          const checkFade = 1 - smoothstep(104, 118, localFrame);
          const checkScale = (0.4 + 0.6 * checkProgress) * (1 + 0.12 * Math.sin(checkProgress * Math.PI));
          return (
            <g key={`ship-${lane.x}`}>
              <g transform={`translate(${lane.x} ${CHECK_Y}) scale(${checkScale})`} opacity={checkProgress * checkFade}>
                <circle r={30} fill="#22c55e" opacity={0.45} filter="url(#net-glow)" />
                <circle r={24} fill="#22c55e" />
                <path d="M -10 1 L -3 8 L 11 -8" fill="none" stroke={colors.background} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <Pill x={lane.x} y={pillY} label={lane.label} tone="good" opacity={pillOpacity} />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
