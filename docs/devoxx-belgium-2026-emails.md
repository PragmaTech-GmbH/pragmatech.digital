# Devoxx Belgium 2026 lead magnet - email copy and Mailchimp setup

Landing page: `https://pragmatech.digital/lp/devoxx-belgium-2026/`
Thank-you page: `https://pragmatech.digital/lp/devoxx-belgium-2026/thank-you/`
Offer ends: 10 October 2026, 3 PM CEST. Coupon: 33%, one code (CopeCart takes one coupon per checkout).

Placeholders: `[COUPON_CODE]` is your CopeCart code. `*|FNAME|*` is the Mailchimp merge tag.

## Flow

| # | Email | Where to set it up in Mailchimp | When it is sent |
|---|---|---|---|
| 1 | Confirm your email (double opt-in) | Audience > Signup forms > Form builder > Confirmation email | At once after the form submit |
| 2 | Welcome | Audience > Signup forms > Form builder > Final welcome email | After the person clicks confirm |
| 3 | Skeleton + 33% coupon | Automations > Customer Journey or classic automation, trigger "Tag added: lp-devoxx-belgium-2026" | 5 minutes after trigger |

Setup notes:
- The audience needs double opt-in on (Audience settings > Audience name and defaults). Check the checkbox "Enable double opt-in".
- Set the "Confirmation thank-you page" in the form builder to the thank-you page URL above. This covers people who use the form without JavaScript.
- Email 3: add a 5 minute delay, so the welcome email arrives first. A tag automation only sends to subscribed contacts, so nobody gets the coupon before confirming. Test this once with your own address, because Mailchimp tags pending contacts too and you should see that no email 3 arrives before you confirm.
- Set the automation to send once per contact.
- Attach `SKILL.md` (text at the end of this file) to email 3, or host it and link it.

---

## Email 1 - Confirmation (double opt-in)

**Subject:** Please confirm your email
**Preview text:** One click, then your skill skeleton and 33% coupon follow.

Hi *|FNAME|*,

Thanks for joining my talk at Devoxx Belgium!

Please confirm your email address with one click:

**[Yes, confirm my email]** (button, Mailchimp confirmation link `*|YES_URL|*`)

After you confirm, you get:
- a short welcome email, and
- the skeleton of my Spring Boot testing agent skill plus your 33% coupon for the Agentic Spring Boot Testing course.

If you did not sign up, ignore this email. Nothing happens.

Philip
PragmaTech GmbH

---

## Email 2 - Welcome (final welcome email)

**Subject:** Welcome, *|FNAME|* - your skeleton and coupon follow in a few minutes
**Preview text:** What to expect from me.

Hi *|FNAME|*,

Your email is confirmed. Welcome!

The email with your skill skeleton and your 33% coupon arrives in a few minutes. If you do not see it, check your spam or promotions folder.

What you get from me:
- Practical tips to make AI coding agents write Spring Boot tests you can trust.
- News about my courses and workshops. No spam. Unsubscribe anytime with one click.

You can reply to this email. I read every reply.

Philip
PragmaTech GmbH

---

## Email 3 - Skeleton + discount

**Subject:** Your testing skill skeleton + 33% off (until Saturday 3 PM)
**Preview text:** SKILL.md skeleton attached, coupon code inside.

Hi *|FNAME|*,

Here is what I promised at the end of my talk.

**1. The testing skill skeleton**
The attached `SKILL.md` has the structure I use for every testing skill: when the agent picks the skill, the hard requirements, parallel by default, an example, and references. Copy it to `.claude/skills/unit-testing/SKILL.md` (or the folder your agent uses), then replace each `<placeholder>` with your own team rules. Start with one rule that your agents get wrong today.

**2. Your 33% coupon for the Agentic Spring Boot Testing course**
Code: **[COUPON_CODE]**

The course has seven maintained agent skills, a 2-hour hands-on course on Spring PetClinic and the reference test suite.

**[Get the course with 33% off]** (button to `https://pragmatech.digital/agentic-spring-boot-testing-course/#pricing`)

Add the code at checkout in CopeCart. The code is valid until **10 October 2026, 3 PM CEST** and works once per checkout. It cannot be combined with another discount. If the course page already shows you a regional discount, use whichever is higher.

Questions? Reply to this email.

Philip
PragmaTech GmbH

P.S. Tried the skeleton? Reply and tell me which rule your agent breaks most often. I answer every reply.

---

## SKILL.md skeleton (attach to email 3)

```markdown
---
name: unit-testing
description: <when the agent picks this skill - for example "Use when writing or changing unit tests for Spring Boot services and components">
---

## Hard requirements

<rules every unit test must follow - for example naming, assertion library, no Spring context, one behavior per test>

## Parallel by default

<how to keep tests isolated and parallelizable - for example no shared mutable state, no static fields>

## Example

<a sample unit test from your project to copy from>

## References

<docs the rules build on - for example JUnit 5, Mockito and AssertJ links>
```
