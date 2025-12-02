import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
const inputSchema = z.object({
    file_path: z.string().describe('Absolute path to the file to review'),
    context: z.string().optional().describe('Additional context about the code purpose'),
    focus: z.enum(['security', 'performance', 'style', 'bugs', 'all']).default('all').describe('Focus area for the review'),
});
export const codeReviewToolSchema = {
    name: 'gemini_code_review',
    description: 'Review code using Gemini AI. Analyzes for security issues, performance problems, style violations, and potential bugs. Returns structured feedback with severity levels.',
    inputSchema: {
        type: 'object',
        properties: {
            file_path: {
                type: 'string',
                description: 'Absolute path to the file to review',
            },
            context: {
                type: 'string',
                description: 'Additional context about the code purpose (optional)',
            },
            focus: {
                type: 'string',
                enum: ['security', 'performance', 'style', 'bugs', 'all'],
                description: 'Focus area for the review (default: all)',
            },
        },
        required: ['file_path'],
    },
};
const SYSTEM_PROMPT = `You are an expert code reviewer with deep knowledge of security, performance, and best practices.
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

Be specific about line numbers when possible. Provide actionable suggestions.`;
export function registerCodeReviewTool(gemini, handlers) {
    handlers.set('gemini_code_review', async (args) => {
        const { file_path, context, focus } = inputSchema.parse(args);
        // Check if file exists
        if (!existsSync(file_path)) {
            throw new Error(`File not found: ${file_path}`);
        }
        // Read file content
        const code = readFileSync(file_path, 'utf-8');
        const fileName = file_path.split('/').pop() || 'unknown';
        // Build the prompt
        let prompt = `Review this code file: ${fileName}\n\n`;
        if (context) {
            prompt += `Context: ${context}\n\n`;
        }
        if (focus !== 'all') {
            prompt += `Focus specifically on: ${focus}\n\n`;
        }
        prompt += `\`\`\`\n${code}\n\`\`\`\n\nProvide your analysis as JSON.`;
        // Call Gemini
        const response = await gemini.generatePro(prompt, SYSTEM_PROMPT);
        // Parse the response
        const result = gemini.parseJsonResponse(response);
        // Filter issues by focus if specified
        let filteredIssues = result.issues;
        if (focus !== 'all') {
            const focusMap = {
                security: ['security'],
                performance: ['performance'],
                style: ['style', 'maintainability'],
                bugs: ['bug'],
            };
            const allowedCategories = focusMap[focus] || [];
            filteredIssues = result.issues.filter(i => allowedCategories.includes(i.category));
        }
        return {
            file: file_path,
            language: result.language,
            score: result.score,
            summary: result.summary,
            issues: filteredIssues,
            issues_count: {
                critical: filteredIssues.filter(i => i.severity === 'critical').length,
                high: filteredIssues.filter(i => i.severity === 'high').length,
                medium: filteredIssues.filter(i => i.severity === 'medium').length,
                low: filteredIssues.filter(i => i.severity === 'low').length,
                info: filteredIssues.filter(i => i.severity === 'info').length,
            },
            strengths: result.strengths,
        };
    });
}
