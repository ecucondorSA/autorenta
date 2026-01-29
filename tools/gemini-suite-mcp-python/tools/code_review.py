"""Code review tool using Gemini AI."""

import os
from typing import Literal
from gemini_client import get_gemini_client

CODE_REVIEW_SCHEMA = {
    'name': 'gemini_code_review',
    'description': 'Review code using Gemini AI. Analyzes for security issues, performance problems, style violations, and potential bugs. Returns structured feedback with severity levels.',
    'inputSchema': {
        'type': 'object',
        'properties': {
            'file_path': {
                'type': 'string',
                'description': 'Absolute path to the file to review',
            },
            'context': {
                'type': 'string',
                'description': 'Additional context about the code purpose (optional)',
            },
            'focus': {
                'type': 'string',
                'enum': ['security', 'performance', 'style', 'bugs', 'all'],
                'description': 'Focus area for the review (default: all)',
            },
        },
        'required': ['file_path'],
    },
}

SYSTEM_PROMPT = """You are an expert code reviewer with deep knowledge of security, performance, and best practices.
Analyze the provided code and return a JSON response with the following structure:

{
  "language": "detected programming language",
  "score": 0-10 (overall code quality score),
  "summary": "brief summary of the code quality",
  "issues": [
    {
      "severity": "critical|high|medium|low|info",
      "category": "security|performance|style|bug|maintainability",
      "line": line_number_or_null,
      "message": "description of the issue",
      "suggestion": "how to fix it"
    }
  ],
  "strengths": ["list of positive aspects of the code"]
}

Focus areas:
- Security: SQL injection, XSS, command injection, sensitive data exposure, auth issues
- Performance: N+1 queries, memory leaks, inefficient algorithms, unnecessary re-renders
- Style: Naming conventions, code organization, comments, TypeScript types
- Bugs: Logic errors, null pointer issues, race conditions, edge cases
- Maintainability: Code duplication, complexity, testability

Be specific about line numbers when possible. Provide actionable suggestions."""


async def code_review_tool(
    file_path: str,
    context: str | None = None,
    focus: Literal['security', 'performance', 'style', 'bugs', 'all'] = 'all'
) -> dict:
    """Execute code review using Gemini AI."""
    # Check if file exists
    if not os.path.exists(file_path):
        raise FileNotFoundError(f'File not found: {file_path}')

    # Read file content
    with open(file_path, 'r', encoding='utf-8') as f:
        code = f.read()

    file_name = os.path.basename(file_path)

    # Build the prompt
    prompt = f'Review this code file: {file_name}\n\n'

    if context:
        prompt += f'Context: {context}\n\n'

    if focus != 'all':
        prompt += f'Focus specifically on: {focus}\n\n'

    prompt += f'```\n{code}\n```\n\nProvide your analysis as JSON.'

    # Call Gemini
    gemini = get_gemini_client()
    response = await gemini.generate_pro(prompt, SYSTEM_PROMPT)

    # Parse the response
    result = gemini.parse_json_response(response)

    # Filter issues by focus if specified
    issues = result.get('issues', [])
    if focus != 'all':
        focus_map = {
            'security': ['security'],
            'performance': ['performance'],
            'style': ['style', 'maintainability'],
            'bugs': ['bug'],
        }
        allowed_categories = focus_map.get(focus, [])
        issues = [i for i in issues if i.get('category') in allowed_categories]

    return {
        'file': file_path,
        'language': result.get('language', 'unknown'),
        'score': result.get('score', 0),
        'summary': result.get('summary', ''),
        'issues': issues,
        'issues_count': {
            'critical': len([i for i in issues if i.get('severity') == 'critical']),
            'high': len([i for i in issues if i.get('severity') == 'high']),
            'medium': len([i for i in issues if i.get('severity') == 'medium']),
            'low': len([i for i in issues if i.get('severity') == 'low']),
            'info': len([i for i in issues if i.get('severity') == 'info']),
        },
        'strengths': result.get('strengths', []),
    }
