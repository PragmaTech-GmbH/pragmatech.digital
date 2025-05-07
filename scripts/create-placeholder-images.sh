#!/bin/bash

# Create placeholder images for case studies
# This is a helper script to create placeholder images for missing files

# Create case studies directory if it doesn't exist
mkdir -p static/images/case-studies

# Check if convert (ImageMagick) is installed
if ! command -v convert &> /dev/null; then
    echo "Warning: ImageMagick is not installed. Skipping placeholder image creation."
    echo "On macOS: brew install imagemagick"
    echo "On Ubuntu: sudo apt-get install imagemagick"
    echo "Checking if images already exist..."
    
    # Create empty files if they don't exist
    for img in microservices-build-pipeline healthtech-startup banking-build-time; do
        if [ ! -f "static/images/case-studies/$img.jpg" ]; then
            echo "Warning: $img.jpg doesn't exist. Site build may fail without this image."
        fi
    done
    
    exit 0
fi

# Create placeholder images
convert -size 1200x630 canvas:white \
    -gravity center \
    -pointsize 50 \
    -annotate 0 "Microservices Build Pipeline" \
    static/images/case-studies/microservices-build-pipeline.jpg

convert -size 1200x630 canvas:white \
    -gravity center \
    -pointsize 50 \
    -annotate 0 "HealthTech Startup" \
    static/images/case-studies/healthtech-startup.jpg

convert -size 1200x630 canvas:white \
    -gravity center \
    -pointsize 50 \
    -annotate 0 "Banking Build Time" \
    static/images/case-studies/banking-build-time.jpg

echo "Placeholder images created successfully!"