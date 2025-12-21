#!/usr/bin/env python3
"""
Screenshot Compressor for MCP Playwright Streaming
Reduces image size by ~10x through:
- Converting PNG to JPEG
- Reducing quality (default 35%)
- Resizing large images (default max 1024px width)

Usage:
  compress-screenshot.py --input input.png --output output.jpg [--quality 35] [--max-width 1024]
  OR
  cat input.json | compress-screenshot.py  # For JSON mode (legacy)
"""

import sys
import json
import base64
import argparse
from io import BytesIO
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Installing Pillow...", file=sys.stderr)
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "Pillow", "-q"])
    from PIL import Image


def compress_image(img: Image.Image, max_width: int = 1024, quality: int = 35) -> tuple[bytes, dict]:
    """
    Compress an image to JPEG.

    Returns:
        tuple of (compressed_bytes, metadata_dict)
    """
    original_size = img.size

    # Convert RGBA to RGB (JPEG doesn't support alpha)
    if img.mode in ('RGBA', 'LA', 'P'):
        background = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'P':
            img = img.convert('RGBA')
        background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
        img = background
    elif img.mode != 'RGB':
        img = img.convert('RGB')

    # Resize if too large
    if img.width > max_width:
        ratio = max_width / img.width
        new_height = int(img.height * ratio)
        img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)

    # Compress to JPEG
    buffer = BytesIO()
    img.save(buffer, format='JPEG', quality=quality, optimize=True)
    compressed_bytes = buffer.getvalue()

    metadata = {
        "original_dimensions": f"{original_size[0]}x{original_size[1]}",
        "final_dimensions": f"{img.width}x{img.height}",
        "size_bytes": len(compressed_bytes),
    }

    return compressed_bytes, metadata


def compress_file(input_path: str, output_path: str, max_width: int = 1024, quality: int = 35) -> dict:
    """Compress an image file to JPEG."""
    img = Image.open(input_path)
    original_size_bytes = Path(input_path).stat().st_size

    compressed_bytes, metadata = compress_image(img, max_width, quality)

    # Write output
    with open(output_path, 'wb') as f:
        f.write(compressed_bytes)

    compression_ratio = original_size_bytes / len(compressed_bytes) if len(compressed_bytes) > 0 else 0

    return {
        **metadata,
        "original_size_bytes": original_size_bytes,
        "compression_ratio": f"{compression_ratio:.1f}x",
        "output_path": output_path,
    }


def compress_base64(base64_data: str, max_width: int = 1024, quality: int = 35) -> dict:
    """
    Compress a base64 PNG screenshot to a smaller JPEG.

    Returns:
        dict with compressed base64 and metadata
    """
    # Decode base64
    img_data = base64.b64decode(base64_data)
    img = Image.open(BytesIO(img_data))
    original_size = len(base64_data)

    compressed_bytes, metadata = compress_image(img, max_width, quality)
    compressed_data = base64.b64encode(compressed_bytes).decode('utf-8')

    compressed_size = len(compressed_data)
    compression_ratio = original_size / compressed_size if compressed_size > 0 else 0

    return {
        "format": "base64/jpeg",
        "size": f"{len(compressed_bytes) // 1024}KB",
        **metadata,
        "compression_ratio": f"{compression_ratio:.1f}x",
        "data": compressed_data
    }


def process_mcp_response(response: dict, max_width: int = 1024, quality: int = 35) -> dict:
    """Process MCP playwright-streaming response and compress screenshots."""
    if "data" in response and response.get("format") == "base64/png":
        return compress_base64(response["data"], max_width, quality)
    return response


def main():
    parser = argparse.ArgumentParser(description='Compress screenshots for MCP Playwright Streaming')
    parser.add_argument('--input', '-i', help='Input PNG file path')
    parser.add_argument('--output', '-o', help='Output JPEG file path')
    parser.add_argument('--quality', '-q', type=int, default=35, help='JPEG quality 1-100 (default: 35)')
    parser.add_argument('--max-width', '-w', type=int, default=1024, help='Max width in pixels (default: 1024)')
    parser.add_argument('json_file', nargs='?', help='JSON file to process (legacy mode)')

    args = parser.parse_args()

    # File-to-file mode (used by MCP server)
    if args.input and args.output:
        result = compress_file(args.input, args.output, args.max_width, args.quality)
        print(json.dumps(result), file=sys.stderr)
        return

    # JSON mode (legacy - for base64 data)
    if args.json_file:
        with open(args.json_file, 'r') as f:
            data = json.load(f)
    else:
        # Read from stdin
        data = json.load(sys.stdin)

    result = process_mcp_response(data, args.max_width, args.quality)
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
