import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
import type { GeminiClient } from '../gemini-client.js';

const inputSchema = z.object({
  original_path: z.string().optional().describe('Path to original file'),
  modified_path: z.string().optional().describe('Path to modified file'),
  original_code: z.string().optional().describe('Original code as string'),
  modified_code: z.string().optional().describe('Modified code as string'),
});

export const codeCompareToolSchema = {
  name: 'gemini_compare_code',
  description: 'Compare two versions of code using Gemini AI. Analyzes the diff for risks, improvements, and potential regressions. Accepts file paths or code strings.',
  inputSchema: {
    type: 'object',
    properties: {
      original_path: {
        type: 'string',
        description: 'Path to the original file',
      },
      modified_path: {
        type: 'string',
        description: 'Path to the modified file',
      },
      original_code: {
        type: 'string',
        description: 'Original code as string (alternative to original_path)',
      },
      modified_code: {
        type: 'string',
        description: 'Modified code as string (alternative to modified_path)',
      },
    },
  },
};

interface CodeChange {
  type: 'addition' | 'removal' | 'modification';
  description: string;
  impact: 'breaking' | 'feature' | 'fix' | 'refactor' | 'style';
}

interface Risk {
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  mitigation: string;
}

interface CompareResult {
  summary: string;
  changes: CodeChange[];
  risks: Risk[];
  improvements: string[];
  regressions: string[];
  testing_recommendations: string[];
  approval_recommendation: 'approve' | 'request_changes' | 'needs_discussion';
}

const SYSTEM_PROMPT = `You are an expert code reviewer analyzing a diff between two versions of code.
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

Be thorough but concise. Flag anything that needs attention before merging.`;

export function registerCodeCompareTool(
  gemini: GeminiClient,
  handlers: Map<string, (args: any) => Promise<any>>
) {
  handlers.set('gemini_compare_code', async (args: unknown) => {
    const { original_path, modified_path, original_code, modified_code } = inputSchema.parse(args);

    // Get original code
    let original: string;
    if (original_path) {
      if (!existsSync(original_path)) {
        throw new Error(`Original file not found: ${original_path}`);
      }
      original = readFileSync(original_path, 'utf-8');
    } else if (original_code) {
      original = original_code;
    } else {
      throw new Error('Either original_path or original_code must be provided');
    }

    // Get modified code
    let modified: string;
    if (modified_path) {
      if (!existsSync(modified_path)) {
        throw new Error(`Modified file not found: ${modified_path}`);
      }
      modified = readFileSync(modified_path, 'utf-8');
    } else if (modified_code) {
      modified = modified_code;
    } else {
      throw new Error('Either modified_path or modified_code must be provided');
    }

    // Build the prompt
    const prompt = `Compare these two versions of code:

## ORIGINAL CODE:
\`\`\`
${original}
\`\`\`

## MODIFIED CODE:
\`\`\`
${modified}
\`\`\`

Analyze the changes and provide your assessment as JSON.`;

    // Call Gemini
    const response = await gemini.generatePro(prompt, SYSTEM_PROMPT);

    // Parse the response
    const result = gemini.parseJsonResponse<CompareResult>(response);

    // Calculate stats
    const linesOriginal = original.split('\n').length;
    const linesModified = modified.split('\n').length;
    const linesDiff = linesModified - linesOriginal;

    return {
      files: {
        original: original_path || '(provided as string)',
        modified: modified_path || '(provided as string)',
      },
      stats: {
        lines_original: linesOriginal,
        lines_modified: linesModified,
        lines_diff: linesDiff > 0 ? `+${linesDiff}` : String(linesDiff),
      },
      summary: result.summary,
      changes: result.changes,
      changes_by_type: {
        additions: result.changes.filter(c => c.type === 'addition').length,
        removals: result.changes.filter(c => c.type === 'removal').length,
        modifications: result.changes.filter(c => c.type === 'modification').length,
      },
      risks: result.risks,
      risk_summary: {
        critical: result.risks.filter(r => r.severity === 'critical').length,
        high: result.risks.filter(r => r.severity === 'high').length,
        medium: result.risks.filter(r => r.severity === 'medium').length,
        low: result.risks.filter(r => r.severity === 'low').length,
      },
      improvements: result.improvements,
      regressions: result.regressions,
      testing_recommendations: result.testing_recommendations,
      approval_recommendation: result.approval_recommendation,
    };
  });
}
