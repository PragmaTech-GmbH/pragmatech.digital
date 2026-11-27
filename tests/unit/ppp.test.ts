// Unit tests for the PPP edge function. Runs on Node 24 (native TypeScript type
// stripping) without any Netlify tooling: the handler is called directly with a fake
// Request and a fake edge context, and the `Netlify.env` global is stubbed.
import { test, describe, beforeEach, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import handler, { handlePppRequest } from "../../netlify/edge-functions/ppp.ts";
import { COUNTRY_TIERS } from "../../netlify/shared/ppp-country-tiers.ts";

const envStore = new Map<string, string>();

// The handler reads the clock, so every test runs at a fixed time outside any campaign.
// Tests of a campaign set their own time, with `?now` or with `setClock`.
const timeOutsideCampaign = "2026-01-15T12:00:00Z";

function setClock(isoDate: string) {
  const fixedTime = Date.parse(isoDate);
  mock.method(Date, "now", () => fixedTime);
}

type FakeGeo = { country?: { code?: string; name?: string } } | null;

function callHandler(
  query = "",
  geo: FakeGeo = { country: { code: "DE", name: "Germany" } },
  deployContext = "production",
  method = "GET",
): Response {
  const request = new Request("https://pragmatech.digital/api/ppp" + query, { method });
  const context = { geo, deploy: { context: deployContext } } as any;
  return handlePppRequest(request, context);
}

async function callJson(query?: string, geo?: FakeGeo, deployContext?: string) {
  return callHandler(query, geo, deployContext).json();
}

beforeEach(() => {
  envStore.clear();
  envStore.set("PPP_COUPON_TIER_2", "T30");
  envStore.set("PPP_COUPON_TIER_3", "T50");
  envStore.set("PPP_COUPON_TIER_4", "T70");
  envStore.set("BLACK_FRIDAY_COUPON_TIER_1", "BF30");
  envStore.set("BLACK_FRIDAY_COUPON_TIER_2", "BF51");
  envStore.set("BLACK_FRIDAY_COUPON_TIER_3", "BF65");
  envStore.set("BLACK_FRIDAY_COUPON_TIER_4", "BF79");
  (globalThis as any).Netlify = { env: { get: (name: string) => envStore.get(name) } };
  setClock(timeOutsideCampaign);
});

afterEach(() => {
  mock.restoreAll();
});

describe("tier resolution from geolocation", () => {
  test("Germany is tier 1 without coupon", async () => {
    const body = await callJson();
    assert.equal(body.country, "DE");
    assert.equal(body.countryName, "Germany");
    assert.equal(body.tier, 1);
    assert.equal(body.discountPercentage, 0);
    assert.equal(body.couponCode, null);
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
    const request = new Request("https://pragmatech.digital/api/ppp?country=in");
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

describe("Black Friday campaign", () => {
  const insideWindow = "?now=2026-11-27T12:00:00Z";
  const germany = { country: { code: "DE", name: "Germany" } };

  test("outside the window there is no campaign", async () => {
    const before = await callJson("?now=2026-11-27T06:59:59Z", germany, "deploy-preview");
    assert.equal(before.campaign, null);
    assert.equal(before.couponCode, null);
    const after = await callJson("?now=2026-11-28T00:00:00Z", germany, "deploy-preview");
    assert.equal(after.campaign, null);
  });

  test("in production the real clock starts and ends the campaign", async () => {
    setClock("2026-11-27T06:59:59Z");
    assert.equal((await callJson("", germany, "production")).campaign, null);
    setClock("2026-11-27T07:00:00Z");
    assert.equal((await callJson("", germany, "production")).couponCode, "BF30");
    setClock("2026-11-27T23:59:59Z");
    assert.equal((await callJson("", germany, "production")).couponCode, "BF30");
    setClock("2026-11-28T00:00:00Z");
    assert.equal((await callJson("", germany, "production")).campaign, null);
  });

  test("tier 1 gets the 30 % Black Friday coupon and the campaign end time", async () => {
    const body = await callJson(insideWindow, germany, "deploy-preview");
    assert.equal(body.discountPercentage, 30);
    assert.equal(body.couponCode, "BF30");
    assert.equal(body.tier, 1);
    assert.deepEqual(body.campaign, { name: "black-friday-2026", endsAt: "2026-11-27T23:59:59Z" });
  });

  test("Black Friday stacks with PPP: each tier gets its combined coupon", async () => {
    const tier2 = await callJson(insideWindow, { country: { code: "ES", name: "Spain" } }, "deploy-preview");
    assert.deepEqual([tier2.tier, tier2.discountPercentage, tier2.pppDiscountPercentage, tier2.couponCode], [2, 51, 30, "BF51"]);
    const tier3 = await callJson(insideWindow, { country: { code: "BR", name: "Brazil" } }, "deploy-preview");
    assert.deepEqual([tier3.tier, tier3.discountPercentage, tier3.pppDiscountPercentage, tier3.couponCode], [3, 65, 50, "BF65"]);
    const tier4 = await callJson(insideWindow, { country: { code: "IN", name: "India" } }, "deploy-preview");
    assert.deepEqual([tier4.tier, tier4.discountPercentage, tier4.pppDiscountPercentage, tier4.couponCode], [4, 79, 70, "BF79"]);
    assert.ok(tier4.campaign);
  });

  test("a missing tier coupon keeps the PPP offer and warns", async () => {
    envStore.delete("BLACK_FRIDAY_COUPON_TIER_4");
    const body = await callJson(insideWindow, { country: { code: "IN", name: "India" } }, "deploy-preview");
    assert.equal(body.campaign, null);
    assert.equal(body.couponCode, "T70");
    assert.ok(body.warnings.includes("BLACK_FRIDAY_COUPON_TIER_4 not set"));
  });

  test("the ?now override is ignored on production without a valid token", async () => {
    const body = await callJson(insideWindow, germany, "production");
    assert.equal(body.campaign, null);
    assert.ok(body.warnings.includes("now override ignored"));
  });
});
