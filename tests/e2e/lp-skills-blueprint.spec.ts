// Tests for the skills blueprint landing page, its download pages and its thank-you page.
// All MailerLite and Matomo requests are blocked or mocked: nothing reaches the real
// subscriber list or the real statistics. Runs against `hugo serve` (project "hugo").
import { test, expect, type Page } from "@playwright/test";

const campaign = "agentic-testing-skills-blueprint";
const landingPath = "/lp/spring-boot-testing-skills-blueprint/";
const thankYouPath = `${landingPath}thank-you/`;
const downloadPath = `${landingPath}download/`;
const confirmedPath = `${landingPath}confirmed/`;
const pdfPath = "/documents/skills-blueprint/PragmaTech-Spring-Boot-Testing-Skills-Blueprint.pdf";
const subscribePattern = "**/jsonp/1613864/forms/205181690544391274/subscribe*";

test.beforeEach(async ({ page }) => {
  await page.route(/mailerlite\.com|mlcdn\.com|analytics\.rieckpil\.de/, (route) => route.abort());
});

async function mockMailerLite(page: Page): Promise<URLSearchParams[]> {
  const subscribeRequests: URLSearchParams[] = [];
  await page.route(subscribePattern, (route) => {
    subscribeRequests.push(new URLSearchParams(route.request().postData() ?? ""));
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ success: true }),
    });
  });
  return subscribeRequests;
}

async function fillForm(page: Page) {
  await page.fill('input[name="fields[name]"]', "Jane Doe");
  await page.fill('input[name="fields[email]"]', "jane@example.com");
}

const leadMagnetEvents = (page: Page) =>
  page.evaluate(() => ((window as any)._paq as unknown[][]).filter((entry) => entry[1] === "LeadMagnet"));

test.describe("skills blueprint landing page", () => {
  test("asks for name and email only", async ({ page }) => {
    await page.goto(landingPath);

    const inputNames = await page
      .locator("#lead-bundle-form input:not([type=hidden])")
      .evaluateAll((inputs) => inputs.map((input) => (input as HTMLInputElement).name));
    expect(inputNames).toEqual(["fields[name]", "fields[email]"]);
    await expect(page.locator("h1")).toContainText("blueprint for structuring your agentic testing skills");
  });

  test("shows the tool icons, the blueprint drawing and the toolbox", async ({ page, request }) => {
    await page.goto(landingPath);

    await expect(page.locator('[data-lp="copy"] [data-lp="tools"] li')).toHaveText([
      "Claude Code",
      "GitHub Copilot",
      "Cursor",
      "Codex",
    ]);
    for (const iconName of ["claude", "copilot", "cursor", "openai"]) {
      expect((await request.get(`/images/logos/${iconName}.svg`)).status(), iconName).toBe(200);
    }
    await expect(page.locator('[data-lp="blueprint"] [data-lp="skills"] li')).toHaveCount(7);
    await expect(page.locator('[data-lp="toolbox"]')).toBeVisible();
    const cover = page.locator('[data-lp="cover"]');
    await cover.scrollIntoViewIfNeeded();
    await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
  });

  test("has a closing call to action that leads to the form", async ({ page }) => {
    await page.goto(landingPath);

    await page.locator('[data-lp="cta"]').click();

    await expect(page.locator("#lead-bundle-form")).toBeInViewport();
  });

  test("fits a mobile screen and shows the form before the drawing", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(landingPath);

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    const formBox = (await page.locator("#lead-bundle-form").boundingBox())!;
    const drawingBox = (await page.locator('[data-lp="blueprint"]').boundingBox())!;
    expect(drawingBox.y).toBeGreaterThan(formBox.y + formBox.height - 1);
  });

  test("is a standalone page that stores nothing on the device", async ({ page, context }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(landingPath);
    await expect(page.locator("#lead-bundle-submit")).toBeEnabled();

    await expect(page.locator("#navbar")).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    expect(await context.cookies()).toEqual([]);
    expect(pageErrors).toEqual([]);
  });

  test("is linked from the sidebar of a blog post", async ({ page }) => {
    await page.goto("/blog/agentic-testing-for-spring-boot-is-live/");

    await page.locator(".blog-post__sidebar").getByRole("link", { name: "Get the Blueprint" }).click();

    await expect(page).toHaveURL(new RegExp(`${landingPath}$`));
  });

  test("is not linked from the main pages", async ({ page }) => {
    for (const publicPage of ["/", "/blog/", "/lp/agentic-readiness-bundle/", "/agentic-spring-boot-testing-course/"]) {
      await page.goto(publicPage);
      await expect(page.locator('a[href*="spring-boot-testing-skills-blueprint"]'), publicPage).toHaveCount(0);
    }
  });

  for (const hiddenPath of [landingPath, thankYouPath, downloadPath, confirmedPath]) {
    test(`${hiddenPath} is not indexed and not in the sitemap`, async ({ page, request }) => {
      await page.goto(hiddenPath);

      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
      const sitemap = await (await request.get("/sitemap.xml")).text();
      expect(sitemap).not.toContain(hiddenPath);
    });
  }
});

test.describe("skills blueprint signup", () => {
  test("blocks a missing name without a request", async ({ page }) => {
    const subscribeRequests = await mockMailerLite(page);
    await page.goto(landingPath);
    await page.fill('input[name="fields[email]"]', "jane@example.com");
    await page.locator("#lead-bundle-submit").click();

    await expect(page.locator("#lead-bundle-error")).toContainText("enter your name");
    expect(subscribeRequests).toHaveLength(0);
  });

  test("sends the fields with attribution and redirects to the thank-you page", async ({ page }) => {
    const subscribeRequests = await mockMailerLite(page);
    await page.goto(`${landingPath}?utm_source=talk&utm_medium=slides`);
    await fillForm(page);
    await page.locator("#lead-bundle-submit").click();

    await expect(page).toHaveURL(new RegExp(`${thankYouPath}$`));
    const parameters = subscribeRequests[0];
    expect(parameters.get("fields[name]")).toBe("Jane Doe");
    expect(parameters.get("fields[email]")).toBe("jane@example.com");
    expect(parameters.has("fields[company]")).toBe(false);
    expect(parameters.get("fields[utm_source]")).toBe("talk");
    expect(parameters.get("fields[utm_medium]")).toBe("slides");
    expect(parameters.get("fields[signup_page]")).toBe(landingPath);
    expect(parameters.get("ml-submit")).toBe("1");
    expect(parameters.get("anticsrf")).toBe("true");
  });

  test("sends the Signup event with its own campaign name", async ({ page }) => {
    await mockMailerLite(page);
    const trackedEntries: unknown[][] = [];
    await page.exposeFunction("recordTrackedEntry", (entry: unknown[]) => trackedEntries.push(entry));
    await page.goto(landingPath);
    await fillForm(page);
    // matomo.js loads async and replaces the window._paq array with its own object.
    await page.evaluate(() => {
      (window as any)._paq = { push: (entry: unknown[]) => (window as any).recordTrackedEntry(entry.slice(0, 4)) };
    });
    await page.locator("#lead-bundle-submit").click();

    await expect(page).toHaveURL(new RegExp(`${thankYouPath}$`));
    expect(trackedEntries).toContainEqual(["trackEvent", "LeadMagnet", "Signup", campaign]);
  });

  test("shows the blueprint fallback text when MailerLite is not reachable", async ({ page }) => {
    await page.goto(landingPath);
    await fillForm(page);
    await page.locator("#lead-bundle-submit").click();

    await expect(page.locator("#lead-bundle-error")).toContainText("Network error");
    await expect(page.locator("#lead-bundle-fallback")).toContainText("send the blueprint manually");
  });
});

test.describe("skills blueprint follow-up pages", () => {
  test("the thank-you page explains both steps and sends the ThankYou event", async ({ page }) => {
    await page.goto(thankYouPath);

    await expect(page.locator('[data-lp="steps"] li')).toHaveCount(2);
    expect(await leadMagnetEvents(page)).toEqual([["trackEvent", "LeadMagnet", "ThankYou", campaign]]);
  });

  test("the download page offers the PDF and the course, without a Confirmed event", async ({ page, request }) => {
    await page.goto(downloadPath);

    await expect(page.locator("h1")).toHaveText("Your blueprint is ready");
    await expect(page.locator('[data-lp="downloads"] a')).toHaveJSProperty("pathname", pdfPath);
    expect((await request.get(pdfPath)).status()).toBe(200);
    await expect(page.locator('[data-lp="course"]')).toHaveJSProperty("pathname", "/agentic-spring-boot-testing-course/");
    expect(await leadMagnetEvents(page)).toEqual([]);
  });

  test("the confirmation page sends one Confirmed event", async ({ page }) => {
    await page.goto(confirmedPath);

    await expect(page.locator("h1")).toHaveText("Your email is confirmed - here is your blueprint");
    await expect(page.locator('[data-lp="downloads"] a')).toHaveJSProperty("pathname", pdfPath);
    expect(await leadMagnetEvents(page)).toEqual([["trackEvent", "LeadMagnet", "Confirmed", campaign]]);
  });
});
