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

const TIERS: Readonly<Record<Tier, { discountPercentage: number; couponEnvVar: string | null }>> = {
  1: { discountPercentage: 0, couponEnvVar: null },
  2: { discountPercentage: 30, couponEnvVar: "PPP_COUPON_TIER_2" },
  3: { discountPercentage: 50, couponEnvVar: "PPP_COUPON_TIER_3" },
  4: { discountPercentage: 70, couponEnvVar: "PPP_COUPON_TIER_4" },
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

export default function handler(request: Request, context: Context): Response {
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
    } else if (COUNTRY_CODE_PATTERN.test(requestedCountry)) {
      country = requestedCountry;
      countryName = countryNameFor(requestedCountry);
      overridden = true;
    } else {
      warnings.push("country override invalid");
    }
  }

  let tier: Tier = COUNTRY_TIERS[country] ?? 1;
  let couponCode: string | null = null;

  const couponEnvVar = TIERS[tier].couponEnvVar;
  if (couponEnvVar) {
    couponCode = Netlify.env.get(couponEnvVar)?.trim() || null;
    if (!couponCode) {
      // Never fail the page: fall back to full price when a coupon is not configured.
      warnings.push(`${couponEnvVar} not set`);
      tier = 1;
    }
  }

  const responseBody = {
    country,
    countryName,
    tier,
    discountPercentage: TIERS[tier].discountPercentage,
    couponCode,
    overridden,
    warnings,
  };

  return new Response(JSON.stringify(responseBody), { status: 200, headers: JSON_HEADERS });
}

export const config: Config = { path: "/api/ppp" };
