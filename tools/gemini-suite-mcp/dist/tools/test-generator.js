import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
const inputSchema = z.object({
    file_path: z.string().describe('Absolute path to the file to generate tests for'),
    test_type: z.enum(['unit', 'e2e', 'integration']).default('unit').describe('Type of tests to generate'),
    framework: z.enum(['jasmine', 'jest', 'playwright', 'auto']).default('auto').describe('Testing framework to use'),
});
export const testGeneratorToolSchema = {
    name: 'gemini_generate_tests',
    description: 'Generate tests using Gemini AI. Creates unit, e2e, or integration tests for the given file. Supports Jasmine, Jest, and Playwright.',
    inputSchema: {
        type: 'object',
        properties: {
            file_path: {
                type: 'string',
                description: 'Absolute path to the file to generate tests for',
            },
            test_type: {
                type: 'string',
                enum: ['unit', 'e2e', 'integration'],
                description: 'Type of tests to generate (default: unit)',
            },
            framework: {
                type: 'string',
                enum: ['jasmine', 'jest', 'playwright', 'auto'],
                description: 'Testing framework to use (default: auto-detect)',
            },
        },
        required: ['file_path'],
    },
};
const SYSTEM_PROMPT_UNIT = `You are an expert test engineer. Generate comprehensive unit tests for the provided code.

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
- For Angular: use TestBed, inject services, mock HTTP calls`;
const SYSTEM_PROMPT_E2E = `You are an expert test engineer. Generate Playwright E2E tests for the provided Angular component/page.

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
- Mock API calls with page.route() when needed`;
export function registerTestGeneratorTool(gemini, handlers) {
    handlers.set('gemini_generate_tests', async (args) => {
        const { file_path, test_type, framework: requestedFramework } = inputSchema.parse(args);
        // Check if file exists
        if (!existsSync(file_path)) {
            throw new Error(`File not found: ${file_path}`);
        }
        // Read file content
        const code = readFileSync(file_path, 'utf-8');
        const fileName = file_path.split('/').pop() || 'unknown';
        // Auto-detect framework
        let framework = requestedFramework;
        if (framework === 'auto') {
            if (test_type === 'e2e') {
                framework = 'playwright';
            }
            else if (file_path.includes('.component.') || file_path.includes('.service.')) {
                framework = 'jasmine'; // Angular default
            }
            else {
                framework = 'jest';
            }
        }
        // Select appropriate system prompt
        const systemPrompt = test_type === 'e2e' ? SYSTEM_PROMPT_E2E : SYSTEM_PROMPT_UNIT;
        // Build the prompt
        const prompt = `Generate ${test_type} tests using ${framework} for this file: ${fileName}

File path: ${file_path}

\`\`\`typescript
${code}
\`\`\`

Provide complete, runnable test code as JSON.`;
        // Call Gemini
        const response = await gemini.generatePro(prompt, systemPrompt);
        // Parse the response
        const result = gemini.parseJsonResponse(response);
        return {
            file: file_path,
            test_type,
            test_file_name: result.test_file_name,
            framework: result.framework,
            test_code: result.test_code,
            test_cases: result.test_cases,
            test_cases_count: result.test_cases.length,
            coverage_areas: result.coverage_areas,
            setup_required: result.setup_required,
            suggestion: `Save to: ${file_path.replace(/\.ts$/, '.spec.ts')}`,
        };
    });
}
