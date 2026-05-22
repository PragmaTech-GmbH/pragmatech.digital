// Renders the OG/social thumbnail (1200x630) for the AI Productivity Paradox
// 2026 report landing page. Uses the report cover PNG as the visual hero.

import { readFile, writeFile, mkdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(HERE, '..', '..', 'static');
const COVER_FILE = join(STATIC_DIR, 'images', 'reports', 'ai-productivity-paradox-2026', 'cover-lg.png');
const LOGO_FILE = join(STATIC_DIR, 'images', 'logo.png');
const OUTPUT_FILE = join(STATIC_DIR, 'images', 'reports', 'ai-productivity-paradox-2026', 'social-thumbnail.png');

async function toDataUri(filePath, mime) {
  const bytes = await readFile(filePath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function buildHtml({ coverDataUri, logoDataUri }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>social thumbnail</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg-deep:   #0B1220;
    --bg-mid:    #0F172A;
    --ink:       #F8FAFC;
    --muted:     #94A3B8;
    --brand:     #38BDF8;
    --brand-dim: #0EA5E9;
    --accent:    #22D3EE;
    --line:      rgba(148,163,184,0.18);
  }
  html, body { margin: 0; padding: 0; }
  body {
    width: 1200px;
    height: 630px;
    background: var(--bg-deep);
    color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    overflow: hidden;
  }
  .card {
    position: relative;
    width: 1200px;
    height: 630px;
    background:
      radial-gradient(1100px 600px at 85% 110%, rgba(14,165,233,0.18), transparent 60%),
      radial-gradient(900px 500px at 0% 0%, rgba(34,211,238,0.10), transparent 55%),
      linear-gradient(135deg, #0B1220 0%, #0F172A 55%, #0B1220 100%);
    overflow: hidden;
  }
  /* faint grid pattern */
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at 30% 50%, black 35%, transparent 75%);
  }
  /* glow behind the cover */
  .glow {
    position: absolute;
    right: -120px;
    top: 50%;
    transform: translateY(-50%);
    width: 720px;
    height: 720px;
    background: radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0.10) 35%, transparent 65%);
    filter: blur(10px);
  }
  /* top accent rail */
  .rail {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 6px;
    background: linear-gradient(90deg, #22D3EE 0%, #38BDF8 35%, #0EA5E9 65%, #0B1220 100%);
  }
  .inner {
    position: relative;
    z-index: 2;
    width: 100%; height: 100%;
    padding: 56px 60px;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 48px;
    align-items: center;
  }
  .brand-row {
    display: flex; align-items: center; gap: 12px;
    margin-bottom: 28px;
  }
  .brand-row img {
    width: 36px; height: 36px;
    filter: drop-shadow(0 4px 12px rgba(56,189,248,0.4));
  }
  .brand-row .name {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 700;
    font-size: 20px;
    letter-spacing: 0.02em;
  }
  .brand-row .name .accent { color: var(--brand); }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 8px 14px;
    border: 1px solid rgba(56,189,248,0.35);
    background: rgba(14,165,233,0.10);
    color: var(--brand);
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    margin-bottom: 22px;
  }
  .eyebrow .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--brand);
    box-shadow: 0 0 0 4px rgba(56,189,248,0.22);
  }
  h1 {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 60px;
    line-height: 1.02;
    font-weight: 700;
    letter-spacing: -0.025em;
    margin: 0 0 18px 0;
    color: var(--ink);
  }
  h1 .accent {
    background: linear-gradient(90deg, #22D3EE 0%, #38BDF8 60%, #0EA5E9 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-style: italic;
  }
  .subhead {
    font-size: 19px;
    line-height: 1.4;
    color: #CBD5E1;
    font-weight: 400;
    margin: 0 0 28px 0;
    max-width: 640px;
  }
  .subhead strong { color: var(--ink); font-weight: 600; }
  .kpis {
    display: flex; gap: 14px;
    margin-bottom: 28px;
  }
  .kpi {
    flex: 0 0 auto;
    padding: 12px 16px;
    background: rgba(15,23,42,0.65);
    border: 1px solid var(--line);
    border-radius: 12px;
    backdrop-filter: blur(6px);
  }
  .kpi .v {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 24px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.01em;
    line-height: 1;
  }
  .kpi .v .unit { font-size: 14px; color: var(--brand); margin-left: 2px; }
  .kpi .l {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--muted);
    margin-top: 6px;
  }
  .footer {
    position: absolute;
    left: 60px; right: 60px;
    bottom: 28px;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px;
    color: var(--muted);
    letter-spacing: 0.18em;
    text-transform: uppercase;
    font-weight: 600;
    padding-top: 16px;
    border-top: 1px solid var(--line);
  }
  .footer .right { color: var(--brand); }
  /* Right column: tilted cover preview */
  .cover-wrap {
    position: relative;
    display: flex; align-items: center; justify-content: center;
    padding: 20px 24px 30px 0; /* room for badge + footer */
  }
  .cover-stack {
    position: relative;
    width: 320px;
    aspect-ratio: 1440 / 2037;
  }
  .cover {
    position: relative;
    width: 320px;
    height: auto;
    aspect-ratio: 1440 / 2037;
    border-radius: 8px;
    overflow: hidden;
    box-shadow:
      0 30px 60px rgba(0,0,0,0.55),
      0 12px 24px rgba(0,0,0,0.35),
      0 0 0 1px rgba(148,163,184,0.18);
    transform: rotate(-4deg);
    background: #0B1220;
  }
  .cover img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* subtle shine over the cover */
  .cover::after {
    content: "";
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.06) 100%);
    pointer-events: none;
  }
  /* small floating badge on cover */
  .badge {
    position: absolute;
    z-index: 3;
    top: -14px; right: -10px;
    background: linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%);
    color: #0B1220;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 800;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    padding: 9px 14px;
    border-radius: 999px;
    box-shadow: 0 14px 28px rgba(56,189,248,0.45);
    transform: rotate(8deg);
    white-space: nowrap;
  }
</style>
</head>
<body>
  <div class="card">
    <div class="rail"></div>
    <div class="grid"></div>
    <div class="glow"></div>

    <div class="inner">
      <div class="left">
        <div class="brand-row">
          <img src="${logoDataUri}" alt="" />
          <div class="name">Pragma<span class="accent">Tech</span></div>
        </div>

        <div class="eyebrow"><span class="dot"></span>Industry Report &middot; 2026</div>

        <h1>
          The AI Productivity<br/>
          <span class="accent">Paradox.</span>
        </h1>

        <p class="subhead">
          What <strong>92 Spring Boot engineers</strong> say AI is really doing to their test pipelines, code reviews and development workflow.
        </p>

        <div class="kpis">
          <div class="kpi">
            <div class="v">92</div>
            <div class="l">Engineers</div>
          </div>
          <div class="kpi">
            <div class="v">~55<span class="unit">%</span></div>
            <div class="l">Speed &amp; Quality</div>
          </div>
          <div class="kpi">
            <div class="v">21.9<span class="unit">%</span></div>
            <div class="l">Blame Slow Builds</div>
          </div>
          <div class="kpi">
            <div class="v">25<span class="unit">%</span></div>
            <div class="l">Blame AI Code</div>
          </div>
        </div>
      </div>

      <div class="cover-wrap">
        <div class="cover-stack">
          <div class="cover">
            <img src="${coverDataUri}" alt="Cover" />
          </div>
          <div class="badge">Free Download</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>Build &amp; Ship Software w/ Confidence</span>
      <span class="right">pragmatech.digital</span>
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  console.log('• loading assets');
  const [coverDataUri, logoDataUri] = await Promise.all([
    toDataUri(COVER_FILE, 'image/png'),
    toDataUri(LOGO_FILE, 'image/png'),
  ]);

  const html = buildHtml({ coverDataUri, logoDataUri });
  const transientFile = join(HERE, '_rendered-social-thumbnail.html');
  await writeFile(transientFile, html, 'utf8');

  console.log('• launching headless Chromium');
  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(transientFile).href, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts && document.fonts.ready);

    if (!existsSync(dirname(OUTPUT_FILE))) await mkdir(dirname(OUTPUT_FILE), { recursive: true });

    await page.screenshot({
      path: OUTPUT_FILE,
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 630 },
      omitBackground: false,
    });

    const kb = (await stat(OUTPUT_FILE)).size / 1024;
    console.log(`✓ wrote ${OUTPUT_FILE} (${kb.toFixed(1)} KB)`);
  } finally {
    await browser.close();
    try { await unlink(transientFile); } catch { /* fine */ }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
