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

Outputs:

- `output/report.pdf` - local working copy (gitignored).
- `../../static/documents/PragmaTech-Spring-Boot-Developer-Productivity-Report-2026.pdf` -
  the committed lead magnet served by Hugo at `/documents/...pdf`.

## Edit

| To change … | Edit … |
|---|---|
| The numbers in the charts | `data/sample.json` |
| Page copy, headlines, takeaways | `data/sample.json` |
| Layout, colours, typography | `template/styles-editorial.css` |
| Page structure or chart SVG | `template/report.html` |

The template uses `{{dotted.path}}` placeholders that resolve against `data/sample.json`.

## Sample vs. real data

`data/sample.json` now holds the real 2026 survey results, so `samplePages` is `[]`
and no `SAMPLE` watermark appears in the output. If you start a future edition with
placeholder numbers, list the page indices (1-based) you want watermarked in
`samplePages` — e.g. `[2, 3, 4, 5]`.
