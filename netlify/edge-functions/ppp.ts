// Purchase Power Parity (PPP) endpoint for course landing pages.
// Runs only for GET /api/ppp (see `config` below). Resolves the visitor country from
// Netlify's geolocation, maps it to a discount tier and returns the coupon code for
// that tier. During the early bird campaign every tier gets its early bird coupon
// instead. Coupon codes come from env vars and never live in this public repo.
import type { Config, Context } from "@netlify/edge-functions";
import { COUNTRY_TIERS } from "../shared/ppp-country-tiers.ts";
import { EARLY_BIRD_DISCOUNT_PERCENTAGE, EARLY_BIRD_ENDS_AT } from "../shared/ppp-early-bird.ts";

// The `Netlify` global is provided by the edge runtime; this declaration keeps the
// file type-checkable and runnable (Node unit tests stub `globalThis.Netlify`).
declare const Netlify: { env: { get(name: string): string | undefined } };

type Tier = 1 | 2 | 3 | 4;

type TierPricing = {
  discountPercentage: number;
  couponEnvVar: string | null;
  earlyBirdDiscountPercentage: number;
  earlyBirdCouponEnvVar: string;
};

// All percentages are off the list price, because CopeCart applies one coupon per
// checkout. Early bird PPP percentages stack the discounts and round to whole percent:
// 100 - (100 - 33) * (100 - PPP) / 100, e.g. 30 % PPP -> 53.1 -> 53 %.
export const TIERS: Readonly<Record<Tier, TierPricing>> = {
  1: { discountPercentage: 0, couponEnvVar: null, earlyBirdDiscountPercentage: EARLY_BIRD_DISCOUNT_PERCENTAGE, earlyBirdCouponEnvVar: "PPP_COUPON_EARLY_BIRD_TIER_1" },
  2: { discountPercentage: 30, couponEnvVar: "PPP_COUPON_TIER_2", earlyBirdDiscountPercentage: 53, earlyBirdCouponEnvVar: "PPP_COUPON_EARLY_BIRD_TIER_2" },
  3: { discountPercentage: 50, couponEnvVar: "PPP_COUPON_TIER_3", earlyBirdDiscountPercentage: 67, earlyBirdCouponEnvVar: "PPP_COUPON_EARLY_BIRD_TIER_3" },
  4: { discountPercentage: 70, couponEnvVar: "PPP_COUPON_TIER_4", earlyBirdDiscountPercentage: 80, earlyBirdCouponEnvVar: "PPP_COUPON_EARLY_BIRD_TIER_4" },
};

const EARLY_BIRD_ENDS_AT_MS = Date.parse(EARLY_BIRD_ENDS_AT);

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex",
};

type Offer = { tier: Tier; earlyBird: boolean; discountPercentage: number; couponEnvVar: string | null };

function countryNameFor(countryCode: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

// Offers the visitor qualifies for, best discount first. A missing coupon env var
// skips to the next offer, down to tier 1 without a coupon (full price).
function candidateOffers(pppTier: Tier, isEarlyBird: boolean): Offer[] {
  const tiers: Tier[] = pppTier === 1 ? [1] : [pppTier, 1];
  const offers: Offer[] = [];
  for (const tier of tiers) {
    const pricing = TIERS[tier];
    offers.push({ tier, earlyBird: false, discountPercentage: pricing.discountPercentage, couponEnvVar: pricing.couponEnvVar });
    if (isEarlyBird) {
      offers.push({ tier, earlyBird: true, discountPercentage: pricing.earlyBirdDiscountPercentage, couponEnvVar: pricing.earlyBirdCouponEnvVar });
    }
  }
  return offers.sort((first, second) => second.discountPercentage - first.discountPercentage);
}

export function handlePppRequest(request: Request, context: Context, currentTime: number = Date.now()): Response {
  if (request.method !== "GET") {
    return new Response(null, { status: 405, headers: { Allow: "GET" } });
  }

  const requestUrl = new URL(request.url);
  const warnings: string[] = [];

  let country = (context.geo?.country?.code ?? "").toUpperCase();
  let countryName = context.geo?.country?.name ?? "";
  let overridden = false;

  // `?country=xx` and `?now=<ISO date>` overrides for QA. Free outside production; in
  // production they need `?token=` matching PPP_TEST_TOKEN so the coupon codes cannot
  // be enumerated.
  const requestedCountry = (requestUrl.searchParams.get("country") ?? "").toUpperCase();
  const requestedTime = requestUrl.searchParams.get("now") ?? "";
  if (requestedCountry || requestedTime) {
    const deployContext = context.deploy?.context ?? Netlify.env.get("CONTEXT");
    const isProduction = deployContext === "production";
    const testToken = Netlify.env.get("PPP_TEST_TOKEN");
    const overrideAllowed = !isProduction || (!!testToken && requestUrl.searchParams.get("token") === testToken);

    if (!overrideAllowed) {
      warnings.push("country override ignored");
    } else {
      if (requestedCountry) {
        if (COUNTRY_CODE_PATTERN.test(requestedCountry)) {
          country = requestedCountry;
          countryName = countryNameFor(requestedCountry);
          overridden = true;
        } else {
          warnings.push("country override invalid");
        }
      }
      if (requestedTime) {
        const requestedTimeMs = Date.parse(requestedTime);
        if (Number.isNaN(requestedTimeMs)) {
          warnings.push("now override invalid");
        } else {
          currentTime = requestedTimeMs;
          overridden = true;
        }
      }
    }
  }

  const pppTier: Tier = COUNTRY_TIERS[country] ?? 1;
  const isEarlyBird = currentTime < EARLY_BIRD_ENDS_AT_MS;

  let selectedOffer: Offer = { tier: 1, earlyBird: false, discountPercentage: 0, couponEnvVar: null };
  let couponCode: string | null = null;
  for (const offer of candidateOffers(pppTier, isEarlyBird)) {
    if (!offer.couponEnvVar) {
      selectedOffer = offer;
      break;
    }
    const configuredCoupon = Netlify.env.get(offer.couponEnvVar)?.trim();
    if (configuredCoupon) {
      selectedOffer = offer;
      couponCode = configuredCoupon;
      break;
    }
    // Never fail the page: fall back to the next best offer when a coupon is not configured.
    warnings.push(`${offer.couponEnvVar} not set`);
  }

  const responseBody = {
    country,
    countryName,
    tier: selectedOffer.tier,
    discountPercentage: selectedOffer.discountPercentage,
    couponCode,
    earlyBird: selectedOffer.earlyBird,
    earlyBirdEndsAt: selectedOffer.earlyBird ? EARLY_BIRD_ENDS_AT : null,
    overridden,
    warnings,
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers: JSON_HEADERS });
}

export default function handler(request: Request, context: Context): Response {
  return handlePppRequest(request, context);
}

export const config: Config = { path: "/api/ppp" };
