// Early bird launch campaign: 33 % off until the go-live on 2 October 2026, 09:00
// Europe/Berlin. PPP discounts stack on top of the early bird price (see TIERS in
// netlify/edge-functions/ppp.ts). `endsAt` is exclusive: the campaign is over from this
// instant on. Keep both values in sync with `ppp.earlyBird` in
// content/agentic-spring-boot-testing-course-new.md - tests/unit/ppp.test.ts checks this.
export const EARLY_BIRD_DISCOUNT_PERCENTAGE = 33;
export const EARLY_BIRD_ENDS_AT = "2026-10-02T09:00:00+02:00";
