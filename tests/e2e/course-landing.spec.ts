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
    await expect(page.locator('[data-demo-panel="without"]')).toContainText("Time elapsed: 38.4 s");
    await expect(page.locator('[data-demo-panel="with"]')).toContainText("Time elapsed: 4.1 s");
    await expect(page.locator("[data-demo-focus]")).toHaveCount(4);
    await expect(page.locator("[data-demo-focus]").nth(3)).toContainText("Parallelizability");
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
    await expect(faqItems).toHaveCount(9);

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

  test("shows the course + skill set diagram and the every-edition pricing strip", async ({ page }) => {
    await page.goto(coursePath);
    const diagram = page.locator("[data-course-diagram]");
    await expect(diagram).toHaveCount(1);
    await expect(diagram).toContainText("Online course");
    await expect(diagram).toContainText("Skill library");
    await expect(diagram).toContainText("Your project");
    await expect(diagram).toContainText("test-setup-reviewer");

    const everyEdition = page.locator("[data-ppp-every-edition]");
    await expect(everyEdition).toBeVisible();
    await expect(everyEdition).toContainText("Both editions include");
    await expect(page.locator("[data-ppp-card-base]")).toHaveCount(2);
    await expect(page.locator("[data-ppp-card-base]").first()).toContainText("full skill library");
    await expect(page.locator("[data-ppp-card-base]").first()).toContainText("Masterclass");
  });

  test("renders story, callout, spotlights, concepts, format, audience, team and guarantee", async ({ page }) => {
    await page.goto(coursePath);
    await expect(page.locator("[data-story] p")).toHaveCount(4);
    await expect(page.locator("[data-callout]")).toContainText("not a prompt-engineering course");
    await expect(page.locator("[data-spotlight]")).toHaveCount(2);
    await expect(page.locator("[data-spotlight]").first()).toContainText("Mudi Lukman");
    await expect(page.locator("[data-format-item]")).toHaveCount(4);
    await expect(page.locator("[data-concept]")).toHaveCount(6);
    await expect(page.locator("[data-concept]").first()).toContainText("Context starvation");
    await expect(page.locator("[data-audience]")).toHaveCount(2);
    await expect(page.locator("[data-ppp-guarantee]")).toHaveCount(1);
    await expect(page.locator("[data-ppp-guarantee]").first()).toContainText("money-back");
    await expect(page.locator("#team")).toHaveCount(1);
    await expect(page.locator("[data-team-cta]")).toHaveAttribute("href", /^mailto:info@pragmatech\.digital\?subject=/);
    // The two spotlight students do not repeat in the grid.
    await expect(page.locator("[data-testimonial]")).toHaveCount(6);
    await expect(page.locator("[data-testimonial]", { hasText: "Mudi Lukman" })).toHaveCount(0);
  });

  test("pricing has a Solo card with the PPP contract and a fixed-price Team card", async ({ page }) => {
    await page.goto(coursePath);
    const soloCard = page.locator('[data-ppp-product="solo"]');
    await expect(soloCard).toHaveCount(1);
    await expect(soloCard.locator("[data-ppp-price]")).toHaveAttribute("data-ppp-base-price", "490");
    await expect(soloCard.locator("[data-ppp-cta]")).toHaveAttribute("href", /copecart\.com/);

    const teamCard = page.locator('[data-product="team"]');
    await expect(teamCard).toHaveCount(1);
    await expect(teamCard).not.toHaveAttribute("data-ppp-product", /.*/);
    await expect(teamCard.locator("[data-product-price]")).toHaveText("3,990€");
    await expect(teamCard.locator("[data-quote-cta]")).toHaveAttribute("href", /^mailto:info@pragmatech\.digital\?subject=/);
    await expect(teamCard.locator("[data-product-note]")).toContainText("Larger team");
    await expect(page.locator("[data-ppp-product]")).toHaveCount(1);
    await expect(page.locator("[data-ppp-renewal]")).toContainText("129€");
    await expect(page.locator("[data-team-overflow]")).toContainText("Larger team");
    await expect(page.locator("[data-ppp-banner]")).toBeHidden();
  });
});

test.describe("animated Claude Code demo", () => {
  test("plays both sessions when scrolled into view and can be replayed", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto(coursePath);
    const lastLineWithout = page.locator('[data-demo-panel="without"] [data-demo-line]').last();
    const lastLineWith = page.locator('[data-demo-panel="with"] [data-demo-line]').last();
    const replayButton = page.locator("[data-demo-replay]");

    // With JavaScript the transcript is hidden until the section scrolls into view.
    await expect(lastLineWithout).toBeHidden();
    await expect(replayButton).toBeHidden();

    await page.locator("#demo").scrollIntoViewIfNeeded();
    await expect(page.locator('[data-demo-panel="with"] [data-demo-type="user"] [data-demo-text]')).toHaveText(
      "write tests for the OwnerController",
      { timeout: 20_000 },
    );
    await expect(lastLineWithout).toBeVisible({ timeout: 45_000 });
    await expect(lastLineWith).toBeVisible({ timeout: 45_000 });
    await expect(page.locator('[data-demo-panel="with"]')).toContainText("LSP(documentSymbol OwnerController.java)");
    await expect(page.locator('[data-demo-panel="with"]')).toContainText("@WebMvcTest(OwnerController.class)");
    await expect(page.locator('[data-demo-panel="with"]')).toContainText("OwnerCreationIT");
    await expect(page.locator('[data-demo-panel="without"] [data-demo-cursor]')).toBeHidden();
    await expect(replayButton).toBeVisible();

    await replayButton.click();
    await expect(lastLineWith).toBeHidden();
    await expect(lastLineWith).toBeVisible({ timeout: 45_000 });
  });

  test("shows the full static transcript with reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(coursePath);
    await page.locator("#demo").scrollIntoViewIfNeeded();
    const lines = page.locator("[data-demo-line]");
    await expect(lines).toHaveCount(41);
    await expect(lines.last()).toBeVisible();
    await expect(page.locator("[data-demo-cursor]").first()).toBeHidden();
    await expect(page.locator("[data-demo-replay]")).toBeHidden();
  });

  test.describe("without JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("shows the full static transcript", async ({ page }) => {
      await page.goto(coursePath);
      const lines = page.locator("[data-demo-line]");
      await expect(lines).toHaveCount(41);
      await expect(lines.first()).toBeVisible();
      await expect(lines.last()).toBeVisible();
      await expect(page.locator('[data-demo-panel="without"]')).toContainText("Time elapsed: 38.4 s");
      await expect(page.locator("[data-demo-replay]")).toBeHidden();
    });
  });
});
