// Opt-in end-to-end tests against the real edge function under `netlify dev`
// (project "netlify"). Requires a filled .env (see .env.example) and
// PPP_E2E_NETLIFY=1 so playwright.config.ts starts `netlify dev --geo=mock --country=DE`.
import { test, expect } from "@playwright/test";

const coursePath = "/agentic-spring-boot-testing-course/";
// `?now=` pins the campaign clock (free outside production): before and after the early bird deadline.
const duringEarlyBird = "now=2026-09-20T10:00:00Z";
const afterEarlyBird = "now=2026-10-01T22:00:00Z";

test.describe("PPP edge function under netlify dev", () => {
  test.skip(!process.env.PPP_E2E_NETLIFY, "set PPP_E2E_NETLIFY=1 to run against netlify dev");

  test("GET /api/ppp resolves the mocked geolocation to tier 1", async ({ request }) => {
    const response = await request.get("/api/ppp?" + afterEarlyBird);
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(response.headers()["content-type"]).toContain("application/json");
    const body = await response.json();
    expect(body).toMatchObject({ country: "DE", tier: 1, discountPercentage: 0, couponCode: null, earlyBird: false });
  });

  test("GET /api/ppp returns the early bird coupons from .env before the deadline", async ({ request }) => {
    const germany = await (await request.get("/api/ppp?" + duringEarlyBird)).json();
    expect(germany).toMatchObject({ country: "DE", tier: 1, discountPercentage: 33, earlyBird: true });
    expect(germany.couponCode).toMatch(/^[A-Za-z0-9_-]+$/);

    const india = await (await request.get("/api/ppp?country=in&" + duringEarlyBird)).json();
    expect(india).toMatchObject({ country: "IN", tier: 4, discountPercentage: 80, earlyBird: true });
  });

  test("GET /api/ppp?country=in returns the tier 4 coupon from .env", async ({ request }) => {
    const response = await request.get("/api/ppp?country=in&" + afterEarlyBird);
    const body = await response.json();
    expect(body).toMatchObject({ country: "IN", countryName: "India", tier: 4, discountPercentage: 70, overridden: true });
    expect(body.couponCode).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test("POST /api/ppp is rejected", async ({ request }) => {
    const response = await request.post("/api/ppp");
    expect(response.status()).toBe(405);
  });

  test("the edge function does not run for other paths", async ({ request }) => {
    const response = await request.get("/api/other");
    expect(response.status()).toBe(404);
  });

  test("the landing page shows discounted prices with ?country=in", async ({ page }) => {
    await page.goto(coursePath + "?country=in&" + afterEarlyBird);
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-price]')).toHaveText("147€");
    await expect(page.locator("[data-ppp-banner]")).toBeVisible();
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-cta]')).toHaveAttribute("href", /promocode=/);
  });

  test("the landing page shows base prices for the mocked German visitor", async ({ page }) => {
    await page.goto(coursePath + "?" + afterEarlyBird);
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-price]')).toHaveText("490€");
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  });

  test("the landing page shows the early bird price for the mocked German visitor", async ({ page }) => {
    await page.goto(coursePath + "?" + duringEarlyBird);
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-price]')).toHaveText("328.30€");
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-early-bird-badge]')).toBeVisible();
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  });
});
