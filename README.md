# PragmaTech Digital Website

The official website for PragmaTech Digital Solutions, showcasing our services, expertise, books, courses, and more.

## Quick Start

```bash
# Install dependencies and set up the project
npm run setup

# Start the development server
npm run dev
```

Visit [http://localhost:1313](http://localhost:1313) to see the site.

## Build & Deployment

This site is built with Hugo and deployed to Netlify. See [BUILD.md](BUILD.md) for detailed build documentation.

### Local Build

```bash
# Build the site with image optimization
npm run build
```

### Netlify Deployment

Deployments are automated through Netlify. The build configuration is in `netlify.toml`. Netlify automatically builds and deploys the site on push to the main branch.

## Image Optimization

The site automatically optimizes images during the build process:

1. Converts images to WebP format for better compression
2. Applies lazy loading to improve page load times
3. Creates responsive images for different device sizes

### Manual Image Optimization

```bash
# Convert images to WebP format
npm run optimize:images

# Create placeholder images for development
npm run create:placeholders
```

## Development

This site is built with:

- [Hugo](https://gohugo.io/) for static site generation
- [Tailwind CSS](https://tailwindcss.com/) for styling
- Custom layouts and partials for components

### Commands

```bash
# Development server with drafts enabled
npm run dev

# Development server with navigation to changed pages
npm run dev:watch

# Clean output directories
npm run clean

# Build for production
npm run build
```

## Project Structure

```
├── archetypes/        # Content templates
├── content/           # Content files (markdown)
├── data/              # Data files (YAML)
├── layouts/           # Hugo layouts and templates
├── public/            # Generated site (ignored in git)
├── resources/         # Generated resources (ignored in git)
├── scripts/           # Utility scripts
├── static/            # Static assets
└── themes/            # Theme files
    └── pragmatech-theme/
```

## License

Copyright © PragmaTech Digital Solutions. All rights reserved.
