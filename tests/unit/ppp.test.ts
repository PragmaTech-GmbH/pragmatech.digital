// Unit tests for the PPP edge function. Runs on Node 24 (native TypeScript type
// stripping) without any Netlify tooling: the handler is called directly with a fake
// Request and a fake edge context, and the `Netlify.env` global is stubbed.
import { test, describe, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler, { handlePppRequest, TIERS } from "../../netlify/edge-functions/ppp.ts";
import { COUNTRY_TIERS } from "../../netlify/shared/ppp-country-tiers.ts";
import { EARLY_BIRD_DISCOUNT_PERCENTAGE, EARLY_BIRD_ENDS_AT } from "../../netlify/shared/ppp-early-bird.ts";

const DURING_EARLY_BIRD = Date.parse("2026-10-02T08:59:59+02:00");
const AFTER_EARLY_BIRD = Date.parse("2026-10-02T09:00:00+02:00");

const envStore = new Map<string, string>();

type FakeGeo = { country?: { code?: string; name?: string } } | null;

function callHandler(
  query = "",
  geo: FakeGeo = { country: { code: "DE", name: "Germany" } },
  deployContext = "production",
  method = "GET",
  currentTime = AFTER_EARLY_BIRD,
): Response {
  const request = new Request("https://pragmatech.digital/api/ppp" + query, { method });
  const context = { geo, deploy: { context: deployContext } } as any;
  return handlePppRequest(request, context, currentTime);
}

async function callJson(query?: string, geo?: FakeGeo, deployContext?: string, currentTime?: number) {
  return callHandler(query, geo, deployContext, "GET", currentTime).json();
}

async function callJsonDuringEarlyBird(geo: FakeGeo) {
  return callJson("", geo, "production", DURING_EARLY_BIRD);
}

beforeEach(() => {
  envStore.clear();
  envStore.set("PPP_COUPON_TIER_2", "T30");
  envStore.set("PPP_COUPON_TIER_3", "T50");
  envStore.set("PPP_COUPON_TIER_4", "T70");
  envStore.set("PPP_COUPON_EARLY_BIRD_TIER_1", "EB33");
  envStore.set("PPP_COUPON_EARLY_BIRD_TIER_2", "EB53");
  envStore.set("PPP_COUPON_EARLY_BIRD_TIER_3", "EB67");
  envStore.set("PPP_COUPON_EARLY_BIRD_TIER_4", "EB80");
  (globalThis as any).Netlify = { env: { get: (name: string) => envStore.get(name) } };
});

describe("tier resolution from geolocation", () => {
  test("Germany is tier 1 without coupon", async () => {
    const body = await callJson();
    assert.equal(body.country, "DE");
    assert.equal(body.countryName, "Germany");
    assert.equal(body.tier, 1);
    assert.equal(body.discountPercentage, 0);
    assert.equal(body.couponCode, null);
    assert.equal(body.earlyBird, false);
    assert.equal(body.earlyBirdEndsAt, null);
    assert.equal(body.overridden, false);
    assert.deepEqual(body.warnings, []);
  });

  test("India is tier 4 with 70 % coupon", async () => {
    const body = await callJson("", { country: { code: "IN", name: "India" } });
    assert.equal(body.tier, 4);
    assert.equal(body.discountPercentage, 70);
    assert.equal(body.couponCode, "T70");
  });

  test("Brazil is tier 3, Mexico is tier 2", async () => {
    const brazil = await callJson("", { country: { code: "BR", name: "Brazil" } });
    assert.equal(brazil.tier, 3);
    assert.equal(brazil.discountPercentage, 50);
    assert.equal(brazil.couponCode, "T50");

    const mexico = await callJson("", { country: { code: "MX", name: "Mexico" } });
    assert.equal(mexico.tier, 2);
    assert.equal(mexico.discountPercentage, 30);
    assert.equal(mexico.couponCode, "T30");
  });

  test("lowercase geo code is normalized", async () => {
    const body = await callJson("", { country: { code: "in", name: "India" } });
    assert.equal(body.country, "IN");
    assert.equal(body.tier, 4);
  });

  test("unknown country and missing geo fall back to tier 1", async () => {
    const unknown = await callJson("", { country: { code: "XX", name: "Nowhere" } });
    assert.equal(unknown.tier, 1);
    assert.equal(unknown.couponCode, null);

    const missing = await callJson("", null);
    assert.equal(missing.country, "");
    assert.equal(missing.tier, 1);
    assert.equal(missing.couponCode, null);
  });
});

describe("country override", () => {
  test("is accepted outside production", async () => {
    const body = await callJson("?country=in", { country: { code: "DE", name: "Germany" } }, "dev");
    assert.equal(body.country, "IN");
    assert.equal(body.countryName, "India");
    assert.equal(body.tier, 4);
    assert.equal(body.couponCode, "T70");
    assert.equal(body.overridden, true);
  });

  test("is accepted on deploy previews", async () => {
    const body = await callJson("?country=br", { country: { code: "DE", name: "Germany" } }, "deploy-preview");
    assert.equal(body.tier, 3);
    assert.equal(body.overridden, true);
  });

  test("is ignored in production without token", async () => {
    const body = await callJson("?country=in", { country: { code: "DE", name: "Germany" } }, "production");
    assert.equal(body.country, "DE");
    assert.equal(body.tier, 1);
    assert.equal(body.couponCode, null);
    assert.equal(body.overridden, false);
    assert.ok(body.warnings.includes("country override ignored"));
  });

  test("is ignored in production with a wrong token", async () => {
    envStore.set("PPP_TEST_TOKEN", "secret");
    const body = await callJson("?country=in&token=wrong", { country: { code: "DE", name: "Germany" } }, "production");
    assert.equal(body.tier, 1);
    assert.ok(body.warnings.includes("country override ignored"));
  });

  test("is accepted in production with the correct token", async () => {
    envStore.set("PPP_TEST_TOKEN", "secret");
    const body = await callJson("?country=in&token=secret", { country: { code: "DE", name: "Germany" } }, "production");
    assert.equal(body.tier, 4);
    assert.equal(body.couponCode, "T70");
    assert.equal(body.overridden, true);
  });

  test("falls back to the CONTEXT env var when deploy context is missing", async () => {
    envStore.set("CONTEXT", "dev");
    const request = new Request("https://pragmatech.digital/api/ppp?country=in&now=2026-10-02T09:00:00%2B02:00");
    const body = await handler(request, { geo: { country: { code: "DE", name: "Germany" } } } as any).json();
    assert.equal(body.tier, 4);
    assert.equal(body.overridden, true);
  });

  test("rejects malformed country codes", async () => {
    const body = await callJson("?country=zzz", { country: { code: "DE", name: "Germany" } }, "dev");
    assert.equal(body.country, "DE");
    assert.equal(body.tier, 1);
    assert.equal(body.overridden, false);
    assert.ok(body.warnings.includes("country override invalid"));
  });
});

describe("robustness", () => {
  test("missing coupon env var degrades to tier 1 with a warning", async () => {
    envStore.delete("PPP_COUPON_TIER_4");
    const response = callHandler("", { country: { code: "IN", name: "India" } });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.tier, 1);
    assert.equal(body.discountPercentage, 0);
    assert.equal(body.couponCode, null);
    assert.deepEqual(body.warnings, ["PPP_COUPON_TIER_4 not set"]);
  });

  test("blank coupon env var counts as not set", async () => {
    envStore.set("PPP_COUPON_TIER_4", "   ");
    const body = await callJson("", { country: { code: "IN", name: "India" } });
    assert.equal(body.tier, 1);
    assert.deepEqual(body.warnings, ["PPP_COUPON_TIER_4 not set"]);
  });

  test("coupon values are trimmed", async () => {
    envStore.set("PPP_COUPON_TIER_4", "  T70  ");
    const body = await callJson("", { country: { code: "IN", name: "India" } });
    assert.equal(body.couponCode, "T70");
  });

  test("non-GET methods get 405", () => {
    const response = callHandler("", null, "production", "POST");
    assert.equal(response.status, 405);
    assert.equal(response.headers.get("Allow"), "GET");
  });

  test("responses are JSON and never cached", () => {
    const response = callHandler();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Content-Type"), "application/json; charset=utf-8");
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    assert.equal(response.headers.get("X-Robots-Tag"), "noindex");
  });
});

describe("early bird campaign", () => {
  test("Germany gets the 33 % early bird coupon until the deadline", async () => {
    const body = await callJsonDuringEarlyBird({ country: { code: "DE", name: "Germany" } });
    assert.equal(body.tier, 1);
    assert.equal(body.discountPercentage, 33);
    assert.equal(body.couponCode, "EB33");
    assert.equal(body.earlyBird, true);
    assert.equal(body.earlyBirdEndsAt, EARLY_BIRD_ENDS_AT);
    assert.deepEqual(body.warnings, []);
  });

  test("PPP tiers get the stacked early bird coupons", async () => {
    const mexico = await callJsonDuringEarlyBird({ country: { code: "MX", name: "Mexico" } });
    assert.deepEqual([mexico.tier, mexico.discountPercentage, mexico.couponCode, mexico.earlyBird], [2, 53, "EB53", true]);

    const brazil = await callJsonDuringEarlyBird({ country: { code: "BR", name: "Brazil" } });
    assert.deepEqual([brazil.tier, brazil.discountPercentage, brazil.couponCode, brazil.earlyBird], [3, 67, "EB67", true]);

    const india = await callJsonDuringEarlyBird({ country: { code: "IN", name: "India" } });
    assert.deepEqual([india.tier, india.discountPercentage, india.couponCode, india.earlyBird], [4, 80, "EB80", true]);
  });

  test("ends exactly at the deadline", async () => {
    const germany = await callJson("", { country: { code: "DE", name: "Germany" } }, "production", AFTER_EARLY_BIRD);
    assert.equal(germany.earlyBird, false);
    assert.equal(germany.couponCode, null);

    const india = await callJson("", { country: { code: "IN", name: "India" } }, "production", AFTER_EARLY_BIRD);
    assert.deepEqual([india.tier, india.discountPercentage, india.couponCode, india.earlyBird], [4, 70, "T70", false]);
  });

  test("the default handler uses the real clock", async () => {
    const request = new Request("https://pragmatech.digital/api/ppp");
    const body = await handler(request, { geo: { country: { code: "DE", name: "Germany" } }, deploy: { context: "production" } } as any).json();
    assert.equal(body.earlyBird, Date.now() < Date.parse(EARLY_BIRD_ENDS_AT));
  });

  test("?now= switches the campaign outside production", async () => {
    const during = await callJson("?now=2026-09-20T10:00:00Z", { country: { code: "DE", name: "Germany" } }, "dev");
    assert.equal(during.earlyBird, true);
    assert.equal(during.overridden, true);

    const after = await callJson("?now=2026-10-02T07:00:00Z", { country: { code: "DE", name: "Germany" } }, "dev", DURING_EARLY_BIRD);
    assert.equal(after.earlyBird, false);
    assert.equal(after.couponCode, null);
  });

  test("?now= is ignored in production without token and rejected when malformed", async () => {
    const production = await callJson("?now=2026-09-20T10:00:00Z", { country: { code: "DE", name: "Germany" } }, "production");
    assert.equal(production.earlyBird, false);
    assert.equal(production.overridden, false);
    assert.ok(production.warnings.includes("country override ignored"));

    const malformed = await callJson("?now=soon", { country: { code: "DE", name: "Germany" } }, "dev");
    assert.equal(malformed.earlyBird, false);
    assert.ok(malformed.warnings.includes("now override invalid"));
  });

  test("missing early bird coupon falls back to the next best offer", async () => {
    envStore.delete("PPP_COUPON_EARLY_BIRD_TIER_4");
    const india = await callJsonDuringEarlyBird({ country: { code: "IN", name: "India" } });
    assert.deepEqual([india.tier, india.discountPercentage, india.couponCode, india.earlyBird], [4, 70, "T70", false]);
    assert.deepEqual(india.warnings, ["PPP_COUPON_EARLY_BIRD_TIER_4 not set"]);

    envStore.delete("PPP_COUPON_EARLY_BIRD_TIER_2");
    const mexico = await callJsonDuringEarlyBird({ country: { code: "MX", name: "Mexico" } });
    assert.deepEqual([mexico.tier, mexico.discountPercentage, mexico.couponCode, mexico.earlyBird], [1, 33, "EB33", true]);

    envStore.delete("PPP_COUPON_EARLY_BIRD_TIER_1");
    const germany = await callJsonDuringEarlyBird({ country: { code: "DE", name: "Germany" } });
    assert.deepEqual([germany.tier, germany.discountPercentage, germany.couponCode, germany.earlyBird], [1, 0, null, false]);
    assert.deepEqual(germany.warnings, ["PPP_COUPON_EARLY_BIRD_TIER_1 not set"]);
  });

  test("stacked percentages follow 100 - (100 - early bird) * (100 - PPP) / 100, rounded", () => {
    for (const pricing of Object.values(TIERS)) {
      const expectedPercentage = Math.round(100 - ((100 - EARLY_BIRD_DISCOUNT_PERCENTAGE) * (100 - pricing.discountPercentage)) / 100);
      assert.equal(pricing.earlyBirdDiscountPercentage, expectedPercentage);
    }
  });

  test("matches ppp.earlyBird in the course landing page frontmatter", () => {
    const landingPage = readFileSync(new URL("../../content/agentic-spring-boot-testing-course.md", import.meta.url), "utf8");
    const earlyBirdBlock = landingPage.match(/^  earlyBird:\n((?:    .*\n)+)/m)?.[1] ?? "";
    assert.match(earlyBirdBlock, new RegExp(`discountPercentage: ${EARLY_BIRD_DISCOUNT_PERCENTAGE}\\n`));
    assert.ok(earlyBirdBlock.includes(`endsAt: "${EARLY_BIRD_ENDS_AT}"`), "endsAt differs from netlify/shared/ppp-early-bird.ts");
  });
});

describe("COUNTRY_TIERS data", () => {
  test("contains only tiers 2-4 keyed by upper-case ISO codes", () => {
    for (const [code, tier] of Object.entries(COUNTRY_TIERS)) {
      assert.match(code, /^[A-Z]{2}$/);
      assert.ok([2, 3, 4].includes(tier), `${code} has tier ${tier}`);
    }
  });

  test("excludes bogus source entries", () => {
    for (const code of ["HR", "MR", "ST", "VE"]) {
      assert.equal(COUNTRY_TIERS[code], undefined, `${code} must not be mapped`);
    }
  });

  test("spot checks against the WordPress factor table", () => {
    assert.equal(COUNTRY_TIERS.DE, undefined);
    assert.equal(COUNTRY_TIERS.US, undefined);
    assert.equal(COUNTRY_TIERS.MX, 2);
    assert.equal(COUNTRY_TIERS.CN, 2);
    assert.equal(COUNTRY_TIERS.BR, 3);
    assert.equal(COUNTRY_TIERS.PL, 3);
    assert.equal(COUNTRY_TIERS.IN, 4);
    assert.equal(COUNTRY_TIERS.TR, 4);
    assert.equal(COUNTRY_TIERS.PK, 4);
  });
});
