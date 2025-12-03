"""UI/UX analyzer tool using Gemini Vision."""

import os
import sys
import base64
from typing import Literal
from gemini_client import get_gemini_client

UI_ANALYZER_SCHEMA = {
    'name': 'gemini_analyze_ui',
    'description': 'Analyze UI/UX using Gemini Vision. Accepts screenshot_base64 (preferred), screenshot_path, or url. Returns accessibility, UX, and consistency analysis.',
    'inputSchema': {
        'type': 'object',
        'properties': {
            'screenshot_base64': {
                'type': 'string',
                'description': 'Screenshot as base64 string (PREFERRED - fastest, no file I/O)',
            },
            'screenshot_path': {
                'type': 'string',
                'description': 'Path to existing screenshot file',
            },
            'url': {
                'type': 'string',
                'description': 'URL to capture (SLOW - use screenshot_base64 instead)',
            },
            'analysis_type': {
                'type': 'string',
                'enum': ['accessibility', 'ux', 'consistency', 'all'],
                'description': 'Focus area (default: all)',
            },
        },
    },
}

SYSTEM_PROMPT = """You are an expert UI/UX designer. Analyze the screenshot and return JSON:

{
  "overall_score": 0-10,
  "summary": "brief summary",
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "category": "accessibility|ux|consistency|layout|typography|color",
      "element": "element description",
      "issue": "problem",
      "recommendation": "fix"
    }
  ],
  "strengths": ["positive aspects"],
  "recommendations": ["suggestions"]
}

Focus: accessibility (contrast, sizes), UX (clarity, flows), consistency (colors, spacing).
Be concise. Max 5 issues."""


async def capture_screenshot(url: str) -> str:
    """Capture screenshot from URL using Playwright."""
    from playwright.async_api import async_playwright

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        try:
            page = await browser.new_page(viewport={'width': 1280, 'height': 720})
            await page.goto(url, wait_until='domcontentloaded', timeout=60000)
            # Wait for Angular to stabilize
            await page.wait_for_timeout(3000)
            # Take screenshot (viewport only, compressed)
            buffer = await page.screenshot(
                full_page=False,
                type='jpeg',
                quality=70
            )
            return base64.b64encode(buffer).decode('utf-8')
        finally:
            await browser.close()


async def ui_analyzer_tool(
    screenshot_base64: str | None = None,
    screenshot_path: str | None = None,
    url: str | None = None,
    analysis_type: Literal['accessibility', 'ux', 'consistency', 'all'] = 'all'
) -> dict:
    """Analyze UI/UX using Gemini Vision."""
    if not screenshot_base64 and not screenshot_path and not url:
        raise ValueError('Provide screenshot_base64, screenshot_path, or url')

    image_base64: str
    source: str
    mime_type = 'image/png'

    # Priority: base64 > path > url (fastest to slowest)
    if screenshot_base64:
        image_base64 = screenshot_base64
        source = 'base64_input'
    elif screenshot_path:
        if not os.path.exists(screenshot_path):
            raise FileNotFoundError(f'File not found: {screenshot_path}')
        with open(screenshot_path, 'rb') as f:
            image_base64 = base64.b64encode(f.read()).decode('utf-8')
        source = screenshot_path
    elif url:
        print(f'Capturing screenshot from {url}...', file=sys.stderr)
        image_base64 = await capture_screenshot(url)
        source = url
        mime_type = 'image/jpeg'
    else:
        raise ValueError('No source provided')

    # Build prompt with full instructions
    focus_map = {
        'accessibility': 'Focus on: color contrast, text sizes, touch targets.',
        'ux': 'Focus on: user flows, clarity, feedback.',
        'consistency': 'Focus on: colors, spacing, typography.',
        'all': '',
    }

    prompt = f"""You are an expert UI/UX designer. Analyze this screenshot and return ONLY valid JSON (no markdown, no explanation):

{{
  "overall_score": <number 0-10>,
  "summary": "<brief summary string>",
  "issues": [
    {{
      "severity": "<critical|high|medium|low>",
      "category": "<accessibility|ux|consistency|layout|typography|color>",
      "element": "<element description>",
      "issue": "<problem>",
      "recommendation": "<fix>"
    }}
  ],
  "strengths": ["<positive aspects>"],
  "recommendations": ["<suggestions>"]
}}

{focus_map.get(analysis_type, 'Analyze accessibility, UX, and visual consistency.')}
Be concise. Max 5 issues. Return ONLY the JSON object."""

    print('Calling Gemini Vision API...', file=sys.stderr)
    gemini = get_gemini_client()
    response = await gemini.analyze_image(image_base64, prompt, mime_type)

    # Parse response with defaults
    try:
        result = gemini.parse_json_response(response)
    except ValueError:
        return {
            'source': source,
            'analysis_type': analysis_type,
            'error': 'Failed to parse Gemini response',
            'raw_response': response[:500],
        }

    # Ensure arrays exist
    issues = result.get('issues', []) if isinstance(result.get('issues'), list) else []
    strengths = result.get('strengths', []) if isinstance(result.get('strengths'), list) else []
    recommendations = result.get('recommendations', []) if isinstance(result.get('recommendations'), list) else []

    # Filter by type if needed
    category_map = {
        'accessibility': ['accessibility'],
        'ux': ['ux', 'layout'],
        'consistency': ['consistency', 'typography', 'color'],
        'all': ['accessibility', 'ux', 'consistency', 'layout', 'typography', 'color'],
    }

    allowed_categories = category_map.get(analysis_type, category_map['all'])
    filtered_issues = [
        i for i in issues
        if i and i.get('category') and i.get('category') in allowed_categories
    ]

    return {
        'source': source,
        'analysis_type': analysis_type,
        'score': result.get('overall_score', 0),
        'summary': result.get('summary', 'No summary'),
        'issues': filtered_issues,
        'issues_count': len(filtered_issues),
        'strengths': strengths,
        'recommendations': recommendations,
    }
