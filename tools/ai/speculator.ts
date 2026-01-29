import * as fs from 'fs';
import * as path from 'path';
import { callGemini, GOOGLE_API_KEY, MOCK_GEMINI } from './gemini-client';

if (!GOOGLE_API_KEY && !MOCK_GEMINI) {
    console.error('❌ Error: GOOGLE_API_KEY is not set in environment variables.');
    process.exit(1);
}

interface SpeculatorResponse {
    specFileContent: string;
    explanation: string;
    scenariosCovered: string[];
}

async function speculate() {
    const args = process.argv.slice(2);
    const fileToTest = args[0];

    if (!fileToTest) {
        console.log('Usage: npx tsx tools/ai/speculator.ts <file-to-test>');
        process.exit(1);
    }

    if (!fs.existsSync(fileToTest)) {
        console.error(`❌ File not found: ${fileToTest}`);
        process.exit(1);
    }

    console.log(`🔮 Speculating tests for: ${fileToTest}`);
    const fileContent = fs.readFileSync(fileToTest, 'utf-8');

    // Determine spec file path
    // If input is `utils.ts`, spec is `utils.spec.ts` next to it.
    const dir = path.dirname(fileToTest);
    const ext = path.extname(fileToTest);
    const base = path.basename(fileToTest, ext);
    const specFilePath = path.join(dir, `${base}.spec.ts`);

    const existingSpec = fs.existsSync(specFilePath) ? fs.readFileSync(specFilePath, 'utf-8') : null;

    try {
        const systemPrompt = `You are an expert QA Engineer and Senior Developer specializing in "Speculative Engineering".
     
     YOUR GOAL:
     Analyze the provided source code and generate a comprehensive TypeScript test suite (using standard Jasmine/Jest/Vitest syntax as inferred from context or defaulting to 'describe/it').
     
     KEY OBJECTIVES:
     1. Identify edge cases, boundary conditions, and potential security vulnerabilities.
     2. Write tests that specifically target these weak points.
     3. Do NOT just write "happy path" tests. Try to break the code.
     4. If a spec file already exists, ADD new invalid/edge-case tests to it, don't just replace it unless asked.

     RESPONSE FORMAT:
     Return JSON:
     {
        "specFileContent": "The COMPLETE content of the .spec.ts file.",
        "explanation": "Breve explicación de los casos borde que cubriste (EN ESPAÑOL).",
        "scenariosCovered": ["Input vacío", "Valores negativos", "Intento de SQL Injection", ...]
     }
     `;

        const prompt = existingSpec
            ? `Update this existing test suite with MORE aggressive edge cases for the source code.`
            : `Generate a brand new test suite for this source code.`;

        // Combine context
        const context = `SOURCE CODE:\n${fileContent}\n\nEXISTING SPECS:\n${existingSpec || 'None'}`;

        const mockResponse: SpeculatorResponse = {
            specFileContent: `import { describe, it, expect } from 'vitest';\n\ndescribe('${base}', () => {\n  it('should handle empty input', () => {\n    // Mock test\n  });\n});`,
            explanation: 'Tests simulados generados para verificación.',
            scenariosCovered: ['Escenario Simulado']
        };

        console.log('🧠 Asking Gemini to invent test cases...');
        const response = await callGemini<SpeculatorResponse>(prompt, context, systemPrompt, mockResponse);

        const { specFileContent, explanation, scenariosCovered } = response;

        console.log('\n🧪 \x1b[36mSpeculative Scenarios:\x1b[0m');
        scenariosCovered.forEach(s => console.log(`  • ${s}`));
        console.log(`\n💬 "${explanation}"\n`);

        fs.writeFileSync(specFilePath, specFileContent);
        console.log(`✨ Generated spec file: ${specFilePath}`);

        // Optional: Try to run the test if logic allows, but for now just generation is enough for Tier 5 MVP.
        // In a real agent, we might run `pnpm test ${specFilePath}`.

    } catch (error) {
        console.error('❌ Generation failed:', error);
        process.exit(1);
    }
}

speculate();
