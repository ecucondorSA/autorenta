import { z } from 'zod';
import { readFileSync, existsSync } from 'fs';
const inputSchema = z.object({
    url: z.string().optional().describe('URL to capture and analyze'),
    screenshot_path: z.string().optional().describe('Path to existing screenshot'),
    screenshot_base64: z.string().optional().describe('Screenshot as base64 string (avoids file I/O)'),
    analysis_type: z.enum(['accessibility', 'ux', 'consistency', 'all']).default('all'),
});
export const uiAnalyzerToolSchema = {
    name: 'gemini_analyze_ui',
    description: 'Analyze UI/UX using Gemini Vision. Accepts screenshot_base64 (preferred), screenshot_path, or url. Returns accessibility, UX, and consistency analysis.',
    inputSchema: {
        type: 'object',
        properties: {
            screenshot_base64: {
                type: 'string',
                description: 'Screenshot as base64 string (PREFERRED - fastest, no file I/O)',
            },
            screenshot_path: {
                type: 'string',
                description: 'Path to existing screenshot file',
            },
            url: {
                type: 'string',
                description: 'URL to capture (SLOW - use screenshot_base64 instead)',
            },
            analysis_type: {
                type: 'string',
                enum: ['accessibility', 'ux', 'consistency', 'all'],
                description: 'Focus area (default: all)',
            },
        },
    },
};
const SYSTEM_PROMPT = `You are an expert UI/UX designer. Analyze the screenshot and return JSON:

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
Be concise. Max 5 issues.`;
async function captureScreenshot(url) {
    // Dynamic import to avoid loading playwright if not needed
    const { chromium } = await import('playwright');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    try {
        const page = await browser.newPage({
            viewport: { width: 1280, height: 720 },
        });
        // Use domcontentloaded instead of networkidle (faster, more reliable)
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        // Wait for Angular to stabilize
        await page.waitForTimeout(3000);
        // Take screenshot (viewport only, not full page - smaller, faster)
        const buffer = await page.screenshot({
            fullPage: false,
            type: 'jpeg',
            quality: 70 // Compress to reduce tokens
        });
        return buffer.toString('base64');
    }
    finally {
        await browser.close();
    }
}
export function registerUIAnalyzerTool(gemini, handlers) {
    handlers.set('gemini_analyze_ui', async (args) => {
        const { url, screenshot_path, screenshot_base64, analysis_type } = inputSchema.parse(args);
        if (!url && !screenshot_path && !screenshot_base64) {
            throw new Error('Provide screenshot_base64, screenshot_path, or url');
        }
        let imageBase64;
        let source;
        let mimeType = 'image/png';
        // Priority: base64 > path > url (fastest to slowest)
        if (screenshot_base64) {
            imageBase64 = screenshot_base64;
            source = 'base64_input';
        }
        else if (screenshot_path) {
            if (!existsSync(screenshot_path)) {
                throw new Error(`File not found: ${screenshot_path}`);
            }
            const buffer = readFileSync(screenshot_path);
            imageBase64 = buffer.toString('base64');
            source = screenshot_path;
        }
        else if (url) {
            console.error(`Capturing screenshot from ${url}...`);
            imageBase64 = await captureScreenshot(url);
            source = url;
            mimeType = 'image/jpeg';
        }
        else {
            throw new Error('No source provided');
        }
        // Build prompt with full instructions
        const focusMap = {
            accessibility: 'Focus on: color contrast, text sizes, touch targets.',
            ux: 'Focus on: user flows, clarity, feedback.',
            consistency: 'Focus on: colors, spacing, typography.',
            all: '',
        };
        const prompt = `You are an expert UI/UX designer. Analyze this screenshot and return ONLY valid JSON (no markdown, no explanation):

{
  "overall_score": <number 0-10>,
  "summary": "<brief summary string>",
  "issues": [
    {
      "severity": "<critical|high|medium|low>",
      "category": "<accessibility|ux|consistency|layout|typography|color>",
      "element": "<element description>",
      "issue": "<problem>",
      "recommendation": "<fix>"
    }
  ],
  "strengths": ["<positive aspects>"],
  "recommendations": ["<suggestions>"]
}

${focusMap[analysis_type] || 'Analyze accessibility, UX, and visual consistency.'}
Be concise. Max 5 issues. Return ONLY the JSON object.`;
        console.error('Calling Gemini Vision API...');
        const response = await gemini.analyzeImage(imageBase64, prompt, mimeType);
        // Parse response with defaults
        let result;
        try {
            result = gemini.parseJsonResponse(response);
        }
        catch (e) {
            // If JSON parsing fails, return raw response
            return {
                source,
                analysis_type,
                error: 'Failed to parse Gemini response',
                raw_response: response.slice(0, 500),
            };
        }
        // Ensure arrays exist
        const issues = Array.isArray(result.issues) ? result.issues : [];
        const strengths = Array.isArray(result.strengths) ? result.strengths : [];
        const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
        // Filter by type if needed
        const categoryMap = {
            accessibility: ['accessibility'],
            ux: ['ux', 'layout'],
            consistency: ['consistency', 'typography', 'color'],
            all: ['accessibility', 'ux', 'consistency', 'layout', 'typography', 'color'],
        };
        const allowedCategories = categoryMap[analysis_type] || categoryMap.all;
        const filteredIssues = issues.filter(i => i && i.category && allowedCategories.includes(i.category));
        return {
            source,
            analysis_type,
            score: result.overall_score ?? 0,
            summary: result.summary ?? 'No summary',
            issues: filteredIssues,
            issues_count: filteredIssues.length,
            strengths,
            recommendations,
        };
    });
}
