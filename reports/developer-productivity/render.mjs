// Renders the Spring Boot Developer Productivity Survey 2026 lead-magnet PDF.
// Reads template/report.html + data/sample.json, fills placeholders, prints with
// headless Chromium, and writes the PDF to output/ AND static/documents/.

import { readFile, writeFile, unlink, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = join(HERE, 'template');
const TEMPLATE_FILE = join(TEMPLATE_DIR, 'report.html');
const TRANSIENT_FILE = join(TEMPLATE_DIR, '_rendered.html');
const DATA_FILE = join(HERE, 'data', 'sample.json');
const OUTPUT_DIR = join(HERE, 'output');
const OUTPUT_FILE = join(OUTPUT_DIR, 'report.pdf');
const PUBLIC_FILE = resolve(
  HERE, '..', '..', 'static', 'documents',
  'Spring-Boot-Developer-Productivity-Report-2026.pdf',
);

const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

// Build derived HTML chunks the template injects via {{placeholders}}.
function buildChunks(data) {
  const samplePages = new Set(data.samplePages || []);
  const watermark = '<div class="watermark"><div class="watermark__text">SAMPLE</div></div>';
  const footerSample = 'SAMPLE — preview data';

  const methodHtml = data.about.methodology
    .map(({ label, value }) => `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd>`)
    .join('');

  const tocHtml = data.about.toc
    .map(({ page, title }) => `<li><span class="toc__page">${escapeHtml(page)}</span><span class="toc__title">${escapeHtml(title)}</span></li>`)
    .join('');

  const kpisHtml = data.about.kpis.map(({ label, value, trend }) => `
    <div class="kpi">
      <div class="kpi__label">${escapeHtml(label)}</div>
      <div class="kpi__value">${escapeHtml(value)}</div>
      <div class="kpi__trend">${escapeHtml(trend)}</div>
    </div>`).join('');

  // Build times: horizontal bars sized against the max value.
  const buildMax = Math.max(...data.buildTimes.bars.map((b) => b.valueSeconds));
  const buildBarsHtml = data.buildTimes.bars.map((b, i) => {
    const widthPct = Math.round((b.valueSeconds / buildMax) * 100);
    const accent = i === data.buildTimes.bars.length - 1 ? ' hbar__fill--accent' : '';
    return `
      <div class="hbar__row">
        <div class="hbar__label">${escapeHtml(b.label)}</div>
        <div class="hbar__track"><div class="hbar__fill${accent}" style="width:${widthPct}%"></div></div>
        <div class="hbar__value">${escapeHtml(b.valueLabel)}</div>
      </div>`;
  }).join('');

  // Convert backtick-quoted spans in the build-time intro into <code> tags.
  const buildIntroHtml = escapeHtml(data.buildTimes.intro)
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);

  // Coverage: vertical bars, peak bucket gets emerald gradient.
  const covMax = Math.max(...data.testCoverage.buckets.map((b) => b.share));
  const coverageVbarHtml = data.testCoverage.buckets.map((b) => {
    const heightPct = Math.round((b.share / covMax) * 100);
    const peak = b.share === covMax ? ' vbar__fill--peak' : '';
    return `
      <div class="vbar__col">
        <div class="vbar__share">${b.share}%</div>
        <div class="vbar__fill${peak}" style="height:${heightPct}%"></div>
      </div>`;
  }).join('');
  const coverageLabelsHtml = data.testCoverage.buckets
    .map((b) => `<div class="vbar__lab">${escapeHtml(b.label)}</div>`)
    .join('');

  // Deploy frequency: horizontal bars scaled to max share.
  const depMax = Math.max(...data.deployFrequency.buckets.map((b) => b.share));
  const deployHtml = data.deployFrequency.buckets.map((b) => {
    const widthPct = Math.round((b.share / depMax) * 100);
    return `
      <div class="deploy__row">
        <div class="deploy__lab">${escapeHtml(b.label)}</div>
        <div class="deploy__track"><div class="deploy__fill" style="width:${widthPct}%"></div></div>
        <div class="deploy__val">${b.share}%</div>
      </div>`;
  }).join('');

  return {
    methodHtml, tocHtml, kpisHtml,
    'buildTimes.introHtml': buildIntroHtml,
    buildBarsHtml,
    coverageVbarHtml, coverageLabelsHtml,
    deployHtml,
    watermarkP2: samplePages.has(2) ? watermark : '',
    watermarkP3: samplePages.has(3) ? watermark : '',
    watermarkP4: samplePages.has(4) ? watermark : '',
    watermarkP5: samplePages.has(5) ? watermark : '',
    footerSampleP2: samplePages.has(2) ? footerSample : '',
    footerSampleP3: samplePages.has(3) ? footerSample : '',
    footerSampleP4: samplePages.has(4) ? footerSample : '',
    footerSampleP5: samplePages.has(5) ? footerSample : '',
  };
}

// Resolve a dotted path against an object — "a.b.c" -> obj.a.b.c.
function resolvePath(obj, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

// Substitute all {{path}} placeholders. Pre-built chunks win over data lookups.
function fillTemplate(html, data, chunks) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path) => {
    if (Object.prototype.hasOwnProperty.call(chunks, path)) return chunks[path];
    const v = resolvePath(data, path);
    if (v == null) {
      console.warn(`  ⚠  unresolved placeholder: ${path}`);
      return '';
    }
    return typeof v === 'string' ? escapeHtml(v) : String(v);
  });
}

async function main() {
  console.log('• reading template + data');
  const [template, raw] = await Promise.all([
    readFile(TEMPLATE_FILE, 'utf8'),
    readFile(DATA_FILE, 'utf8'),
  ]);
  const data = JSON.parse(raw);
  const chunks = buildChunks(data);
  const html = fillTemplate(template, data, chunks);

  console.log('• writing transient HTML');
  await writeFile(TRANSIENT_FILE, html, 'utf8');

  console.log('• launching headless Chromium');
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.goto(pathToFileURL(TRANSIENT_FILE).href, { waitUntil: 'networkidle0' });
    // Belt-and-braces: make sure web fonts are fully loaded before capture.
    await page.evaluate(() => document.fonts && document.fonts.ready);

    console.log('• rendering PDF');
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    await mkdir(OUTPUT_DIR, { recursive: true });
    await writeFile(OUTPUT_FILE, pdf);
    const publicDir = dirname(PUBLIC_FILE);
    if (!existsSync(publicDir)) await mkdir(publicDir, { recursive: true });
    await writeFile(PUBLIC_FILE, pdf);

    const kb = (await stat(OUTPUT_FILE)).size / 1024;
    console.log(`✓ wrote ${OUTPUT_FILE} (${kb.toFixed(1)} KB)`);
    console.log(`✓ wrote ${PUBLIC_FILE}`);
  } finally {
    await browser.close();
    try { await unlink(TRANSIENT_FILE); } catch { /* fine if already gone */ }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
