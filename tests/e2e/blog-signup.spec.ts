// The bundle signup below blog posts and the teaser in the sidebar. All MailerLite and Matomo
// requests are blocked or mocked: nothing reaches the real subscriber list or statistics.
import { test, expect } from "@playwright/test";

const postPath = "/blog/agentic-testing-for-spring-boot-is-live/";

test.beforeEach(async ({ page }) => {
  await page.route(/mailerlite\.com|mlcdn\.com|analytics\.rieckpil\.de/, (route) => route.abort());
});

test("signs up below a blog post and opens the thank-you page", async ({ page }) => {
  const subscribedEmails: (string | null)[] = [];
  await page.route("**/jsonp/1613864/forms/187358602568140384/subscribe*", (route) => {
    subscribedEmails.push(new URLSearchParams(route.request().postData() ?? "").get("fields[email]"));
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ success: true }),
    });
  });
  await page.goto(postPath);

  await expect(page.locator('#blog-signup [data-lp="covers"] img')).toHaveCount(3);
  await page.fill('input[name="fields[name]"]', "Jane Doe");
  await page.fill('input[name="fields[company]"]', "Acme");
  await page.fill('input[name="fields[email]"]', "jane@example.com");
  await page.locator("#lead-bundle-submit").click();

  await page.waitForURL("**/lp/agentic-readiness-bundle/thank-you/");
  expect(subscribedEmails).toEqual(["jane@example.com"]);
});

test("links from the sidebar to the bundle landing page, without a form", async ({ page }) => {
  await page.goto(postPath);

  const sidebar = page.locator(".blog-post__sidebar");
  await expect(sidebar.locator("form, input")).toHaveCount(0);
  await expect(sidebar.locator("img")).toHaveCount(3);
  await sidebar.getByRole("link", { name: "See What Is Inside" }).click();

  await expect(page).toHaveURL(/\/lp\/agentic-readiness-bundle\/$/);
});
