// Tests for the Agentic Testing webinar signup page and its thank-you page.
// The Mailchimp JSONP request is mocked, nothing reaches the real audience.
// Runs against plain `hugo serve` (project "hugo").
import { test, expect, type Page } from "@playwright/test";

const leadPath = "/lp/agentic-testing-webinar/";
const thankYouPath = "/lp/agentic-testing-webinar/thank-you/";

async function mockMailchimp(page: Page, response: { result: string; msg: string }, requestUrls: string[] = []) {
  await page.route("**/subscribe/post-json*", (route) => {
    const requestUrl = new URL(route.request().url());
    requestUrls.push(requestUrl.toString());
    route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: `${requestUrl.searchParams.get("c")}(${JSON.stringify(response)});`,
    });
  });
}

async function fillForm(page: Page, company = "Acme Inc.") {
  await page.fill('input[name="FNAME"]', "Jane");
  await page.fill("#mce-COMPANY", company);
  await page.fill('input[name="EMAIL"]', "jane@example.com");
}

test.describe("webinar signup page", () => {
  test("shows the format, the three fields and the no-recording note", async ({ page }) => {
    await page.goto(leadPath);

    await expect(page.locator('input[name="FNAME"]')).toBeVisible();
    await expect(page.locator("#mce-COMPANY")).toBeVisible();
    await expect(page.locator('input[name="EMAIL"]')).toBeVisible();
    await expect(page.locator('[data-lp="copy"]')).toContainText("45 minutes of talk and 15 minutes of Q&A");
    await expect(page.locator('[data-lp="copy"]')).toContainText("no recording", { ignoreCase: true });
  });

  test("requires first name, company and a valid email", async ({ page }) => {
    await page.goto(leadPath);

    await page.locator("#lead-signup-submit").click();
    await expect(page.locator("#lead-signup-error")).toContainText("first name");

    await page.fill('input[name="FNAME"]', "Jane");
    await page.locator("#lead-signup-submit").click();
    await expect(page.locator("#lead-signup-error")).toContainText("company");

    await page.fill("#mce-COMPANY", "Acme Inc.");
    await page.fill('input[name="EMAIL"]', "not-an-email");
    await page.locator("#lead-signup-submit").click();
    await expect(page.locator("#lead-signup-error")).toContainText("valid email");
  });

  test("sends first name, company and tag to Mailchimp, then redirects", async ({ page }) => {
    const requestUrls: string[] = [];
    await mockMailchimp(page, { result: "success", msg: "Almost finished..." }, requestUrls);
    await page.goto(leadPath);

    await fillForm(page);
    await page.locator("#lead-signup-submit").click();

    await expect(page).toHaveURL(new RegExp(`${thankYouPath}$`));
    expect(requestUrls).toHaveLength(1);
    const params = new URL(requestUrls[0]).searchParams;
    expect(params.get("FNAME")).toBe("Jane");
    expect(params.get("COMPANY")).toBe("Acme Inc.");
    expect(params.get("EMAIL")).toBe("jane@example.com");
    expect(params.get("tags")).toBeTruthy();
  });

  test("shows a generic error when Mailchimp rejects the signup", async ({ page }) => {
    await mockMailchimp(page, { result: "error", msg: "0 - <a href='x'>Something</a> broke" });
    await page.goto(leadPath);

    await fillForm(page);
    await page.locator("#lead-signup-submit").click();

    await expect(page.locator("#lead-signup-error")).toContainText("Something went wrong");
    await expect(page).toHaveURL(new RegExp(`${leadPath}$`));
  });
});

test.describe("webinar thank-you page", () => {
  test("explains the double opt-in and the webinar details email", async ({ page }) => {
    await page.goto(thankYouPath);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    const steps = page.locator('[data-lp="steps"] li');
    await expect(steps).toHaveCount(2);
    await expect(steps.nth(0)).toContainText("Confirm your email");
    await expect(steps.nth(1)).toContainText("Webinar details");
  });
});
