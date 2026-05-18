// Renders the PragmaTech "AI Productivity Paradox 2026" lead-magnet PDF.
// Reads template/report.html + data/sample.json, fills placeholders, prints
// with headless Chromium, and writes the PDF to output/ AND static/documents/.

import { readFile, writeFile, unlink, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(HERE, 'template');
const TEMPLATE_FILE = join(TEMPLATE_DIR, 'report.html');
const DATA_FILE = join(HERE, 'data', 'sample.json');
const OUTPUT_DIR = join(HERE, 'output');
const PUBLIC_DIR = resolve(HERE, '..', '..', 'static', 'documents');
const LOGO_FILE = resolve(HERE, '..', '..', 'static', 'images', 'logo.png');

// Two visual variants share the same template + data; they differ only by
// stylesheet. The canonical lead-magnet filename
// (Spring-Boot-Developer-Productivity-Report-2026.pdf) stays bound to the
// editorial variant so the Hugo links wired to that path keep working; the
// classic variant lands beside it with a -Classic suffix.
const VARIANTS = [
  {
    key: 'editorial',
    cssHref: 'styles-editorial.css',
    outputName: 'report-editorial.pdf',
    publicName: 'Spring-Boot-Developer-Productivity-Report-2026.pdf',
  },
  {
    key: 'classic',
    cssHref: 'styles-classic.css',
    outputName: 'report-classic.pdf',
    publicName: 'Spring-Boot-Developer-Productivity-Report-2026-Classic.pdf',
  },
];

// Palette tokens used by inline SVG chart fills. Mirror styles.css so the PDF
// stays visually aligned with the rest of pragmatech.digital.
const PALETTE = {
  'primary':       '#0284c7',  // brand-600
  'primary-dark':  '#0369a1',  // brand-700
  'hot':           '#DC2626',  // terra (semantic red for frustration data)
  'warn':          '#D97706',  // amber-600 (semantic warning)
  'neutral':       '#475569',  // slate-600
  'neutral-dark':  '#0f172a',  // slate-900
  'muted':         '#94a3b8',  // slate-400
  'success':       '#10b981',  // emerald-500
};
const fill = (token) => PALETTE[token] || PALETTE.neutral;

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Many JSON fields already carry hand-authored entities (&times;, &mdash;,
// &lsquo;, etc.) and inline HTML (<strong>, <em>, <br/>). We must pass them
// through unchanged. Use this helper for any field meant as rich text.
const raw = (s) => String(s == null ? '' : s);

// Wrap each entry in <p>...</p>, preserving inline HTML.
const joinParagraphs = (arr, klass) => (arr || [])
  .map((p) => `<p${klass ? ` class="${klass}"` : ''}>${raw(p)}</p>`)
  .join('');

// Join short lines into one block with <br/> separators.
const joinBreaks = (arr) => (arr || []).map(raw).join('<br/>');

// ----------------------------------------------------------------------------
// Chunk builders
// ----------------------------------------------------------------------------

function buildCoverIssueLineHtml(cover) {
  return (cover.issueLine || []).map((s) => `<span>${raw(s)}</span>`).join('');
}

function buildCoverBigTitleHtml(cover) {
  const lines = (cover.bigTitleLines || []).map(raw).join('<br>');
  const accent = cover.bigTitleAccent
    ? `${lines ? '<br>' : ''}<span class="accent">${raw(cover.bigTitleAccent)}</span>`
    : '';
  return `${lines}${accent}`;
}

function buildCoverKpisHtml(cover) {
  return (cover.kpis || []).map((k) => `
    <div class="kpi">
      <div class="v">${raw(k.value)}${k.valueSuffix ? `<span style="font-size:18pt;">${raw(k.valueSuffix)}</span>` : ''}</div>
      <div class="l">${raw(k.label)}</div>
    </div>`).join('');
}

function buildFourNumbersHtml(items) {
  return (items || []).map((c) => {
    const toneClass = c.tone === 'hot' ? ' hot' : c.tone === 'gold' ? ' gold' : '';
    return `
      <div class="stat-card${toneClass}">
        <div class="v">${raw(c.value)}${c.valueSuffix ? `<span style="font-size:14pt;">${raw(c.valueSuffix)}</span>` : ''}</div>
        <div class="l">${raw(c.label)}</div>
      </div>`;
  }).join('');
}

function buildSummaryColumnsHtml(columns) {
  return (columns || []).map((col) => `
    <div>
      <h3>${raw(col.h3)}</h3>
      ${joinParagraphs(col.paragraphs)}
    </div>`).join('');
}

function buildFieldworkHtml(fieldwork) {
  return (fieldwork || []).map((row) => `
    <tr><td>${raw(row.field)}</td><td class="num">${raw(row.value)}</td></tr>
  `).join('');
}

// Donut chart from segments. Anchored at -90° (12 o'clock), arcs go clockwise.
// outer r = 80, inner r = 50 — keeps the legend layout compatible with
// the same viewBox the editorial source used (360 x 260).
function buildDonutSvg(companySize) {
  const segments = companySize.segments || [];
  const total = segments.reduce((acc, s) => acc + Number(s.share || 0), 0) || 100;
  const R_OUT = 80;
  const R_IN = 50;
  let cumAngle = -Math.PI / 2;

  const arcs = segments.map((seg) => {
    const sweep = (Number(seg.share || 0) / total) * Math.PI * 2;
    const start = cumAngle;
    const end = cumAngle + sweep;
    cumAngle = end;

    const x1o = Math.cos(start) * R_OUT;
    const y1o = Math.sin(start) * R_OUT;
    const x2o = Math.cos(end) * R_OUT;
    const y2o = Math.sin(end) * R_OUT;
    const x1i = Math.cos(end) * R_IN;
    const y1i = Math.sin(end) * R_IN;
    const x2i = Math.cos(start) * R_IN;
    const y2i = Math.sin(start) * R_IN;
    const largeArc = sweep > Math.PI ? 1 : 0;

    const d = [
      `M ${x1o.toFixed(2)},${y1o.toFixed(2)}`,
      `A ${R_OUT},${R_OUT} 0 ${largeArc},1 ${x2o.toFixed(2)},${y2o.toFixed(2)}`,
      `L ${x1i.toFixed(2)},${y1i.toFixed(2)}`,
      `A ${R_IN},${R_IN} 0 ${largeArc},0 ${x2i.toFixed(2)},${y2i.toFixed(2)}`,
      'Z',
    ].join(' ');

    return `<path d="${d}" fill="${fill(seg.color)}"/>`;
  }).join('\n');

  const legend = segments.map((seg, i) => {
    const y = i * 40;
    return `
      <rect x="0" y="${y}" width="10" height="10" fill="${fill(seg.color)}"/>
      <text x="16" y="${y + 8.5}" font-size="9" font-weight="700">${raw(seg.label)}</text>
      <text x="16" y="${y + 20}" font-size="8" fill="#475569">${seg.count} · ${seg.share}%</text>`;
  }).join('');

  return `
    <svg viewBox="0 0 360 260" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <g transform="translate(120,130)">
        ${arcs}
        <circle r="46" fill="#f8fafc"/>
        <text x="0" y="-2" text-anchor="middle" font-size="22" font-weight="800" letter-spacing="-1">${companySize.n}</text>
        <text x="0" y="14" text-anchor="middle" font-size="8" font-weight="600" letter-spacing="1.2" fill="#475569">${raw(companySize.centerLabel || 'RESPONDENTS')}</text>
      </g>
      <g transform="translate(225,55)">
        ${legend}
      </g>
    </svg>`;
}

// Horizontal bar chart. Each bar has a grey track + colored fill scaled by value.
// Includes an optional legend rendered below the axis.
function buildHorizontalBarsSvg({ bars, axisMax, legend }) {
  const rowH = 22;
  const rowGap = 12;                                     // 34 per row total
  const labelXEnd = 215;
  const trackX = 220;
  const trackW = 270;                                    // narrower so longest bars don't overlap the value text on the right
  const valueX = 545;                                    // % value right-edge (text-anchor: end)
  const maxFill = 250;                                   // ≤ trackW; gives ~25px breathing room between bar end and label

  const max = axisMax || Math.max(...bars.map((b) => Number(b.value || 0)));
  const scale = (maxFill / max);

  // If any bar carries 2 decimals of meaningful precision, format the whole
  // chart with 2 decimals; otherwise 1 decimal. Matches the source report
  // (Q1/Q2 use 1 decimal; Q3/Q6 use 2).
  const needsTwoDecimals = bars.some((b) => {
    const v = Number(b.value || 0);
    return Math.round(v * 10) / 10 !== v;
  });
  const decimals = needsTwoDecimals ? 2 : 1;

  const rows = bars.map((b, i) => {
    const yTop = 4 + i * (rowH + rowGap);
    const yMid = yTop + 14;
    const fillW = Math.max(0, Math.min(maxFill, Number(b.value || 0) * scale));
    return `
      <text x="${labelXEnd}" y="${yMid}" text-anchor="end">${raw(b.label)}</text>
      <rect x="${trackX}" y="${yTop}" width="${trackW}" height="${rowH}" fill="#E5E7EB"/>
      <rect x="${trackX}" y="${yTop}" width="${fillW.toFixed(2)}" height="${rowH}" fill="${fill(b.color)}"/>
      <text x="${valueX}" y="${yMid}" text-anchor="end" fill="#0f172a" font-weight="800" font-size="10.5">${Number(b.value).toFixed(decimals)}%</text>`;
  }).join('\n');

  const axisY = 4 + bars.length * (rowH + rowGap) + 9;
  const axisLabelY = axisY + 12;

  const midLabel = Math.round(max / 2);

  // Legend (optional). 4 entries per row, two rows if needed.
  const legendY = axisLabelY + 22;
  const legendHtml = legend && legend.length
    ? buildBarLegendSvg(legend, legendY)
    : '';

  const viewboxH = legend && legend.length
    ? legendY + Math.ceil(legend.length / 3) * 28
    : axisLabelY + 8;

  return `
    <svg viewBox="0 0 580 ${viewboxH}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg">
      <g font-size="9" font-weight="600">
        ${rows}
        <line x1="${trackX}" y1="${axisY}" x2="${trackX + trackW}" y2="${axisY}" stroke="#475569" stroke-width="0.5"/>
        <text x="${trackX}" y="${axisLabelY}" font-size="7" fill="#475569">0%</text>
        <text x="${trackX + trackW / 2}" y="${axisLabelY}" font-size="7" fill="#475569" text-anchor="middle">${midLabel}%</text>
        <text x="${trackX + trackW}" y="${axisLabelY}" font-size="7" fill="#475569" text-anchor="end">${max}%</text>
        ${legendHtml}
      </g>
    </svg>`;
}

function buildBarLegendSvg(legend, startY) {
  // Layout legend chips on a 580-wide canvas: up to 3 per row, ~170px gap.
  const perRow = 3;
  const colW = 180;
  const baseX = 40;
  return legend.map((item, i) => {
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const x = baseX + col * colW;
    const y = startY + row * 24;
    return `
      <rect x="${x}" y="${y}" width="10" height="10" fill="${fill(item.color)}"/>
      <text x="${x + 16}" y="${y + 9}" font-size="8.5" font-weight="600">${raw(item.label)}</text>`;
  }).join('');
}

function buildQuotesColsHtml(quotes, fontSize = '11pt') {
  return (quotes || []).map((q) => `
    <div>
      <div class="pullquote" style="font-size:${fontSize};">
        ${raw(q.text)}
        <span class="attr">${raw(q.attribution)}</span>
      </div>
    </div>`).join('');
}

function buildSignalParagraphsHtml(signal) {
  return joinParagraphs((signal && signal.paragraphs) || [], null)
    .replace(/<p>/g, '<p style="font-size:9.5pt;">');
}

function buildPatternParagraphsHtml(pattern) {
  return joinParagraphs((pattern && pattern.paragraphs) || [], null)
    .replace(/<p>/g, '<p style="font-size:10pt;">');
}

function buildCalloutAsideParagraphsHtml(callout) {
  // Inside a .callout: first paragraph default, subsequent paragraphs get top margin.
  return ((callout && callout.paragraphs) || []).map((p, i) => {
    const style = i === 0 ? 'font-size:10pt;' : 'font-size:10pt; margin-top:3mm;';
    return `<p style="${style}">${raw(p)}</p>`;
  }).join('');
}

function buildAnalysisStatCardsHtml(cards) {
  return (cards || []).map((c, i) => {
    const toneClass = c.tone === 'hot' ? ' hot' : c.tone === 'gold' ? ' gold' : '';
    const marginBottom = i < cards.length - 1 ? 'margin-bottom: 4mm;' : '';
    return `
      <div class="stat-card${toneClass}" style="${marginBottom}">
        <div class="v">${raw(c.value)}${c.valueSuffix ? `<span style="font-size:14pt;">${raw(c.valueSuffix)}</span>` : ''}</div>
        <div class="l">${raw(c.label)}</div>
        <p class="sub">${raw(c.sub)}</p>
      </div>`;
  }).join('');
}

function buildAnalysisBulletsHtml(bullets) {
  return (bullets || []).map((b, i) => {
    const style = i < bullets.length - 1 ? 'margin-bottom:1.5mm;' : '';
    return `<li style="${style}">${raw(b)}</li>`;
  }).join('');
}

function buildRecommendationsHtml(items) {
  return (items || []).map((item) => `
    <div class="rec">
      <div class="num">${raw(item.num)}</div>
      <div>
        <h4>${raw(item.title)}</h4>
        <p>${raw(item.body)}</p>
        <span class="tie">${raw(item.tie)}</span>
      </div>
    </div>`).join('');
}

function buildOfferH2Html(offer) {
  const head = (offer.h2Lines || []).map(raw).join('<br/>');
  const accent = offer.h2Accent
    ? `${head ? ' ' : ''}<span class="accent">${raw(offer.h2Accent)}</span>`
    : '';
  return `${head}${accent}`;
}

function buildOfferBadgesHtml(badges) {
  return (badges || []).map((b) => `<span>${raw(b)}</span>`).join('');
}

function buildBlueprintHtml(offer) {
  const steps = (offer.blueprint || []).map((s) => `
    <div class="step">
      <div class="n">${raw(s.n)}</div>
      <div class="body">
        <h4>${raw(s.h4)}</h4>
        <p>${raw(s.p)}</p>
      </div>
    </div>`).join('');

  const closer = offer.blueprintCloser ? `
    <div class="step closer">
      <div class="n">&rarr;</div>
      <div class="body">
        <h4>${raw(offer.blueprintCloser.h4)}</h4>
        <p>${raw(offer.blueprintCloser.p)}</p>
      </div>
    </div>` : '';

  return steps + closer;
}

function buildAboutSourcesHtml(sources) {
  return (sources || []).map((s) => `<p style="font-size: 9pt;">${raw(s)}</p>`).join('');
}

function buildAboutRightCtaParagraphsHtml(paragraphs) {
  return (paragraphs || []).map((p, i) => {
    const style = i === 0 ? '' : 'margin-top: 3mm;';
    return `<p${style ? ` style="${style}"` : ''}>${raw(p)}</p>`;
  }).join('');
}

// ----------------------------------------------------------------------------
// Build all chunks at once
// ----------------------------------------------------------------------------

function buildChunks(data) {
  const samplePages = new Set(data.samplePages || []);
  const watermark = '<div class="watermark"><div class="text">SAMPLE</div></div>';
  const wm = (n) => samplePages.has(n) ? watermark : '';

  return {
    // Cover
    coverIssueLineHtml: buildCoverIssueLineHtml(data.cover),
    coverBigTitleHtml:  buildCoverBigTitleHtml(data.cover),
    coverKpisHtml:      buildCoverKpisHtml(data.cover),

    // Executive Summary
    summaryHeadlineHtml:      joinBreaks(data.executiveSummary.headlineLines),
    summaryColumnsHtml:       buildSummaryColumnsHtml(data.executiveSummary.columns),
    summaryFourNumbersHtml:   buildFourNumbersHtml(data.executiveSummary.fourNumbers),

    // Methodology
    methodologyHeadlineHtml:  joinBreaks(data.methodology.headlineLines),
    methodologyFieldworkHtml: buildFieldworkHtml(data.methodology.fieldwork),
    methodologyDonutSvg:      buildDonutSvg(data.methodology.companySize),

    // Q1
    q1HeadlineHtml:           joinBreaks(data.q1Priorities.headlineLines),
    q1BarsSvg:                buildHorizontalBarsSvg({
                                bars: data.q1Priorities.bars,
                                axisMax: data.q1Priorities.axisMax,
                              }),
    q1SignalParagraphsHtml:   buildSignalParagraphsHtml(data.q1Priorities.signal),

    // Q2
    q2HeadlineHtml:           joinBreaks(data.q2Bottlenecks.headlineLines),
    q2BarsSvg:                buildHorizontalBarsSvg({
                                bars: data.q2Bottlenecks.bars,
                                axisMax: data.q2Bottlenecks.axisMax,
                              }),
    q2QuotesHtml:             buildQuotesColsHtml(data.q2Bottlenecks.quotes, '11pt'),

    // Q3
    q3HeadlineHtml:           joinBreaks(data.q3FrictionMap.headlineLines),
    q3BarsSvg:                buildHorizontalBarsSvg({
                                bars: data.q3FrictionMap.bars,
                                axisMax: data.q3FrictionMap.axisMax,
                                legend: data.q3FrictionMap.legend,
                              }),

    // Q6
    q6HeadlineHtml:           joinBreaks(data.q6SpringBoot.headlineLines),
    q6BarsSvg:                buildHorizontalBarsSvg({
                                bars: data.q6SpringBoot.bars,
                                axisMax: data.q6SpringBoot.axisMax,
                                legend: data.q6SpringBoot.legend,
                              }),
    q6PatternParagraphsHtml:      buildPatternParagraphsHtml(data.q6SpringBoot.pattern),
    q6CalloutAsideParagraphsHtml: buildCalloutAsideParagraphsHtml(data.q6SpringBoot.calloutAside),

    // Analysis
    analysisHeadlineHtml:    joinBreaks(data.analysis.headlineLines),
    analysisStatCardsHtml:   buildAnalysisStatCardsHtml(data.analysis.statCards),
    analysisBulletsHtml:     buildAnalysisBulletsHtml(data.analysis.rightColumn.bullets),

    // Recommendations
    recommendationsHeadlineHtml: joinBreaks(data.recommendations.headlineLines),
    recommendationsHtml:         buildRecommendationsHtml(data.recommendations.items),

    // Offer
    offerH2Html:    buildOfferH2Html(data.offer),
    offerBadgesHtml: buildOfferBadgesHtml(data.offer.badges),
    blueprintHtml:   buildBlueprintHtml(data.offer),

    // About
    aboutHeadlineHtml:             joinBreaks(data.about.headlineLines),
    aboutLeftParagraphsHtml:       joinParagraphs(data.about.leftColumn.aboutParagraphs)
                                     .replace(/<p>/g, '<p style="font-size: 10pt;">'),
    aboutSourcesHtml:              buildAboutSourcesHtml(data.about.leftColumn.sources),
    aboutRightCtaParagraphsHtml:   buildAboutRightCtaParagraphsHtml(data.about.rightColumn.ctaParagraphs),

    // Watermarks (only render if listed in data.samplePages)
    watermarkP2: wm(2),
    watermarkP3: wm(3),
    watermarkP4: wm(4),
    watermarkP5: wm(5),
    watermarkP6: wm(6),
    watermarkP7: wm(7),
    watermarkP8: wm(8),
    watermarkP9: wm(9),
    watermarkP10: wm(10),
    watermarkP11: wm(11),
  };
}

// ----------------------------------------------------------------------------
// Placeholder resolution
// ----------------------------------------------------------------------------

function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

// Substitute all {{path}} placeholders. Pre-built chunks win over data lookups.
// Values that look like raw HTML (chunks, fields ending in *Html, *Svg) pass
// through; primitive data values are emitted *unescaped* because the JSON
// already carries hand-authored HTML entities like &mdash;, &times;, <em>.
function fillTemplate(html, data, chunks) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    if (Object.prototype.hasOwnProperty.call(chunks, path)) return chunks[path];
    const v = resolvePath(data, path);
    if (v == null) {
      console.warn(`  ⚠  unresolved placeholder: ${path}`);
      return '';
    }
    return String(v);
  });
}

async function renderVariant({ browser, template, data, chunks, variant }) {
  const transientFile = join(TEMPLATE_DIR, `_rendered-${variant.key}.html`);
  const outputFile = join(OUTPUT_DIR, variant.outputName);
  const publicFile = join(PUBLIC_DIR, variant.publicName);

  const html = fillTemplate(template, data, { ...chunks, cssHref: variant.cssHref });
  await writeFile(transientFile, html, 'utf8');

  const page = await browser.newPage();
  try {
    await page.goto(pathToFileURL(transientFile).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts && document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await writeFile(outputFile, pdf);
    if (!existsSync(PUBLIC_DIR)) await mkdir(PUBLIC_DIR, { recursive: true });
    await writeFile(publicFile, pdf);

    const kb = (await stat(outputFile)).size / 1024;
    console.log(`✓ [${variant.key}] wrote ${outputFile} (${kb.toFixed(1)} KB)`);
    console.log(`✓ [${variant.key}] wrote ${publicFile}`);
  } finally {
    await page.close();
    try { await unlink(transientFile); } catch { /* fine if already gone */ }
  }
}

async function main() {
  console.log('• reading template + data + logo');
  const [template, rawJson, logoBytes] = await Promise.all([
    readFile(TEMPLATE_FILE, 'utf8'),
    readFile(DATA_FILE, 'utf8'),
    readFile(LOGO_FILE),
  ]);
  const data = JSON.parse(rawJson);
  const logoDataUri = `data:image/png;base64,${logoBytes.toString('base64')}`;
  const chunks = { ...buildChunks(data), logoDataUri };

  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log('• launching headless Chromium');
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    for (const variant of VARIANTS) {
      console.log(`• rendering "${variant.key}" variant`);
      await renderVariant({ browser, template, data, chunks, variant });
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
