// Purchase Power Parity (PPP) endpoint for course landing pages.
// Runs only for GET /api/ppp (see `config` below). Resolves the visitor country from
// Netlify's geolocation, maps it to a discount tier and returns the coupon code for
// that tier. Coupon codes come from env vars and never live in this public repo.
import type { Config, Context } from "@netlify/edge-functions";
import { COUNTRY_TIERS } from "../shared/ppp-country-tiers.ts";

// The `Netlify` global is provided by the edge runtime; this declaration keeps the
// file type-checkable and runnable (Node unit tests stub `globalThis.Netlify`).
declare const Netlify: { env: { get(name: string): string | undefined } };

type Tier = 1 | 2 | 3 | 4;

type TierPricing = {
  discountPercentage: number;
  couponEnvVar: string | null;
};

// All percentages are off the list price, because CopeCart applies one coupon per checkout.
export const TIERS: Readonly<Record<Tier, TierPricing>> = {
  1: { discountPercentage: 0, couponEnvVar: null },
  2: { discountPercentage: 30, couponEnvVar: "PPP_COUPON_TIER_2" },
  3: { discountPercentage: 50, couponEnvVar: "PPP_COUPON_TIER_3" },
  4: { discountPercentage: 70, couponEnvVar: "PPP_COUPON_TIER_4" },
};

// Black Friday 2026 campaign: 30 % off the base price on top of Purchase Power Parity.
// CopeCart applies one coupon per checkout, so every tier needs its own combined coupon
// (PPP and Black Friday multiplied): 1 - (1 - PPP) * (1 - 0.30). Each coupon code lives in an
// env var and must carry the same validity window in CopeCart. Remove this block after the campaign.
export const BLACK_FRIDAY = {
  name: "black-friday-2026",
  startsAt: "2026-11-27T07:00:00Z",
  endsAt: "2026-11-27T23:59:59Z",
  discountPercentage: 30,
} as const;

export const BLACK_FRIDAY_TIERS: Readonly<Record<Tier, TierPricing>> = {
  1: { discountPercentage: 30, couponEnvVar: "BLACK_FRIDAY_COUPON_TIER_1" },
  2: { discountPercentage: 51, couponEnvVar: "BLACK_FRIDAY_COUPON_TIER_2" },
  3: { discountPercentage: 65, couponEnvVar: "BLACK_FRIDAY_COUPON_TIER_3" },
  4: { discountPercentage: 79, couponEnvVar: "BLACK_FRIDAY_COUPON_TIER_4" },
};

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};

function countryNameFor(countryCode: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

export function handlePppRequest(request: Request, context: Context): Response {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const requestUrl = new URL(request.url);
  const warnings: string[] = [];

  let country = (context.geo?.country?.code ?? "").toUpperCase();
  let countryName = context.geo?.country?.name ?? "";
  let overridden = false;

  // `?country=xx` override for QA. Free outside production; in production it needs
  // `?token=` matching PPP_TEST_TOKEN so the coupon codes cannot be enumerated.
  const requestedCountry = (requestUrl.searchParams.get("country") ?? "").toUpperCase();
  if (requestedCountry) {
    const deployContext = context.deploy?.context ?? Netlify.env.get("CONTEXT");
    const isProduction = deployContext === "production";
    const testToken = Netlify.env.get("PPP_TEST_TOKEN");
    const overrideAllowed = !isProduction || (!!testToken && requestUrl.searchParams.get("token") === testToken);

    if (!overrideAllowed) {
      warnings.push("country override ignored");
    } else {
      if (COUNTRY_CODE_PATTERN.test(requestedCountry)) {
        country = requestedCountry;
        countryName = countryNameFor(requestedCountry);
        overridden = true;
      } else {
        warnings.push("country override invalid");
      }
    }
  }

  // `?now=<ISO date>` simulates the clock for QA, guarded like the country override.
  let currentTime = Date.now();
  const requestedNow = requestUrl.searchParams.get("now");
  if (requestedNow) {
    const deployContext = context.deploy?.context ?? Netlify.env.get("CONTEXT");
    const testToken = Netlify.env.get("PPP_TEST_TOKEN");
    const nowOverrideAllowed =
      deployContext !== "production" || (!!testToken && requestUrl.searchParams.get("token") === testToken);
    const requestedTime = Date.parse(requestedNow);
    if (!nowOverrideAllowed) {
      warnings.push("now override ignored");
    } else if (Number.isNaN(requestedTime)) {
      warnings.push("now override invalid");
    } else {
      currentTime = requestedTime;
    }
  }

  const pppTier: Tier = COUNTRY_TIERS[country] ?? 1;
  const pricing = TIERS[pppTier];

  // Never fail the page: a missing coupon env var degrades to the full price.
  let selectedTier: Tier = 1;
  let discountPercentage = 0;
  let couponCode: string | null = null;
  if (pricing.couponEnvVar) {
    const configuredCoupon = Netlify.env.get(pricing.couponEnvVar)?.trim();
    if (configuredCoupon) {
      selectedTier = pppTier;
      discountPercentage = pricing.discountPercentage;
      couponCode = configuredCoupon;
    } else {
      warnings.push(`${pricing.couponEnvVar} not set`);
    }
  }

  // Black Friday window: the combined coupon of the visitor's tier replaces the PPP coupon.
  // A missing env var ends the campaign for that visitor, who keeps the PPP offer.
  let campaign: { name: string; endsAt: string } | null = null;
  const pppDiscountPercentage = discountPercentage;
  const isInsideWindow = currentTime >= Date.parse(BLACK_FRIDAY.startsAt) && currentTime <= Date.parse(BLACK_FRIDAY.endsAt);
  if (isInsideWindow) {
    const blackFridayPricing = BLACK_FRIDAY_TIERS[selectedTier];
    const blackFridayCoupon = Netlify.env.get(blackFridayPricing.couponEnvVar ?? "")?.trim();
    if (!blackFridayCoupon) {
      warnings.push(`${blackFridayPricing.couponEnvVar} not set`);
    } else {
      campaign = { name: BLACK_FRIDAY.name, endsAt: BLACK_FRIDAY.endsAt };
      discountPercentage = blackFridayPricing.discountPercentage;
      couponCode = blackFridayCoupon;
    }
  }

  const responseBody = {
    country,
    countryName,
    tier: selectedTier,
    discountPercentage,
    pppDiscountPercentage,
    couponCode,
    campaign,
    overridden,
    warnings,
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers: JSON_HEADERS });
}

export default function handler(request: Request, context: Context): Response {
  return handlePppRequest(request, context);
}

export const config: Config = { path: "/api/ppp" };
