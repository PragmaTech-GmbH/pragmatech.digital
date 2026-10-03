// Tests for the Devoxx Belgium 2026 lead magnet and its thank-you page.
// The Mailchimp JSONP request is mocked, nothing reaches the real audience.
// Runs against plain `hugo serve` (project "hugo").
import { test, expect, type Page } from "@playwright/test";

const leadPath = "/lp/devoxx-belgium-2026/";
const thankYouPath = "/lp/devoxx-belgium-2026/thank-you/";

async function mockMailchimp(page: Page, response: { result: string; msg: string }) {
  await page.route("**/subscribe/post-json*", (route) => {
    const callbackName = new URL(route.request().url()).searchParams.get("c");
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `${callbackName}(${JSON.stringify(response)});`,
    });
  });
}

test.describe("devoxx lead magnet page", () => {
  test("shows form, deadline and the email delivery note, and is not indexed", async ({ page }) => {
    await page.goto(leadPath);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    await expect(page.locator('input[name="FNAME"]')).toBeVisible();
    await expect(page.locator('input[name="EMAIL"]')).toBeVisible();
    await expect(page.locator('[data-lp="email-note"]')).toContainText("arrive by email");
    await expect(page.locator('[data-lp="deadline"]')).toContainText("10 October 2026, 3 PM CEST");
  });

  test("blocks an empty name and an invalid email", async ({ page }) => {
    await page.goto(leadPath);

    await page.locator("#lead-signup-submit").click();
    await expect(page.locator("#lead-signup-error")).toContainText("first name");

    await page.fill('input[name="FNAME"]', "Jane");
    await page.fill('input[name="EMAIL"]', "not-an-email");
    await page.locator("#lead-signup-submit").click();
    await expect(page.locator("#lead-signup-error")).toContainText("valid email");
  });

  test("redirects to the thank-you page after a successful signup", async ({ page }) => {
    await mockMailchimp(page, { result: "success", msg: "Almost finished..." });
    await page.goto(leadPath);

    await page.fill('input[name="FNAME"]', "Jane");
    await page.fill('input[name="EMAIL"]', "jane@example.com");
    await page.locator("#lead-signup-submit").click();

    await expect(page).toHaveURL(new RegExp(`${thankYouPath}$`));
  });

  test("redirects an already subscribed person to the thank-you page too", async ({ page }) => {
    await mockMailchimp(page, { result: "success", msg: "You're already subscribed, your profile has been updated." });
    await page.goto(leadPath);

    await page.fill('input[name="FNAME"]', "Jane");
    await page.fill('input[name="EMAIL"]', "jane@example.com");
    await page.locator("#lead-signup-submit").click();

    await expect(page).toHaveURL(new RegExp(`${thankYouPath}$`));
  });

  test("shows a generic error when Mailchimp rejects the signup", async ({ page }) => {
    await mockMailchimp(page, { result: "error", msg: "0 - <a href='x'>Something</a> broke" });
    await page.goto(leadPath);

    await page.fill('input[name="FNAME"]', "Jane");
    await page.fill('input[name="EMAIL"]', "jane@example.com");
    await page.locator("#lead-signup-submit").click();

    await expect(page.locator("#lead-signup-error")).toContainText("Something went wrong");
    await expect(page).toHaveURL(new RegExp(`${leadPath}$`));
  });
});

test.describe("devoxx thank-you page", () => {
  test("explains the double opt-in and the two follow-up emails", async ({ page }) => {
    await page.goto(thankYouPath);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    const steps = page.locator('[data-lp="steps"] li');
    await expect(steps).toHaveCount(3);
    await expect(steps.nth(0)).toContainText("Confirm your email");
    await expect(steps.nth(1)).toContainText("Welcome email");
    await expect(steps.nth(2)).toContainText("33% coupon");
  });

  test("both pages stay out of the sitemap", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain("/lp/devoxx-belgium-2026");
  });
});
