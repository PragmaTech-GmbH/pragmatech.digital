---
title: "Optimizing Build Pipeline for Microservices Architecture"
summary: "How we reduced build times by 72% and improved test reliability for a SaaS company with 30+ Spring Boot microservices"
description: "Case study on how PragmaTech optimized the build pipeline for a SaaS company with 30+ Spring Boot microservices, reducing build times by 72% and improving test reliability"
date: 2023-06-10T11:40:13+02:00
client_name: "CloudScale Solutions"
client_industry: "SaaS / E-commerce"
client_size: "Mid-size (150 developers)"
challenge: "Slow, unreliable builds across 30+ microservices hindering productivity and release velocity"
solution: "Consolidated build pipeline with optimized testing, containerization, and parallelization"
results:
  - "Reduced average build time from 32 minutes to 9 minutes (72% improvement)"
  - "Decreased flaky tests from 8% to less than 1%"
  - "Cut infrastructure costs by 35%"
  - "Improved release frequency from bi-weekly to daily deployments"
technologies:
  - "Spring Boot"
  - "Gradle"
  - "JUnit 5"
  - "Testcontainers"
  - "GitHub Actions"
  - "Kubernetes"
testimonial:
  quote: "PragmaTech's build optimization transformed our delivery pipeline. Our developers are more productive, our releases are more reliable, and we can respond to market needs much faster. The ROI on this engagement was phenomenal."
  name: "David Chen"
  role: "Director of Engineering"
featured_image: "/images/case-studies/microservices-build-pipeline.jpg"
---

## The Challenge

CloudScale Solutions is a rapidly growing SaaS company providing e-commerce infrastructure to mid-market retailers. Their platform had evolved into a microservices architecture with over 30 Spring Boot services, each with its own build process and deployment pipeline.

As the company scaled, they faced significant challenges with their build and deployment process:

- **Lengthy Build Times**: The average build took 32 minutes, with some services taking up to 45 minutes
- **Test Reliability Issues**: Approximately 8% of their tests were "flaky" (inconsistently passing or failing)
- **Resource Constraints**: Build agents were constantly at capacity, causing queuing and delays
- **Inconsistent Environments**: Differences between local, CI, and production environments caused deployment failures
- **Developer Frustration**: Long feedback cycles led to context switching and reduced productivity
- **Release Delays**: The cumulative impact was slowing their ability to release new features

The leadership team recognized that these issues were significantly impacting their ability to compete in the fast-moving e-commerce infrastructure space, where rapid feature delivery is critical.

## Our Approach

We began with a comprehensive audit of their build and test infrastructure, focusing on:

1. **Build Process Analysis**: Detailed profiling of build times across their microservices
2. **Test Execution Patterns**: Identification of slow and unreliable tests
3. **Infrastructure Assessment**: Evaluation of their CI/CD infrastructure and resource allocation
4. **Developer Workflow Study**: Understanding the daily developer experience and pain points

Based on this assessment, we identified several critical areas for improvement:

- Their test suite contained many redundant integration tests that were testing the same functionality across services
- Container startup was a major bottleneck in their test process
- Resource allocation in their CI pipeline was inefficient
- Build configurations varied significantly between services, making maintenance difficult
- Local development environments were inconsistent with CI environments

We developed a holistic strategy addressing both technical and organizational aspects of their build process.

## Solution Implementation

### 1. Test Suite Rationalization

The test suite was our first target, as it represented over 70% of the total build time:

- **Test Deduplication**: We identified and eliminated redundant integration tests that were testing the same functionality across multiple services
- **Test Categorization**: Implemented JUnit 5 tags to categorize tests by type (unit, integration, end-to-end) and execution requirements
- **Test Data Management**: Replaced tests using full production-like datasets with focused test data
- **Parallelization Strategy**: Implemented optimal test parallelization based on service resource profiles

### 2. Testcontainers Optimization

Many of their integration tests relied on Testcontainers, but the implementation was inefficient:

- **Container Reuse**: Implemented container reuse across test classes
- **Startup Time Reduction**: Pre-built custom container images with necessary initialization data
- **Parallel Container Management**: Optimized container startup sequencing
- **Lightweight Alternatives**: Replaced heavy containers with lightweight alternatives for certain test scenarios

Example implementation:

```java
@Testcontainers
public class SharedPostgresqlContainer {
    private static final Logger log = LoggerFactory.getLogger(SharedPostgresqlContainer.class);

    @Container
    public static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:13")
            .withDatabaseName("integration-tests-db")
            .withUsername("testuser")
            .withPassword("testpass")
            .withInitScript("init-db.sql");

    static {
        postgres.start();
        System.setProperty("DB_URL", postgres.getJdbcUrl());
        System.setProperty("DB_USERNAME", postgres.getUsername());
        System.setProperty("DB_PASSWORD", postgres.getPassword());
        log.info("Started PostgreSQL container");
    }
}
```

### 3. Build System Standardization

We standardized their build configuration across all services:

- **Consolidated Gradle Configuration**: Created a centralized Gradle plugin containing optimized build configurations for all services
- **Dependency Management**: Implemented consistent dependency management across all services
- **Build Cache**: Set up a distributed build cache to avoid redundant work
- **Resource Optimization**: Tuned JVM and Gradle parameters based on profiling data

Example of the consolidated Gradle plugin:

```groovy
plugins {
    id 'java-library'
    id 'org.springframework.boot' apply false
}

subprojects {
    apply plugin: 'java-library'
    apply plugin: 'io.spring.dependency-management'
    apply plugin: 'jacoco'
    
    java {
        toolchain {
            languageVersion = JavaLanguageVersion.of(17)
        }
    }
    
    repositories {
        mavenCentral()
    }

    test {
        useJUnitPlatform()
        maxParallelForks = Runtime.runtime.availableProcessors().intdiv(2) ?: 1
        
        filter {
            includeTestsMatching "com.cloudscale.*"
        }
    }
    
    // Optimized task configuration based on profiling
    tasks.withType(JavaCompile) {
        options.fork = true
        options.incremental = true
    }
}
```

### 4. CI Pipeline Redesign

We completely redesigned their CI pipeline for efficiency:

- **Intelligent Task Scheduling**: Implemented a system to determine which services needed to be rebuilt based on changes
- **Parallel Execution**: Designed the pipeline to run independent builds in parallel
- **Resource Allocation**: Matched CI agent specifications to the needs of different services
- **Caching Strategy**: Implemented aggressive caching of dependencies, build outputs, and test containers
- **Artifact Management**: Streamlined the handling of build artifacts between pipeline stages

### 5. Local Development Improvements

We also addressed the developer experience:

- **Containerized Development Environment**: Created consistent Docker-based development environments
- **Build Scripts**: Provided optimized local build scripts with appropriate defaults
- **Pre-commit Hooks**: Implemented lightweight pre-commit validation to catch issues early
- **Development Mode**: Added specialized development mode configurations to speed up the local feedback loop

## Technical Deep Dive

### Test Execution Optimization

One of the key innovations was our approach to test parallelization and resource allocation. We developed a system to analyze test resource requirements and group tests optimally:

```java
@Tag("resource-intensive")
public class DatabaseMigrationTests {
    // Tests that require significant database resources
}

@Tag("io-intensive")
public class FileProcessingTests {
    // Tests that are I/O intensive but not CPU intensive
}

@Tag("cpu-intensive")
public class ComputationTests {
    // Tests that require significant CPU resources
}
```

These tags were then used in the CI pipeline to schedule tests efficiently:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        test-group: [resource-intensive, io-intensive, cpu-intensive, standard]
    steps:
      - uses: actions/checkout@v2
      - name: Set up JDK
        uses: actions/setup-java@v2
        with:
          java-version: '17'
      - name: Run tests
        run: ./gradlew test --tests "@${{ matrix.test-group }}*"
```

### Service Dependency Graph

We built a service dependency graph to optimize the build order:

```kotlin
val serviceDependencyGraph = mapOf(
    "product-service" to listOf("inventory-service", "pricing-service"),
    "order-service" to listOf("product-service", "customer-service"),
    // ... other service dependencies
)

fun determineOptimalBuildOrder(changedServices: Set<String>): List<String> {
    // Algorithm to determine which services need to be rebuilt and in what order
}
```

This allowed us to avoid rebuilding services that had no changes in their dependency chain.

### Containerization Strategy

We standardized the containerization process across all services:

```dockerfile
# Base image with pre-installed dependencies
FROM cloudscale/java-service-base:17 as builder

WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
RUN ./gradlew dependencies

COPY src ./src
RUN ./gradlew build -x test

FROM cloudscale/java-runtime:17
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]
```

This approach ensured consistency and leveraged Docker layer caching effectively.

## Results and Impact

The optimizations delivered remarkable improvements:

1. **Build Time Reduction**: Average build time decreased from 32 minutes to 9 minutes (72% improvement)
2. **Test Reliability**: Flaky tests decreased from 8% to less than 1%
3. **Infrastructure Cost Savings**: 35% reduction in CI infrastructure costs despite increasing the number of services
4. **Developer Productivity**: Engineers reported 30% less time waiting for builds
5. **Release Velocity**: Moved from bi-weekly releases to daily deployments
6. **Code Quality**: Pull request reviews increased by 45% as developers had more time available

These technical improvements translated to significant business outcomes:

- **Faster Time-to-Market**: New features reached customers 3x faster than before
- **Improved Competitive Position**: Ability to respond to market demands more quickly
- **Enhanced Developer Satisfaction**: Reduced turnover in the engineering team
- **Better Product Quality**: Fewer production incidents due to more thorough testing

## Lessons Learned

Several key insights emerged from this project:

1. **Test Strategy is Critical**: The biggest gains came from test suite optimization and judicious use of different test types
2. **Standardization Pays Off**: Consistency across services made ongoing maintenance much easier
3. **Developer Experience Matters**: Optimizing for developer productivity had a multiplier effect on overall efficiency
4. **Incremental Improvements**: Some of the most valuable optimizations were small, targeted changes applied consistently
5. **Monitoring and Measurement**: Continuous monitoring of build performance was essential to prevent regression

CloudScale Solutions now has a robust, efficient build pipeline that supports their continued growth. They've established a build performance budget and regular reviews to ensure build times don't creep up as they add new services and features.

The optimization work has become a competitive advantage for their engineering organization, allowing them to attract talent and deliver features at a pace that distinguishes them in the market.