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
  session and adjusts prices, checkout links (`promocode=`), a
  note and a banner. A spinner covers the prices until the call answers, fails or
  times out (3 s); on failure the page keeps the list price.
  The banner shows top right below the navbar once the visitor scrolls.
- Base prices and product names live in the page frontmatter (`ppp.products`). Only
  products with `ppp: true` (the Course and Bundle editions) get regional discounts;
  the Team Edition is sold at a fixed price. The editions build on each other: `addOns`
  on a product (Bundle Edition) renders a green box with what it adds to the edition
  before it.

### Pricing

The Course Edition (329€) and the Bundle Edition (490€) are sold at the list price.
Visitors from PPP countries get one coupon per checkout, a percentage off the list
price. The prices below are for the Bundle Edition; the Course Edition follows the same
percentages. Every coupon must be enabled for both products in CopeCart:

| Visitor | Coupon | Price |
|---|---|---|
| Tier 1 | none | 490€ |
| Tier 2 | `PPP_COUPON_TIER_2` 30 % | 343€ |
| Tier 3 | `PPP_COUPON_TIER_3` 50 % | 245€ |
| Tier 4 | `PPP_COUPON_TIER_4` 70 % | 147€ |

Coupon codes and CopeCart product IDs are not in the repository. Set them as Netlify
environment variables (Project configuration > Environment variables):

| Variable | Read by | Purpose |
|---|---|---|
| `PPP_PRODUCT_ID_COURSE_EDITION`, `PPP_PRODUCT_ID_BUNDLE_EDITION`, `PPP_PRODUCT_ID_TEAM_EDITION` | Hugo build (`os.Getenv`) | CopeCart product IDs for the checkout links (one per `ppp.products[].key`) |
| `PPP_COUPON_TIER_2`, `PPP_COUPON_TIER_3`, `PPP_COUPON_TIER_4` | Edge function | Coupon codes for 30 / 50 / 70 % off (tier 1 has no coupon) |
| `BLACK_FRIDAY_COUPON_TIER_1` to `_4` | Edge function | Combined Black Friday coupon codes (30 / 51 / 65 / 79 %), active only inside the campaign window |
| `PPP_TEST_TOKEN` | Edge function | Optional. Enables `?country=xx&now=...&token=<value>` on production for QA |

Without the product ID variables Hugo prints a warning and renders `#` as checkout
link. Without a coupon variable the edge function answers with the next best offer,
down to tier 1 (full price).

### Black Friday 2026 campaign

30 % off the base price for everyone, on top of PPP, on 2026-11-27 from 08:00 to 23:59 UTC
(Course and Bundle editions). CopeCart takes one coupon per checkout, so every tier has a
combined coupon, PPP and Black Friday multiplied (`BLACK_FRIDAY_TIERS` in
`netlify/edge-functions/ppp.ts`):

| Visitor | Env var | CopeCart discount | Bundle | Course |
|---|---|---|---|---|
| Tier 1 | `BLACK_FRIDAY_COUPON_TIER_1` | 30 % | 343.00€ | 230.30€ |
| Tier 2 | `BLACK_FRIDAY_COUPON_TIER_2` | 51 % | 240.10€ | 161.21€ |
| Tier 3 | `BLACK_FRIDAY_COUPON_TIER_3` | 65 % | 171.50€ | 115.15€ |
| Tier 4 | `BLACK_FRIDAY_COUPON_TIER_4` | 79 % | 102.90€ | 69.09€ |

Every coupon needs the same validity window in CopeCart and must be enabled for both products.
Inside the window `/api/ppp` returns a `campaign` object, and the page shows the banner in the
pricing section, a bonus label on the Course and Bundle cards (1-hour 1:1 consulting call,
Black Friday purchases only) and a countdown. The copy lives in `ppp.blackFriday` in the course
page frontmatter. QA: `?now=2026-11-27T12:00:00Z` simulates the clock (free outside production,
needs `&token=` on production). After the campaign delete the `BLACK_FRIDAY` constants, the
frontmatter block and the env vars.

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

`test:e2e:netlify` uses port 8888. When that port is taken, set another one:
`PPP_E2E_NETLIFY_PORT=8889 npm run test:e2e:netlify`.

GitHub Actions (`.github/workflows/tests.yml`) runs a Hugo build and all three test
suites on every pull request and push to `main`. The netlify dev tests use the fake
coupons from `.env.example`.

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