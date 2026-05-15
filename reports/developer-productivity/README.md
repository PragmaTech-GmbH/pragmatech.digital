# Spring Boot Developer Productivity Report — Renderer

Generates the lead-magnet PDF promised by the survey landing page at
`/content/spring-boot-developer-productivity-survey.md`.

The renderer is **independent of Hugo**. Run it whenever the source data or template
changes, then commit the resulting PDF in `static/documents/`.

## Render

```bash
cd reports/developer-productivity
npm install            # one-time; downloads Chromium for Puppeteer (~170 MB)
npm run build          # produces the PDF
```

Outputs:

- `output/report.pdf` — local working copy (gitignored).
- `../../static/documents/Spring-Boot-Developer-Productivity-Report-2026.pdf` — the
  committed lead magnet served by Hugo at `/documents/...pdf`.

## Edit

| To change … | Edit … |
|---|---|
| The numbers in the charts | `data/sample.json` |
| Page copy, headlines, takeaways | `data/sample.json` |
| Layout, colours, typography | `template/styles.css` |
| Page structure or chart SVG | `template/report.html` |

The template uses `{{dotted.path}}` placeholders that resolve against `data/sample.json`.

## Sample vs. real data

`data/sample.json` is fabricated. The `samplePages` array in the JSON controls which
pages render the `SAMPLE — preview data` watermark — leave it as `[2,3,4,5]` until the
real 2026 survey results land, then clear it to `[]`.
