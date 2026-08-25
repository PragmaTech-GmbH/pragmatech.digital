// End-to-end tests for PPP pricing against plain `hugo serve`. The edge function is
// faked with page.route(), so every response shape (discount, no discount, errors,
// timeouts, malformed data) is under test control.
import { test, expect, type Page, type Route } from "@playwright/test";

const coursePath = "/agentic-spring-boot-testing-course/";
const productKeys = ["small", "medium", "large"] as const;
const basePrices: Record<(typeof productKeys)[number], number> = { small: 189, medium: 289, large: 489 };

const tier4India = { country: "IN", countryName: "India", tier: 4, discountPercentage: 70, couponCode: "T70" };
const tier1Germany = { country: "DE", countryName: "Germany", tier: 1, discountPercentage: 0, couponCode: null };

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
    await expect(productCard.locator("[data-ppp-cta]")).toHaveAttribute(
      "href",
      `https://www.copecart.com/products/pid-${productKey}/checkout?locale=en`,
    );
  }
  await expect(page.locator("[data-ppp-note]")).toBeHidden();
  await expect(page.locator("[data-ppp-banner]")).toBeHidden();
}

test.describe("PPP pricing on the course landing page", () => {
  test("applies a tier 4 discount to prices, links, note and banner", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await fakePppEndpoint(page, tier4India);
    await page.goto(coursePath);

    for (const productKey of productKeys) {
      const productCard = page.locator(`[data-ppp-product="${productKey}"]`);
      const expectedPrice = Math.round(basePrices[productKey] * 0.3);
      await expect(productCard.locator("[data-ppp-price]")).toHaveText(`${expectedPrice}€`);
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

  test("treats malformed responses as no discount", async ({ page }) => {
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

    const cachedValue = await page.evaluate(() => window.sessionStorage.getItem("ppp:v1"));
    expect(JSON.parse(cachedValue ?? "null")).toMatchObject({ tier: 4, couponCode: "T70" });

    await page.goto(coursePath);
    await expect(page.locator('[data-ppp-product="small"] [data-ppp-price]')).toHaveText("57€");
    expect(requestedUrls).toHaveLength(1);
  });

  test("forwards ?country and skips the cache in test mode", async ({ page }) => {
    const tier3Brazil = { country: "BR", countryName: "Brazil", tier: 3, discountPercentage: 50, couponCode: "T50" };
    const requestedUrls = await fakePppEndpoint(page, tier3Brazil);
    await page.goto(coursePath + "?country=br&token=abc");
    await expect(page.locator('[data-ppp-product="small"] [data-ppp-price]')).toHaveText("95€");

    expect(requestedUrls).toHaveLength(1);
    const requestUrl = new URL(requestedUrls[0]);
    expect(requestUrl.pathname).toBe("/api/ppp");
    expect(requestUrl.searchParams.get("country")).toBe("br");
    expect(requestUrl.searchParams.get("token")).toBe("abc");

    const cachedValue = await page.evaluate(() => window.sessionStorage.getItem("ppp:v1"));
    expect(cachedValue).toBeNull();
  });

  test("dismisses the banner for the session but keeps the discount", async ({ page }) => {
    await fakePppEndpoint(page, tier4India);
    await page.goto(coursePath);
    await expect(page.locator("[data-ppp-banner]")).toBeVisible();

    await page.locator("[data-ppp-banner-close]").click();
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();

    await page.reload();
    await expect(page.locator('[data-ppp-product="small"] [data-ppp-price]')).toHaveText("57€");
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
