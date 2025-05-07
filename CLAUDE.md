# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Use Case

This repository contains the corporate website for the company PragmaTech GmbH with the slogan "Build & Ship Software w/ Confidence" and "Cut through testing complexity and slow builds for faster feedback and fearless shipping".

It's used to showcase the company's services, blog posts, and other content related to software development and testing.

## Build Commands
- `hugo` - Build the site
- `hugo serve` - Start development server with live reload
- `hugo serve -D` - Start development server including draft content

## CSS/Styling
- Use Tailwind CSS for styling (v4.1.4)
- Follow BEM naming convention for custom CSS classes
- Use `@apply` for component styles in `themes/pragmatech-theme/assets/css/styles.css`
- Maintain the defined color scheme in theme variables

## HTML Structure
- Use semantic HTML5 elements
- Maintain existing component structure in layouts
- Follow the established header/footer pattern across templates

## JavaScript
- Keep scripts minimal and focused on UI interactions
- Event handlers should be in DOMContentLoaded listeners
- Use ES6+ syntax when possible

## Content
- Create new content in the `/content` directory
- Follow the established frontmatter format for each content type
- Image assets should be placed in `/static/images/`

## Git Workflow
- Create feature branches from `main`
- Use descriptive commit messages
- Reference related issues in commits when applicable
