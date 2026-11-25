---
title: "Dolor Sit Amet: Context Caching Without the Surprises"
summary: "Consectetur adipiscing elit. Find the hidden reasons why your test suite starts the application context again and again."
date: 2026-11-03
lastmod: 2026-11-03
author: "philip"
draft: true
---

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.

## Lorem Ipsum

Sed nisi. Nulla quis sem at nibh elementum imperdiet. Duis sagittis ipsum. Praesent mauris.

```java {title="LoremIpsumTest.java"}
@ExtendWith(MockitoExtension.class)
class LoremIpsumTest {

  @Mock
  private DolorRepository dolorRepository;

  @Test
  void shouldReturnAmet() {
    when(dolorRepository.findName(42)).thenReturn("amet");
  }
}
```

## Dolor Sit

Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla.
