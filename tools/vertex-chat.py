#!/usr/bin/env python3
import os
import sys
import json
import logging
import subprocess
import requests

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Constants
REGION = "us-east5"
PROJECT_ID = "gen-lang-client-0858183694"
MODEL_ID = "claude-sonnet-4-5@20250929"   # Claude 4.5 Sonnet (Released Sept 2025)

def get_access_token():
    """Get Google Cloud access token using gcloud CLI."""
    try:
        result = subprocess.run(
            ["gcloud", "auth", "print-access-token"],
            capture_output=True,
            text=True,
            check=True
        )
        return result.stdout.strip()
    except subprocess.CalledProcessError as e:
        logger.error(f"Error getting access token: {e.stderr}")
        sys.exit(1)

def chat_with_vertex(prompt):
    """Send a chat message to Vertex AI."""
    token = get_access_token()
    
    url = f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/anthropic/models/{MODEL_ID}:streamRawPredict"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8"
    }
    
    # Claude 3.5 Sonnet Message API format
    data = {
        "anthropic_version": "vertex-2023-10-16",
        "messages": [
            {
                "role": "user",
                "content": prompt
            }
        ],
        "max_tokens": 4096,
        "stream": True
    }
    
    try:
        print(f"\n🤖 \033[1mClaude 3.5 Sonnet ({REGION})\033[0m connecting...\n")
        response = requests.post(url, headers=headers, json=data, stream=True)
        
        if response.status_code != 200:
            logger.error(f"API Error {response.status_code}: {response.text}")
            return

        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("data: "):
                    event_data = decoded_line[6:] # Strip "data: "
                    if event_data == "[DONE]":
                        break
                    
                    try:
                        json_data = json.loads(event_data)
                        if "delta" in json_data:
                            # Handling different delta types
                            delta = json_data["delta"]
                            if "text" in delta:
                                print(delta["text"], end="", flush=True)
                            elif "type" in delta and delta["type"] == "text_delta":
                                print(delta["text"], end="", flush=True)
                                
                    except json.JSONDecodeError:
                        pass
        print("\n") # End with a newline

    except Exception as e:
        logger.error(f"Request failed: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 vertex-chat.py \"Your message here\" [model_id]")
        sys.exit(1)
    
    prompt = sys.argv[1]
    if len(sys.argv) > 2:
        MODEL_ID = sys.argv[2]
        print(f"Overriding model ID to: {MODEL_ID}")
        
    chat_with_vertex(prompt)
