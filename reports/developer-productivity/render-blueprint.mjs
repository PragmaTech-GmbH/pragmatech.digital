// Renders the 5-page "Spring Boot Testing Skills Blueprint" lead-magnet PDF.
// Reads template/blueprint.html, prints it with headless Chromium and writes the PDF to
// output/ and static/documents/skills-blueprint/. It also writes the cover PNG that the
// website shows. Create the WebP version afterwards with scripts/convert-to-webp.sh.

import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import puppeteer from 'puppeteer';

const baseDirectory = dirname(fileURLToPath(import.meta.url));
const templateDirectory = join(baseDirectory, 'template');
const outputDirectory = join(baseDirectory, 'output');
const staticDirectory = resolve(baseDirectory, '..', '..', 'static');
const publicDirectory = join(staticDirectory, 'documents', 'skills-blueprint');
const coverDirectory = join(staticDirectory, 'images', 'reports', 'skills-blueprint');
const publicName = 'PragmaTech-Spring-Boot-Testing-Skills-Blueprint.pdf';
const courseUrl = 'https://pragmatech.digital/agentic-spring-boot-testing-course/'
  + '?utm_source=skills-blueprint&utm_medium=pdf&utm_campaign=agentic-testing-skills-blueprint';

// A4 at 96 dpi, scaled so that the cover PNG is 600x849 like the other report covers.
const pageWidthPixels = 794;
const pageHeightPixels = 1123;
const coverWidthPixels = 600;

// The icons ship without a color. Set one, so they are visible on the dark cover.
const readIconDataUri = async (iconName, color) => {
  const markup = await readFile(join(staticDirectory, 'images', 'logos', `${iconName}.svg`), 'utf8');
  const coloredMarkup = markup.replace('<svg ', `<svg fill="${color}" `);
  return `data:image/svg+xml;base64,${Buffer.from(coloredMarkup).toString('base64')}`;
};

const [template, logoBytes, courseImageBytes] = await Promise.all([
  readFile(join(templateDirectory, 'blueprint.html'), 'utf8'),
  readFile(join(staticDirectory, 'images', 'logo.png')),
  readFile(join(staticDirectory, 'images', 'courses', 'agentic-testing-course-thumbnail.png')),
]);

const values = {
  courseUrl,
  courseImageDataUri: `data:image/png;base64,${courseImageBytes.toString('base64')}`,
  logoDataUri: `data:image/png;base64,${logoBytes.toString('base64')}`,
  claudeIconDataUri: await readIconDataUri('claude', '#d97757'),
  copilotIconDataUri: await readIconDataUri('copilot', '#f8fafc'),
  cursorIconDataUri: await readIconDataUri('cursor', '#f8fafc'),
  codexIconDataUri: await readIconDataUri('openai', '#f8fafc'),
};

const html = template.replace(/\{\{\s*(\w+)\s*\}\}/g, (placeholder, key) => {
  if (values[key] == null) throw new Error(`unresolved placeholder: ${key}`);
  return values[key];
});

const renderedFile = join(templateDirectory, '_rendered-blueprint.html');
await writeFile(renderedFile, html, 'utf8');
await Promise.all([outputDirectory, publicDirectory, coverDirectory]
  .map((directory) => mkdir(directory, { recursive: true })));

const browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({
    width: pageWidthPixels,
    height: pageHeightPixels,
    deviceScaleFactor: coverWidthPixels / pageWidthPixels,
  });
  await page.goto(pathToFileURL(renderedFile).href, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);

  const pdf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  await writeFile(join(outputDirectory, publicName), pdf);
  await writeFile(join(publicDirectory, publicName), pdf);

  await page.screenshot({
    path: join(coverDirectory, 'cover-skills-blueprint.png'),
    clip: { x: 0, y: 0, width: pageWidthPixels, height: pageHeightPixels },
  });
  console.log(`wrote ${join(publicDirectory, publicName)}`);
} finally {
  await browser.close();
  await unlink(renderedFile);
}
