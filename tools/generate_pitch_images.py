#!/usr/bin/env python3
"""
Generate images for AutoRentar Pitch Deck V14 using Gemini API (google-genai)
"""

import os
from pathlib import Path
from google import genai
from google.genai import types

# Configure API
# Using the key found in the original file or environment variable
API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyCJIdveA5iCElCbfkBC9gXv24VktHRjftU')

# Create client
client = genai.Client(api_key=API_KEY)

# Output directory
OUTPUT_DIR = Path('/home/edu/autorenta/docs/pitch/images')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Common style for UI screens
STYLE_SUFFIX = " High fidelity UI design, mobile app screen, dark mode #111111 background, neon green #00CC66 accents, clean typography, modern fintech aesthetic, 8k resolution, highly detailed, flat design."

# Image prompts for pitch deck V14
PROMPTS = {
    "ui_1_discovery": f"""
    Mobile app map interface showing Buenos Aires streets in dark mode. Bright green location pins scattered. A bottom card overlay shows a white Toyota Corolla, 'Premium Sedan', '$45/day'. Clean sans-serif text. {STYLE_SUFFIX}
    """,

    "ui_2_booking": f"""
    Mobile app booking summary screen. Dark background. Header 'Reservation Confirmed' in green. Central card showing car thumbnail, dates 'Jan 12 - Jan 15', Total '$135'. Bottom button 'Open Wallet'. Minimalist. {STYLE_SUFFIX}
    """,

    "ui_3_wallet": f"""
    Mobile app wallet dashboard. Dark mode. Large text '$1,250.00' in white. Green graph line going up. List of 'Recent Transactions' below. 'Add Funds' button in green. Fintech style. {STYLE_SUFFIX}
    """,

    "ui_4_preauth": f"""
    Mobile app security deposit screen. Dark mode. A shield icon with a checkmark. Text 'Pre-authorization Active'. Amount '$500.00' in grey. 'Funds on hold' status. Secure and clean design. {STYLE_SUFFIX}
    """,

    "ui_5_kyc": f"""
    Mobile app selfie verification screen. A user's face (photorealistic) framed by a green oval scanner line. Text 'Verifying Identity...'. Dark background with tech grid overlay. Biometric style. {STYLE_SUFFIX}
    """,

    "ui_6_inspection": f"""
    Mobile app video recording screen. View of a car bumper. Augmented Reality (AR) overlay: a bounding box detecting a scratch. Tag 'Minor Scratch Detected'. Recording timer 00:15. Tech interface. {STYLE_SUFFIX}
    """,

    "team_founders": """
    Professional headshot of two tech co-founders standing together. One is a software engineer (30s, smart casual), the other is an operations expert (30s, smart casual). Modern office background with glass and tech vibes. Confident, trustworthy, visionary. 8k resolution, cinematic lighting.
    """
}

def generate_image(prompt_name: str, prompt: str):
    """Generate an image using Gemini's Imagen model"""
    print(f"\n{'='*50}")
    print(f"Generating: {prompt_name}")
    print(f"{'='*50}")

    # Determine aspect ratio based on prompt type
    aspect_ratio = "9:16" if prompt_name.startswith("ui_") else "16:9"

    try:
        response = client.models.generate_images(
            model='imagen-3.0-generate-001',
            prompt=prompt.strip(),
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio=aspect_ratio,
                output_mime_type="image/png"
            )
        )

        if response.generated_images:
            image = response.generated_images[0]
            output_path = OUTPUT_DIR / f"{prompt_name}.png"

            # Save the image data directly
            with open(output_path, 'wb') as f:
                f.write(image.image.image_bytes)

            print(f"Saved: {output_path}")
            print(f"Size: {output_path.stat().st_size / 1024:.1f} KB")
            return True
        else:
            print(f"No images generated for {prompt_name}")
            return False

    except Exception as e:
        print(f"Error generating {prompt_name}: {type(e).__name__}: {e}")
        # Fallback to fast model if 3.0 fails or is not available
        try:
            print("Retrying with fast model...")
            response = client.models.generate_images(
                model='imagen-4.0-fast-generate-001',
                prompt=prompt.strip(),
                config=types.GenerateImagesConfig(
                    number_of_images=1,
                    aspect_ratio=aspect_ratio,
                    output_mime_type="image/png"
                )
            )
            if response.generated_images:
                image = response.generated_images[0]
                output_path = OUTPUT_DIR / f"{prompt_name}.png"
                with open(output_path, 'wb') as f:
                    f.write(image.image.image_bytes)
                print(f"Saved (Fast Model): {output_path}")
                return True
        except Exception as e2:
            print(f"Fallback failed: {e2}")
            return False

def main():
    print("AutoRentar Pitch Deck V14 Image Generator")
    print("="*50)
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Images to generate: {len(PROMPTS)}")

    # Install google-genai if missing (basic check)
    try:
        import google.genai
    except ImportError:
        print("Installing google-genai...")
        os.system("pip install google-genai")

    success_count = 0
    for name, prompt in PROMPTS.items():
        if generate_image(name, prompt):
            success_count += 1

    print(f"\n{'='*50}")
    print(f"Generation complete: {success_count}/{len(PROMPTS)} images")
    print(f"Output: {OUTPUT_DIR}")

if __name__ == "__main__":
    main()