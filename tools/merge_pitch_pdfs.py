#!/usr/bin/env python3
"""
Merge Pitch Deck PDFs
Extracts background images from original and combines with clean text from UPDATED.
"""

import fitz  # PyMuPDF
import os
from PIL import Image
import io

# Paths
ORIGINAL_PDF = "/mnt/storage/Downloads/AutoRentar-PitchDeck.pdf"
UPDATED_PDF = "/mnt/storage/Downloads/AutoRentar-PitchDeck-UPDATED.pdf"
OUTPUT_PDF = "/mnt/storage/Downloads/AutoRentar-PitchDeck-FINAL-MERGED.pdf"
IMAGES_DIR = "/home/edu/autorenta/docs/pitch/images"

def ensure_dir(path):
    os.makedirs(path, exist_ok=True)

def extract_background_images(pdf_path, output_dir):
    """Extract background images from each page of the original PDF."""
    print(f"Extracting images from {pdf_path}...")
    ensure_dir(output_dir)

    doc = fitz.open(pdf_path)
    images = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        image_list = page.get_images(full=True)

        print(f"  Page {page_num + 1}: {len(image_list)} images found")

        if image_list:
            # Get the largest image (likely the background)
            largest_img = None
            largest_size = 0

            for img_idx, img in enumerate(image_list):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]

                # Check image size
                pil_image = Image.open(io.BytesIO(image_bytes))
                size = pil_image.width * pil_image.height

                if size > largest_size:
                    largest_size = size
                    largest_img = {
                        'bytes': image_bytes,
                        'ext': base_image["ext"],
                        'width': pil_image.width,
                        'height': pil_image.height
                    }

            if largest_img and largest_size > 100000:  # Only if reasonably large
                img_path = os.path.join(output_dir, f"page_{page_num + 1:02d}.{largest_img['ext']}")
                with open(img_path, 'wb') as f:
                    f.write(largest_img['bytes'])
                images[page_num] = img_path
                print(f"    Saved: {img_path} ({largest_img['width']}x{largest_img['height']})")

    doc.close()
    return images

def render_pages_as_images(pdf_path, output_dir, dpi=150):
    """Render each page of PDF as an image (alternative approach)."""
    print(f"Rendering pages from {pdf_path}...")
    ensure_dir(output_dir)

    doc = fitz.open(pdf_path)
    images = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        # Render at higher resolution
        mat = fitz.Matrix(dpi/72, dpi/72)
        pix = page.get_pixmap(matrix=mat)

        img_path = os.path.join(output_dir, f"rendered_page_{page_num + 1:02d}.png")
        pix.save(img_path)
        images[page_num] = img_path
        print(f"  Rendered page {page_num + 1}: {pix.width}x{pix.height}")

    doc.close()
    return images

def create_merged_pdf(background_images, text_pdf_path, output_path):
    """Create new PDF with backgrounds from original and text overlay."""
    print(f"\nCreating merged PDF...")

    text_doc = fitz.open(text_pdf_path)
    output_doc = fitz.open()

    for page_num in range(len(text_doc)):
        text_page = text_doc[page_num]
        page_rect = text_page.rect

        # Create new page
        new_page = output_doc.new_page(width=page_rect.width, height=page_rect.height)

        # Add background image if available
        if page_num in background_images:
            img_path = background_images[page_num]
            if os.path.exists(img_path):
                # Insert image as background
                new_page.insert_image(page_rect, filename=img_path)
                print(f"  Page {page_num + 1}: Added background from {os.path.basename(img_path)}")

        # Copy text content from UPDATED PDF
        # This overlays the clean text on top of the background
        new_page.show_pdf_page(page_rect, text_doc, page_num)

    output_doc.save(output_path)
    output_doc.close()
    text_doc.close()

    print(f"\nSaved merged PDF to: {output_path}")

def analyze_pdfs():
    """Analyze both PDFs to understand their structure."""
    print("=" * 60)
    print("ANALYZING ORIGINAL PDF")
    print("=" * 60)

    doc = fitz.open(ORIGINAL_PDF)
    print(f"Pages: {len(doc)}")
    print(f"File size: {os.path.getsize(ORIGINAL_PDF) / 1024 / 1024:.2f} MB")

    for i in range(min(3, len(doc))):
        page = doc[i]
        images = page.get_images(full=True)
        print(f"  Page {i+1}: {len(images)} images")
    doc.close()

    print("\n" + "=" * 60)
    print("ANALYZING UPDATED PDF")
    print("=" * 60)

    doc = fitz.open(UPDATED_PDF)
    print(f"Pages: {len(doc)}")
    print(f"File size: {os.path.getsize(UPDATED_PDF) / 1024:.2f} KB")

    for i in range(min(3, len(doc))):
        page = doc[i]
        images = page.get_images(full=True)
        print(f"  Page {i+1}: {len(images)} images")
    doc.close()

def main():
    analyze_pdfs()

    print("\n" + "=" * 60)
    print("EXTRACTING BACKGROUND IMAGES")
    print("=" * 60)

    # First try to extract embedded images
    bg_images = extract_background_images(ORIGINAL_PDF, IMAGES_DIR)

    if len(bg_images) < 5:
        print("\nNot enough embedded images found. Rendering pages instead...")
        bg_images = render_pages_as_images(ORIGINAL_PDF, IMAGES_DIR, dpi=150)

    print("\n" + "=" * 60)
    print("CREATING MERGED PDF")
    print("=" * 60)

    create_merged_pdf(bg_images, UPDATED_PDF, OUTPUT_PDF)

    print("\n" + "=" * 60)
    print("DONE!")
    print("=" * 60)
    print(f"\nOutput: {OUTPUT_PDF}")
    print(f"Size: {os.path.getsize(OUTPUT_PDF) / 1024 / 1024:.2f} MB")

if __name__ == "__main__":
    main()
