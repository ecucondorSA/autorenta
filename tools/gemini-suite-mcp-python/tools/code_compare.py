"""Code comparison tool using Gemini AI."""

import os
from gemini_client import get_gemini_client

CODE_COMPARE_SCHEMA = {
    'name': 'gemini_compare_code',
    'description': 'Compare two versions of code using Gemini AI. Analyzes the diff for risks, improvements, and potential regressions. Accepts file paths or code strings.',
    'inputSchema': {
        'type': 'object',
        'properties': {
            'original_path': {
                'type': 'string',
                'description': 'Path to the original file',
            },
            'modified_path': {
                'type': 'string',
                'description': 'Path to the modified file',
            },
            'original_code': {
                'type': 'string',
                'description': 'Original code as string (alternative to original_path)',
            },
            'modified_code': {
                'type': 'string',
                'description': 'Modified code as string (alternative to modified_path)',
            },
        },
    },
}

SYSTEM_PROMPT = """You are an expert code reviewer analyzing a diff between two versions of code.
Compare the original and modified code and return a JSON response with:

{
  "summary": "brief summary of what changed",
  "changes": [
    {
      "type": "addition|removal|modification",
      "description": "what changed",
      "impact": "breaking|feature|fix|refactor|style"
    }
  ],
  "risks": [
    {
      "severity": "critical|high|medium|low",
      "description": "potential risk introduced",
      "mitigation": "how to mitigate this risk"
    }
  ],
  "improvements": ["positive changes in the code"],
  "regressions": ["potential regressions or bugs introduced"],
  "testing_recommendations": ["specific areas to test"],
  "approval_recommendation": "approve|request_changes|needs_discussion"
}

Focus on:
- Breaking changes to public APIs or interfaces
- Removed functionality that might be used elsewhere
- New dependencies or complexity added
- Security implications
- Performance implications
- Error handling changes
- Edge cases that might not be covered
- Backward compatibility issues

Be thorough but concise. Flag anything that needs attention before merging."""


async def code_compare_tool(
    original_path: str | None = None,
    modified_path: str | None = None,
    original_code: str | None = None,
    modified_code: str | None = None,
) -> dict:
    """Compare two versions of code using Gemini AI."""
    # Get original code
    if original_path:
        if not os.path.exists(original_path):
            raise FileNotFoundError(f'Original file not found: {original_path}')
        with open(original_path, 'r', encoding='utf-8') as f:
            original = f.read()
    elif original_code:
        original = original_code
    else:
        raise ValueError('Either original_path or original_code must be provided')

    # Get modified code
    if modified_path:
        if not os.path.exists(modified_path):
            raise FileNotFoundError(f'Modified file not found: {modified_path}')
        with open(modified_path, 'r', encoding='utf-8') as f:
            modified = f.read()
    elif modified_code:
        modified = modified_code
    else:
        raise ValueError('Either modified_path or modified_code must be provided')

    # Build the prompt
    prompt = f"""Compare these two versions of code:

## ORIGINAL CODE:
```
{original}
```

## MODIFIED CODE:
```
{modified}
```

Analyze the changes and provide your assessment as JSON."""

    # Call Gemini
    gemini = get_gemini_client()
    response = await gemini.generate_pro(prompt, SYSTEM_PROMPT)

    # Parse the response
    result = gemini.parse_json_response(response)

    # Calculate stats
    lines_original = len(original.split('\n'))
    lines_modified = len(modified.split('\n'))
    lines_diff = lines_modified - lines_original

    changes = result.get('changes', [])
    risks = result.get('risks', [])

    return {
        'files': {
            'original': original_path or '(provided as string)',
            'modified': modified_path or '(provided as string)',
        },
        'stats': {
            'lines_original': lines_original,
            'lines_modified': lines_modified,
            'lines_diff': f'+{lines_diff}' if lines_diff > 0 else str(lines_diff),
        },
        'summary': result.get('summary', ''),
        'changes': changes,
        'changes_by_type': {
            'additions': len([c for c in changes if c.get('type') == 'addition']),
            'removals': len([c for c in changes if c.get('type') == 'removal']),
            'modifications': len([c for c in changes if c.get('type') == 'modification']),
        },
        'risks': risks,
        'risk_summary': {
            'critical': len([r for r in risks if r.get('severity') == 'critical']),
            'high': len([r for r in risks if r.get('severity') == 'high']),
            'medium': len([r for r in risks if r.get('severity') == 'medium']),
            'low': len([r for r in risks if r.get('severity') == 'low']),
        },
        'improvements': result.get('improvements', []),
        'regressions': result.get('regressions', []),
        'testing_recommendations': result.get('testing_recommendations', []),
        'approval_recommendation': result.get('approval_recommendation', 'needs_discussion'),
    }
