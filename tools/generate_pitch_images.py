#!/usr/bin/env python3
"""
Generate images for AutoRentar Pitch Deck using Gemini API (google-genai)
"""

import os
from pathlib import Path
from google import genai
from google.genai import types

# Configure API
API_KEY = os.environ.get('GEMINI_API_KEY', 'AIzaSyCJIdveA5iCElCbfkBC9gXv24VktHRjftU')

# Create client
client = genai.Client(api_key=API_KEY)

# Output directory
OUTPUT_DIR = Path('/home/edu/autorenta/docs/pitch/images')
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Image prompts for pitch deck
PROMPTS = {
    "hero_car": """
    Photorealistic image of a modern premium sedan car parked on a vibrant
    Buenos Aires street at golden hour sunset. The car has subtle neon green
    accent lighting. Modern Latin American city backdrop with colonial and
    contemporary architecture. Professional automotive photography style,
    cinematic lighting. The mood conveys trust, innovation, and shared mobility.
    """,

    "owner_happy": """
    Photorealistic image of a happy professional person in their 30s standing
    next to their car with a smartphone showing earnings. Warm, trustworthy
    expression. Urban residential background. Natural lighting, lifestyle
    photography style. Conveys passive income and satisfaction from car sharing.
    """,

    "renter_keys": """
    Photorealistic close-up of hands exchanging car keys between two people.
    Modern car visible in background. Professional, clean aesthetic.
    Natural lighting. Represents peer-to-peer car sharing transaction moment.
    Trust and connection between people.
    """,

    "app_dashboard": """
    Modern smartphone mockup displaying a car rental app dashboard.
    Dark theme UI with bright green accents. Shows car listings, map with
    location pins, booking calendar, and earnings graph. Clean, minimalist
    fintech design. 3D render style with subtle shadows. Tech startup aesthetic.
    """,

    "verification": """
    Futuristic biometric verification concept. Face scan with digital overlay,
    fingerprint recognition visualization. Blue and green tech colors on dark
    background. Conveys security, trust, and modern technology.
    Abstract tech-illustration style. Digital identity verification.
    """,

    "latam_expansion": """
    Stylized digital map visualization of South America highlighting Argentina,
    Brazil, Uruguay and Ecuador. Glowing green connection lines between major
    cities. Dark background with luminous nodes. Modern data visualization
    infographic style. Shows business expansion and regional connectivity.
    """
}

def generate_image(prompt_name: str, prompt: str):
    """Generate an image using Gemini's Imagen model"""
    print(f"\n{'='*50}")
    print(f"Generating: {prompt_name}")
    print(f"{'='*50}")

    try:
        response = client.models.generate_images(
            model='imagen-4.0-fast-generate-001',
            prompt=prompt.strip(),
            config=types.GenerateImagesConfig(
                number_of_images=1,
                aspect_ratio="16:9",
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
        return False

def main():
    print("AutoRentar Pitch Deck Image Generator")
    print("="*50)
    print(f"Output directory: {OUTPUT_DIR}")
    print(f"Images to generate: {len(PROMPTS)}")

    success_count = 0
    for name, prompt in PROMPTS.items():
        if generate_image(name, prompt):
            success_count += 1

    print(f"\n{'='*50}")
    print(f"Generation complete: {success_count}/{len(PROMPTS)} images")
    print(f"Output: {OUTPUT_DIR}")

    # List generated images
    if success_count > 0:
        print("\nGenerated files:")
        for f in OUTPUT_DIR.glob("*.png"):
            print(f"  - {f.name} ({f.stat().st_size / 1024:.1f} KB)")

if __name__ == "__main__":
    main()
