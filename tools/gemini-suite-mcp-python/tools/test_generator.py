"""Test generator tool using Gemini AI."""

import os
from typing import Literal
from gemini_client import get_gemini_client

TEST_GENERATOR_SCHEMA = {
    'name': 'gemini_generate_tests',
    'description': 'Generate tests using Gemini AI. Creates unit, e2e, or integration tests for the given file. Supports Jasmine, Jest, and Playwright.',
    'inputSchema': {
        'type': 'object',
        'properties': {
            'file_path': {
                'type': 'string',
                'description': 'Absolute path to the file to generate tests for',
            },
            'test_type': {
                'type': 'string',
                'enum': ['unit', 'e2e', 'integration'],
                'description': 'Type of tests to generate (default: unit)',
            },
            'framework': {
                'type': 'string',
                'enum': ['jasmine', 'jest', 'playwright', 'auto'],
                'description': 'Testing framework to use (default: auto-detect)',
            },
        },
        'required': ['file_path'],
    },
}

SYSTEM_PROMPT_UNIT = """You are an expert test engineer. Generate comprehensive unit tests for the provided code.

Return a JSON response with:
{
  "framework": "detected or specified framework",
  "test_file_name": "suggested test file name",
  "test_code": "complete test file code as a string",
  "test_cases": [
    {
      "name": "test case name",
      "description": "what this test verifies",
      "type": "happy_path|edge_case|error_handling|boundary"
    }
  ],
  "coverage_areas": ["list of functions/methods covered"],
  "setup_required": ["any setup steps needed"]
}

Guidelines:
- Use describe/it blocks for organization
- Include happy path, edge cases, and error scenarios
- Mock external dependencies
- Test public methods and observable behavior
- Include async test patterns where needed
- Add meaningful assertions
- For Angular: use TestBed, inject services, mock HTTP calls"""

SYSTEM_PROMPT_E2E = """You are an expert test engineer. Generate Playwright E2E tests for the provided Angular component/page.

Return a JSON response with:
{
  "framework": "playwright",
  "test_file_name": "suggested test file name (*.spec.ts)",
  "test_code": "complete Playwright test file code",
  "test_cases": [
    {
      "name": "test case name",
      "description": "what this test verifies",
      "type": "happy_path|edge_case|error_handling|boundary"
    }
  ],
  "coverage_areas": ["user flows covered"],
  "setup_required": ["any setup steps needed"]
}

Guidelines:
- Use page.locator() with data-testid selectors when possible
- Include page.waitForLoadState() for navigation
- Test user flows end-to-end
- Include form interactions, navigation, assertions
- Use test.describe for grouping related tests
- Add screenshot on failure
- Mock API calls with page.route() when needed"""


async def test_generator_tool(
    file_path: str,
    test_type: Literal['unit', 'e2e', 'integration'] = 'unit',
    framework: Literal['jasmine', 'jest', 'playwright', 'auto'] = 'auto'
) -> dict:
    """Generate tests using Gemini AI."""
    # Check if file exists
    if not os.path.exists(file_path):
        raise FileNotFoundError(f'File not found: {file_path}')

    # Read file content
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    file_name = os.path.basename(file_path)

    # Auto-detect framework
    detected_framework = framework
    if framework == 'auto':
        if test_type == 'e2e':
            detected_framework = 'playwright'
        elif '.component.' in file_path or '.service.' in file_path:
            detected_framework = 'jasmine'  # Angular default
        else:
            detected_framework = 'jest'

    # Select appropriate system prompt
    system_prompt = SYSTEM_PROMPT_E2E if test_type == 'e2e' else SYSTEM_PROMPT_UNIT

    # Build the prompt
    prompt = f"""Generate {test_type} tests using {detected_framework} for this file: {file_name}

File path: {file_path}

```typescript
{code}
```

Provide complete, runnable test code as JSON."""

    # Call Gemini
    gemini = get_gemini_client()
    response = await gemini.generate_pro(prompt, system_prompt)

    # Parse the response
    result = gemini.parse_json_response(response)

    test_cases = result.get('test_cases', [])

    return {
        'file': file_path,
        'test_type': test_type,
        'test_file_name': result.get('test_file_name', ''),
        'framework': result.get('framework', detected_framework),
        'test_code': result.get('test_code', ''),
        'test_cases': test_cases,
        'test_cases_count': len(test_cases),
        'coverage_areas': result.get('coverage_areas', []),
        'setup_required': result.get('setup_required', []),
        'suggestion': f"Save to: {file_path.replace('.ts', '.spec.ts')}",
    }
