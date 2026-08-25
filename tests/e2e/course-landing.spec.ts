// Structure tests for the course landing page (sections, CTAs, curriculum totals,
// FAQ accordion, signup form ids). Runs against plain `hugo serve` (project "hugo").
import { test, expect, type Page } from "@playwright/test";

const coursePath = "/agentic-spring-boot-testing-course/";

function collectPageErrors(page: Page): Error[] {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  return pageErrors;
}

test.describe("course landing page structure", () => {
  test("hero CTAs point to pricing and curriculum", async ({ page }) => {
    const pageErrors = collectPageErrors(page);
    await page.route("**/api/ppp*", (route) => route.fulfill({ status: 404, body: "" }));
    await page.goto(coursePath);

    await expect(page.locator("h1")).toContainText("Agentic Spring Boot Testing");
    await expect(page.locator("[data-hero-primary-cta]")).toHaveAttribute("href", "#pricing");
    await expect(page.locator("[data-hero-secondary-cta]")).toHaveAttribute("href", "#curriculum");
    await expect(page.locator("[data-final-cta]")).toHaveAttribute("href", "#pricing");

    for (const anchor of ["#demo", "#skills", "#curriculum", "#pricing", "#faq", "#signup"]) {
      await expect(page.locator(anchor)).toHaveCount(1);
    }
    expect(pageErrors).toEqual([]);
  });

  test("renders pains, status quo, demo and included sections from frontmatter", async ({ page }) => {
    await page.goto(coursePath);
    await expect(page.locator("[data-pain-item]")).toHaveCount(6);
    await expect(page.locator("[data-demo-panel]")).toHaveCount(2);
    await expect(page.locator('[data-demo-panel="without"]')).toContainText("Total time: 04:12 min");
    await expect(page.locator('[data-demo-panel="with"]')).toContainText("Total time: 48 s");
    await expect(page.locator("[data-demo-stat]")).toHaveCount(4);
    await expect(page.locator("[data-included-item]")).toHaveCount(7);
    await expect(page.locator("[data-testimonial]")).toHaveCount(6);
    await expect(page.locator("[data-endorsement]")).toHaveCount(3);
  });

  test("curriculum totals are computed from the lessons", async ({ page }) => {
    await page.goto(coursePath);
    const summary = page.locator("[data-curriculum-summary]");
    await expect(summary).toContainText("6 modules");
    await expect(summary).toContainText("25 lessons");
    await expect(summary).toContainText("2h 0m");
    await expect(summary).toContainText("2 free previews");
    await expect(page.locator("[data-curriculum-module]")).toHaveCount(6);
    await expect(page.locator("[data-lesson-free]")).toHaveCount(2);
  });

  test("FAQ items open and close without JavaScript", async ({ page }) => {
    await page.goto(coursePath);
    const faqItems = page.locator("[data-faq-item]");
    await expect(faqItems).toHaveCount(8);

    const firstItem = faqItems.first();
    await expect(firstItem).not.toHaveAttribute("open", "");
    await firstItem.locator("summary").click();
    await expect(firstItem).toHaveAttribute("open", "");
    await expect(firstItem.locator("div")).toBeVisible();
    await firstItem.locator("summary").click();
    await expect(firstItem).not.toHaveAttribute("open", "");
  });

  test("signup form keeps the ids that course-signup.js relies on", async ({ page }) => {
    await page.goto(coursePath);
    const form = page.locator("#course-signup-form");
    await expect(form).toHaveCount(1);
    await expect(form).toHaveAttribute("data-action-url", /list-manage\.com/);
    await expect(form).toHaveAttribute("data-tag-id", /\d+/);
    await expect(form.locator('input[name="EMAIL"]')).toBeVisible();
    await expect(page.locator("#course-signup-submit")).toBeVisible();
    await expect(page.locator("#course-signup-success")).toBeHidden();
    await expect(page.locator("#course-signup-already")).toBeHidden();
    await expect(page.locator("#course-signup-error")).toBeHidden();
  });

  test("pricing cards still carry the PPP contract", async ({ page }) => {
    await page.goto(coursePath);
    for (const productKey of ["small", "medium", "large"]) {
      const card = page.locator(`[data-ppp-product="${productKey}"]`);
      await expect(card).toHaveCount(1);
      await expect(card.locator("[data-ppp-price]")).toHaveAttribute("data-ppp-base-price", /\d+/);
      await expect(card.locator("[data-ppp-cta]")).toHaveAttribute("href", /copecart\.com/);
    }
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  });
});
