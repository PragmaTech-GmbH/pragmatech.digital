# Developer Productivity Report — Renderer

Generates the lead-magnet PDF promised by the survey landing page at
`/content/spring-boot-developer-productivity-survey.md`.

As of May 2026, the rendered report is **_The AI Productivity Paradox 2026_** —
the survey results from 92 Spring Boot engineers, framed around the productivity
paradox that AI tooling has surfaced. The PDF filename and Hugo download links
are unchanged (`Spring-Boot-Developer-Productivity-Report-2026.pdf`); only the
contents were swapped when the real survey closed.

The source-of-truth visual reference for the report lives at
`data/result.html` — the static, hand-authored design that was decomposed back
into data + template + renderer for this pipeline.

The renderer is **independent of Hugo**. Run it whenever the source data or template
changes, then commit the resulting PDF in `static/documents/`.

## Render

```bash
cd reports/developer-productivity
npm install            # one-time; downloads Chromium for Puppeteer (~170 MB)
npm run build          # produces the PDF
```

The renderer emits **two visual variants** of the same report from the same
data + template. They differ only by stylesheet.

| Variant | Style | Local output | Public path (served by Hugo) |
|---|---|---|---|
| `editorial` | Dark editorial cover, magazine layout, dark callouts | `output/report-editorial.pdf` | `static/documents/Spring-Boot-Developer-Productivity-Report-2026.pdf` (canonical lead-magnet) |
| `classic` | Light magazine cover with gradient band + yellow year tag, soft brand-blue callouts | `output/report-classic.pdf` | `static/documents/Spring-Boot-Developer-Productivity-Report-2026-Classic.pdf` |

The canonical lead-magnet filename (`Spring-Boot-Developer-Productivity-Report-2026.pdf`)
is bound to the editorial variant so the Hugo links wired to that path (header,
footer, report-success) keep working unchanged. The classic variant lands beside
it with a `-Classic` suffix and can be promoted to canonical by flipping the
`publicName` fields in the `VARIANTS` array in `render.mjs`.

## Edit

| To change … | Edit … |
|---|---|
| The numbers in the charts | `data/sample.json` |
| Page copy, headlines, takeaways | `data/sample.json` |
| Editorial variant layout, colours, typography | `template/styles-editorial.css` |
| Classic variant layout, colours, typography | `template/styles-classic.css` |
| Page structure or chart SVG | `template/report.html` |
| Add/remove a variant | `VARIANTS` array in `render.mjs` |

The template uses `{{dotted.path}}` placeholders that resolve against `data/sample.json`,
plus `{{cssHref}}` which is swapped per-variant by the renderer.

## Sample vs. real data

`data/sample.json` now holds the real 2026 survey results, so `samplePages` is `[]`
and no `SAMPLE` watermark appears in the output. If you start a future edition with
placeholder numbers, list the page indices (1-based) you want watermarked in
`samplePages` — e.g. `[2, 3, 4, 5]`.
