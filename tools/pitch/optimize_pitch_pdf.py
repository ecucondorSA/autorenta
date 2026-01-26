#!/usr/bin/env python3
"""
Optimize and improve Pitch Deck PDF
Creates a better merged version with darkened backgrounds.
"""

import fitz  # PyMuPDF
import os
from PIL import Image, ImageEnhance, ImageFilter
import io

# Paths
IMAGES_DIR = "/home/edu/autorenta/docs/pitch/images"
UPDATED_PDF = "/mnt/storage/Downloads/AutoRentar-PitchDeck-UPDATED.pdf"
OUTPUT_PDF = "/mnt/storage/Downloads/AutoRentar-PitchDeck-UPDATED.pdf"  # Overwrite

def darken_and_compress_image(input_path, darkness=0.35, blur=2):
    """
    Darken an image and compress it.
    darkness: 0.0 = black, 1.0 = original brightness
    """
    img = Image.open(input_path)

    # Convert to RGB if necessary
    if img.mode in ('RGBA', 'P'):
        img = img.convert('RGB')

    # Apply slight blur to soften the underlying text
    if blur > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur))

    # Darken the image
    enhancer = ImageEnhance.Brightness(img)
    img = enhancer.enhance(darkness)

    # Compress and save to bytes
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG', quality=75, optimize=True)
    buffer.seek(0)

    return buffer.getvalue(), img.width, img.height

def create_optimized_pdf():
    """Create optimized PDF with darkened backgrounds."""
    print("Creating optimized PDF with darkened backgrounds...")

    text_doc = fitz.open(UPDATED_PDF)
    output_doc = fitz.open()

    # Get list of available background images
    bg_files = sorted([f for f in os.listdir(IMAGES_DIR) if f.startswith('page_')])
    print(f"Found {len(bg_files)} background images")

    for page_num in range(len(text_doc)):
        text_page = text_doc[page_num]
        page_rect = text_page.rect

        # Create new page
        new_page = output_doc.new_page(width=page_rect.width, height=page_rect.height)

        # Try to find corresponding background
        bg_file = f"page_{page_num + 1:02d}.png"
        bg_path = os.path.join(IMAGES_DIR, bg_file)

        if os.path.exists(bg_path):
            try:
                # Darken and compress the background
                img_data, width, height = darken_and_compress_image(bg_path, darkness=0.25, blur=3)

                # Insert darkened background
                new_page.insert_image(page_rect, stream=img_data)
                print(f"  Page {page_num + 1}: Added darkened background")
            except Exception as e:
                print(f"  Page {page_num + 1}: Error with background - {e}")
        else:
            print(f"  Page {page_num + 1}: No background image, using original")

        # Overlay the clean text from UPDATED
        new_page.show_pdf_page(page_rect, text_doc, page_num)

    # Save with compression
    output_doc.save(
        OUTPUT_PDF,
        garbage=4,  # Maximum cleanup
        deflate=True,  # Compress streams
        clean=True  # Clean up unused objects
    )

    output_doc.close()
    text_doc.close()

    size_mb = os.path.getsize(OUTPUT_PDF) / 1024 / 1024
    print(f"\nSaved to: {OUTPUT_PDF}")
    print(f"Size: {size_mb:.2f} MB")

def main():
    create_optimized_pdf()
    print("\nDone!")

if __name__ == "__main__":
    main()
