#!/bin/bash

# Create placeholder images for case studies
# This is a helper script to create placeholder images for missing files

# Create case studies directory if it doesn't exist
mkdir -p static/images/case-studies

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