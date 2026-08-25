// Opt-in end-to-end tests against the real edge function under `netlify dev`
// (project "netlify"). Requires a filled .env (see .env.example) and
// PPP_E2E_NETLIFY=1 so playwright.config.ts starts `netlify dev --geo=mock --country=DE`.
import { test, expect } from "@playwright/test";

const coursePath = "/agentic-spring-boot-testing-course/";

test.describe("PPP edge function under netlify dev", () => {
  test.skip(!process.env.PPP_E2E_NETLIFY, "set PPP_E2E_NETLIFY=1 to run against netlify dev");

  test("GET /api/ppp resolves the mocked geolocation to tier 1", async ({ request }) => {
    const response = await request.get("/api/ppp");
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toBe("private, no-store");
    expect(response.headers()["content-type"]).toContain("application/json");
    const body = await response.json();
    expect(body).toMatchObject({ country: "DE", tier: 1, discountPercentage: 0, couponCode: null });
  });

  test("GET /api/ppp?country=in returns the tier 4 coupon from .env", async ({ request }) => {
    const response = await request.get("/api/ppp?country=in");
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
    await page.goto(coursePath + "?country=in");
    await expect(page.locator('[data-ppp-product="small"] [data-ppp-price]')).toHaveText("57€");
    await expect(page.locator("[data-ppp-banner]")).toBeVisible();
    await expect(page.locator('[data-ppp-product="small"] [data-ppp-cta]')).toHaveAttribute("href", /promocode=/);
  });

  test("the landing page shows base prices for the mocked German visitor", async ({ page }) => {
    await page.goto(coursePath);
    await expect(page.locator('[data-ppp-product="small"] [data-ppp-price]')).toHaveText("189€");
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  });
});
