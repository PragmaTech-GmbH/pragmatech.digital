#!/bin/bash

# Convert PNG, JPG, and JPEG images to WebP and save to generated folder
# Usage: ./convert-to-webp.sh [directory]

# Default directory is static/images if not specified
SRC_DIR=${1:-"static/images"}
# Output directory for WebP images
GEN_DIR="static/generated/images"

# Check if cwebp is installed
if ! command -v cwebp &> /dev/null; then
    echo "Error: cwebp is not installed. Please install it first."
    echo "On macOS: brew install webp"
    echo "On Ubuntu: sudo apt-get install webp"
    exit 1
fi

# Create generated directory if it doesn't exist
mkdir -p "$GEN_DIR"

# Function to convert a file to WebP
convert_to_webp() {
    local input_file=$1
    local rel_path=${input_file#"$SRC_DIR/"}
    local dirname=$(dirname "$rel_path")
    local filename=$(basename -- "$input_file")
    local extension="${filename##*.}"
    local basename="${filename%.*}"
    
    # Create output directory structure
    local output_dir="$GEN_DIR/$dirname"
    mkdir -p "$output_dir"
    
    local output_file="$output_dir/$basename.webp"
    
    # Skip if WebP version already exists and is newer
    if [ -f "$output_file" ] && [ "$output_file" -nt "$input_file" ]; then
        echo "Skipping $input_file (WebP version is up to date)"
        return
    fi
    
    # Convert to WebP
    echo "Converting $input_file to WebP..."
    cwebp -q 90 "$input_file" -o "$output_file"
    
    if [ $? -eq 0 ]; then
        # Get file sizes for comparison
        original_size=$(du -h "$input_file" | cut -f1)
        webp_size=$(du -h "$output_file" | cut -f1)
        echo "✅ Converted: $input_file ($original_size) -> $output_file ($webp_size)"
    else
        echo "❌ Error converting $input_file to WebP"
    fi
}

# Find all PNG, JPG, and JPEG files and convert them
find "$SRC_DIR" -type f \( -iname "*.png" -o -iname "*.jpg" -o -iname "*.jpeg" \) | while read file; do
    convert_to_webp "$file"
done

echo "Conversion completed! WebP images stored in $GEN_DIR"
