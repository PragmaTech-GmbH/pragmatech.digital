# WebP Image Implementation Guide

This document explains the WebP image implementation for the PragmaTech Digital website.

## Overview

The website implements WebP images using a two-pronged approach:

1. **Build-time image conversion**: Original images are converted to WebP format during the build process
2. **HTML picture elements**: Proper fallback for browsers that don't support WebP

## Directory Structure

- Original images: `/static/images/`
- WebP versions: `/static/generated/` (same structure as original)

For example:
- Original: `/static/images/logo.png`
- WebP version: `/static/generated/images/logo.webp`

## How It Works

1. The `convert-to-webp.sh` script converts all JPG, PNG, and JPEG images to WebP format
2. WebP images are stored in the generated folder with the same relative path
3. The `picture.html` partial and `image` shortcode provide proper HTML structure

## Using WebP in Templates

### For template-based images

Use the `picture.html` partial:

```html
{{ partial "picture" (dict 
   "src" "/images/logo.png" 
   "alt" "Logo" 
   "class" "w-full h-auto" 
   "loading" "lazy"
) }}
```

### For content-based images in markdown

Use the `image` shortcode:

```markdown
{{< image src="/images/example.jpg" alt="Example image" class="w-full h-auto" >}}
```

## Parameters

Both the partial and shortcode accept the following parameters:

- `src`: Image path (required)
- `alt`: Alt text (required)
- `class`: CSS classes (optional)
- `width`: Width attribute (optional)
- `height`: Height attribute (optional)
- `loading`: Loading strategy (optional, defaults to "lazy")
- `sizes`: Sizes attribute for responsive images (optional)

## Build Process

The WebP conversion is integrated into the build process:

1. `npm run clean:generated` - Removes previously generated WebP images
2. `npm run optimize:images` - Converts images to WebP
3. Hugo build process - Generates the static site

## Scripts

Check `package.json` for the build scripts:

```json
"scripts": {
  "build": "npm run clean:generated && npm run optimize:images && hugo --gc --minify",
  "optimize:images": "bash scripts/convert-to-webp.sh",
  "clean:generated": "rm -rf static/generated"
}
```

## Git Considerations

The `/static/generated/` directory is excluded from Git to avoid storing generated files.

## Best Practices

1. Always provide proper alt text for accessibility
2. Use appropriate image dimensions to avoid unnecessary resizing
3. Prefer lazy loading for below-the-fold images
4. Run image optimization before committing new images

## Implementation Details

- The WebP conversion quality is set to 90% (good balance of quality and size)
- Original images are always kept as fallbacks
- The build process automatically recreates all WebP images
- Netlify headers are configured for proper caching