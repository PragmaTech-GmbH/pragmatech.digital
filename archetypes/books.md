---
title: "{{ replace .Name "-" " " | title }}"
subtitle: "Subtitle here"
summary: "Brief summary of the book"
description: "Detailed description for SEO"
date: {{ .Date }}
cover_image: "/images/books/default-cover.jpg"
authors: ["Author Name", "Co-Author Name"]
published_date: "{{ now.Format "January 2006" }}"
last_updated: "{{ now.Format "January 2006" }}"
pages: 300
format: "Digital Book"
price: "€XX.XX"
badge: ""
purchase_url: "https://books.pragmatech.de/book-url/"
sample_url: "https://books.pragmatech.de/book-url/sample"
purchase_note: "Available as PDF, EPUB, and MOBI. Includes free updates for life."
formats: ["PDF", "EPUB", "MOBI"]
topics:
  - "Topic 1"
  - "Topic 2"
  - "Topic 3"
toc:
  - chapter: "1. Chapter Title"
    sections:
      - "Section 1"
      - "Section 2"
      - "Section 3"
  
  - chapter: "2. Chapter Title"
    sections:
      - "Section 1"
      - "Section 2"
      - "Section 3"
author_bio: |
  **Author Name** is a brief biography of the author.
  
  **Co-Author Name** is a brief biography of the co-author.
testimonials:
  - name: "Reader Name"
    role: "Role"
    company: "Company"
    quote: "Testimonial quote"
faqs:
  - question: "FAQ Question"
    answer: "FAQ Answer"
draft: true
---

## Book Introduction

Book description goes here.

### Who This Book Is For

Target audience description.

### What You'll Learn

Key learning outcomes.

### Book Features

Highlight of special features or approaches used in the book.