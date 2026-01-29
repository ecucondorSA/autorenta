#!/usr/bin/env python3
"""
Sora 2 Video Generator - Official API
Uses OpenAI's official Sora 2 API for video generation.

Requirements:
    pip install openai

Usage:
    export OPENAI_API_KEY="sk-..."
    python sora_api.py --prompt "Your video prompt" --output output.mp4

Available Models:
    - sora-2: Faster results for iterative design
    - sora-2-pro: Higher fidelity production quality
"""

import asyncio
import argparse
import os
import sys
import time
from pathlib import Path
import httpx

try:
    from openai import OpenAI
except ImportError:
    print("❌ OpenAI SDK not installed. Run: pip install openai")
    sys.exit(1)


class SoraAPIGenerator:
    """Generate videos using OpenAI's Sora 2 API."""
    
    def __init__(self, api_key: str = None, model: str = "sora-2"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY required")
            
        self.client = OpenAI(api_key=self.api_key)
        self.model = model
        
    def generate_video(
        self,
        prompt: str,
        duration: int = 10,
        resolution: str = "1080p",
        aspect_ratio: str = "16:9"
    ) -> dict:
        """
        Generate a video from text prompt.
        
        Args:
            prompt: Description of the video to generate
            duration: Video length in seconds (5-25)
            resolution: "720p", "1080p", or "4k"
            aspect_ratio: "16:9", "9:16", "1:1"
            
        Returns:
            dict with video URL and metadata
        """
        print(f"🎬 Generating video with {self.model}...")
        print(f"   Prompt: {prompt[:80]}...")
        print(f"   Duration: {duration}s | Resolution: {resolution} | Ratio: {aspect_ratio}")
        
        try:
            # Create video generation job
            response = self.client.videos.generate(
                model=self.model,
                prompt=prompt,
                size=f"{aspect_ratio}",
                duration=duration,
            )
            
            job_id = response.id
            print(f"✅ Job created: {job_id}")
            
            # Poll for completion
            return self._wait_for_completion(job_id)
            
        except Exception as e:
            print(f"❌ Error: {e}")
            raise
            
    def _wait_for_completion(self, job_id: str, timeout: int = 600) -> dict:
        """Wait for video generation to complete."""
        start_time = time.time()
        last_status = None
        
        while time.time() - start_time < timeout:
            try:
                status = self.client.videos.retrieve(job_id)
                
                if status.status != last_status:
                    last_status = status.status
                    progress = getattr(status, 'progress', 0) or 0
                    print(f"   Status: {status.status} ({progress}%)")
                    
                if status.status == "completed":
                    return {
                        "id": job_id,
                        "status": "completed",
                        "video_url": status.video_url,
                        "duration": status.duration,
                    }
                elif status.status == "failed":
                    raise Exception(f"Generation failed: {status.error}")
                    
            except Exception as e:
                if "not found" not in str(e).lower():
                    raise
                    
            time.sleep(5)
            
        raise TimeoutError("Video generation timed out")
        
    def download_video(self, video_url: str, output_path: str) -> str:
        """Download generated video to file."""
        print(f"📥 Downloading video...")
        
        with httpx.Client() as client:
            response = client.get(video_url, follow_redirects=True)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
                
        size_mb = Path(output_path).stat().st_size / (1024 * 1024)
        print(f"✅ Downloaded: {output_path} ({size_mb:.1f} MB)")
        return output_path


def main():
    parser = argparse.ArgumentParser(description="Generate videos with Sora 2 API")
    parser.add_argument("--prompt", "-p", required=True, help="Video prompt")
    parser.add_argument("--output", "-o", default="sora_video.mp4", help="Output file")
    parser.add_argument("--duration", "-d", type=int, default=10, help="Duration (5-25s)")
    parser.add_argument("--model", "-m", default="sora-2", choices=["sora-2", "sora-2-pro"])
    parser.add_argument("--resolution", "-r", default="1080p", choices=["720p", "1080p", "4k"])
    parser.add_argument("--ratio", default="16:9", choices=["16:9", "9:16", "1:1"])
    
    args = parser.parse_args()
    
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("❌ Set OPENAI_API_KEY environment variable")
        print("   Get your API key from: https://platform.openai.com/api-keys")
        sys.exit(1)
        
    generator = SoraAPIGenerator(api_key=api_key, model=args.model)
    
    # Generate video
    result = generator.generate_video(
        prompt=args.prompt,
        duration=args.duration,
        resolution=args.resolution,
        aspect_ratio=args.ratio
    )
    
    print(f"\n🎥 Video URL: {result['video_url']}")
    
    # Download
    generator.download_video(result['video_url'], args.output)
    print(f"\n✅ Video saved: {args.output}")


if __name__ == "__main__":
    main()
