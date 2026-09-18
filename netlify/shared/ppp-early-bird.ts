// Early bird launch campaign for the Solo edition: 33 % off until 1 October 2026, 23:59
// Europe/Berlin. PPP discounts stack on top of the early bird price (see TIERS in
// netlify/edge-functions/ppp.ts). `endsAt` is exclusive: the campaign is over from this
// instant on. Keep both values in sync with `ppp.earlyBird` in
// content/agentic-spring-boot-testing-course.md - tests/unit/ppp.test.ts checks this.
export const EARLY_BIRD_DISCOUNT_PERCENTAGE = 33;
export const EARLY_BIRD_ENDS_AT = "2026-10-02T00:00:00+02:00";
