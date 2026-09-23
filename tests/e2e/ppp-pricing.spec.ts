// End-to-end tests for PPP pricing against plain `hugo serve`. The edge function is
// faked with page.route(), so every response shape (discount, no discount, errors,
// timeouts, malformed data) is under test control. The browser clock is set per
// test (page.clock), because the pricing script decides the early bird campaign from
// the current time. hugo serve pre-renders the campaign with the coupon EB33.
import { test, expect, type Page, type Route } from "@playwright/test";

const coursePath = "/agentic-spring-boot-testing-course-new/";
// The Course and Bundle editions carry the PPP contract; Team is sold at a fixed price.
const productKeys = ["course_edition", "bundle_edition"] as const;
const basePrices: Record<(typeof productKeys)[number], number> = { course_edition: 329, bundle_edition: 490 };

// Prices as the page formats them: whole amounts without decimals, others with cents.
function formatPrice(basePrice: number, discountPercentage: number): string {
  const cents = Math.round((basePrice * (100 - discountPercentage)) / 100 * 100);
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);
}

const tier4India = { country: "IN", countryName: "India", tier: 4, discountPercentage: 70, couponCode: "T70" };
const tier1Germany = { country: "DE", countryName: "Germany", tier: 1, discountPercentage: 0, couponCode: null };

const earlyBirdEndsAt = "2026-10-02T09:00:00+02:00";
const duringEarlyBird = new Date("2026-10-02T08:00:00+02:00");
const afterEarlyBird = new Date(earlyBirdEndsAt);
const earlyBirdGermany = { ...tier1Germany, discountPercentage: 33, couponCode: "EB33", earlyBird: true, earlyBirdEndsAt };
const earlyBirdIndia = { ...tier4India, discountPercentage: 80, couponCode: "EB80", earlyBird: true, earlyBirdEndsAt };

type FakeOptions = { status?: number; delayMs?: number; abort?: boolean };

async function fakePppEndpoint(page: Page, body: unknown, options: FakeOptions = {}): Promise<string[]> {
  const requestedUrls: string[] = [];
  await page.route("**/api/ppp*", async (route: Route) => {
    requestedUrls.push(route.request().url());
    if (options.abort) {
      await route.abort("failed");
      return;
    }
    if (options.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, options.delayMs));
    }
    try {
      await route.fulfill({
        status: options.status ?? 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    } catch {
      // The browser may already have aborted the request (timeout test).
    }
  });
  return requestedUrls;
}

function collectPageErrors(page: Page): Error[] {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  return pageErrors;
}

async function expectBasePricing(page: Page) {
  for (const productKey of productKeys) {
    const productCard = page.locator(`[data-ppp-product="${productKey}"]`);
    await expect(productCard.locator("[data-ppp-price]")).toHaveText(`${basePrices[productKey]}€`);
    await expect(productCard.locator("[data-ppp-original-price]")).toBeHidden();
    await expect(productCard.locator("[data-ppp-early-bird-badge]")).toBeHidden();
    await expect(productCard.locator("[data-ppp-cta]")).toHaveAttribute(
      "href",
      `https://www.copecart.com/products/pid-${productKey}/checkout?locale=en`,
    );
  }
  await expect(page.locator("[data-ppp-note]")).toBeHidden();
  await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  await expectTeamEditionUntouched(page);
}

async function expectEarlyBirdPricing(page: Page) {
  for (const productKey of productKeys) {
    const productCard = page.locator(`[data-ppp-product="${productKey}"]`);
    await expect(productCard.locator("[data-ppp-price]")).toHaveText(`${formatPrice(basePrices[productKey], 33)}€`);
    await expect(productCard.locator("[data-ppp-original-price]")).toBeVisible();
    await expect(productCard.locator("[data-ppp-original-price]")).toHaveText(`${basePrices[productKey]}€`);
    await expect(productCard.locator("[data-ppp-early-bird-badge]")).toBeVisible();
    await expect(productCard.locator("[data-ppp-early-bird-badge]")).toHaveText("Early bird: 33% off until course launch at 2 October 2026, 09:00 CEST");
    await expect(productCard.locator("[data-ppp-cta]")).toHaveAttribute(
      "href",
      `https://www.copecart.com/products/pid-${productKey}/checkout?locale=en&promocode=EB33`,
    );
  }
  await expect(page.locator("[data-ppp-note]")).toBeHidden();
  await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  await expectTeamEditionUntouched(page);
}

async function expectTeamEditionUntouched(page: Page) {
  const teamCard = page.locator('[data-product="team_edition"]');
  await expect(teamCard).toHaveCount(1);
  await expect(teamCard).not.toHaveAttribute("data-ppp-product", /.*/);
  await expect(teamCard.locator("[data-product-price]")).toHaveText("3,990€");
  await expect(teamCard.locator("[data-product-cta]")).toHaveAttribute(
    "href",
    "https://www.copecart.com/products/pid-team_edition/checkout?locale=en",
  );
}

test.describe("PPP pricing on the course landing page after the early bird campaign", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setSystemTime(afterEarlyBird);
  });

  test("applies a tier 4 discount to prices, links, note and banner", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await fakePppEndpoint(page, tier4India);
    await page.goto(coursePath);

    for (const productKey of productKeys) {
      const productCard = page.locator(`[data-ppp-product="${productKey}"]`);
      await expect(productCard.locator("[data-ppp-price]")).toHaveText(`${formatPrice(basePrices[productKey], 70)}€`);
      await expect(productCard.locator("[data-ppp-original-price]")).toBeVisible();
      await expect(productCard.locator("[data-ppp-original-price]")).toHaveText(`${basePrices[productKey]}€`);
      await expect(productCard.locator("[data-ppp-cta]")).toHaveAttribute(
        "href",
        `https://www.copecart.com/products/pid-${productKey}/checkout?locale=en&promocode=T70`,
      );
    }

    const note = page.locator("[data-ppp-note]");
    await expect(note).toBeVisible();
    await expect(note.locator("[data-ppp-discount-percentage]")).toHaveText("70");
    await expect(note.locator("[data-ppp-country-name]")).toHaveText("India");
    await expect(note.locator("[data-ppp-coupon-code]")).toHaveText("T70");
    await expect(note.locator("[data-ppp-flag]")).toHaveText("\u{1F1EE}\u{1F1F3}");

    const banner = page.locator("[data-ppp-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("It looks like you are from India");
    await expect(banner.locator("[data-ppp-coupon-code]")).toHaveText("T70");
    await expect(page.locator("[data-ppp-early-bird-only]").first()).toBeHidden();
    await expect(page.locator("[data-ppp-early-bird-badge]").first()).toBeHidden();

    // The Team edition is never discounted.
    await expectTeamEditionUntouched(page);
    expect(pageErrors).toEqual([]);
  });

  test("keeps base prices for tier 1", async ({ page }) => {
    await fakePppEndpoint(page, tier1Germany);
    await page.goto(coursePath);
    await expectBasePricing(page);
  });

  test("keeps base prices when the endpoint returns 500", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await fakePppEndpoint(page, { error: "boom" }, { status: 500 });
    await page.goto(coursePath);
    await expectBasePricing(page);
    expect(pageErrors).toEqual([]);
  });

  test("keeps base prices when the request fails", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await fakePppEndpoint(page, null, { abort: true });
    await page.goto(coursePath);
    await expectBasePricing(page);
    expect(pageErrors).toEqual([]);
  });

  test("keeps base prices when the endpoint is slower than the 3 s timeout", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await fakePppEndpoint(page, tier4India, { delayMs: 4500 });
    await page.goto(coursePath);
    await page.waitForTimeout(5000);
    await expectBasePricing(page);
    expect(pageErrors).toEqual([]);
  });

  test("ignores malformed responses", async ({ page }) => {
    await fakePppEndpoint(page, {
      country: "IN",
      tier: 9,
      discountPercentage: 70,
      couponCode: "<script>alert(1)</script>",
    });
    await page.goto(coursePath);
    await expectBasePricing(page);
  });

  test("caches the response in sessionStorage for the session", async ({ page }) => {
    const requestedUrls = await fakePppEndpoint(page, tier4India);
    await page.goto(coursePath);
    await expect(page.locator("[data-ppp-banner]")).toBeVisible();
    expect(requestedUrls).toHaveLength(1);

    const cachedValue = await page.evaluate(() => window.sessionStorage.getItem("ppp:v2"));
    expect(JSON.parse(cachedValue ?? "null")).toMatchObject({ tier: 4, couponCode: "T70" });

    await page.goto(coursePath);
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-price]')).toHaveText("147€");
    expect(requestedUrls).toHaveLength(1);
  });

  test("forwards ?country and skips the cache in test mode", async ({ page }) => {
    const tier3Brazil = { country: "BR", countryName: "Brazil", tier: 3, discountPercentage: 50, couponCode: "T50" };
    const requestedUrls = await fakePppEndpoint(page, tier3Brazil);
    await page.goto(coursePath + "?country=br&token=abc");
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-price]')).toHaveText("245€");

    expect(requestedUrls).toHaveLength(1);
    const requestUrl = new URL(requestedUrls[0]);
    expect(requestUrl.pathname).toBe("/api/ppp");
    expect(requestUrl.searchParams.get("country")).toBe("br");
    expect(requestUrl.searchParams.get("token")).toBe("abc");

    const cachedValue = await page.evaluate(() => window.sessionStorage.getItem("ppp:v2"));
    expect(cachedValue).toBeNull();
  });

  test("dismisses the banner for the session but keeps the discount", async ({ page }) => {
    await fakePppEndpoint(page, tier4India);
    await page.goto(coursePath);
    await expect(page.locator("[data-ppp-banner]")).toBeVisible();

    await page.locator("[data-ppp-banner-close]").click();
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();

    await page.reload();
    await expect(page.locator('[data-ppp-product="bundle_edition"] [data-ppp-price]')).toHaveText("147€");
    await expect(page.locator("[data-ppp-note]")).toBeVisible();
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  });

  test("does not call the endpoint or load the script on other pages", async ({ page }) => {
    const requestedUrls = await fakePppEndpoint(page, tier4India);
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
    await expect(page.locator('script[src*="ppp-pricing"]')).toHaveCount(0);
    expect(requestedUrls).toHaveLength(0);
  });
});

test.describe("early bird campaign on the course landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setSystemTime(duringEarlyBird);
  });

  test("shows the early bird price for tier 1 visitors", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await fakePppEndpoint(page, earlyBirdGermany);
    await page.goto(coursePath);
    await expectEarlyBirdPricing(page);
    expect(pageErrors).toEqual([]);
  });

  test("stacks early bird and PPP for tier 4 visitors", async ({ page }) => {
    await fakePppEndpoint(page, earlyBirdIndia);
    await page.goto(coursePath);

    for (const productKey of productKeys) {
      const productCard = page.locator(`[data-ppp-product="${productKey}"]`);
      await expect(productCard.locator("[data-ppp-price]")).toHaveText(`${formatPrice(basePrices[productKey], 80)}€`);
      await expect(productCard.locator("[data-ppp-original-price]")).toHaveText(`${basePrices[productKey]}€`);
      await expect(productCard.locator("[data-ppp-early-bird-badge]")).toBeVisible();
      await expect(productCard.locator("[data-ppp-cta]")).toHaveAttribute(
        "href",
        `https://www.copecart.com/products/pid-${productKey}/checkout?locale=en&promocode=EB80`,
      );
    }

    const note = page.locator("[data-ppp-note]");
    await expect(note).toBeVisible();
    await expect(note).toContainText("80% early bird and Purchase Power Parity discount for India");
    await expect(note.locator("[data-ppp-coupon-code]")).toHaveText("EB80");

    const banner = page.locator("[data-ppp-banner]");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("80% off the base price, early bird included.");
    await expectTeamEditionUntouched(page);
  });

  test("keeps the early bird price when the endpoint fails", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await fakePppEndpoint(page, null, { abort: true });
    await page.goto(coursePath);
    await expectEarlyBirdPricing(page);
    expect(pageErrors).toEqual([]);
  });

  test("follows the endpoint when it reports no campaign", async ({ page }) => {
    await fakePppEndpoint(page, tier1Germany);
    await page.goto(coursePath);
    await expectBasePricing(page);
  });

  test("drops a cached early bird answer after the deadline", async ({ page }) => {
    let pppResponse: unknown = earlyBirdGermany;
    const requestedUrls: string[] = [];
    await page.route("**/api/ppp*", async (route) => {
      requestedUrls.push(route.request().url());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(pppResponse) });
    });

    await page.goto(coursePath);
    await expectEarlyBirdPricing(page);
    expect(requestedUrls).toHaveLength(1);

    await page.clock.setSystemTime(afterEarlyBird);
    pppResponse = tier1Germany;
    await page.reload();
    await expectBasePricing(page);
    expect(requestedUrls).toHaveLength(2);
  });

  test("forwards ?now to the endpoint and uses it as the clock", async ({ page }) => {
    const requestedUrls = await fakePppEndpoint(page, null, { abort: true });
    await page.goto(coursePath + "?now=2026-10-02T07:00:00Z");
    await expectBasePricing(page);
    expect(new URL(requestedUrls[0]).searchParams.get("now")).toBe("2026-10-02T07:00:00Z");
  });

  test("pre-renders the early bird price for visitors without JavaScript", async ({ request }) => {
    test.skip(Date.now() >= afterEarlyBird.getTime(), "hugo serve only pre-renders the campaign before the deadline");
    const html = await (await request.get(coursePath)).text();
    expect(html).toMatch(/data-ppp-price[^>]*>328\.30€</);
    expect(html).toContain("/checkout?locale=en&amp;promocode=EB33");
    expect(html).toMatch(/data-ppp-early-bird-ends-at="2026-10-02T09:00:00(\+|&#43;)02:00"/);
  });
});
