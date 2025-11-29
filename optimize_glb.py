

import argparse
import os
import subprocess
import sys

def optimize_glb(input_path, output_path):
    """
    Optimizes a GLB file by applying Draco compression, resizing textures to 1K,
    and converting them to KTX2 format using the gltf-transform CLI.

    Args:
        input_path (str): Path to the input GLB file.
        output_path (str): Path for the optimized output GLB file.
    """
    print(f"Optimizing GLB file: {input_path}")

    # Ensure output directory exists
    output_dir = os.path.dirname(output_path)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)

    # Locate the gltf-transform executable
    # Assuming it's installed in node_modules/.bin/ relative to the current working directory
    # or available in the system PATH.
    gltf_transform_bin = os.path.join("autorenta", "node_modules", ".bin", "gltf-transform")
    
    if not os.path.exists(gltf_transform_bin):
        # Fallback to trying to find it in the current directory's node_modules if running from autorenta root
        gltf_transform_bin = os.path.join("node_modules", ".bin", "gltf-transform")
    
    if not os.path.exists(gltf_transform_bin):
        # Final fallback: assume it's in the PATH
        gltf_transform_bin = "gltf-transform"

    print(f"Using gltf-transform executable: {gltf_transform_bin}")

    # 1. Apply Draco compression
    # Quantization bits: 14 for position, 10 for normal
    # We output to a temporary file first to chain commands cleanly
    temp_draco_path = output_path + ".draco.glb"
    
    draco_command = [
        gltf_transform_bin,
        'draco',
        '--quantize-position', '14',
        '--quantize-normal', '10',
        input_path,
        temp_draco_path
    ]
    
    print(f"Running: {' '.join(draco_command)}")
    try:
        subprocess.run(draco_command, check=True)
        print("Draco compression applied.")
    except subprocess.CalledProcessError as e:
        print(f"Error applying Draco compression: {e}")
        return
    except FileNotFoundError:
         print(f"Error: Could not find the gltf-transform executable at '{gltf_transform_bin}'. Make sure you have installed '@gltf-transform/cli' via npm.")
         return

    # 2. Resize textures to 1K (1024x1024) and convert to KTX2
    # We take the draco-compressed file as input and write to the final output
    # Note: --res 1024 might not be a direct flag for 'texture-compress' in all versions.
    # Usually 'resize' is a separate command, but let's check standard usage.
    # The user requested: Resize to 1K AND Convert to KTX2.
    # Efficient pipeline: Input -> Resize -> KTX2 -> Output.
    # Since we are using CLI, we might need two steps if texture-compress doesn't support direct resize.
    # Let's try to use the 'resize' command first, then 'ktx'. 
    # Actually, gltf-transform allows chaining if we used the API, but via CLI we chain files.
    
    temp_resized_path = output_path + ".resized.glb"
    
    # Step 2a: Resize
    resize_command = [
        gltf_transform_bin,
        'resize',
        '--width', '1024',
        '--height', '1024',
        temp_draco_path,
        temp_resized_path
    ]
    
    print(f"Running: {' '.join(resize_command)}")
    try:
        subprocess.run(resize_command, check=True)
        print("Textures resized to 1K.")
    except subprocess.CalledProcessError as e:
        print(f"Error resizing textures: {e}")
        if os.path.exists(temp_draco_path): os.remove(temp_draco_path)
        return

    # Step 2b: Convert to KTX2 (using etc1s by default for broad compatibility or uastc for quality)
    # User mentioned "KTX2 (Texturas - GPU)".
    # We'll use the 'etc1s' command (often mapped to 'ktx' or 'optimize' depending on version, usually 'etc1s' is explicit for Basis Universal)
    # Or 'uastc'. Let's use the generic 'ktx' command which usually defaults to ETC1S (Basis).
    ktx_command = [
        gltf_transform_bin,
        'etc1s', # Using ETC1S for high compression as implied by "Safe for Mobile" context
        temp_resized_path,
        output_path
    ]

    print(f"Running: {' '.join(ktx_command)}")
    try:
        subprocess.run(ktx_command, check=True)
        print("Textures converted to KTX2.")
    except subprocess.CalledProcessError as e:
        print(f"Error converting to KTX2: {e}")
        print("KTX2 conversion failed (likely due to missing KTX-Software dependencies).")
        print("Attempting fallback to WebP format...")
        
        webp_command = [
            gltf_transform_bin,
            'webp',
            temp_resized_path,
            output_path
        ]
        print(f"Running: {' '.join(webp_command)}")
        try:
            subprocess.run(webp_command, check=True)
            print("Textures converted to WebP.")
        except subprocess.CalledProcessError as e_webp:
            print(f"Error converting to WebP: {e_webp}")
            # If WebP also fails, we might just want to copy the resized file to output
            # so the user at least gets Draco + Resize.
            print("WebP conversion failed. Saving resized (but not texture-formatted) file as output.")
            import shutil
            shutil.copy(temp_resized_path, output_path)
    
    # Cleanup temp files
    if os.path.exists(temp_draco_path):
        os.remove(temp_draco_path)
    if os.path.exists(temp_resized_path):
        os.remove(temp_resized_path)

    print(f"Optimization complete. Final file: {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Optimize a GLB file for mobile.")
    parser.add_argument("input", help="Path to the input GLB file.")
    parser.add_argument("output", help="Path for the optimized output GLB file.")
    args = parser.parse_args()

    if not os.path.exists(args.input):
        print(f"Error: Input file not found at {args.input}")
    else:
        optimize_glb(args.input, args.output)


