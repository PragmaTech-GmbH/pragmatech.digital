---
title: "Reducing Build Time by 68% for Enterprise Banking App"
summary: "How we optimized the CI/CD pipeline for a large banking application, cutting build times from 25 minutes to just 8 minutes"
description: "Case study on how PragmaTech reduced Spring Boot build times by 68% for an enterprise banking application, improving developer productivity and deployment frequency"
date: 2023-05-15T11:40:13+02:00
client_name: "Global Financial Services"
client_industry: "Banking"
client_size: "Enterprise (5000+ employees)"
challenge: "25-minute build times slowing development and CI/CD pipelines"
solution: "Optimized test execution, build caching, and modularized architecture"
results:
  - "Reduced build time from 25 minutes to 8 minutes (68% improvement)"
  - "Increased deployment frequency from 3 to 12 times per week"
  - "Developer feedback cycle reduced from 15 minutes to 4 minutes"
  - "Saved approximately 20 developer hours per week"
technologies:
  - "Spring Boot"
  - "Maven"
  - "Gradle"
  - "JUnit 5"
  - "Docker"
  - "Jenkins"
testimonial:
  quote: "The improvements to our build process have transformed our development workflow. What used to be a frustrating bottleneck is now a smooth, efficient process. Our team can iterate faster and ship with more confidence."
  name: "Sarah Johnson"
  role: "VP of Engineering"
featured_image: "/images/case-studies/banking-build-time.jpg"
---

## The Challenge

Global Financial Services, a large international bank, approached us with a significant challenge: their core banking platform, built with Spring Boot, had grown to over 500,000 lines of code with more than 4,000 tests. As the codebase expanded, build times had gradually increased to approximately 25 minutes, creating a substantial bottleneck in their development process.

This slow build time was causing numerous problems:

- **Reduced developer productivity**: Engineers were waiting 15+ minutes to get feedback on their changes
- **Low deployment frequency**: The team was only able to deploy to production 3 times per week
- **CI pipeline congestion**: Build agents were constantly busy, creating a queue for CI jobs
- **High infrastructure costs**: The long-running build jobs required substantial computing resources
- **Developer frustration**: Engineers were context-switching during long builds, reducing focus and efficiency

The situation had reached a critical point where the slow build times were directly impacting the bank's ability to deliver features and fixes to their customers in a timely manner.

## Our Approach

After being engaged, we conducted a thorough analysis of their build process, infrastructure, and codebase. We deployed a suite of profiling and monitoring tools to identify the key bottlenecks:

1. **Build Profiling**: We used Maven/Gradle build scans to analyze where time was being spent during builds
2. **Test Execution Analysis**: We measured the execution time of individual tests and test suites
3. **Dependency Graph Mapping**: We created a visualization of project dependencies to identify optimization opportunities
4. **Infrastructure Assessment**: We evaluated the build infrastructure and resource utilization

Based on our findings, we developed a comprehensive optimization strategy focused on the areas with the highest impact potential.

## Solution Implementation

### 1. Test Execution Optimization

The test suite was a major bottleneck, accounting for 65% of the total build time. We implemented several optimizations:

- **Test Parallelization**: Configured JUnit to run tests in parallel with optimal thread count based on available CPU cores
- **Test Classification**: Categorized tests into unit, integration, and end-to-end tests with appropriate execution strategies for each
- **Test Data Management**: Replaced database-dependent tests with in-memory alternatives where appropriate
- **Test Ordering**: Prioritized fast-running tests to provide earlier feedback

### 2. Build Caching Improvements

We identified that ineffective caching was causing unnecessary rebuilds:

- **Implemented Incremental Builds**: Configured Gradle to properly leverage incremental builds
- **Remote Cache Server**: Set up a distributed build cache shared across all build agents
- **Dependency Caching**: Optimized dependency resolution and caching strategies
- **Layer Caching for Docker**: Implemented proper Dockerfile layer ordering to maximize cache hits

### 3. Build Process Restructuring

We made several structural changes to the build process itself:

- **Multi-stage Builds**: Implemented a pipeline with distinct validation, build, and deploy stages
- **Artifact Reuse**: Configured the CI system to reuse artifacts between stages instead of rebuilding
- **Parallel Task Execution**: Identified build tasks that could be executed in parallel
- **Build Agent Optimization**: Tuned JVM memory settings and garbage collection strategies

### 4. Application Architecture Improvements

We also recommended and implemented changes to the application architecture:

- **Modularization**: Split the monolithic application into logical modules with cleaner boundaries
- **Dependency Management**: Reduced unnecessary and transitive dependencies
- **Lazy Initialization**: Implemented conditional bean creation in the Spring context
- **Resource Optimization**: Reduced unnecessary resource scanning during startup

## Technical Deep Dive

### Test Suite Optimization Details

The original test configuration was running most tests sequentially. By implementing JUnit 5's parallel execution feature with properly isolated tests, we achieved significant time savings:

```java
// Before: Sequential test execution
@SpringBootTest
public class PaymentProcessorTests {
    // Tests that would run one after another
}

// After: Configured for parallel execution
@SpringBootTest
@Execution(ExecutionMode.CONCURRENT)
public class PaymentProcessorTests {
    // Tests capable of running in parallel
}
```

We also implemented custom test execution listeners to prioritize fast-running tests:

```java
public class TimeBasedTestExecutionListener implements TestExecutionListener {
    // Implementation that tracks test execution times and reorders based on historical data
}
```

### Build Caching Implementation

For Gradle builds, we implemented a remote build cache:

```groovy
// Gradle build cache configuration
buildCache {
    local {
        enabled = true
    }
    remote(HttpBuildCache) {
        url = 'https://cache.company.com/'
        credentials {
            username = 'cache-user'
            password = 'cache-password'
        }
        push = true
    }
}
```

For Docker builds, we restructured the Dockerfile to optimize layer caching:

```dockerfile
# Before: Inefficient layer caching
FROM openjdk:11-jdk
COPY . /app
RUN ./gradlew build

# After: Optimized for layer caching
FROM openjdk:11-jdk
COPY build.gradle settings.gradle /app/
COPY gradle /app/gradle
RUN cd /app && ./gradlew dependencies
COPY src /app/src
RUN cd /app && ./gradlew build
```

### Modularization Strategy

We divided the application into core modules with well-defined boundaries:

```
banking-app/
├── core/
│   ├── domain/
│   ├── infrastructure/
│   └── security/
├── services/
│   ├── accounts/
│   ├── payments/
│   └── reporting/
└── api/
    ├── rest/
    ├── graphql/
    └── batch/
```

This modularization allowed for:
- Parallel compilation of independent modules
- Selective testing of only affected modules
- Better incremental builds

## Results and Impact

The optimizations delivered impressive results:

1. **Total Build Time**: Reduced from 25 minutes to 8 minutes (68% improvement)
2. **Developer Feedback Cycle**: Local build time reduced from 15 minutes to 4 minutes
3. **Deployment Frequency**: Increased from 3 deployments per week to 12
4. **Infrastructure Savings**: Reduced CI server resource requirements by 40%
5. **Developer Productivity**: Estimated time savings of 20+ hours per week across the team

The improved build performance had several business impacts:

- **Faster Feature Delivery**: New features reached customers more quickly
- **Improved Quality**: More frequent testing and deployment led to fewer production issues
- **Enhanced Developer Experience**: Reduced frustration and context-switching
- **Cost Savings**: Lower infrastructure costs and improved developer efficiency

## Lessons Learned

This project provided several valuable insights:

1. **Continuous Performance Monitoring**: Build performance can degrade gradually. Regular monitoring is essential to catch issues early.
2. **Test Strategy Matters**: A thoughtful testing strategy is critical for maintaining build performance as the codebase grows.
3. **Infrastructure Investment**: Investing in proper build infrastructure (including caching) pays significant dividends.
4. **Architectural Boundaries**: Clear module boundaries make build optimization much more effective.
5. **Developer Workflows**: Optimizing for developer feedback loops can dramatically improve productivity and satisfaction.

By addressing the build performance challenges, we not only solved an immediate technical problem but helped transform the development culture at Global Financial Services. The team now embraces a truly iterative, fast-feedback approach that lets them respond to market and customer needs more effectively.