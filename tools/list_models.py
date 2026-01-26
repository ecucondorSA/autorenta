import subprocess
import requests
import json

REGION = "us-east5"
PROJECT_ID = "gen-lang-client-0858183694"

def get_token():
    return subprocess.check_output(["gcloud", "auth", "print-access-token"]).decode('utf-8').strip()

def list_models():
    token = get_token()
    url = f"https://{REGION}-aiplatform.googleapis.com/v1/projects/{PROJECT_ID}/locations/{REGION}/publishers/anthropic/models"
    
    response = requests.get(url, headers={"Authorization": f"Bearer {token}"})
    if response.status_code == 200:
        models = response.json().get('publisherModels', [])
        for m in models:
            print(f"ID: {m['name'].split('/')[-1]}")
            print(f"Title: {m.get('versionConfig', {}).get('versionDisplayName', 'N/A')}")
            print("-" * 20)
    else:
        print(f"Error: {response.text}")

if __name__ == "__main__":
    list_models()
