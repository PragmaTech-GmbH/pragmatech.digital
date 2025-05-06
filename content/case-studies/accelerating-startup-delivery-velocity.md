---
title: "Accelerating Delivery Velocity for Fast-Growing Startup"
summary: "How we helped a HealthTech startup reduce build times by 65% while improving test coverage and enabling rapid iteration"
description: "Case study on how PragmaTech helped a HealthTech startup reduce Spring Boot build times by 65%, improving delivery velocity and enabling rapid feature development"
date: 2023-07-20T11:40:13+02:00
client_name: "HealthPulse"
client_industry: "HealthTech"
client_size: "Startup (25 developers)"
challenge: "Slow build and deployment process hampering rapid iteration and growth"
solution: "Optimized build configuration, containerization strategy, and testing approach"
results:
  - "Reduced build time from 18 minutes to 6.5 minutes (65% improvement)"
  - "Increased test coverage from 62% to 87% while reducing test execution time"
  - "Enabled same-day feature deployment (down from 3-4 days)"
  - "Supported 3x growth in codebase without build time regression"
technologies:
  - "Spring Boot"
  - "Gradle"
  - "Testcontainers"
  - "AWS CodeBuild"
  - "Docker"
  - "JUnit 5"
testimonial:
  quote: "As a fast-growing startup, our ability to iterate quickly is everything. PragmaTech's build optimization work removed a major bottleneck in our delivery process. We can now ship features 3x faster without sacrificing quality."
  name: "Emily Rodriguez"
  role: "CTO"
featured_image: "/images/case-studies/healthtech-startup.jpg"
---

## The Challenge

HealthPulse is a rapidly growing HealthTech startup developing a platform that connects patients with healthcare providers through virtual consultations and remote monitoring. As a startup in a competitive space, their ability to iterate quickly and respond to market feedback is critical to their success.

When they approached us, HealthPulse was experiencing significant growing pains with their development process:

- **Slow Build Times**: Their Spring Boot application build was taking approximately 18 minutes
- **Deployment Bottlenecks**: The path from code commit to production was taking 3-4 days
- **Scaling Challenges**: As they added more features and developers, build times were steadily increasing
- **Technical Debt**: Quick fixes to meet deadlines were creating mounting technical debt
- **Inconsistent Environments**: Discrepancies between development and production environments caused unpredictable issues
- **Limited Test Coverage**: Test coverage was around 62%, with tests often skipped to save time

These challenges were particularly problematic for a startup where speed to market is a critical competitive advantage. Each day of delay in feature development represented potential market share lost to competitors.

## Our Approach

We began by conducting a thorough assessment of HealthPulse's development workflow, build process, and deployment pipeline. Our approach focused on identifying quick wins that could deliver immediate value while also establishing a foundation for long-term scalability.

Key assessment activities included:

1. **Build Process Profiling**: Detailed analysis of where time was being spent during builds
2. **Code Architecture Review**: Evaluation of the application structure and its impact on build times
3. **Test Suite Analysis**: Identification of slow, duplicative, or unnecessary tests
4. **Deployment Pipeline Mapping**: End-to-end mapping of the deployment process
5. **Development Workflow Interviews**: Conversations with developers to understand pain points

This assessment revealed several opportunities for improvement:

- Their Gradle configuration wasn't optimized for their specific project structure
- Test execution was inefficient with redundant database setup
- Docker image builds were taking place within the main CI pipeline
- AWS CodeBuild resources were undersized for their build requirements
- Developers were running full builds locally when only testing small changes

## Solution Implementation

### 1. Gradle Build Optimization

We implemented several Gradle optimizations to address the core build speed issues:

- **Parallel Task Execution**: Configured Gradle to run tasks in parallel where possible
- **Build Cache Implementation**: Set up a local and remote Gradle build cache
- **Dependency Management**: Streamlined dependency resolution and caching
- **Incremental Compilation**: Ensured incremental Java compilation was properly configured
- **Task Output Caching**: Implemented task output caching for expensive operations

Example Gradle configuration improvements:

```groovy
// Before
// No specific optimizations in gradle.properties

// After
org.gradle.parallel=true
org.gradle.caching=true
org.gradle.configureondemand=true
org.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=512m -XX:+HeapDumpOnOutOfMemoryError
```

```groovy
// Optimized dependency management
configurations.all {
    resolutionStrategy {
        cacheDynamicVersionsFor 10, 'minutes'
        cacheChangingModulesFor 4, 'hours'
    }
}
```

### 2. Test Execution Optimization

We significantly improved their testing strategy:

- **Test Parallelization**: Configured JUnit to run tests in parallel
- **Test Data Management**: Implemented a shared test database setup with reusable test containers
- **Test Classification**: Categorized tests as unit, integration, or end-to-end with different execution strategies
- **Conditional Testing**: Implemented selective test execution based on changed components
- **Test Coverage Improvement**: Added strategic tests to increase coverage without significantly impacting build time

Example JUnit configuration:

```java
@Configuration
public class TestConfig {
    @Bean(initMethod = "start", destroyMethod = "stop")
    public PostgreSQLContainer<?> postgreSQLContainer() {
        return new PostgreSQLContainer<>("postgres:13")
                .withDatabaseName("test")
                .withUsername("test")
                .withPassword("test")
                .withReuse(true);  // Enable container reuse between test runs
    }
    
    @Bean
    public DataSource dataSource(PostgreSQLContainer<?> postgreSQLContainer) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(postgreSQLContainer.getJdbcUrl());
        dataSource.setUsername(postgreSQLContainer.getUsername());
        dataSource.setPassword(postgreSQLContainer.getPassword());
        return dataSource;
    }
}
```

### 3. Docker Build Optimization

We completely revamped their Docker build process:

- **Multi-stage Builds**: Implemented efficient multi-stage Dockerfile for smaller, faster builds
- **Layer Caching**: Optimized layer ordering to maximize cache hits
- **Parallel Image Building**: Moved Docker image building to a separate pipeline running in parallel
- **Base Image Optimization**: Created custom base images with pre-installed dependencies
- **BuildKit Integration**: Leveraged Docker BuildKit for parallel and efficient builds

Example optimized Dockerfile:

```dockerfile
# Build stage
FROM gradle:7.4-jdk17 AS builder
WORKDIR /app
COPY build.gradle settings.gradle ./
COPY gradle ./gradle
# Cache dependencies
RUN gradle dependencies --no-daemon

COPY src ./src
RUN gradle build --no-daemon -x test

# Runtime stage
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -q --spider http://localhost:8080/actuator/health || exit 1
COPY --from=builder /app/build/libs/*.jar ./app.jar
ENTRYPOINT ["java", "-XX:+UseContainerSupport", "-jar", "app.jar"]
```

### 4. CI/CD Pipeline Redesign

We redesigned their CI/CD pipeline for maximum efficiency:

- **Right-sized Resources**: Adjusted AWS CodeBuild instance types based on build requirements
- **Targeted Build Scripts**: Created specialized build scripts for different types of changes
- **Parallel Execution**: Restructured the pipeline to maximize parallel execution
- **Artifact Caching**: Implemented caching of dependencies and intermediate build artifacts
- **Fast-track Paths**: Created expedited paths for urgent hotfixes and critical features

### 5. Local Development Experience

To improve the developer experience, we implemented:

- **Development Mode**: Added a specialized Gradle development mode that skipped non-essential tasks
- **Incremental Builds**: Configured truly incremental local builds that only recompiled changed code
- **Local Docker Environment**: Created a standardized local development environment using Docker Compose
- **Pre-commit Validations**: Added lightweight pre-commit hooks to catch issues early
- **IDE Integration**: Provided optimized IDE configurations for IntelliJ IDEA and VS Code

## Technical Deep Dive

### Test Suite Restructuring

A key aspect of our optimization was the restructuring of the test suite to balance coverage and execution time:

```java
// Example of test categorization
// Unit tests (fast, no external dependencies)
@Tag("unit")
public class PatientServiceUnitTest {
    // Fast unit tests with mocked dependencies
}

// Integration tests (may require external systems)
@Tag("integration")
public class PatientServiceIntegrationTest {
    // Integration tests with actual dependencies
}

// End-to-end tests (test full flows)
@Tag("e2e")
public class PatientOnboardingE2ETest {
    // Full workflow tests
}
```

We then configured the build to run different types of tests in different contexts:

```groovy
// In build.gradle
tasks.register('fastTest') {
    group = 'verification'
    description = 'Runs fast unit tests only'
    useJUnitPlatform {
        includeTags 'unit'
    }
}

tasks.register('integrationTest') {
    group = 'verification'
    description = 'Runs integration tests only'
    useJUnitPlatform {
        includeTags 'integration'
    }
}

tasks.register('e2eTest') {
    group = 'verification'
    description = 'Runs end-to-end tests only'
    useJUnitPlatform {
        includeTags 'e2e'
    }
}
```

### Build Time Analysis Tool

We developed a custom build time analysis tool to help the team continuously monitor and optimize their build:

```kotlin
// Simplified version of our build time analyzer
class BuildTimeAnalyzer : BuildAdapter(), TaskExecutionListener {
    private val taskTimes = mutableMapOf<String, Long>()
    private var startTime: Long = 0

    override fun beforeExecute(task: Task) {
        startTime = System.currentTimeMillis()
    }

    override fun afterExecute(task: Task, state: TaskState) {
        val elapsed = System.currentTimeMillis() - startTime
        taskTimes[task.path] = elapsed
    }

    override fun buildFinished(result: BuildResult) {
        // Sort tasks by duration
        val sortedTasks = taskTimes.entries.sortedByDescending { it.value }
        
        // Print top 10 most time-consuming tasks
        println("Top 10 most time-consuming tasks:")
        sortedTasks.take(10).forEach { (task, time) ->
            println("${task.padEnd(50)} ${time}ms")
        }
        
        // Calculate task type statistics
        val taskTypeStats = taskTimes.entries.groupBy { 
            it.key.substring(it.key.lastIndexOf(':') + 1) 
        }.mapValues { entry ->
            entry.value.sumOf { it.value }
        }
        
        println("\nTime spent by task type:")
        taskTypeStats.entries.sortedByDescending { it.value }.forEach { (type, time) ->
            println("${type.padEnd(30)} ${time}ms")
        }
    }
}
```

### AWS CodeBuild Optimization

We implemented a multi-tiered AWS CodeBuild configuration:

```yaml
# Example CodeBuild buildspec.yml
version: 0.2

phases:
  install:
    runtime-versions:
      java: corretto17
  pre_build:
    commands:
      - echo Determine build type
      - CHANGED_FILES=$(git diff --name-only HEAD^)
      - |
        if echo "$CHANGED_FILES" | grep -q "src/main"; then
          echo "Source changes detected, running full build"
          BUILD_TYPE="full"
        elif echo "$CHANGED_FILES" | grep -q "src/test"; then
          echo "Only test changes detected, running test-only build"
          BUILD_TYPE="test-only"
        else
          echo "Documentation or configuration changes only, running minimal build"
          BUILD_TYPE="minimal"
        fi
  build:
    commands:
      - |
        case $BUILD_TYPE in
          full)
            ./gradlew build dockerPrepare
            ;;
          test-only)
            ./gradlew test
            ;;
          minimal)
            ./gradlew compileJava
            ;;
        esac

cache:
  paths:
    - '/root/.gradle/caches/**/*'
    - '/root/.gradle/wrapper/**/*'
```

## Results and Impact

The optimizations delivered significant improvements across all key metrics:

1. **Build Time Reduction**: Total build time decreased from 18 minutes to 6.5 minutes (65% improvement)
2. **Improved Test Coverage**: Test coverage increased from 62% to 87% while reducing test execution time
3. **Deployment Speed**: Time from commit to production reduced from 3-4 days to same-day deployment
4. **Scalability**: The system now handles 3x the original codebase size without build time regression
5. **Developer Productivity**: Developers report saving approximately 1 hour per day waiting for builds
6. **Resource Efficiency**: CI/CD cost per build reduced by 40% despite faster builds

These technical improvements translated to significant business outcomes:

- **Faster Time to Market**: Features now reach users 3x faster than before
- **Improved Quality**: Higher test coverage and more consistent environments reduced production bugs by 45%
- **Enhanced Competitiveness**: Ability to rapidly implement user feedback helped secure additional funding
- **Team Growth**: Optimized processes supported team growth from 12 to 25 developers without process breakdown
- **Reduced Technical Debt**: More efficient processes allowed time for refactoring and technical debt reduction

## Lessons Learned

This project yielded several valuable insights:

1. **Start with Profiling**: Data-driven optimization is much more effective than intuition-based changes
2. **Developer Experience Matters**: Optimizing the local development feedback loop has an outsized impact
3. **Right-sized Testing**: A thoughtful test strategy balances coverage, reliability, and execution time
4. **Build for Growth**: Infrastructure and processes should anticipate growth in both codebase and team size
5. **Continuous Monitoring**: Build performance requires ongoing attention to prevent regression

The HealthPulse team has now established a build performance budget and regular reviews to ensure build times remain optimal as they continue to grow. They've also implemented a "build performance champion" role that rotates among team members, ensuring continuous focus on this critical aspect of their development process.

The improved development velocity has been a significant factor in HealthPulse's ability to respond to market opportunities and secure additional venture funding for their expansion.