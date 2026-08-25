---
title: "Agentic Spring Boot Testing - Online Course"
description: "A hands-on 2-hour on-demand course on reliable, meaningful Spring Boot test suites with AI coding agents - the Testing Spring Boot Applications Masterclass for the era of AI. Includes six agent skills for Claude Code, GitHub Copilot and Cursor."
layout: "course-landing"
image: "/generated/images/courses/agentic-testing-course-thumbnail.webp"
share_image: "/images/courses/agentic-testing-course-thumbnail.png"

# All copy for the landing page lives in this frontmatter. The layout
# (themes/pragmatech-theme/layouts/_default/course-landing.html) only renders it via
# the partials in themes/pragmatech-theme/layouts/partials/course/.

hero:
  eyebrow: "Now available - on-demand course"
  headlineAccent: "Agentic Spring Boot Testing."
  headline: "Reliable, meaningful test suites with AI agents."
  intro: "A hands-on, 2-hour on-demand course - the Testing Spring Boot Applications Masterclass for the era of AI. You get the six agent skills I use every day to make Claude Code, GitHub Copilot and Cursor write Spring Boot tests you can trust, plus every future update."
  bullets:
    - "2 hours, hands-on, on-demand - watch and code along whenever it fits your schedule."
    - "Six agent skills as plain SKILL.md files - copy them into your project, adapt them, keep every update."
    - "Agent harnessing for testing - the setup that makes agents choose the right test type before writing a line."
  primaryCta: { label: "Enroll now", href: "#pricing" }
  secondaryCta: { label: "See curriculum", href: "#curriculum" }
  trust:
    - "One-time payment from 189€"
    - "Lifetime access and updates"
    - "Works with Claude Code, Copilot, Cursor"
  previewLabel: "Free preview lesson"
  facts:
    - { value: "6", label: "modules" }
    - { value: "25", label: "lessons" }
    - { value: "2h", label: "runtime" }
    - { value: "6", label: "agent skills" }

pains:
  headline: "Does this sound like your test suite since the agents arrived?"
  intro: "None of this is a developer problem. It is what every coding agent produces when nobody tells it how your project tests."
  items:
    - title: "Forty tests, nothing asserted"
      text: "The agent delivers a full test class in seconds and every test is green. Look closer and most of them call a method, catch nothing, and assert nothing."
    - title: "@SpringBootTest for a utility class"
      text: "A date formatter gets a complete application context because that is the annotation the agent has seen most often. A plain JUnit test would run in milliseconds."
    - title: "Twelve contexts, twenty minutes"
      text: "Every generated class brings its own @MockitoBean mix, so context caching never hits, and each class starts its own Testcontainers. The build that took 3 minutes takes 20 and fails at random on CI."
    - title: "Mocks of the class under test"
      text: "The repository is mocked, the service is mocked, and sometimes the class the test is supposed to cover. The test passes and proves nothing."
    - title: "Green on the PR, broken in production"
      text: "The suite passes on every pull request. The bug ships anyway, because no test ever ran the real query, the real serialization, or the real database."
    - title: "Review fatigue"
      text: "Developers turn into auditors of tests they did not write. After the tenth 400-line generated test class, nobody reads closely anymore and nobody trusts the suite."

statusQuo:
  headline: "Your status quo before taking this course"
  beforeLabel: "Before"
  afterLabel: "After the course"
  before:
    - "You review generated tests line by line because you cannot tell which ones prove anything."
    - "Agents reach for @SpringBootTest for everything and the build grows with every PR."
    - "Every test class starts its own Spring context and its own containers."
    - "The suite is green while production breaks."
    - "Your CLAUDE.md has rules the agent ignores half of the time."
    - "You are not sure whether to let agents write tests at all."
  after:
    - "A harness that makes the agent pick the right test type before writing a line."
    - "Six skills that encode unit, slice, integration and Testcontainers decisions the way I make them."
    - "Two or three cached contexts per build and tests running in parallel forks."
    - "Every test asserts behavior, with mocks only at real boundaries."
    - "A reviewer skill that flags anti-patterns before you open the PR."
    - "A test suite you trust enough to let agents refactor."

demo:
  headline: "Same prompt, same project, different harness"
  intro: "Claude Code on Spring PetClinic, asked to add tests for the owner and pet features. Once without any skills, once with the six skills from this course."
  caption: "Illustrative run on a MacBook Pro against Spring PetClinic. Numbers are rounded from a single local run and will differ on your project and machine."
  panels:
    - key: without
      tone: bad
      title: "claude-code - spring-petclinic - without skills"
      badge: "no skills"
      lines:
        - { type: prompt, text: "claude \"add tests for the owner and pet features\"" }
        - { type: agent,  text: "Reading OwnerController, PetController, OwnerRepository ..." }
        - { type: agent,  text: "Created 6 test classes, 41 tests" }
        - { type: warn,   text: "All 6 classes use @SpringBootTest with @MockitoBean" }
        - { type: prompt, text: "./mvnw verify" }
        - { type: info,   text: "[INFO] Tests run: 41, Failures: 0, Errors: 0, Skipped: 0" }
        - { type: warn,   text: "[WARN] Spring contexts started: 9" }
        - { type: warn,   text: "[WARN] Testcontainers started: 6 (postgres:16)" }
        - { type: err,    text: "[WARN] Flaky reruns: 3" }
        - { type: err,    text: "[WARN] Tests with meaningful assertions: 23 / 41" }
        - { type: muted,  text: "[INFO] Parallel forks: 1" }
        - { type: err,    text: "[INFO] Total time: 04:12 min" }
      footer: "green, slow, and nobody knows what it proves"
    - key: with
      tone: good
      title: "claude-code - spring-petclinic - with my skills"
      badge: "6 skills loaded"
      lines:
        - { type: prompt, text: "claude \"add tests for the owner and pet features\"" }
        - { type: agent,  text: "Loaded skills: unit-testing, slice-testing-webmvc, integration-testing" }
        - { type: agent,  text: "Plan: 2 unit, 3 @WebMvcTest, 1 @DataJpaTest, 1 @SpringBootTest" }
        - { type: ok,     text: "test-setup-reviewer: 0 findings" }
        - { type: prompt, text: "./mvnw verify" }
        - { type: info,   text: "[INFO] Tests run: 38, Failures: 0, Errors: 0, Skipped: 0" }
        - { type: ok,     text: "[INFO] Spring contexts started: 2 (cache hits: 5)" }
        - { type: ok,     text: "[INFO] Testcontainers started: 1 (postgres:16, reused)" }
        - { type: ok,     text: "[INFO] Flaky reruns: 0" }
        - { type: ok,     text: "[INFO] Tests with meaningful assertions: 38 / 38" }
        - { type: muted,  text: "[INFO] Parallel forks: 4" }
        - { type: ok,     text: "[INFO] Total time: 48 s" }
      footer: "green, fast, and every test asserts something"
  stats:
    - { label: "Wall time",             before: "4m 12s", after: "48s" }
    - { label: "Spring contexts",       before: "9",      after: "2" }
    - { label: "Tests with assertions", before: "56%",    after: "100%" }
    - { label: "Parallel forks",        before: "1",      after: "4" }

included:
  headline: "What you get"
  intro: "Everything you need to run the workflow on your own project the same day."
  items:
    - { icon: play,      title: "2 hours of video lessons",              text: "25 lessons in 6 modules, recorded on Spring PetClinic. Watch on demand and code along." }
    - { icon: code,      title: "Six agent skills as a Git repository",   text: "unit-testing, slice-testing, slice-testing-webmvc, integration-testing, testcontainers-setup and test-setup-reviewer as SKILL.md files, with every future update." }
    - { icon: beaker,    title: "The PetClinic reference test suite",     text: "The complete before-and-after test suite from the course, so you can diff what the skills changed." }
    - { icon: document,  title: "Harness templates",                     text: "CLAUDE.md, AGENTS.md and a test-strategy file, plus the equivalent setup for GitHub Copilot and Cursor." }
    - { icon: refresh,   title: "Lifetime access and updates",           text: "Agents and Spring Boot change fast. You get every update to the lessons and the skills at no extra cost." }
    - { icon: badge,     title: "Certificate of completion",             text: "A certificate for your training records once you finish all lessons." }
    - { icon: subtitles, title: "English subtitles",                     text: "Every lesson comes with reviewed English subtitles." }

curriculum:
  headline: "Curriculum"
  intro: "Six modules, about two hours. Every lesson is hands-on in Spring PetClinic with Claude Code, with notes for GitHub Copilot and Cursor."
  freeLabel: "Free preview"
  modules:
    - title: "Why AI-generated tests are bad by default"
      summary: "What agents optimize for when you say \"write tests\", and why the result looks fine and proves nothing."
      lessons:
        - { title: "Welcome and how to get the most out of this course", duration: 3, free: true }
        - { title: "What an agent does when you say \"write tests\"", duration: 4 }
        - { title: "Context starvation: the agent does not know your test strategy", duration: 4 }
        - { title: "The four default failures: @SpringBootTest everywhere, mocks everywhere, no assertions, one context per class", duration: 4, free: true }
    - title: "Building the harness"
      summary: "The project files that turn a generic agent into one that tests the way your team does."
      lessons:
        - { title: "CLAUDE.md and AGENTS.md: what belongs in, what does not", duration: 5 }
        - { title: "A test strategy file the agent actually reads", duration: 5 }
        - { title: "Skills vs. rules vs. prompts: where each instruction lives", duration: 4 }
        - { title: "Installing the six skills in PetClinic for Claude Code, Copilot and Cursor", duration: 6 }
    - title: "The six skills applied to Spring PetClinic"
      summary: "One skill per lesson, each applied to real PetClinic code, each result reviewed."
      lessons:
        - { title: "unit-testing: owner and pet logic without a Spring context", duration: 6 }
        - { title: "slice-testing: @DataJpaTest for the repositories", duration: 6 }
        - { title: "slice-testing-webmvc: @WebMvcTest for the controllers", duration: 7 }
        - { title: "integration-testing: one @SpringBootTest setup, reused everywhere", duration: 6 }
        - { title: "testcontainers-setup: PostgreSQL once per JVM, not once per class", duration: 6 }
        - { title: "test-setup-reviewer: let the agent audit its own output", duration: 4 }
    - title: "Making the suite fast"
      summary: "The settings and conventions that keep an agent-written suite under a minute."
      lessons:
        - { title: "Spring context caching: why 9 contexts become 2", duration: 5 }
        - { title: "Parallel execution with Surefire, Failsafe and Gradle", duration: 5 }
        - { title: "Testcontainers reuse and a single container per build", duration: 5 }
        - { title: "Measuring what changed with the Spring Test Profiler", duration: 5 }
    - title: "The daily workflow"
      summary: "TDD, pull requests and maintenance with an agent that follows your rules."
      lessons:
        - { title: "TDD with an agent: red, green, refactor with guardrails", duration: 6 }
        - { title: "Reviewing agent pull requests with the test-setup-reviewer skill", duration: 5 }
        - { title: "Keeping skills updated as your project evolves", duration: 4 }
        - { title: "Adapting the skills to your team conventions", duration: 5 }
    - title: "Wrap-up"
      summary: "A checklist you can hand to your team and where to go from here."
      lessons:
        - { title: "The checklist: what a trustworthy agent-written test looks like", duration: 4 }
        - { title: "Where to go next: Masterclass, community, updates", duration: 3 }
        - { title: "Certificate and course resources", duration: 3 }

instructor:
  headline: "Your instructor"
  name: "Philip Riecks"
  role: "Founder of PragmaTech GmbH and rieckpil.de"
  image: "/images/rieckpil-speaker.jpeg"
  imageAlt: "Philip Riecks speaking at a conference"
  imageCaption: "Philip Riecks - international speaker and Spring Boot testing expert"
  intro: "I have written Java since 2015, published Spring Boot testing content on rieckpil.de since 2017 and on YouTube since 2018. As a consultant I spend my days inside client teams fixing slow and flaky Spring Boot test suites. The six skills in this course are the ones I use in that work every day."
  bullets:
    - "10+ years on the developer frontlines, 6 years as a consultant inside the engine rooms of 10+ Spring Boot teams"
    - "10,000+ students across my Spring Boot testing courses, including the Testing Spring Boot Applications Masterclass"
    - "20+ conference talks in the USA, Belgium, Spain, Germany and Switzerland"
    - "Author of Testing Spring Boot Applications Demystified, Stratospheric and the Java Testing Toolbox"
    - "Creator of the Spring Test Profiler and a weekly testing newsletter read by 10,000 developers"
  talksLabel: "Spoken at"
  talks: ["Devoxx Belgium", "Spring I/O", "JCON Europe", "SpringOne"]

testimonials:
  headline: "What students say about my testing courses"
  intro: "Feedback from the Testing Spring Boot Applications Masterclass, the course this one builds on."
  students:
    - { text: "Philip has made a fantastic overview of the full testing landscape of Spring.", person: "Wim Deblauwe", position: "Software Engineer", initials: "WD" }
    - { text: "I find it wonderful for learning how to test Spring Boot applications leveraging modern testing frameworks and libraries.", person: "Siva", position: "Software Engineer, AtomicJar", initials: "S" }
    - { text: "After watching the Testing Spring Boot Applications Masterclass course I feel more confident in writing different types of tests for my apps.", person: "Anton Ždanov", position: "Full Stack Developer", initials: "AZ" }
    - { text: "The depth and completeness of the content truly stands out. Exceptional content with comprehensive coverage and rich examples.", person: "Xavier Escudero", position: "Course Student", initials: "XE" }
    - { text: "This course is quite dangerous as it will leave you expecting the same level of high-quality material from every other course you take going forward.", person: "Mudi Lukman", position: "Course Student", initials: "ML" }
    - { text: "Honestly, it's the best course content on testing in general. Most importantly, it gives you the structure - how to navigate the testing field. Yet it still provides real-world examples. A good investment of money and time.", person: "Sergei Sukhoborov", position: "Course Student", initials: "SS" }
  expertsLabel: "Endorsed by"
  experts:
    - { text: "Philip transfers this knowledge to you and his courses leave you smarter than before.", person: "Tom Hombergs", position: "Founder, reflectoring.io", initials: "TH" }
    - { text: "Philip managed to publish high quality articles and videos covering a wide range of topics.", person: "Vlad Mihalcea", position: "Founder, vladmihalcea.com", initials: "VM" }
    - { text: "Tons of actionable tutorials and content across the Spring universes. Highly recommended!", person: "Marco Behler", position: "Founder, marcobehler.com", initials: "MB" }

# Purchase Power Parity pricing, see BUILD.md. `key` selects the CopeCart product ID
# env var PPP_PRODUCT_ID_<KEY>.
ppp:
  currency: "€"
  headline: "Pricing"
  intro: "One-time payment, lifetime access. Prices include VAT where applicable."
  companyNote: "Paying from a company training budget or need a team license? Email me and you get an invoice and a team quote within a day."
  products:
    - key: small
      name: "Course edition"
      price: 189
      license: "Single-user"
      tagline: "The course and all six agent skills."
      features:
        - "2-hour on-demand video course, 25 lessons"
        - "Six agent skills as a Git repository, with all future updates"
        - "PetClinic reference test suite"
        - "Harness templates: CLAUDE.md, AGENTS.md, test strategy"
        - "Lifetime access and updates"
        - "Certificate of completion"
        - "English subtitles"
    - key: medium
      name: "Bundle edition"
      price: 289
      highlight: true
      license: "Single-user"
      tagline: "The course plus my other testing courses and the community."
      features:
        - "Everything in the Course edition"
        - "TDD with Spring Boot Done Right course"
        - "Hands-On Mocking with Mockito course"
        - "Java Testing Toolbox eBook"
        - "Private community access"
        - "Comments and Q&A on every lesson"
    - key: large
      name: "Coaching edition"
      price: 489
      license: "Single-user"
      tagline: "The bundle plus a 1:1 review of your test suite and harness."
      features:
        - "Everything in the Bundle edition"
        - "60-minute 1:1 coaching session"
        - "Review of your test suite and agent harness with written findings"
        - "Offline .mp4 downloads of all lessons"

faqs:
  headline: "Frequently asked questions"
  items:
    - question: "Do I need the Testing Spring Boot Applications Masterclass first?"
      answer: "No. This course assumes you have written Spring Boot tests before and know what @SpringBootTest and @WebMvcTest do. The Masterclass goes deep on the testing tools themselves. This course is about making agents apply them correctly. Both work on their own."
    - question: "Which coding agents are supported?"
      answer: "The lessons use Claude Code. The skills are plain Markdown, and module 2 shows how to wire them into GitHub Copilot and Cursor. Any agent that reads project files and supports skills or rules works."
    - question: "Does it work with Maven and Gradle?"
      answer: "Yes. PetClinic uses Maven in the lessons, and the skills contain the Gradle equivalents for parallel execution, test tasks and Testcontainers reuse."
    - question: "Which Spring Boot and Java versions are covered?"
      answer: "Recorded with Spring Boot 4 and Java 21. The skills handle the differences to Spring Boot 3.x, for example @MockBean versus @MockitoBean. Spring Boot 2.x is not covered."
    - question: "How long do I have access?"
      answer: "Lifetime. That includes every future update to the lessons and to the skills repository."
    - question: "Can I pay from a company training budget or buy for a team?"
      answer: "Yes. Every tier is a single-user license. Email me for a team quote and an invoice your company can pay directly."
    - question: "What if the course is not for me?"
      answer: "Email me within 14 days of purchase and you get a full refund, no questions asked."
    - question: "When does the course launch?"
      answer: "It is available now. You get access to all lessons and the skills repository right after checkout, and an email whenever new content lands."

finalCta:
  headline: "Let your agents write tests you trust"
  text: "Two hours, six skills, one harness. Start on your own project today."
  primaryCta: { label: "Enroll now", href: "#pricing" }
  companyNote: "Company training budget? Email me for an invoice and a team quote."

signup:
  headline: "Not ready? Get the free preview lesson"
  text: "Drop your email and I send you the lesson \"The four default failures\" for free, plus one email when the skills get a major update."
  buttonLabel: "Send me the preview lesson"
  success: "Almost there - check your inbox and confirm your email. The preview lesson follows right after."
  already: "Good news - you are already subscribed. The preview lesson is on its way to your inbox."
  footnote: "No spam. Unsubscribe anytime."
---
