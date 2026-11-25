// Tests for the 3-PDF bundle landing page, its download page and its thank-you page.
// All MailerLite and Matomo requests are blocked or mocked: nothing reaches the real
// subscriber list or the real statistics. Runs against `hugo serve` (project "hugo").
import { test, expect, type Page } from "@playwright/test";

const publicPath = "/lp/agentic-readiness-bundle/";
const thankYouPath = "/lp/agentic-readiness-bundle/thank-you/";
const subscribePattern = "**/jsonp/1613864/forms/187358602568140384/subscribe*";

test.beforeEach(async ({ page }) => {
  await page.route(/mailerlite\.com|mlcdn\.com|analytics\.rieckpil\.de/, (route) => route.abort());
});

async function mockMailerLite(page: Page, responseBody: unknown): Promise<URLSearchParams[]> {
  const subscribeRequests: URLSearchParams[] = [];
  await page.route(subscribePattern, (route) => {
    subscribeRequests.push(new URLSearchParams(route.request().postData() ?? ""));
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify(responseBody),
    });
  });
  return subscribeRequests;
}

async function fillForm(page: Page) {
  await page.fill('input[name="fields[name]"]', "Jane Doe");
  await page.fill('input[name="fields[company]"]', "Acme");
  await page.fill('input[name="fields[email]"]', "jane@example.com");
}

test.describe("bundle landing page", () => {
  test("shows the three covers, the CTA and the form in the right third", async ({ page }) => {
    await page.goto(publicPath);

    const covers = page.locator('[data-lp="covers"] img');
    await expect(covers).toHaveCount(3);
    for (const cover of await covers.all()) {
      await expect.poll(() => cover.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    }
    await expect(page.locator("#lead-bundle-submit")).toHaveText("Send the 3 reports to my inbox");
    const copyBox = (await page.locator('[data-lp="copy"]').boundingBox())!;
    const formCardBox = (await page.locator("#lead-bundle-form").locator("..").boundingBox())!;
    expect(formCardBox.x).toBeGreaterThan(copyBox.x + copyBox.width - 1);
    const widthRatio = copyBox.width / formCardBox.width;
    expect(widthRatio).toBeGreaterThan(1.9);
    expect(widthRatio).toBeLessThan(2.3);
  });

  test("targets Java and Spring teams with badges below the headline", async ({ page }) => {
    await page.goto(publicPath);

    await expect(page.locator('[data-lp="tech-badges"] li')).toHaveText(["Java", "Spring Framework"]);
    const headlineBox = (await page.locator('[data-lp="copy"] h1').boundingBox())!;
    const badgesBox = (await page.locator('[data-lp="tech-badges"]').boundingBox())!;
    expect(badgesBox.y).toBeGreaterThan(headlineBox.y + headlineBox.height - 1);
  });

  test("says where the data and insights come from", async ({ page }) => {
    await page.goto(publicPath);

    const sources = page.locator('[data-lp="sources"] li');
    await expect(sources).toHaveCount(4);
    await expect(sources).toContainText(["Consulting", "Speaking", "9,000", "10,000"]);
    await expect(page.locator('[data-lp="mission"] strong')).toContainText("Enable Clients to Ship with Confidence in Every Commit");
  });

  test("is indexable and in the sitemap, its sub pages are not", async ({ page, request }) => {
    await page.goto(publicPath);
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain(publicPath);
    expect(sitemap).not.toContain(thankYouPath);
  });

  test("all three PDFs are published", async ({ request }) => {
    for (const fileName of [
      "PragmaTech-Spring-Boot-Developer-Productivity-Report-2026.pdf",
      "PragmaTech-Spring-Boot-Testing-AI-Survey-2026.pdf",
      "PragmaTech-Top-5-Investments-Before-Scaling-AI-Agents.pdf",
    ]) {
      const response = await request.get(`/documents/lead-bundle/${fileName}`);
      expect(response.status(), fileName).toBe(200);
    }
  });

  test("header and footer link to the bundle", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Get the three free PDFs for engineering leaders" })).toBeVisible();
    await expect(page.locator('[data-lp="footer-covers"] img')).toHaveCount(3);
    const headerLink = page.locator("#navbar").getByRole("link", { name: /Agentic Development Readiness Bundle/ }).first();
    await headerLink.click();
    await expect(page).toHaveURL(new RegExp(`${publicPath}$`));
  });

  test("is a standalone page with legal links only", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(publicPath);
    await expect(page.locator("#lead-bundle-submit")).toBeEnabled();

    await expect(page.locator("#navbar")).toHaveCount(0);
    await expect(page.locator('[data-lp="brand"]')).toBeVisible();
    await expect(page.locator("body a:visible")).toHaveText(["Privacy policy", "Imprint", "Privacy Policy"]);
    expect(pageErrors).toEqual([]);
  });

  test("stores nothing on the device", async ({ page, context }) => {
    await page.goto(publicPath);
    await expect(page.locator("#lead-bundle-submit")).toBeEnabled();

    expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
    expect(await context.cookies()).toEqual([]);
  });
});

test.describe("bundle signup", () => {
  test("blocks an invalid email without a request", async ({ page }) => {
    const subscribeRequests = await mockMailerLite(page, { success: true });
    await page.goto(publicPath);
    await fillForm(page);
    await page.fill('input[name="fields[email]"]', "not-an-email");
    await page.locator("#lead-bundle-submit").click();

    await expect(page.locator("#lead-bundle-error")).toContainText("valid email");
    expect(subscribeRequests).toHaveLength(0);
  });

  test("sends the MailerLite fields and redirects after success", async ({ page }) => {
    const subscribeRequests = await mockMailerLite(page, { success: true });
    await page.goto(publicPath);
    await fillForm(page);
    await page.locator("#lead-bundle-submit").click();

    await expect(page).toHaveURL(new RegExp(`${thankYouPath}$`));
    const parameters = subscribeRequests[0];
    expect(parameters.get("fields[name]")).toBe("Jane Doe");
    expect(parameters.get("fields[company]")).toBe("Acme");
    expect(parameters.get("fields[email]")).toBe("jane@example.com");
    expect(parameters.get("ml-submit")).toBe("1");
    expect(parameters.get("anticsrf")).toBe("true");
    expect(parameters.get("ajax")).toBe("1");
  });

  test("sends the Signup event to the tracker that matomo.js installs after page load", async ({ page }) => {
    await mockMailerLite(page, { success: true });
    const trackedEntries: unknown[][] = [];
    await page.exposeFunction("recordTrackedEntry", (entry: unknown[]) => trackedEntries.push(entry));
    await page.goto(publicPath);
    await fillForm(page);
    // matomo.js loads async and replaces the window._paq array with its own object.
    await page.evaluate(() => {
      (window as any)._paq = { push: (entry: unknown[]) => (window as any).recordTrackedEntry(entry.slice(0, 4)) };
    });
    await page.locator("#lead-bundle-submit").click();

    await expect(page).toHaveURL(new RegExp(`${thankYouPath}$`));
    expect(trackedEntries).toContainEqual(["trackEvent", "LeadMagnet", "Signup", "agentic-readiness-bundle"]);
  });

  test("stays on the page when MailerLite rejects the signup", async ({ page }) => {
    await mockMailerLite(page, { success: false, errors: { fields: { email: ["<b>raw markup</b>"] } } });
    await page.goto(publicPath);
    await fillForm(page);
    await page.locator("#lead-bundle-submit").click();

    await expect(page.locator("#lead-bundle-error")).toHaveText("Please enter a valid email address.");
    await expect(page.locator("#lead-bundle-fallback")).toBeVisible();
    await expect(page.locator("#lead-bundle-submit")).toBeEnabled();
    await expect(page).toHaveURL(new RegExp(`${publicPath}$`));
  });

  test("stays on the page when MailerLite is not reachable", async ({ page }) => {
    await page.goto(publicPath);
    await fillForm(page);
    await page.locator("#lead-bundle-submit").click();

    await expect(page.locator("#lead-bundle-error")).toContainText("Network error");
    await expect(page).toHaveURL(new RegExp(`${publicPath}$`));
  });

  test("shows an error when MailerLite does not answer", async ({ page }) => {
    await page.clock.install();
    await page.route(subscribePattern, () => {
      // never answered
    });
    await page.goto(publicPath);
    await fillForm(page);
    await page.locator("#lead-bundle-submit").click();
    await expect(page.locator("#lead-bundle-submit")).toBeDisabled();
    await page.clock.fastForward(10_500);

    await expect(page.locator("#lead-bundle-error")).toContainText("Something went wrong");
    await expect(page.locator("#lead-bundle-submit")).toBeEnabled();
  });
});

test.describe("bundle download page", () => {
  const downloadPath = "/lp/agentic-readiness-bundle/download/";

  test("offers all three PDFs and the call, and every PDF link works", async ({ page, request }) => {
    await page.goto(downloadPath);

    const downloadLinks = page.locator('[data-lp="downloads"] a');
    await expect(downloadLinks).toHaveCount(3);
    for (const downloadLink of await downloadLinks.all()) {
      const linkTarget = await downloadLink.evaluate((anchor: HTMLAnchorElement) => anchor.href);
      expect(new URL(linkTarget).pathname).toMatch(/^\/documents\/lead-bundle\/.+\.pdf$/);
      expect((await request.get(new URL(linkTarget).pathname)).status(), linkTarget).toBe(200);
    }
    await expect(page.locator('[data-lp="call"]')).toHaveAttribute("href", /cal\.eu\/pragmatech/);
  });

  test("is not indexed and not in the sitemap", async ({ page, request }) => {
    await page.goto(downloadPath);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain(downloadPath);
  });
});

const leadMagnetEvents = (page: Page) =>
  page.evaluate(() => ((window as any)._paq as unknown[][]).filter((entry) => entry[1] === "LeadMagnet"));

test.describe("bundle confirmation page", () => {
  const confirmedPath = "/lp/agentic-readiness-bundle/confirmed/";

  test("confirms the email and offers all three PDFs and the call", async ({ page }) => {
    await page.goto(confirmedPath);

    await expect(page.locator("h1")).toHaveText("Your email is confirmed - here are your three PDFs");
    await expect(page.locator('[data-lp="downloads"] a')).toHaveCount(3);
    await expect(page.locator('[data-lp="call"]')).toHaveAttribute("href", /cal\.eu\/pragmatech/);
  });

  test("sends one Confirmed event, with page view and link tracking", async ({ page }) => {
    await page.goto(confirmedPath);

    expect(await leadMagnetEvents(page)).toEqual([["trackEvent", "LeadMagnet", "Confirmed", "agentic-readiness-bundle"]]);
    const trackerCommands = await page.evaluate(() => ((window as any)._paq as unknown[][]).map((entry) => entry[0]));
    expect(trackerCommands).toEqual(expect.arrayContaining(["disableCookies", "trackPageView", "enableLinkTracking"]));
  });

  test("the download page from the email sends no Confirmed event", async ({ page }) => {
    await page.goto("/lp/agentic-readiness-bundle/download/");

    await expect(page.locator("h1")).toHaveText("Your three PDFs are ready");
    expect(await leadMagnetEvents(page)).toEqual([]);
  });

  test("is not indexed and not in the sitemap", async ({ page, request }) => {
    await page.goto(confirmedPath);

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).not.toContain(confirmedPath);
  });
});

test("the thank-you page explains both steps and is not indexed", async ({ page }) => {
  await page.goto(thankYouPath);

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator('[data-lp="steps"] li')).toHaveCount(2);
});
