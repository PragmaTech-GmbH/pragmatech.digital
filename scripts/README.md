# PragmaTech Website Scripts

This directory contains utility scripts for the PragmaTech website.

## Image Optimization Scripts

### Convert to WebP

The `convert-to-webp.sh` script automatically converts PNG, JPG, and JPEG images to the WebP format, which provides better compression and quality for web images.

#### Prerequisites

- Install the WebP tools:
  - macOS: `brew install webp`
  - Ubuntu: `sudo apt-get install webp`

#### Usage

```bash
# Convert all images in the default directory (static/images)
./convert-to-webp.sh

# Convert images in a specific directory
./convert-to-webp.sh static/images/clients
```

The script:
- Preserves the original images
- Creates WebP versions alongside the originals
- Skips conversion if the WebP version is newer than the original
- Shows the file size difference between the original and WebP versions

## Hugo Image Processing

The website also uses Hugo's built-in image processing for:

1. **Automatic WebP conversion**: The template uses `<picture>` elements with WebP sources
2. **Responsive images**: Images are processed to appropriate sizes
3. **Lazy loading**: All images use the `loading="lazy"` attribute

### How It Works

The centralized image handling uses Hugo's powerful asset pipeline:

```html
{{ $image := resources.Get (print "images/path/to/image.jpg") }}
{{ $webp := $image.Fill "300x200 webp q90" }}
{{ $resized := $image.Fill "300x200 q90" }}

<picture>
  <source srcset="{{ $webp.RelPermalink }}" type="image/webp">
  <source srcset="{{ $resized.RelPermalink }}" type="{{ $resized.MediaType }}">
  <img 
    src="{{ $resized.RelPermalink }}" 
    alt="Description" 
    loading="lazy" 
    width="{{ $resized.Width }}"
    height="{{ $resized.Height }}">
</picture>
```

This approach ensures:
- WebP is used when supported by the browser
- Fallback formats for older browsers
- Properly sized images for different devices
- Lazy loading for better performance
- Explicit width and height to prevent layout shifts