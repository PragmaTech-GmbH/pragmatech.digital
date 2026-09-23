import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadMonoFont } from '@remotion/google-fonts/JetBrainsMono';
import { loadFont as loadSansFont } from '@remotion/google-fonts/Inter';

const { fontFamily: monoFont } = loadMonoFont('normal', { weights: ['400', '700'], subsets: ['latin'] });
const { fontFamily: sansFont } = loadSansFont('normal', { weights: ['500', '700', '800'], subsets: ['latin'] });

// Timeline (30 fps). Plays once on the website and stays on the final frame.
export const NOISE_TO_TESTS_DURATION = 300;
const SWEEP_START = 120;
const SWEEP_END = 165;
const CLEAN_ROWS_START = SWEEP_START + 4;
const CLEAN_ROW_STAGGER = 7;
const TAGLINE_START = 235;

// Colors from the site theme (Tailwind slate / brand / emerald / rose)
const colors = {
  background: '#0f172a',
  panel: '#111c33',
  border: '#1e293b',
  textMuted: '#64748b',
  text: '#cbd5e1',
  white: '#f8fafc',
  brand: '#0ea5e9',
  brandLight: '#38bdf8',
  emerald: '#34d399',
  rose: '#fb7185',
  amber: '#fbbf24',
  violet: '#a78bfa',
};

const PANE_TOP = 96;
const PANE_HEIGHT = 500;
const PANE_SIDE = 40;
const LINE_HEIGHT = 34;

const generatedTestLines = [
  '@SpringBootTest',
  '@AutoConfigureMockMvc',
  'class OwnerControllerTest {',
  '  @MockBean OwnerRepository ownerRepository;',
  '  @MockBean PetTypeRepository petTypeRepository;',
  '  @MockBean VisitRepository visitRepository;',
  '  @MockBean OwnerService ownerService;',
  '  @Test void test1() throws Exception {',
  '    mockMvc.perform(get("/owners/1"))',
  '      .andExpect(status().isOk());',
  '    assertNotNull(result);',
  '  when(ownerRepository.findById(any())).thenReturn(owner);',
  '  verify(ownerRepository, times(1)).findById(any());',
  '  @Test void shouldWork() {',
  '    assertTrue(true);',
  '    Thread.sleep(2000); // wait for async',
  '@DirtiesContext',
  '  // TODO: flaky on CI, retry',
  '  @Test void testFindOwner2() {',
  '    assertThat(response.getStatusCode()).isEqualTo(200);',
];

const suspiciousMarkers = ['@SpringBootTest', '@MockBean', '@DirtiesContext', 'Thread.sleep', 'assertTrue(true)', 'TODO', 'isEqualTo(200)'];
const noiseGlyphs = '█▓▒░#@%&*<>/\\{}[]=+~?!';

type CleanTest = { name: string; type: string; typeColor: string; duration: string };

const cleanTests: CleanTest[] = [
  { name: 'OwnerValidatorTest', type: 'unit', typeColor: colors.emerald, duration: '12 ms' },
  { name: 'PetTypeFormatterTest', type: 'unit', typeColor: colors.emerald, duration: '8 ms' },
  { name: 'OwnerControllerTest', type: '@WebMvcTest', typeColor: colors.brandLight, duration: '0.4 s' },
  { name: 'OwnerRepositoryTest', type: '@DataJpaTest + Testcontainers', typeColor: colors.brandLight, duration: '1.1 s' },
  { name: 'OwnerIntegrationTest', type: '@SpringBootTest', typeColor: colors.violet, duration: '2.3 s' },
  { name: 'VisitBookingE2ETest', type: 'end-to-end', typeColor: colors.amber, duration: '3.1 s' },
];

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const corruptLine = (line: string, lineIndex: number, frame: number, noiseLevel: number) => {
  const flickerStep = Math.floor(frame / 2);
  return line
    .split('')
    .map((character, characterIndex) => {
      if (character === ' ') return character;
      const roll = random(`c-${lineIndex}-${characterIndex}-${flickerStep}`);
      if (roll >= noiseLevel) return character;
      const glyphIndex = Math.floor(random(`g-${lineIndex}-${characterIndex}-${flickerStep}`) * noiseGlyphs.length);
      return noiseGlyphs[glyphIndex];
    })
    .join('');
};

const formatBuildTime = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const PromptBar: React.FC<{ frame: number; cleanProgress: number }> = ({ frame, cleanProgress }) => {
  const promptText = 'write tests for OwnerController';
  const typedCharacters = Math.floor(interpolate(frame, [4, 28], [0, promptText.length], clamp));
  const cursorVisible = Math.floor(frame / 8) % 2 === 0;
  const badgeColor = cleanProgress < 0.5 ? colors.rose : colors.emerald;

  return (
    <div
      style={{
        position: 'absolute',
        top: 28,
        left: PANE_SIDE,
        right: PANE_SIDE,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: monoFont,
        fontSize: 26,
      }}
    >
      <div style={{ color: colors.text }}>
        <span style={{ color: colors.brandLight, fontWeight: 700 }}>❯ claude </span>
        <span>"{promptText.slice(0, typedCharacters)}"</span>
        <span style={{ opacity: cursorVisible && typedCharacters < promptText.length ? 1 : 0, color: colors.brandLight }}>▌</span>
      </div>
      <div
        style={{
          fontFamily: sansFont,
          fontWeight: 700,
          fontSize: 20,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: badgeColor,
          border: `2px solid ${badgeColor}`,
          borderRadius: 999,
          padding: '6px 18px',
          background: `${badgeColor}1a`,
        }}
      >
        {cleanProgress < 0.5 ? 'no skills' : '✓ 7 skills loaded'}
      </div>
    </div>
  );
};

const NoiseStream: React.FC<{ frame: number }> = ({ frame }) => {
  // Scroll speeds up while the agent keeps generating
  const scrollOffset = interpolate(frame, [0, SWEEP_END], [0, 2600], { ...clamp, easing: Easing.in(Easing.quad) });
  const noiseLevel = interpolate(frame, [0, SWEEP_START, SWEEP_END], [0.08, 0.35, 0.7], clamp);
  const firstVisibleLine = Math.floor(scrollOffset / LINE_HEIGHT);
  const visibleLineCount = Math.ceil(PANE_HEIGHT / LINE_HEIGHT) + 1;

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: monoFont, fontSize: 22 }}>
      {Array.from({ length: visibleLineCount }).map((_, rowIndex) => {
        const lineIndex = firstVisibleLine + rowIndex;
        const sourceLine = generatedTestLines[(lineIndex * 7 + 3) % generatedTestLines.length];
        const isSuspicious = suspiciousMarkers.some((marker) => sourceLine.includes(marker));
        const glitchRoll = random(`glitch-${lineIndex}-${Math.floor(frame / 3)}`);
        const glitchShift = glitchRoll < noiseLevel * 0.4 ? (random(`shift-${lineIndex}-${frame}`) - 0.5) * 40 : 0;
        return (
          <div
            key={lineIndex}
            style={{
              position: 'absolute',
              left: 24 + glitchShift,
              top: lineIndex * LINE_HEIGHT - scrollOffset + 16,
              whiteSpace: 'pre',
              color: isSuspicious ? colors.rose : colors.textMuted,
              opacity: isSuspicious ? 0.95 : 0.75,
            }}
          >
            {corruptLine(sourceLine, lineIndex, frame, noiseLevel)}
          </div>
        );
      })}
      <NoisePixels frame={frame} density={noiseLevel} />
    </div>
  );
};

const NoisePixels: React.FC<{ frame: number; density: number }> = ({ frame, density }) => {
  const pixelCount = Math.floor(40 + density * 160);
  return (
    <>
      {Array.from({ length: pixelCount }).map((_, pixelIndex) => {
        const seed = `px-${pixelIndex}-${Math.floor(frame / 2)}`;
        const size = 2 + random(`${seed}-s`) * 8;
        return (
          <div
            key={pixelIndex}
            style={{
              position: 'absolute',
              left: `${random(`${seed}-x`) * 100}%`,
              top: `${random(`${seed}-y`) * 100}%`,
              width: size * (random(`${seed}-w`) < 0.2 ? 6 : 1),
              height: size,
              background: random(`${seed}-c`) < 0.3 ? colors.rose : colors.textMuted,
              opacity: 0.1 + random(`${seed}-o`) * 0.3,
            }}
          />
        );
      })}
    </>
  );
};

const CleanResults: React.FC<{ frame: number; fps: number }> = ({ frame, fps }) => {
  const taglineProgress = spring({ frame: frame - TAGLINE_START, fps, config: { damping: 200 } });

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '22px 28px', fontFamily: monoFont }}>
      {cleanTests.map((cleanTest, rowIndex) => {
        const rowProgress = spring({
          frame: frame - (CLEAN_ROWS_START + rowIndex * CLEAN_ROW_STAGGER),
          fps,
          config: { damping: 18, stiffness: 140 },
        });
        return (
          <div
            key={cleanTest.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 62,
              gap: 18,
              fontSize: 24,
              opacity: rowProgress,
              transform: `translateY(${(1 - rowProgress) * 24}px)`,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <span style={{ color: colors.emerald, fontWeight: 700, width: 26 }}>✓</span>
            <span style={{ color: colors.white, width: 360 }}>{cleanTest.name}</span>
            <span
              style={{
                fontFamily: sansFont,
                fontWeight: 700,
                fontSize: 18,
                color: cleanTest.typeColor,
                background: `${cleanTest.typeColor}1f`,
                border: `1px solid ${cleanTest.typeColor}55`,
                borderRadius: 8,
                padding: '4px 12px',
              }}
            >
              {cleanTest.type}
            </span>
            <span style={{ marginLeft: 'auto', color: colors.textMuted }}>{cleanTest.duration}</span>
          </div>
        );
      })}
      <div
        style={{
          marginTop: 30,
          textAlign: 'center',
          fontFamily: sansFont,
          fontWeight: 800,
          fontSize: 34,
          letterSpacing: -0.5,
          color: colors.white,
          opacity: taglineProgress,
          transform: `scale(${0.94 + taglineProgress * 0.06})`,
        }}
      >
        Fast. Comprehensive. <span style={{ color: colors.emerald }}>Trusted.</span>
      </div>
    </div>
  );
};

const ScanLine: React.FC<{ scanY: number; opacity: number }> = ({ scanY, opacity }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: scanY - 2, height: 4, opacity }}>
    <div style={{ height: 4, background: colors.brandLight, boxShadow: `0 0 24px 6px ${colors.brand}aa` }} />
    <div
      style={{
        position: 'absolute',
        right: 20,
        top: -36,
        fontFamily: monoFont,
        fontSize: 18,
        color: colors.brandLight,
        background: colors.background,
        border: `1px solid ${colors.brand}`,
        borderRadius: 6,
        padding: '3px 10px',
      }}
    >
      applying skills…
    </div>
  </div>
);

type Metric = { label: string; noiseValue: string; cleanValue: string; noiseNote: string; cleanNote: string };

const MetricCards: React.FC<{ frame: number; cleanProgress: number }> = ({ frame, cleanProgress }) => {
  const generatedTestCount = Math.floor(interpolate(frame, [10, SWEEP_START], [0, 412], { ...clamp, easing: Easing.in(Easing.quad) }));
  const contextCount = Math.floor(interpolate(frame, [10, SWEEP_START], [1, 37], clamp));
  const buildSeconds = interpolate(frame, [10, SWEEP_START], [45, 18 * 60 + 42], { ...clamp, easing: Easing.in(Easing.cubic) });
  const showClean = cleanProgress >= 0.5;
  const valueColor = showClean ? colors.emerald : colors.rose;

  const metrics: Metric[] = [
    { label: 'Tests', noiseValue: `${generatedTestCount}`, cleanValue: '48', noiseNote: 'check status 200', cleanNote: 'assert behavior' },
    { label: 'Spring contexts', noiseValue: `${contextCount}`, cleanValue: '3', noiseNote: 'one per class', cleanNote: 'cached & reused' },
    { label: 'Build time', noiseValue: formatBuildTime(buildSeconds), cleanValue: '2:51', noiseNote: 'and growing', cleanNote: 'parallel forks' },
  ];

  return (
    <div style={{ position: 'absolute', left: PANE_SIDE, right: PANE_SIDE, top: PANE_TOP + PANE_HEIGHT + 24, display: 'flex', gap: 20 }}>
      {metrics.map((metric) => (
        <div
          key={metric.label}
          style={{
            flex: 1,
            height: 136,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            padding: '16px 22px',
            fontFamily: sansFont,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: colors.textMuted }}>{metric.label}</div>
          <div style={{ fontFamily: monoFont, fontWeight: 700, fontSize: 48, color: valueColor, lineHeight: 1.2 }}>
            {showClean ? metric.cleanValue : metric.noiseValue}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: colors.text }}>{showClean ? metric.cleanNote : metric.noiseNote}</div>
        </div>
      ))}
    </div>
  );
};

export const NoiseToTests: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const sweepProgress = interpolate(frame, [SWEEP_START, SWEEP_END], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const scanY = sweepProgress * PANE_HEIGHT;
  const scanLineOpacity = interpolate(frame, [SWEEP_START, SWEEP_START + 5, SWEEP_END - 5, SWEEP_END], [0, 1, 1, 0], clamp);
  const sceneOpacity = interpolate(frame, [0, 10], [0, 1], clamp);

  return (
    <AbsoluteFill style={{ background: colors.background }}>
      <AbsoluteFill style={{ opacity: sceneOpacity }}>
        <PromptBar frame={frame} cleanProgress={sweepProgress} />

        <div
          style={{
            position: 'absolute',
            top: PANE_TOP,
            left: PANE_SIDE,
            right: PANE_SIDE,
            height: PANE_HEIGHT,
            borderRadius: 16,
            border: `1px solid ${colors.border}`,
            background: colors.panel,
            overflow: 'hidden',
          }}
        >
          {/* Noise stays below the scan line, clean results appear above it */}
          {frame < SWEEP_END && (
            <div style={{ position: 'absolute', inset: 0, clipPath: `inset(${scanY}px 0 0 0)` }}>
              <NoiseStream frame={frame} />
            </div>
          )}
          {frame >= SWEEP_START && (
            <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 ${PANE_HEIGHT - scanY}px 0)` }}>
              <CleanResults frame={frame} fps={fps} />
            </div>
          )}
          <ScanLine scanY={scanY} opacity={scanLineOpacity} />
        </div>

        <MetricCards frame={frame} cleanProgress={sweepProgress} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
