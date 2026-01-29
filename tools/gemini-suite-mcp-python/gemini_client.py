"""Gemini API Client wrapper for MCP tools."""

import os
import re
import json
from typing import Any, TypeVar
from google import genai
from google.genai import types

T = TypeVar('T')


class GeminiClient:
    """Client wrapper for Google Gemini API."""

    # Available models
    MODEL_PRO = 'gemini-2.0-pro-exp'   # Most powerful available
    MODEL_FLASH = 'gemini-2.0-flash'   # Fast, good for vision

    def __init__(self):
        api_key = os.environ.get('GEMINI_API_KEY')
        if not api_key:
            raise ValueError('GEMINI_API_KEY environment variable is required')
        # Debug: log key prefix
        import sys
        print(f'[DEBUG] Using API key: {api_key[:10]}...{api_key[-4:]}', file=sys.stderr)
        self.client = genai.Client(api_key=api_key)

    async def generate_pro(self, prompt: str, system_prompt: str | None = None) -> str:
        """Generate content using Gemini Pro (for complex analysis)."""
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.2,
                max_output_tokens=8192,
            )
            response = await self.client.aio.models.generate_content(
                model=self.MODEL_PRO,
                contents=prompt,
                config=config,
            )
            return response.text or ''
        except Exception as e:
            raise RuntimeError(f'Gemini API error: {e}')

    async def generate_flash(self, prompt: str, system_prompt: str | None = None) -> str:
        """Generate content using Gemini Flash (for quick tasks)."""
        try:
            config = types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.3,
                max_output_tokens=4096,
            )
            response = await self.client.aio.models.generate_content(
                model=self.MODEL_FLASH,
                contents=prompt,
                config=config,
            )
            return response.text or ''
        except Exception as e:
            raise RuntimeError(f'Gemini API error: {e}')

    async def analyze_image(
        self,
        image_base64: str,
        prompt: str,
        mime_type: str = 'image/png'
    ) -> str:
        """Analyze an image with Gemini Vision."""
        try:
            # Create inline data part
            image_part = types.Part.from_bytes(
                data=bytes.fromhex(image_base64) if all(c in '0123456789abcdefABCDEF' for c in image_base64[:20]) else __import__('base64').b64decode(image_base64),
                mime_type=mime_type,
            )
            text_part = types.Part.from_text(prompt)

            config = types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=4096,
            )

            response = await self.client.aio.models.generate_content(
                model=self.MODEL_FLASH,  # Flash is good for vision
                contents=[image_part, text_part],
                config=config,
            )
            return response.text or ''
        except Exception as e:
            raise RuntimeError(f'Gemini Vision error: {e}')

    def parse_json_response(self, response: str) -> Any:
        """Parse JSON response from Gemini."""
        if not response or response.strip() == '':
            raise ValueError('Empty response from Gemini')

        # Extract JSON from markdown code blocks if present
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)```', response)
        json_str = json_match.group(1).strip() if json_match else response.strip()

        # Try to find JSON object in the response
        start_index = json_str.find('{')
        end_index = json_str.rfind('}')

        if start_index == -1 or end_index == -1 or start_index >= end_index:
            raise ValueError(f'No valid JSON found in response: {response[:200]}')

        json_str = json_str[start_index:end_index + 1]

        try:
            return json.loads(json_str)
        except json.JSONDecodeError as e:
            raise ValueError(f'JSON parse failed: {e}. Response: {json_str[:200]}')


# Singleton instance
_instance: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """Get or create singleton GeminiClient instance."""
    global _instance
    if _instance is None:
        _instance = GeminiClient()
    return _instance
