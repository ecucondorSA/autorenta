
import torch
import argparse
from diffusers import ShapEPipeline
from diffusers.utils import export_to_ply

def generate_3d_model(prompt, output_path):
    """
    Generates a 3D model from a text prompt using OpenAI's Shap-E model
    and saves it as a .ply file.
    """
    print("--> Checking for available device (GPU/CPU)...")
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"    Using device: {device}")

    print("--> Loading the Shap-E pipeline...")
    # Using variant="fp16" and torch_dtype=torch.float16 for better performance on compatible GPUs.
    # If you are on a CPU or non-T4/A100 GPU, you might need to remove these arguments.
    pipe = ShapEPipeline.from_pretrained(
        "openai/shap-e"
    )
    pipe = pipe.to(device)
    print("    Pipeline loaded successfully.")

    # Generation parameters
    guidance_scale = 15.0
    num_inference_steps = 64
    
    print(f"--> Starting 3D model generation for prompt: '{prompt}'")
    print("    This may take a few minutes...")
    
    output = pipe(
        prompt,
        guidance_scale=guidance_scale,
        num_inference_steps=num_inference_steps,
        output_type="mesh",
    )
    
    # The output is a list of meshes, we'll take the first one.
    mesh = output.images[0]
    print("    Generation complete.")

    print(f"--> Exporting model to {output_path}...")
    # export_to_ply returns a tuple, the first element is the path
    saved_path = export_to_ply(mesh, output_path)
    print(f"    Successfully saved model to: {saved_path[0]}")

    return saved_path[0]

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate a 3D model from a text prompt using Shap-E.")
    parser.add_argument("prompt", type=str, help="The text prompt describing the 3D model to generate.")
    parser.add_argument(
        "--output",
        "-o",
        type=str,
        default="output.ply",
        help="The path to save the output .ply file. Defaults to 'output.ply'."
    )

    args = parser.parse_args()

    try:
        generate_3d_model(args.prompt, args.output)
    except Exception as e:
        print(f"\nAn error occurred: {e}")
        print("Please ensure you have installed all required packages and that your system has enough memory.")
        print("If you are on a CPU or a GPU with low VRAM, model generation may fail.")

    
