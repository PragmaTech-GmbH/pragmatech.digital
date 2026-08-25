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
  intro: "Your coding agent is missing the testing judgment of a senior Spring Boot engineer. This course gives it that judgment as six skills you install in your project and keep updated, plus the complete testing education behind them: this 2-hour course and my three existing testing courses. The videos are the manual, the skills are the tool."
  bullets:
    - "Six agent skills as plain SKILL.md files - copy them into your project, adapt them, get 12 months of updates."
    - "Agent harnessing for testing - the setup that makes agents choose the right test type before writing a line."
    - "Four courses in one purchase: this one plus the Masterclass, TDD with Spring Boot Done Right and Hands-On Mocking with Mockito."
  primaryCta: { label: "Enroll now", href: "#pricing" }
  secondaryCta: { label: "See curriculum", href: "#curriculum" }
  trust:
    - "490€ once, 12 months of skill updates"
    - "Team edition: 10 seats + implementation workshop"
    - "Works with Claude Code, Copilot, Cursor"
  previewLabel: "Free preview lesson"
  facts:
    - { value: "6", label: "agent skills" }
    - { value: "4", label: "courses" }
    - { value: "25", label: "new lessons" }
    - { value: "12", label: "months of updates" }

story:
  eyebrow: "Sound familiar?"
  paragraphs:
    - "You ask Claude Code for tests. Twenty seconds later there are forty green tests and a confident summary. It feels like magic."
    - "Two weeks later a bug ships that the suite should have caught. You open the test class: @SpringBootTest on top, five mocks, and assertions that check for status 200. The build takes 20 minutes now, and nobody remembers what those tests prove."
    - "That is not the agent being bad at testing. It is the agent doing what every agent does without judgment: the most common pattern from its training data. Maybe it has happened to you. It happened in every team I consulted with this year."

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
  intro: "Claude Code on Spring PetClinic, asked to write tests for the OwnerController. Once without any skills, once with the six skills from this course. Scroll down and watch both sessions run."
  replayLabel: "Replay both sessions"
  caption: "Illustrative session, condensed. Output is shortened and numbers are rounded from a single local run; they will differ on your project and machine."
  panels:
    - key: without
      tone: bad
      title: "spring-petclinic - claude - without skills"
      badge: "no skills"
      lines:
        - { type: cmd,      text: "claude" }
        - { type: user,     text: "write tests for the OwnerController" }
        - { type: thinking, text: "Thinking about what to test", hold: 900 }
        - { type: tool,     text: "Read(src/main/java/org/springframework/samples/petclinic/owner/OwnerController.java)" }
        - { type: tool,     text: "Read(src/main/java/org/springframework/samples/petclinic/owner/OwnerRepository.java)" }
        - { type: tool,     text: "Write(src/test/java/org/springframework/samples/petclinic/owner/OwnerControllerTest.java)" }
        - { type: result,   text: "@SpringBootTest + @AutoConfigureMockMvc, 5 @MockitoBean, 12 tests" }
        - { type: tool,     text: "Bash(./mvnw test -Dtest=OwnerControllerTest)" }
        - { type: result,   text: "Tests run: 12, Failures: 0, Errors: 0, Skipped: 0" }
        - { type: hr }
        - { type: warn,     text: "Context read: 2 full files, 640 lines" }
        - { type: warn,     text: "Spring contexts started: 1 (full application)" }
        - { type: warn,     text: "Testcontainers started: 1 (postgres:16)" }
        - { type: err,      text: "Tests with meaningful assertions: 5 / 12" }
        - { type: err,      text: "Time elapsed: 38.4 s" }
        - { type: muted,    text: "Done. I added 12 tests covering the OwnerController." }
      footer: "green, slow, and 7 tests only check status 200"
    - key: with
      tone: good
      title: "spring-petclinic - claude - with my skills"
      badge: "6 skills loaded"
      lines:
        - { type: cmd,      text: "claude" }
        - { type: user,     text: "write tests for the OwnerController" }
        - { type: thinking, text: "Loading skills: slice-testing-webmvc, integration-testing, test-setup-reviewer", hold: 900 }
        - { type: tool,     text: "LSP(documentSymbol OwnerController.java)" }
        - { type: result,   text: "5 handlers: initCreationForm, processCreationForm, initFindForm, processFindForm, showOwner" }
        - { type: tool,     text: "LSP(findReferences OwnerRepository.findByLastNameStartingWith)" }
        - { type: result,   text: "2 call sites in OwnerController, no existing test" }
        - { type: tool,     text: "LSP(goToDefinition AbstractIntegrationTest)" }
        - { type: result,   text: "shared @SpringBootTest base, one reused PostgreSQL container" }
        - { type: thinking, text: "Plan: @WebMvcTest slice for the 5 handlers, one happy-path integration test on the shared context", hold: 700 }
        - { type: tool,     text: "Write(src/test/java/.../owner/OwnerControllerWebMvcTest.java)" }
        - { type: result,   text: "@WebMvcTest(OwnerController.class), 7 tests: validation, 404, find by last name, create, update" }
        - { type: tool,     text: "Write(src/test/java/.../owner/OwnerCreationIT.java)" }
        - { type: result,   text: "extends AbstractIntegrationTest, 1 happy-path test: create owner, find it in the list" }
        - { type: tool,     text: "Skill(test-setup-reviewer)" }
        - { type: result,   text: "0 findings" }
        - { type: tool,     text: "Bash(./mvnw test -Dtest='OwnerControllerWebMvcTest,OwnerCreationIT')" }
        - { type: result,   text: "Tests run: 8, Failures: 0, Errors: 0, Skipped: 0" }
        - { type: hr }
        - { type: ok,       text: "Context read: 3 symbols via LSP, 0 full files" }
        - { type: ok,       text: "Spring contexts started: 1, slice context reused from cache" }
        - { type: ok,       text: "Testcontainers started: 0 (reused)" }
        - { type: ok,       text: "Tests with meaningful assertions: 8 / 8" }
        - { type: ok,       text: "Time elapsed: 4.1 s" }
        - { type: muted,    text: "Done. 7 slice tests and 1 integration test, all following the project test strategy." }
      footer: "green, fast, and every test asserts behavior"
  focusLabel: "What the six skills enforce"
  focus:
    - icon: standards
      title: "Testing standards"
      text: "One test type per concern: unit, slice or integration. The skill decides before a line of test code is written, and the reviewer skill checks the result."
    - icon: practices
      title: "Best practices"
      text: "Assertions on behavior, mocks only at real boundaries, one shared Testcontainers setup, no @SpringBootTest by default."
    - icon: overhead
      title: "Minimum overhead"
      text: "LSP navigation instead of reading whole files, sliced contexts, and one cached integration context per build."
    - icon: parallel
      title: "Parallelizability"
      text: "Tests written to run in parallel forks from day one: no shared mutable state, isolated test data, reused containers."

diagram:
  courseLabel: "Part 1"
  courseTitle: "Online course"
  courseText: "Six modules, 25 lessons, two hours of hands-on lessons on Spring PetClinic. Plus the Masterclass, TDD Done Right and Hands-On Mocking as the foundation."
  skillsLabel: "Part 2"
  skillsTitle: "Skill library"
  skills:
    - "unit-testing"
    - "slice-testing"
    - "slice-testing-webmvc"
    - "integration-testing"
    - "testcontainers-setup"
    - "test-setup-reviewer"
  skillsText: "Six SKILL.md files as a Git repository, maintained: 12 months of updates included, 24 for teams."
  projectLabel: "Result"
  projectTitle: "Your project"
  projectFiles: ["CLAUDE.md", "AGENTS.md", "test-strategy.md", ".claude/skills/"]
  outcomes:
    - "The agent picks the right test type before writing a line"
    - "A fast, parallel suite with cached contexts"
    - "The reviewer skill on every pull request"
  agentsLabel: "Works with"
  agents: ["Claude Code", "GitHub Copilot", "Cursor"]

callout:
  eyebrow: "To be clear"
  title: "This is not a prompt-engineering course"
  text: "You will not learn magic prompts or yet another framework. You will learn the harness that makes any coding agent test like a senior Spring Boot engineer: skills, a test strategy file, and a reviewer loop. And you get that harness as files you own, not as a tool you rent."
  bullets:
    - "Works with Claude Code, GitHub Copilot and Cursor"
    - "Plain Markdown, no vendor lock-in, no subscription"
    - "Maven and Gradle projects, Spring Boot 3 and 4"

spotlights:
  afterPains:
    text: "This course is quite dangerous as it will leave you expecting the same level of high-quality material from every other course you take going forward."
    person: "Mudi Lukman"
    position: "Course Student, Testing Spring Boot Applications Masterclass"
    initials: "ML"
  afterDemo:
    text: "Honestly, it's the best course content on testing in general. Most importantly, it gives you the structure - how to navigate the testing field. Yet it still provides real-world examples. A good investment of money and time."
    person: "Sergei Sukhoborov"
    position: "Course Student, Testing Spring Boot Applications Masterclass"
    initials: "SS"

included:
  headline: "What you get"
  intro: "The tool your agent is missing, the manual that explains it, and the complete testing education behind both."
  formatLabel: "Format"
  format:
    - "25 video lessons, about 2 hours"
    - "Written summary and code for every lesson"
    - "Skills and templates as a Git repository"
    - "Finish in one evening, apply the next morning"
  items:
    - { icon: code,      title: "Six agent skills, maintained",           text: "unit-testing, slice-testing, slice-testing-webmvc, integration-testing, testcontainers-setup and test-setup-reviewer as SKILL.md files. Updates for 12 months, 24 for teams." }
    - { icon: play,      title: "The 2-hour Agentic Testing course",       text: "25 lessons in 6 modules, recorded on Spring PetClinic. Watch how the skills are built and applied, then code along." }
    - { icon: refresh,   title: "Three more courses included",             text: "Testing Spring Boot Applications Masterclass, TDD with Spring Boot Done Right and Hands-On Mocking with Mockito. Your complete testing education." }
    - { icon: beaker,    title: "The PetClinic reference test suite",      text: "The complete before-and-after test suite from the course, so you can diff what the skills changed." }
    - { icon: document,  title: "Harness templates",                      text: "CLAUDE.md, AGENTS.md and a test-strategy file, plus the equivalent setup for GitHub Copilot and Cursor." }
    - { icon: badge,     title: "Certificate of completion",              text: "A certificate for your training records once you finish all lessons." }
    - { icon: subtitles, title: "Lessons stay yours",                     text: "All video lessons remain accessible after the update window. English subtitles for every lesson." }

curriculum:
  headline: "Curriculum"
  intro: "Six modules, about two hours. Every lesson is hands-on in Spring PetClinic with Claude Code, with notes for GitHub Copilot and Cursor."
  freeLabel: "Free preview"
  conceptsLabel: "Concepts you will take with you"
  concepts:
    - { term: "Context starvation", text: "why an agent without your test strategy defaults to @SpringBootTest and mocks everywhere" }
    - { term: "The four default failures", text: "the checklist to spot agent-written tests that prove nothing" }
    - { term: "Slice first", text: "the decision rule for unit, slice or integration test, encoded in a skill" }
    - { term: "One context per build", text: "how cached contexts and reused containers keep the suite under a minute" }
    - { term: "The reviewer loop", text: "letting the agent audit its own output before you read a single line" }
    - { term: "Harness over prompts", text: "where an instruction belongs: CLAUDE.md, a skill, or the prompt" }
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
    - { text: "Your courses are genuinely excellent. Very focused and hands-on, far more so than many of the other resources on the internet or YouTube that essentially stop at Hello World. I've been a Java and Spring developer for many years, and I learned a lot from you, especially about integration testing.", person: "Oli", position: "Course Student", initials: "O" }
    - { text: "This is probably the best resource that I got in this regard for real-world TDD examples with Spring.", person: "Siddharth Goel", position: "Course Student", initials: "SG" }
  expertsLabel: "Endorsed by"
  experts:
    - { text: "Philip transfers this knowledge to you and his courses leave you smarter than before.", person: "Tom Hombergs", position: "Founder, reflectoring.io", initials: "TH" }
    - { text: "Philip managed to publish high quality articles and videos covering a wide range of topics.", person: "Vlad Mihalcea", position: "Founder, vladmihalcea.com", initials: "VM" }
    - { text: "Tons of actionable tutorials and content across the Spring universes. Highly recommended!", person: "Marco Behler", position: "Founder, marcobehler.com", initials: "MB" }

audience:
  headline: "Is this course for you?"
  items:
    - title: "You have let agents write tests and stopped trusting the result"
      text: "You know the green-but-empty test class. This course gives you the harness that turns the same agent into one that writes tests you would accept in review, plus a reviewer skill that catches the rest."
    - title: "You have not let agents touch your tests yet"
      text: "Good instinct. Start with the guardrails in place: install the skills, set the test strategy, and let the agent work inside them from the first prompt. You skip the cleanup phase most teams are in right now. If you still need the testing foundations, the bundled Masterclass covers them."

# Pricing v2: Solo and Team. `key` selects the CopeCart product ID env var
# PPP_PRODUCT_ID_<KEY>. Purchase Power Parity applies only to products with
# `ppp: true`, see BUILD.md.
ppp:
  currency: "€"
  headline: "Pricing"
  intro: "Two editions, identical content. They differ in seats, the implementation workshop, support and the update window."
  pppScope: "Solo edition"
  guarantee: "14-day money-back guarantee, no questions asked"
  renewal: "Every purchase includes its skill update window. After that, renew for 129€ per year or keep everything from your purchase window forever."
  quoteSubject: "Agentic Spring Boot Testing - Team edition quote"
  everyEdition:
    label: "Both editions include"
    cardLabel: "Included"
    principle: "Content is identical across editions. No buyer gets a lesser product."
    items:
      - "Agentic Spring Boot Testing course and the full skill library"
      - "Testing Spring Boot Applications Masterclass"
      - "TDD with Spring Boot Done Right"
      - "Hands-On Mocking with Mockito"
  products:
    - key: solo
      name: "Solo"
      audience: "For one developer"
      price: 490
      seats: "1 seat"
      license: "one-time payment"
      ppp: true
      tagline: "The encoded testing judgment your agent is missing, maintained for a year. The videos are the manual."
      featuresLabel: "Solo specifics"
      features:
        - "Skill updates for 12 months"
        - "Invoice for your employer on request"
        - "Convince-your-manager email template"
        - "Purchase Power Parity pricing for your country"
    - key: team
      name: "Team"
      audience: "For teams"
      price: 3990
      seats: "10 seats"
      license: "one invoice"
      perSeat: "399€ per seat"
      ppp: false
      guarantee: false
      tagline: "Your whole team on the same skills, with a 2-hour implementation workshop on your codebase."
      featuresLabel: "Team specifics"
      features:
        - "10 seats, every bundled course for all seats"
        - "Skill updates for 24 months"
        - "2-hour implementation workshop on your codebase"
        - "30 days of async Q&A support"
        - "Quote or purchase order on request"
      quoteLabel: "Request a quote"
      note: "Larger team or need more hands-on time?"

team:
  headline: "Team edition: your whole team on the same skills"
  text: "One developer with the skills improves their own pull requests. Ten developers with the same skills get a consistent test suite, faster reviews, and a build that stays fast while the agents write more code. The Team edition adds a 2-hour implementation workshop on your codebase, so the skills fit your conventions from day one."
  bullets:
    - "10 seats, 399€ per seat, one invoice for your training budget"
    - "2-hour implementation workshop on your codebase, not on a demo project"
    - "30 days of async Q&A support and 24 months of skill updates"
  ctaLabel: "Request a quote"
  mailSubject: "Agentic Spring Boot Testing - Team edition quote"
  overflow: "Larger team or need more hands-on time? Email me."
  card:
    label: "Team edition"
    title: "3,990€ for 10 seats"
    text: "399€ per seat, below the Solo price. Quotes and purchase orders welcome; you get the quote within a day."
  testimonial:
    text: "Philip delivered an outstanding session in our Spring Boot CoP, breaking down testing concepts into clear, practical bites. His structured approach to unit, sliced, and integration testing resonated with us."
    person: "Dustin Hütter"
    position: "Engineer, REWE Digital"
    initials: "DH"

faqs:
  headline: "Frequently asked questions"
  items:
    - question: "Do I need the Testing Spring Boot Applications Masterclass first?"
      answer: "No, and you do not need to buy it: the Masterclass is included in both editions. This course assumes you have written Spring Boot tests before and know what @SpringBootTest and @WebMvcTest do. Start with the Masterclass modules if you want the foundations first."
    - question: "I already own the Masterclass or one of the bundled courses. Do I pay twice?"
      answer: "No. Part of the Solo edition is already yours, so you get an alumni discount code. Email me from the address you bought with and I send it the same day."
    - question: "Which coding agents are supported?"
      answer: "The lessons use Claude Code. The skills are plain Markdown, and module 2 shows how to wire them into GitHub Copilot and Cursor. Any agent that reads project files and supports skills or rules works."
    - question: "Does it work with Maven and Gradle?"
      answer: "Yes. PetClinic uses Maven in the lessons, and the skills contain the Gradle equivalents for parallel execution, test tasks and Testcontainers reuse."
    - question: "Which Spring Boot and Java versions are covered?"
      answer: "Recorded with Spring Boot 4 and Java 21. The skills handle the differences to Spring Boot 3.x, for example @MockBean versus @MockitoBean. Spring Boot 2.x is not covered."
    - question: "How long do I have access, and what happens after the update window?"
      answer: "The lessons of all four courses stay yours forever. Skill updates are included for 12 months (Solo) or 24 months (Team). After that you renew for 129€ per year to keep receiving updates, or you keep the version from your purchase window and nothing is taken away."
    - question: "Can I pay from a company training budget or buy for a team?"
      answer: "Yes. The Solo edition comes with an invoice for your employer on request, and 490€ fits most no-approval training budgets. For teams, the Team edition has 10 seats, a 2-hour implementation workshop on your codebase and 30 days of async Q&A. Use Request a quote if you need a purchase order or a custom invoice."
    - question: "What if the course is not for me?"
      answer: "Email me within 14 days of purchase and you get a full refund, no questions asked."
    - question: "When does the course launch?"
      answer: "It is available now. You get access to all lessons, the bundled courses and the skills repository right after checkout, and an email whenever new content lands."

finalCta:
  headline: "Give your agent the testing judgment it is missing"
  text: "Six maintained skills, four courses, one harness. Start on your own project today."
  primaryCta: { label: "Enroll now", href: "#pricing" }
  companyNote: "Team of ten or more? See the Team edition or email me for a quote."

signup:
  headline: "Not ready? Get the free preview lesson"
  text: "Drop your email and I send you the lesson \"The four default failures\" for free, plus one email when the skills get a major update."
  buttonLabel: "Send me the preview lesson"
  success: "Almost there - check your inbox and confirm your email. The preview lesson follows right after."
  already: "Good news - you are already subscribed. The preview lesson is on its way to your inbox."
  footnote: "No spam. Unsubscribe anytime."
---
