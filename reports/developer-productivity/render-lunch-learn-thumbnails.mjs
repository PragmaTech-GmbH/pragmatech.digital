// Renders the social/OG thumbnail (1200x630) for the Lunch & Learn page
// ("Testing Spring Boot Applications Demystified"). Mirrors the look & feel of
// render-social-thumbnail.mjs and uses the adventure journey map as the hero.

import { readFile, writeFile, mkdir, unlink, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const HERE = dirname(fileURLToPath(import.meta.url));
const STATIC_DIR = resolve(HERE, '..', '..', 'static');
const MAP_FILE = join(STATIC_DIR, 'images', 'webinar', 'tsbad-webinar-map-parts.png');
const LOGO_FILE = join(STATIC_DIR, 'images', 'logo.png');
const OUTPUT_FILE = join(STATIC_DIR, 'images', 'webinar', 'lunch-learn-social-thumbnail.jpg');

async function toDataUri(filePath, mime) {
  const bytes = await readFile(filePath);
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

function buildHtml({ mapDataUri, logoDataUri }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
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
    width: 1200px; height: 630px;
    background: var(--bg-deep); color: var(--ink);
    font-family: 'Inter', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: geometricPrecision;
    overflow: hidden;
  }
  .card {
    position: relative; width: 1200px; height: 630px;
    background:
      radial-gradient(1100px 600px at 85% 110%, rgba(14,165,233,0.18), transparent 60%),
      radial-gradient(900px 500px at 0% 0%, rgba(34,211,238,0.10), transparent 55%),
      linear-gradient(135deg, #0B1220 0%, #0F172A 55%, #0B1220 100%);
    overflow: hidden;
  }
  .grid {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse at 30% 50%, black 35%, transparent 75%);
  }
  .rail {
    position: absolute; top: 0; left: 0; right: 0; height: 6px; z-index: 5;
    background: linear-gradient(90deg, #22D3EE 0%, #38BDF8 35%, #0EA5E9 65%, #0B1220 100%);
  }
  .glow {
    position: absolute; right: -120px; top: 50%; transform: translateY(-50%);
    width: 720px; height: 720px;
    background: radial-gradient(circle, rgba(56,189,248,0.32) 0%, rgba(56,189,248,0.10) 35%, transparent 65%);
    filter: blur(10px);
  }
  .inner {
    position: relative; z-index: 2; width: 100%; height: 100%;
    padding: 52px 60px 70px; box-sizing: border-box;
    display: grid; grid-template-columns: 1fr 470px; gap: 44px; align-items: center;
  }
  .brand-row { display: flex; align-items: center; gap: 12px; }
  .brand-row img { width: 36px; height: 36px; filter: drop-shadow(0 4px 12px rgba(56,189,248,0.4)); }
  .brand-row .name {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 700; font-size: 20px; letter-spacing: 0.02em;
  }
  .brand-row .name .accent { color: var(--brand); }
  .eyebrow {
    display: inline-flex; align-items: center; gap: 10px;
    padding: 8px 14px;
    border: 1px solid rgba(56,189,248,0.35);
    background: rgba(14,165,233,0.10);
    color: var(--brand);
    border-radius: 999px;
    font-size: 11px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase;
    margin: 24px 0 22px;
  }
  .eyebrow .dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: var(--brand); box-shadow: 0 0 0 4px rgba(56,189,248,0.22);
  }
  h1 {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 52px; line-height: 1.04; font-weight: 700; letter-spacing: -0.025em;
    margin: 0 0 18px 0; color: var(--ink);
  }
  h1 .accent {
    background: linear-gradient(90deg, #22D3EE 0%, #38BDF8 60%, #0EA5E9 100%);
    -webkit-background-clip: text; background-clip: text; color: transparent;
    font-style: italic;
  }
  .subhead { font-size: 19px; line-height: 1.4; color: #CBD5E1; max-width: 560px; margin: 0 0 28px; }
  .stats { display: flex; gap: 14px; }
  .stat {
    flex: 0 0 auto; padding: 12px 18px;
    background: rgba(15,23,42,0.65);
    border: 1px solid var(--line); border-radius: 12px; backdrop-filter: blur(6px);
  }
  .stat .v {
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-size: 22px; font-weight: 700; color: var(--ink); line-height: 1;
  }
  .stat .v .unit { font-size: 13px; color: var(--brand); margin-left: 3px; }
  .stat .l {
    font-size: 10px; font-weight: 600; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--muted); margin-top: 6px;
  }
  .map-wrap { position: relative; display: flex; align-items: center; justify-content: center; }
  .map-card {
    position: relative; width: 470px; border-radius: 12px; overflow: hidden; transform: rotate(-3deg);
    box-shadow: 0 30px 60px rgba(0,0,0,0.55), 0 12px 24px rgba(0,0,0,0.35), 0 0 0 1px rgba(148,163,184,0.18);
  }
  .map-card img { display: block; width: 100%; height: auto; }
  .map-card::after {
    content: ""; position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0) 35%, rgba(255,255,255,0) 65%, rgba(255,255,255,0.06) 100%);
    pointer-events: none;
  }
  .badge {
    position: absolute; z-index: 3; top: 6px; right: -8px; transform: rotate(7deg);
    background: linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%);
    color: #0B1220;
    font-family: 'Space Grotesk', 'Inter', sans-serif;
    font-weight: 800; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    padding: 9px 14px; border-radius: 999px;
    box-shadow: 0 14px 28px rgba(56,189,248,0.45); white-space: nowrap;
  }
  .footer {
    position: absolute; left: 60px; right: 60px; bottom: 28px; z-index: 4;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; color: var(--muted);
    letter-spacing: 0.18em; text-transform: uppercase; font-weight: 600;
    padding-top: 16px; border-top: 1px solid var(--line);
  }
  .footer .right { color: var(--brand); }
</style>
</head>
<body>
  <div class="card">
    <div class="rail"></div>
    <div class="grid"></div>
    <div class="glow"></div>

    <div class="inner">
      <div>
        <div class="brand-row">
          <img src="${logoDataUri}" alt="" />
          <div class="name">Pragma<span class="accent">Tech</span></div>
        </div>
        <div class="eyebrow"><span class="dot"></span>Lunch &amp; Learn &middot; Live or On-site</div>
        <h1>Testing Spring Boot<br/>Applications <span class="accent">Demystified</span></h1>
        <p class="subhead">A live tour from the testing labyrinth to fast, fearless shipping.</p>
        <div class="stats">
          <div class="stat"><div class="v">60<span class="unit">min</span></div><div class="l">Talk</div></div>
          <div class="stat"><div class="v">Live</div><div class="l">or Remote</div></div>
          <div class="stat"><div class="v">Free</div><div class="l">Internal events</div></div>
        </div>
      </div>

      <div class="map-wrap">
        <div class="map-card"><img src="${mapDataUri}" alt="Journey map" /></div>
        <div class="badge">Free for teams</div>
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
  const [mapDataUri, logoDataUri] = await Promise.all([
    toDataUri(MAP_FILE, 'image/png'),
    toDataUri(LOGO_FILE, 'image/png'),
  ]);

  const html = buildHtml({ mapDataUri, logoDataUri });
  const transientFile = join(HERE, '_rendered-lunch-learn-thumbnail.html');
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
      type: 'jpeg',
      quality: 85,
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

main().catch((err) => { console.error(err); process.exit(1); });
