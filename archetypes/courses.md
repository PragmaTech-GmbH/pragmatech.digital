---
title: "{{ replace .Name "-" " " | title }}"
summary: "Brief summary of the course"
description: "Detailed description for SEO"
date: {{ .Date }}
image: "/images/courses/default.jpg"
level: "Intermediate"
duration: "X hours"
modules: "X modules with Y lessons"
last_updated: "{{ now.Format "January 2006" }}"
price: "€XXX"
badge: ""
course_url: "https://courses.pragmatech.de/course-url/"
enrollment_note: "Lifetime access with free updates"
features:
  - "Feature 1"
  - "Feature 2"
  - "Feature 3"
prerequisites:
  - "Prerequisite 1"
  - "Prerequisite 2"
curriculum:
  - module: "Module 1: Title"
    duration: "Duration"
    lessons:
      - title: "Lesson Title"
        duration: "Duration"
        preview: false
instructor:
  name: "Philip Riecks"
  role: "Lead Instructor"
  image: "/images/team/philip.jpg"
  bio: "Instructor biography"
testimonials:
  - name: "Student Name"
    role: "Role"
    company: "Company"
    quote: "Testimonial quote"
faqs:
  - question: "FAQ Question"
    answer: "FAQ Answer"
draft: true
---

## Course Introduction

Course description goes here.

### What You'll Learn

Key learning outcomes go here.