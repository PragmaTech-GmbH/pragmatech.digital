---
title: "Agentic Testing for Spring Boot Course Is Live"
summary: "My new on-demand course and skill library help your coding agent write Spring Boot tests you can trust: six modules, seven agent skills and three editions."
description: "The Agentic Testing for Spring Boot course is live: six modules and seven agent skills that help coding agents write reliable, fast Spring Boot tests."
date: 2026-10-02
lastmod: 2026-10-02
author: "philip"
---

Today I'm launching [Agentic Testing for Spring Boot](/agentic-spring-boot-testing-course/), an on-demand course and skill library that help your coding agent write Spring Boot tests you can trust.

![Agentic Testing for Spring Boot course](/generated/images/courses/agentic-testing-course-thumbnail.webp?v=2)

## Why I built this course

Earlier this year, I gave Claude Code a Spring Boot service and asked it for meaningful tests. I got about 2,000 lines of passing tests: getter tests, `@SpringBootTest` on everything, and mocks asserting on mocks. None of them would have caught a bug.

The fix was not a better prompt. It was writing my testing judgment into files that the agent reads before every test.

A prompt is a conversation that is gone when the session ends. A skill file is the prompt you would write if you could write it once, keep it under version control, and have the agent apply it every time. The hard part is not the content, it is the consistency.

The goal is also not to trust the agent more. The goal is to verify its output quickly, with tests that fail for one reason, run in seconds, and never lie. **The trust goes into the suite, not the model.**

## What you get

The course has 25 video lessons in six modules, about two hours in total. I recorded it on Spring PetClinic with Claude Code, with notes for GitHub Copilot and Cursor. Every lesson comes with a written summary, code and English subtitles.

The six modules are:

1. **Why AI-generated tests are bad by default:** what agents optimize for, and why the result looks fine but proves nothing.
2. **Building the harness:** the project files that make a generic agent test the way your team does.
3. **The seven skills applied to Spring PetClinic:** each skill used on real code, with every result reviewed.
4. **Making the suite fast:** context caching, parallel execution and Testcontainers reuse.
5. **The daily workflow:** TDD, pull request reviews and maintenance with an agent.
6. **Wrap-up:** a checklist for your team and your next steps.

### The seven agent skills

The skill library works with coding agents such as Claude Code, Codex and GitHub Copilot, and covers your test suite from unit to end-to-end tests:

| Skill                  | Focus                                                   |
|------------------------|---------------------------------------------------------|
| `unit-testing`         | Fast tests without a Spring context                     |
| `slice-testing`        | Focused tests for single layers, such as persistence    |
| `slice-testing-webmvc` | Tests for the web layer                                 |
| `integration-testing`  | One reusable integration test setup                     |
| `e2e-testing`          | End-to-end tests                                        |
| `testcontainers-setup` | Real infrastructure without a new container per class   |
| `test-setup-reviewer`  | Reviews the test setup and helps to keep the suite fast |

The skills support Spring Boot 3 and 4 with Maven or Gradle, in both legacy and new projects. You also get 12 months of skill updates, because coding agents change quickly.

## "My project is different"

It is, and the skills are built for that. Each skill separates rules that apply to any Spring Boot project from a short block with your conventions, such as your assertion library, naming, base classes and container images. **You edit the block, not the rules.** One lesson shows you how.

This course assumes that you have written Spring Boot tests before and know what `@SpringBootTest` and `@WebMvcTest` do.

Not using a coding agent yet? You can start with the guardrails in place. Everything in the skills is a testing decision first, the agent only executes it.

## Three editions

| Edition            | Best for                                       | What's included                                                                                     |
|--------------------|------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| **Course Edition** | Students who already own my testing courses    | The new course and the skill library, with 12 months of skill updates                               |
| **Bundle Edition** | Individual developers who want the full picture | Everything in the Course Edition, plus my three other testing courses listed below                  |
| **Team Edition**   | Teams of up to 10 developers                   | The Bundle Edition for 10 seats, 24 months of skill updates, a 2-hour implementation workshop on your codebase and 30 days of async Q&A support |

The three additional courses in the Bundle and Team Editions are:

- Testing Spring Boot Applications Masterclass
- TDD with Spring Boot Done Right
- Hands-On Mocking with Mockito

Need your manager's approval? Use my [ready-to-send email template](/agentic-spring-boot-testing-course/convince-your-manager/).

## Get started

[**Get Agentic Testing for Spring Boot**](/agentic-spring-boot-testing-course/)

Joyful testing,\
Philip
