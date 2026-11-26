// Renders the LinkedIn thumbnails (1200x630 at 2x) of the two lead magnets into
// output/linkedin/. Same design as render-social-thumbnail.mjs. LinkedIn can crop the
// image to about 2.2:1, so all content stays inside the middle 540px of the height.

import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const staticDirectory = resolve(baseDirectory, '..', '..', 'static');
const outputDirectory = join(baseDirectory, 'output', 'linkedin');

const toDataUri = async (filePath, mimeType) =>
  `data:${mimeType};base64,${(await readFile(filePath)).toString('base64')}`;

const readIconDataUri = async (iconName, color) => {
  const markup = await readFile(join(staticDirectory, 'images', 'logos', `${iconName}.svg`), 'utf8');
  const coloredMarkup = markup.replace('<svg ', `<svg fill="${color}" `);
  return `data:image/svg+xml;base64,${Buffer.from(coloredMarkup).toString('base64')}`;
};

const readCoverDataUri = (folderName, coverName) =>
  toDataUri(join(staticDirectory, 'images', 'reports', folderName, `${coverName}.png`), 'image/png');

const logoDataUri = await toDataUri(join(staticDirectory, 'images', 'logo.png'), 'image/png');

const [productivityCover, investmentsCover, surveyCover] = await Promise.all(
  ['cover-productivity-report', 'cover-top-investments', 'cover-testing-survey']
    .map((coverName) => readCoverDataUri('lead-bundle', coverName)),
);

const tools = await Promise.all([
  ['Claude Code', 'claude', '#d97757'],
  ['GitHub Copilot', 'copilot', '#f8fafc'],
  ['Cursor', 'cursor', '#f8fafc'],
  ['Codex', 'openai', '#f8fafc'],
].map(async ([toolName, iconName, color]) => ({ toolName, iconDataUri: await readIconDataUri(iconName, color) })));

const skills = [
  'unit-testing',
  'slice-testing',
  'slice-web-testing',
  'integration-testing',
  'testcontainers-setup',
  'e2e-ui-testing',
  'test-setup-review',
];

const styles = `
  html, body { margin: 0; padding: 0; }
  body { width: 1200px; height: 630px; overflow: hidden; color: #F8FAFC; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
  .card { position: relative; width: 1200px; height: 630px; overflow: hidden; background:
    radial-gradient(1100px 600px at 85% 110%, rgba(14,165,233,0.18), transparent 60%),
    radial-gradient(900px 500px at 0% 0%, rgba(34,211,238,0.10), transparent 55%),
    linear-gradient(135deg, #0B1220 0%, #0F172A 55%, #0B1220 100%); }
  .grid { position: absolute; inset: 0; background-image:
    linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px);
    background-size: 48px 48px; mask-image: radial-gradient(ellipse at 30% 50%, black 35%, transparent 75%); }
  .glow { position: absolute; right: -120px; top: -45px; width: 720px; height: 720px; filter: blur(10px);
    background: radial-gradient(circle, rgba(56,189,248,0.35) 0%, rgba(56,189,248,0.10) 35%, transparent 65%); }
  .rail { position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #22D3EE 0%, #38BDF8 35%, #0EA5E9 65%, #0B1220 100%); }
  .inner { position: relative; z-index: 2; display: grid; grid-template-columns: 1fr 440px; gap: 36px; align-items: center; width: 100%; height: 100%; box-sizing: border-box; padding: 56px 52px 66px 60px; }
  .brand-row { display: flex; align-items: center; gap: 12px; margin-bottom: 26px; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 22px; }
  .brand-row img { width: 36px; height: 36px; filter: drop-shadow(0 4px 12px rgba(56,189,248,0.4)); }
  .accent-brand { color: #38BDF8; }
  .eyebrow { display: inline-flex; align-items: center; gap: 10px; padding: 8px 14px; margin-bottom: 20px; border: 1px solid rgba(56,189,248,0.35); background: rgba(14,165,233,0.10); color: #38BDF8; border-radius: 999px; font-size: 12px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; }
  .dot { width: 8px; height: 8px; border-radius: 50%; background: #38BDF8; box-shadow: 0 0 0 4px rgba(56,189,248,0.22); }
  h1 { font-family: 'Space Grotesk', sans-serif; font-size: 58px; line-height: 1.04; font-weight: 700; letter-spacing: -0.025em; margin: 0 0 18px; }
  h1 .accent { display: block; padding-right: 6px; font-style: italic; width: fit-content; color: transparent; background: linear-gradient(90deg, #22D3EE 0%, #38BDF8 60%, #0EA5E9 100%); -webkit-background-clip: text; background-clip: text; }
  .subhead { font-size: 21px; line-height: 1.4; color: #CBD5E1; margin: 0 0 28px; max-width: 610px; }
  .subhead strong { color: #F8FAFC; font-weight: 600; }
  .chips { display: flex; gap: 12px; }
  .chip { padding: 12px 15px; background: rgba(15,23,42,0.65); border: 1px solid rgba(148,163,184,0.18); border-radius: 12px; }
  .chip .value { font-family: 'Space Grotesk', sans-serif; font-size: 27px; font-weight: 700; line-height: 1; }
  .chip .label { margin-top: 7px; font-size: 10.5px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; color: #94A3B8; }
  .chip.tool { display: flex; align-items: center; gap: 9px; padding: 12px 13px; font-size: 14px; font-weight: 600; white-space: nowrap; }
  .chip.tool img { width: 22px; height: 22px; }
  .visual { position: relative; display: flex; justify-content: center; align-items: center; }
  .badge { position: absolute; z-index: 5; background: linear-gradient(135deg, #22D3EE 0%, #0EA5E9 100%); color: #0B1220; font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 14px; letter-spacing: 0.14em; text-transform: uppercase; padding: 11px 18px; border-radius: 999px; box-shadow: 0 14px 28px rgba(56,189,248,0.45); transform: rotate(8deg); white-space: nowrap; }

  /* Bundle: three covers as a fan */
  .covers { position: relative; width: 440px; height: 390px; }
  .covers img { position: absolute; width: 238px; border-radius: 7px; box-shadow: 0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(148,163,184,0.28); }
  .covers .left { left: 0; top: 40px; transform: rotate(-9deg); }
  .covers .right { right: 0; top: 40px; transform: rotate(9deg); }
  .covers .front { left: 90px; top: 12px; width: 260px; z-index: 2; }
  .covers + .badge { top: -22px; right: -6px; }

  /* Blueprint: toolbox with the seven skills */
  .toolbox { width: 440px; transform: rotate(-2deg); filter: drop-shadow(0 30px 40px rgba(0,0,0,0.55)); }
  .handle { width: 148px; height: 38px; margin: 0 auto; box-sizing: border-box; border: 9px solid #64748B; border-bottom: 0; border-radius: 20px 20px 0 0; }
  .lid { display: flex; justify-content: space-around; align-items: flex-end; height: 38px; padding: 0 60px; background: #0C4A6E; border-radius: 14px 14px 0 0; }
  .latch { width: 38px; height: 18px; background: #CBD5E1; border-radius: 4px; transform: translateY(9px); }
  .box { padding: 28px 16px 26px; background: linear-gradient(160deg, #0EA5E9 0%, #0284C7 100%); border-radius: 0 0 14px 14px; text-align: center; }
  .box-label { margin-bottom: 18px; font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 700; }
  .skills { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; }
  .skills span { padding: 9px 11px; background: #fff; color: #0F172A; border-radius: 7px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; box-shadow: 0 5px 10px rgba(0,0,0,0.22); }
  .toolbox + .badge { top: -4px; right: 0; }
`;

const buildPage = ({ eyebrow, headline, highlight, subhead, chips, visual }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>${styles}</style>
</head>
<body>
  <div class="card">
    <div class="rail"></div><div class="grid"></div><div class="glow"></div>
    <div class="inner">
      <div>
        <div class="brand-row"><img src="${logoDataUri}" alt="" /><div>Pragma<span class="accent-brand">Tech</span></div></div>
        <div class="eyebrow"><span class="dot"></span>${eyebrow}</div>
        <h1>${headline}<span class="accent">${highlight}</span></h1>
        <p class="subhead">${subhead}</p>
        <div class="chips">${chips}</div>
      </div>
      <div class="visual">${visual}<div class="badge">Free Download</div></div>
    </div>
  </div>
</body>
</html>`;

// The numbers come from data/lead_bundle.yaml.
const statChips = [
  ['614', 'Developers asked'],
  ['92', 'Engineers surveyed'],
  ['5', 'Investments'],
  ['3', 'Free reports'],
].map(([value, label]) => `<div class="chip"><div class="value">${value}</div><div class="label">${label}</div></div>`).join('');

const toolChips = tools
  .map(({ toolName, iconDataUri }) => `<div class="chip tool"><img src="${iconDataUri}" alt="" />${toolName}</div>`)
  .join('');

const thumbnails = [
  {
    fileName: 'linkedin-agentic-development-readiness.png',
    eyebrow: 'Spring Boot &middot; For Engineering Leaders',
    headline: 'Agentic Development',
    highlight: 'Readiness.',
    subhead: 'Know what to fix <strong>before you scale agentic development</strong> for your Java and Spring Boot team.',
    chips: statChips,
    visual: `<div class="covers">
      <img class="left" src="${productivityCover}" alt="" />
      <img class="right" src="${surveyCover}" alt="" />
      <img class="front" src="${investmentsCover}" alt="" />
    </div>`,
  },
  {
    fileName: 'linkedin-spring-boot-testing-skills-blueprint.png',
    eyebrow: 'Developer Blueprint',
    headline: 'Spring Boot Testing',
    highlight: 'Skills Blueprint.',
    subhead: 'Your blueprint for <strong>proper agentic testing</strong> of your Spring Boot applications.',
    chips: toolChips,
    visual: `<div class="toolbox">
      <div class="handle"></div>
      <div class="lid"><span class="latch"></span><span class="latch"></span></div>
      <div class="box">
        <div class="box-label">spring-boot-testing/</div>
        <div class="skills">${skills.map((skillName) => `<span>${skillName}</span>`).join('')}</div>
      </div>
    </div>`,
  },
];

await mkdir(outputDirectory, { recursive: true });
const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
  for (const thumbnail of thumbnails) {
    const renderedFile = join(baseDirectory, '_rendered-linkedin-thumbnail.html');
    await writeFile(renderedFile, buildPage(thumbnail), 'utf8');
    try {
      await page.goto(pathToFileURL(renderedFile).href, { waitUntil: 'networkidle0' });
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(outputDirectory, thumbnail.fileName) });
      console.log(`wrote ${join(outputDirectory, thumbnail.fileName)}`);
    } finally {
      await unlink(renderedFile);
    }
  }
} finally {
  await browser.close();
}
