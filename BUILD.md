# Build Process Documentation

This document describes the build process for the PragmaTech Digital website, both for local development and Netlify deployment.

## Prerequisites

- [Hugo Extended](https://gohugo.io/installation/) (version 0.127.0 or higher)
- [Node.js](https://nodejs.org/) (version 20 or higher)
- [npm](https://www.npmjs.com/) (version 10 or higher)
- [WebP tools](https://developers.google.com/speed/webp/download) for image optimization

## Local Development

For local development, we've set up several npm scripts to make the process easier.

### Installation

```bash
# Install dependencies
npm install
```

### Development Server

```bash
# Start development server with drafts enabled
npm run dev

# Start development server with drafts enabled and navigate to changed pages
npm run dev:watch

# Start production server (no drafts)
npm run start
```

### Building the Site

```bash
# Build the site with image optimization
npm run build

# Build the site with image optimization and future posts
npm run build:preview

# Just run image optimization
npm run optimize:images

# Clean output directories
npm run clean
```

## Images Optimization

The build process automatically optimizes images:

1. The `optimize:images` script converts all PNG, JPG, and JPEG images to WebP format
2. Hugo's built-in image processing creates responsive images
3. The site uses picture elements with WebP sources and appropriate fallbacks
4. All images use lazy loading

## Netlify Deployment

Netlify is configured to:

1. Run `npm run build` for production deployments
2. Run `npm run build:preview` for preview and branch deployments
3. Set appropriate cache headers for static assets
4. Configure security headers for all pages

### Environment Variables

The Netlify configuration in `netlify.toml` sets:

- Node.js and npm versions
- Hugo version and environment
- Base URL for different deployment contexts

## Purchase Power Parity (PPP) Pricing

The course landing page (`content/agentic-spring-boot-testing-course.md`, layout
`course-landing`) shows regional discounts. The moving parts:

- `netlify/edge-functions/ppp.ts` - Netlify Edge Function, runs only for `GET /api/ppp`.
  It maps the visitor country (Netlify geolocation, no external API) to a discount tier
  and returns the coupon code for that tier as JSON.
- `netlify/shared/ppp-country-tiers.ts` - generated country to tier map (public data).
- `themes/pragmatech-theme/assets/js/ppp-pricing.js` - calls `/api/ppp` once per
  session and adjusts prices, checkout links (`promocode=`), a note and a banner.
- Base prices and product names live in the page frontmatter (`ppp.products`).

Coupon codes and CopeCart product IDs are not in the repository. Set them as Netlify
environment variables (Project configuration > Environment variables):

| Variable | Read by | Purpose |
|---|---|---|
| `PPP_PRODUCT_ID_SMALL`, `PPP_PRODUCT_ID_MEDIUM`, `PPP_PRODUCT_ID_LARGE` | Hugo build (`os.Getenv`) | CopeCart product IDs for the checkout links |
| `PPP_COUPON_TIER_2`, `PPP_COUPON_TIER_3`, `PPP_COUPON_TIER_4` | Edge function | Coupon codes for 30 / 50 / 70 % off (tier 1 has no coupon) |
| `PPP_TEST_TOKEN` | Edge function | Optional. Enables `?country=xx&token=<value>` on production for QA |

Without the product ID variables Hugo prints a warning and renders `#` as checkout
link. Without a coupon variable the edge function answers with tier 1 (full price).

### Local development

```bash
# One-time: local env vars for netlify dev (never commit .env)
cp .env.example .env

# Hugo dev server behind the Netlify CLI proxy with the edge function running locally.
# Geolocation is mocked as Germany; open http://localhost:8888
npm run dev:netlify

# Switch the tier without restarting (override is free outside production)
open "http://localhost:8888/agentic-spring-boot-testing-course/?country=in"
curl -s "http://localhost:8888/api/ppp?country=br"
```

`npm run dev` (plain Hugo) still works: `/api/ppp` answers 404 and the page shows the
base prices.

Note: `netlify dev` resolves the project root by walking up to the first `.git`
directory. Run it from a normal checkout, not from a git worktree nested inside another
checkout (for example `.claude/worktrees/*`), otherwise it ignores `netlify/` and `.env`.

### Tests

```bash
npm run test:unit         # edge function, Node test runner, no Netlify tooling needed
npm run test:e2e          # Playwright against hugo serve, /api/ppp faked with page.route()
npm run test:e2e:netlify  # Playwright against netlify dev with the real edge function (.env required)
npm test                  # unit + e2e
```

One-time setup for Playwright: `npx playwright install chromium`.

## Performance Optimization

The build process implements several performance optimizations:

1. **Image Optimization:**
   - WebP conversion for better compression
   - Responsive images for different devices
   - Lazy loading to defer off-screen images

2. **Asset Optimization:**
   - Hugo's minification for HTML, CSS, and JS
   - Long-term caching for static assets
   - Garbage collection during builds

3. **Security Enhancements:**
   - Strict security headers
   - Content Security Policy
   - XSS protection

## Troubleshooting

### Common Issues

- **Missing WebP Tools**: If image optimization fails, ensure WebP tools are installed with `brew install webp` (macOS) or `apt-get install webp` (Ubuntu)
- **Hugo Version Mismatch**: Make sure you're using Hugo Extended version 0.127.0 or higher
- **Node Modules Issues**: Try `npm ci` instead of `npm install` for a clean installation

### Manual Build

If the npm scripts don't work as expected, you can run the Hugo commands directly:

```bash
# Convert images to WebP
bash scripts/convert-to-webp.sh

# Build the site
hugo --gc --minify
```