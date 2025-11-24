#!/usr/bin/env python3
"""
Script to apply PBR materials to GLB models
Usage: python apply-pbr-materials.py <input.glb> <color> <metallic> <roughness>
Example: python apply-pbr-materials.py model.glb "0.2,0.4,0.8" 0.8 0.3
"""

import sys
import json
import struct
import base64
from pathlib import Path

def hex_to_rgb(hex_color):
    """Convert hex color to RGB tuple (0-1 range)"""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def parse_color(color_str):
    """Parse color from hex or RGB string"""
    if color_str.startswith('#'):
        return hex_to_rgb(color_str)
    elif ',' in color_str:
        return tuple(float(x) for x in color_str.split(','))
    else:
        # Named colors
        colors = {
            'blue': (0.2, 0.4, 0.9),
            'red': (0.8, 0.2, 0.2),
            'white': (0.95, 0.95, 0.95),
            'black': (0.1, 0.1, 0.1),
            'silver': (0.75, 0.75, 0.78),
            'grey': (0.5, 0.5, 0.5),
        }
        return colors.get(color_str.lower(), (0.8, 0.8, 0.8))

def read_glb(file_path):
    """Read GLB file and extract JSON and binary data"""
    with open(file_path, 'rb') as f:
        # Read GLB header
        magic = struct.unpack('I', f.read(4))[0]
        version = struct.unpack('I', f.read(4))[0]
        length = struct.unpack('I', f.read(4))[0]

        if magic != 0x46546C67:  # 'glTF' in ASCII
            raise ValueError("Not a valid GLB file")

        # Read JSON chunk
        json_chunk_length = struct.unpack('I', f.read(4))[0]
        json_chunk_type = struct.unpack('I', f.read(4))[0]
        json_data = f.read(json_chunk_length).decode('utf-8')

        # Read binary chunk (if exists)
        binary_data = None
        if f.tell() < length:
            bin_chunk_length = struct.unpack('I', f.read(4))[0]
            bin_chunk_type = struct.unpack('I', f.read(4))[0]
            binary_data = f.read(bin_chunk_length)

        return json.loads(json_data), binary_data

def write_glb(file_path, gltf_json, binary_data):
    """Write GLB file with JSON and binary data"""
    with open(file_path, 'wb') as f:
        json_str = json.dumps(gltf_json, separators=(',', ':'))
        json_bytes = json_str.encode('utf-8')

        # Pad JSON to 4-byte alignment
        json_padding = (4 - len(json_bytes) % 4) % 4
        json_bytes += b' ' * json_padding

        # Calculate total length
        total_length = 12  # Header
        total_length += 8 + len(json_bytes)  # JSON chunk
        if binary_data:
            bin_padding = (4 - len(binary_data) % 4) % 4
            total_length += 8 + len(binary_data) + bin_padding

        # Write header
        f.write(struct.pack('I', 0x46546C67))  # magic: 'glTF'
        f.write(struct.pack('I', 2))  # version
        f.write(struct.pack('I', total_length))

        # Write JSON chunk
        f.write(struct.pack('I', len(json_bytes)))
        f.write(struct.pack('I', 0x4E4F534A))  # 'JSON'
        f.write(json_bytes)

        # Write binary chunk
        if binary_data:
            f.write(struct.pack('I', len(binary_data) + bin_padding))
            f.write(struct.pack('I', 0x004E4942))  # 'BIN\0'
            f.write(binary_data)
            f.write(b'\0' * bin_padding)

def apply_pbr_material(gltf_json, base_color, metallic=0.8, roughness=0.3):
    """Apply PBR material to all materials in the GLTF"""

    if 'materials' not in gltf_json:
        gltf_json['materials'] = []

    # Create or update materials
    if len(gltf_json['materials']) == 0:
        # No materials exist, create one
        gltf_json['materials'].append({})

    for material in gltf_json['materials']:
        # Ensure pbrMetallicRoughness exists
        if 'pbrMetallicRoughness' not in material:
            material['pbrMetallicRoughness'] = {}

        pbr = material['pbrMetallicRoughness']

        # Set base color (RGBA)
        pbr['baseColorFactor'] = [base_color[0], base_color[1], base_color[2], 1.0]

        # Set metallic and roughness
        pbr['metallicFactor'] = metallic
        pbr['roughnessFactor'] = roughness

        # Set material properties for better rendering
        material['doubleSided'] = False
        material['alphaMode'] = 'OPAQUE'

        # Optional: Add emissive for slight glow (for metallic cars)
        if metallic > 0.5:
            material['emissiveFactor'] = [
                base_color[0] * 0.05,
                base_color[1] * 0.05,
                base_color[2] * 0.05
            ]

    return gltf_json

def main():
    if len(sys.argv) < 3:
        print("Usage: python apply-pbr-materials.py <input.glb> <color> [metallic] [roughness]")
        print("\nExamples:")
        print('  python apply-pbr-materials.py model.glb "0.2,0.4,0.9" 0.9 0.2  # Blue metallic')
        print('  python apply-pbr-materials.py model.glb "#FF0000" 0.8 0.3      # Red metallic')
        print('  python apply-pbr-materials.py model.glb blue 0.9 0.2          # Blue (named)')
        print('  python apply-pbr-materials.py model.glb silver 0.95 0.15      # Silver chrome')
        sys.exit(1)

    input_file = sys.argv[1]
    color_str = sys.argv[2]
    metallic = float(sys.argv[3]) if len(sys.argv) > 3 else 0.8
    roughness = float(sys.argv[4]) if len(sys.argv) > 4 else 0.3

    # Parse color
    base_color = parse_color(color_str)

    print(f"🎨 Applying PBR material to {input_file}")
    print(f"   Color: RGB({base_color[0]:.2f}, {base_color[1]:.2f}, {base_color[2]:.2f})")
    print(f"   Metallic: {metallic}")
    print(f"   Roughness: {roughness}")
    print()

    # Read GLB
    print("📖 Reading GLB file...")
    gltf_json, binary_data = read_glb(input_file)

    # Apply PBR material
    print("✨ Applying PBR material...")
    gltf_json = apply_pbr_material(gltf_json, base_color, metallic, roughness)

    # Generate output filename
    input_path = Path(input_file)
    output_file = str(input_path.parent / f"{input_path.stem}-pbr{input_path.suffix}")

    # Write GLB
    print(f"💾 Writing to {output_file}...")
    write_glb(output_file, gltf_json, binary_data)

    print("✅ Done!")
    print(f"📁 Output: {output_file}")

if __name__ == '__main__':
    main()
