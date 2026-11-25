// Renders the 3-page "Top 5 Investments Before You Scale Agentic Coding" lead-magnet PDF.
// Reads template/investments.html + data/investments.json, prints with headless
// Chromium and writes the PDF to output/ and static/documents/lead-bundle/.

import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const templateDirectory = join(baseDirectory, 'template');
const outputDirectory = join(baseDirectory, 'output');
const publicDirectory = resolve(baseDirectory, '..', '..', 'static', 'documents', 'lead-bundle');
const publicName = 'PragmaTech-Top-5-Investments-Before-Scaling-AI-Agents.pdf';

const [template, rawData, logoBytes] = await Promise.all([
  readFile(join(templateDirectory, 'investments.html'), 'utf8'),
  readFile(join(baseDirectory, 'data', 'investments.json'), 'utf8'),
  readFile(resolve(baseDirectory, '..', '..', 'static', 'images', 'logo.png')),
]);
const data = JSON.parse(rawData);

const buildInvestmentHtml = (investment, index) => `
  <article class="investment">
    <h3>${index + 1}. ${investment.title}</h3>
    <dl>
      <dt>Risk</dt><dd>${investment.risk}</dd>
      <dt>Data point</dt><dd>${investment.evidence}</dd>
      <dt>First 30 days</dt><dd>${investment.firstStep}</dd>
      <dt>Measure</dt><dd>${investment.measure}</dd>
    </dl>
  </article>`;

const investmentBlocks = data.investments.map(buildInvestmentHtml);
const chunks = {
  logoDataUri: `data:image/png;base64,${logoBytes.toString('base64')}`,
  firstInvestmentsHtml: investmentBlocks.slice(0, 3).join(''),
  lastInvestmentsHtml: investmentBlocks.slice(3).join(''),
  selfCheckHtml: data.selfCheck.map((statement) => `<li>${statement}</li>`).join(''),
};

const html = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, key) => {
  const value = chunks[key] ?? data[key];
  if (value == null) throw new Error(`unresolved placeholder: ${key}`);
  return String(value);
});

const renderedFile = join(templateDirectory, '_rendered-investments.html');
await writeFile(renderedFile, html, 'utf8');
await mkdir(outputDirectory, { recursive: true });
await mkdir(publicDirectory, { recursive: true });

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(pathToFileURL(renderedFile).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  await writeFile(join(outputDirectory, publicName), pdf);
  await writeFile(join(publicDirectory, publicName), pdf);
  console.log(`wrote ${join(publicDirectory, publicName)}`);
} finally {
  await browser.close();
  await unlink(renderedFile);
}
