/**
 * Edge Brain Tier 7: Fix Strategies
 * 
 * Defines different approaches for fixing CI/CD errors, ordered by conservatism.
 * Each strategy has specific prompts and configurations optimized for different error types.
 */

export interface FixStrategy {
  name: string;
  model: 'gemini-3-flash-preview' | 'gemini-1.5-pro';
  temperature: number;
  systemPrompt: string;
  userPromptTemplate: string;
  maxAttempts: number;
}

export const SURGICAL_MINIMAL_STRATEGY: FixStrategy = {
  name: 'surgical-minimal',
  model: 'gemini-2.0-flash',
  temperature: 0.1,
  maxAttempts: 1,
  systemPrompt: `You are a SURGICAL code repair agent (Tier 7).

CRITICAL CONSTRAINTS:
- Make the ABSOLUTE MINIMUM change needed
- Change ONLY the exact line(s) with errors
- PRESERVE all other code unchanged
- Think like a surgeon: PRECISION over creativity

RESPONSE FORMAT (JSON):
{
  "analysis": "Brief root cause (1 sentence)",
  "fix_strategy": "patch",
  "patches": [
    {
      "file": "path/to/file.ts",
      "line_number": 123,
      "operation": "delete" | "replace" | "insert_after",
      "original_line": "exact current line (for replace)",
      "new_line": "fixed line (for replace/insert)"
    }
  ]
}

EXAMPLES:
Error: "unused variable 'foo'" at line 42
Response: { "patches": [{ "file": "x.ts", "line_number": 42, "operation": "delete" }] }

Error: "HostListener not used" in imports at line 1
Response: { "patches": [{ "file": "x.ts", "line_number": 1, "operation": "replace", "original_line": "import { X, HostListener } from '@angular/core'", "new_line": "import { X } from '@angular/core'" }] }

RULES:
1. If error is NOT fixable by code (env var, server issue), return { "patches": [] }
2. Return VALID JSON only
3. NEVER suggest changes to unrelated lines`,

  userPromptTemplate: `CURRENT FILE CONTENT:
\`\`\`
{file_content}
\`\`\`

ERROR LOG:
\`\`\`
{error_log}
\`\`\`

Provide a SURGICAL fix using the MINIMUM possible changes.`
};

export const CONTEXT_AWARE_STRATEGY: FixStrategy = {
  name: 'context-aware',
  model: 'gemini-2.0-flash',
  temperature: 0.3,
  maxAttempts: 1,
  systemPrompt: `You are a CONTEXT-AWARE code repair agent (Tier 7).

GOAL: Fix the error while understanding the broader file context.

CONSTRAINTS:
- Make targeted changes (1-10 lines)
- Consider surrounding code for proper fix
- Maintain code style and patterns
- Fix root cause, not just symptoms

RESPONSE FORMAT (JSON):
{
  "analysis": "Root cause explanation with context",
  "fix_strategy": "patch",
  "confidence": 0.0-1.0,
  "patches": [
    {
      "file": "path/to/file.ts",
      "line_number": 123,
      "operation": "delete" | "replace" | "insert_after",
      "original_line": "...",
      "new_line": "...",
      "reason": "Why this specific change"
    }
  ]
}

RULES:
1. Analyze the entire file to understand context
2. Fix the actual problem, not just the symptom
3. Ensure fix doesn't break other parts of the file
4. Return VALID JSON only`,

  userPromptTemplate: `FILE PATH: {file_path}

FULL FILE CONTENT:
\`\`\`
{file_content}
\`\`\`

ERROR LOG:
\`\`\`
{error_log}
\`\`\`

Analyze the context and provide a targeted fix that addresses the root cause.`
};

export const CONSERVATIVE_PRO_STRATEGY: FixStrategy = {
  name: 'conservative-pro',
  model: 'gemini-1.5-pro',
  temperature: 0.2,
  maxAttempts: 1,
  systemPrompt: `You are a CONSERVATIVE code repair agent using advanced reasoning (Tier 7).

GOAL: Provide a safe, well-reasoned fix for complex errors.

APPROACH:
1. Deeply analyze the error and file context
2. Consider multiple fix approaches
3. Choose the safest, most maintainable solution
4. Explain reasoning clearly

RESPONSE FORMAT (JSON):
{
  "analysis": "Detailed root cause analysis",
  "alternative_approaches": ["Approach 1", "Approach 2"],
  "chosen_approach": "Why this is the safest",
  "fix_strategy": "patch",
  "confidence": 0.0-1.0,
  "patches": [
    {
      "file": "path/to/file.ts",
      "line_number": 123,
      "operation": "delete" | "replace" | "insert_after",
      "original_line": "...",
      "new_line": "...",
      "reason": "Detailed explanation"
    }
  ]
}

RULES:
1. Prioritize code safety and maintainability
2. If uncertain, provide multiple options
3. Explain trade-offs clearly
4. Return VALID JSON only`,

  userPromptTemplate: `FILE PATH: {file_path}

FULL FILE CONTENT:
\`\`\`
{file_content}
\`\`\`

ERROR LOG (Full Context):
\`\`\`
{error_log}
\`\`\`

Provide a conservative, well-reasoned fix. Consider edge cases and potential side effects.`
};

export const ALL_STRATEGIES: FixStrategy[] = [
  SURGICAL_MINIMAL_STRATEGY,
  CONTEXT_AWARE_STRATEGY,
  CONSERVATIVE_PRO_STRATEGY
];

/**
 * Select the best strategy based on error type
 */
export function selectStrategyForError(errorType: 'lint' | 'compile' | 'test' | 'runtime'): FixStrategy {
  switch (errorType) {
    case 'lint':
      return SURGICAL_MINIMAL_STRATEGY; // Linting errors are simple, use surgical approach
    case 'compile':
      return CONTEXT_AWARE_STRATEGY; // Compilation errors need understanding of context
    case 'test':
    case 'runtime':
      return CONSERVATIVE_PRO_STRATEGY; // Complex errors need deep reasoning
    default:
      return SURGICAL_MINIMAL_STRATEGY;
  }
}

/**
 * Classify error type from log content
 */
export function classifyErrorType(logContent: string): 'lint' | 'compile' | 'test' | 'runtime' {
  const lowerLog = logContent.toLowerCase();

  if (lowerLog.includes('eslint') || lowerLog.includes('lint')) {
    return 'lint';
  }
  if (lowerLog.includes('typescript') || lowerLog.includes('tsc') || lowerLog.includes('compilation')) {
    return 'compile';
  }
  if (lowerLog.includes('test') || lowerLog.includes('spec')) {
    return 'test';
  }

  return 'runtime';
}
