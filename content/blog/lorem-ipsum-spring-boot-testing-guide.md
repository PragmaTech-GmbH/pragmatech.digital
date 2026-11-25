---
title: "Lorem Ipsum: The Complete Guide to Spring Boot Integration Tests"
summary: "Lorem ipsum dolor sit amet: how to set up fast and reliable integration tests with Testcontainers, context caching and parallel builds."
date: 2026-11-12
lastmod: 2026-11-20
author: "philip"
draft: true
---

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus **fast feedback** at integer nec odio praesent libero. Sed cursus ante dapibus diam, sed nisi nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum with `@SpringBootTest` praesent mauris.

Fusce nec tellus sed augue semper porta. Mauris massa vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. [Curabitur sodales ligula](#) in libero.

## Lorem Ipsum Dependency Setup

Sed dignissim lacinia nunc. Curabitur tortor, pellentesque nibh, aenean quam. In scelerisque sem at dolor maecenas mattis:

```xml {title="pom.xml"}
<!-- Lorem ipsum: everything we need for testing -->
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-webmvc-test</artifactId>
  <scope>test</scope>
</dependency>

<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>testcontainers-postgresql</artifactId>
  <scope>test</scope>
</dependency>
```

Sed convallis tristique sem. Proin ut ligula vel nunc egestas porttitor:

- Morbi lectus risus, iaculis vel, suscipit quis, luctus non, massa
- Fusce ac turpis quis ligula lacinia aliquet
- Mauris ipsum nulla metus metus, ullamcorper vel, tincidunt sed, euismod in

## Consectetur Integration Test

Nulla quam. Aenean laoreet. Vestibulum nisi lectus, commodo ac, facilisis ac, ultricies eu, pede. Ut orci risus, accumsan porttitor, cursus quis, aliquet eget, justo.

```java {title="HealthCheckIT.java"}
package digital.pragmatech.demo;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.client.RestTestClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class HealthCheckIT {

  private static final long TIMEOUT_MILLIS = 100L;

  @Autowired
  private RestTestClient restTestClient;

  @Test
  void shouldReturnSuccessfulHealthCheck() {
    // Lorem ipsum dolor sit amet
    restTestClient
      .get()
      .uri("/actuator/health")
      .exchange()
      .expectStatus().isOk()
      .expectBody()
      .jsonPath("$.status").isEqualTo("UP");
  }
}
```

> Lorem ipsum dolor sit amet: a test that nobody trusts is worse than no test, because it costs time and gives no confidence.

### Adipiscing Configuration

Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Proin pharetra nonummy pede:

```yaml {title="application-test.yml"}
spring:
  jpa:
    open-in-view: false
    hibernate:
      ddl-auto: validate
  test:
    context:
      cache:
        max-size: 32 # lorem ipsum
```

![Lorem ipsum conference talk](/generated/images/events/philip-jug-cern-2025.webp)

## Elit Build Performance

Mauris et orci. Aenean nec lorem. In porttitor. Donec laoreet nonummy augue.

| Lorem setup          | Duration | Context starts |
|----------------------|----------|----------------|
| Ipsum sequential     | 14m 20s  | 31             |
| Dolor cached context | 6m 05s   | 4              |
| Amet parallel        | 3m 40s   | 4              |

Run the build with the following command, suspendisse dui purus, scelerisque at, vulputate vitae, pretium mattis, nunc:

```bash
# Lorem ipsum: a very long command line to check horizontal scrolling
./mvnw verify -Dsurefire.forkCount=2 -Dsurefire.reuseForks=true -Djunit.jupiter.execution.parallel.enabled=true --batch-mode
```

### Sed Do Eiusmod

1. Praesent blandit laoreet nibh
2. Fusce convallis metus id felis luctus adipiscing
3. Pellentesque egestas, neque sit amet convallis pulvinar

Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem.

## Summary

Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh.

Joyful testing,\
Philip
