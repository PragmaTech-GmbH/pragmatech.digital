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

The course landing page (`content/agentic-spring-boot-testing-course-new.md`, layout
`course-landing`) shows regional discounts. The moving parts:

- `netlify/edge-functions/ppp.ts` - Netlify Edge Function, runs only for `GET /api/ppp`.
  It maps the visitor country (Netlify geolocation, no external API) to a discount tier
  and returns the coupon code for that tier as JSON.
- `netlify/shared/ppp-country-tiers.ts` - generated country to tier map (public data).
- `netlify/shared/ppp-early-bird.ts` - early bird percentage and deadline.
- `themes/pragmatech-theme/assets/js/ppp-pricing.js` - calls `/api/ppp` once per
  session and adjusts prices, checkout links (`promocode=`), the early bird badge, a
  note and a banner.
- Base prices and product names live in the page frontmatter (`ppp.products`). Only
  products with `ppp: true` (the Course and Bundle editions) get regional discounts;
  the Team Edition is sold at a fixed price. `everyEdition: false` on a product (Course
  Edition) leaves out the bundled-course strip, because that edition is for students who
  already own those courses.

### Early bird campaign

Until 1 October 2026, 23:59 CEST the Course Edition (329€) and the Bundle Edition
(490€) cost 33 % less, and PPP stacks on top. CopeCart accepts one coupon per checkout,
so every coupon is a percentage off the list price. The prices below are for the Bundle
Edition; the Course Edition follows the same percentages. Every coupon must be enabled
for both products in CopeCart:

| Visitor | Early bird coupon | Price | After the campaign | Price |
|---|---|---|---|---|
| Tier 1 | `PPP_COUPON_EARLY_BIRD_TIER_1` 33 % | 328.30€ | none | 490€ |
| Tier 2 | `PPP_COUPON_EARLY_BIRD_TIER_2` 53 % | 230.30€ | `PPP_COUPON_TIER_2` 30 % | 343€ |
| Tier 3 | `PPP_COUPON_EARLY_BIRD_TIER_3` 67 % | 161.70€ | `PPP_COUPON_TIER_3` 50 % | 245€ |
| Tier 4 | `PPP_COUPON_EARLY_BIRD_TIER_4` 80 % | 98€ | `PPP_COUPON_TIER_4` 70 % | 147€ |

Stacked percentages: `100 - (100 - 33) * (100 - PPP) / 100`, rounded to whole percent.
Set the early bird coupons in CopeCart to expire at the deadline.

- The deadline and percentage live twice: `netlify/shared/ppp-early-bird.ts` (edge
  function) and `ppp.earlyBird` in the page frontmatter (Hugo). A unit test fails when
  they differ.
- The switch at the deadline needs no deploy: the edge function checks the time per
  request, and `ppp-pricing.js` checks it in the browser before and after the call.
  Hugo pre-renders the early bird price only for visitors without JavaScript, so the
  first deploy after the deadline also removes it from the static HTML.
- A missing early bird coupon falls back to the next best configured offer.
- After the campaign, delete the `earlyBird` block and the `PPP_COUPON_EARLY_BIRD_*`
  variables at your own pace.

Coupon codes and CopeCart product IDs are not in the repository. Set them as Netlify
environment variables (Project configuration > Environment variables):

| Variable | Read by | Purpose |
|---|---|---|
| `PPP_PRODUCT_ID_COURSE_EDITION`, `PPP_PRODUCT_ID_BUNDLE_EDITION`, `PPP_PRODUCT_ID_TEAM_EDITION` | Hugo build (`os.Getenv`) | CopeCart product IDs for the checkout links (one per `ppp.products[].key`) |
| `PPP_COUPON_TIER_2`, `PPP_COUPON_TIER_3`, `PPP_COUPON_TIER_4` | Edge function | Coupon codes for 30 / 50 / 70 % off (tier 1 has no coupon) |
| `PPP_COUPON_EARLY_BIRD_TIER_1` | Hugo build and edge function | Early bird coupon, 33 % off |
| `PPP_COUPON_EARLY_BIRD_TIER_2`, `_TIER_3`, `_TIER_4` | Edge function | Early bird + PPP coupons, 53 / 67 / 80 % off |
| `PPP_TEST_TOKEN` | Edge function | Optional. Enables `?country=xx&now=<ISO date>&token=<value>` on production for QA |

Without the product ID variables Hugo prints a warning and renders `#` as checkout
link. Without a coupon variable the edge function answers with the next best offer,
down to tier 1 (full price).

### Local development

```bash
# One-time: local env vars for netlify dev (never commit .env)
cp .env.example .env

# Hugo dev server behind the Netlify CLI proxy with the edge function running locally.
# Geolocation is mocked as Germany; open http://localhost:8888
npm run dev:netlify

# Switch the tier without restarting (override is free outside production)
open "http://localhost:8888/agentic-spring-boot-testing-course-new/?country=in"
curl -s "http://localhost:8888/api/ppp?country=br"

# Preview the page before or after the early bird deadline
open "http://localhost:8888/agentic-spring-boot-testing-course-new/?now=2026-10-01T22:00:00Z"
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