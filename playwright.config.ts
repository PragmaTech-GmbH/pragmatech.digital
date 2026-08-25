import { defineConfig } from "@playwright/test";

// Two projects:
// - "hugo" (default): plain `hugo serve`, the /api/ppp edge function is faked per test
//   with page.route(). Deterministic, no Netlify tooling required.
// - "netlify" (opt-in via PPP_E2E_NETLIFY=1): `netlify dev` runs the real edge function
//   locally with mocked geolocation and the values from .env.
//
// Browser: Playwright's own bundled Chromium (installed with `npx playwright install
// chromium`), headless, with a throwaway profile per test. No `channel` is set on
// purpose, so the system browsers (Chrome, Firefox, Safari) are never used or touched.
const coursePath = "/agentic-spring-boot-testing-course/";
const useNetlifyDev = Boolean(process.env.PPP_E2E_NETLIFY);

const chromiumLaunchArgs = [
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-features=Translate,PasswordLeakDetection,PasswordManagerOnboarding,AutofillServerCommunication",
  "--disable-save-password-bubble",
  "--disable-notifications",
  "--hide-crash-restore-bubble",
];

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    browserName: "chromium",
    headless: true,
    viewport: { width: 1280, height: 900 },
    launchOptions: { args: chromiumLaunchArgs },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "hugo",
      use: { baseURL: "http://localhost:1316" },
      testIgnore: /ppp-netlify\.spec\.ts$/,
    },
    {
      name: "netlify",
      use: { baseURL: "http://localhost:8888" },
      testMatch: /ppp-netlify\.spec\.ts$/,
    },
  ],
  webServer: useNetlifyDev
    ? {
        command: "npx netlify-cli dev --no-open --geo=mock --country=DE",
        url: "http://localhost:8888" + coursePath,
        reuseExistingServer: true,
        timeout: 180_000,
      }
    : {
        command: "hugo serve -D --port 1316 --disableLiveReload",
        url: "http://localhost:1316" + coursePath,
        reuseExistingServer: true,
        timeout: 120_000,
        env: {
          PPP_PRODUCT_ID_SMALL: "pid-small",
          PPP_PRODUCT_ID_MEDIUM: "pid-medium",
          PPP_PRODUCT_ID_LARGE: "pid-large",
        },
      },
});
