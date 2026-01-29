import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { callGemini, GOOGLE_API_KEY, MOCK_GEMINI, MODEL_NAME } from './gemini-client';

interface HealerResponse {
  fixedContent: string;
  explanation: string;
  confidenceScore: number;
}

if (!GOOGLE_API_KEY && !MOCK_GEMINI) {
  console.error('❌ Error: GOOGLE_API_KEY is not set in environment variables.');
  process.exit(1);
}

// Función principal (Main Loop)
async function heal() {
  const args = process.argv.slice(2);
  const commandToFix = args.join(' ');

  if (!commandToFix) {
    console.log('Usage: npx tsx tools/ai/healer.ts "<command-that-failed>"');
    process.exit(1);
  }

  console.log(`🚑 Healer Agent activated using ${MODEL_NAME}`);

  try {
    // 1. Ejecutar comando para capturar el error
    console.log('🔍 Reproducing failure...');
    execSync(commandToFix, { stdio: 'pipe' });
    console.log('✅ Command passed unexpectedly. Nothing to heal.');
    process.exit(0);

  } catch (error: any) {
    const output = error.stdout?.toString() + '\n' + error.stderr?.toString();
    console.log('❌ Captured failure log.');

    // 2. Analizar el log para encontrar el archivo culpable
    const fileMatch = output.match(/([a-zA-Z0-9_\-\/]+\.(ts|js|html|css|scss)):\d+/);

    if (!fileMatch) {
      console.error('⚠️ Could not identify a specific file in the error log.');
      process.exit(1);
    }

    const filePath = fileMatch[1];
    if (!fs.existsSync(filePath)) {
      console.error(`⚠️ Detected file "${filePath}" does not exist.`);
      process.exit(1);
    }

    console.log(`🎯 Identified culprit: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, 'utf-8');

    // 3. Consultar a Gemini
    console.log('🧠 Asking Gemini for a fix and explanation...');
    try {
      const systemPrompt = `You are an expert Senior Software Engineer acting as a 'Conversational CI Healer'.
            
            YOUR GOAL:
            Fix the code error provided in the ERROR LOG based on the CONTEXT.

            RESPONSE FORMAT:
            You must return a valid JSON object with the following structure:
            {
              "fixedContent": "The entire file content with the fix applied. Do NOT use markdown code blocks.",
              "explanation": "Una explicación breve, útil y humana de qué salió mal y cómo lo arreglaste (EN ESPAÑOL). Sé educativo pero conciso. Ejemplo: 'Noté que olvidaste manejar el caso null en getUser(), así que agregué un operador de encadenamiento opcional.'",
              "confidenceScore": 0.95 (number between 0 and 1)
            }

            RULES:
            1. The 'fixedContent' must be the FULL file content, ready to be written to disk.
            2. The 'explanation' must be friendly and conversational (IN SPANISH).
            3. Do NOT wrap the JSON in markdown blocks (no \`\`\`json).
            4. Maintain existing coding style.`;

      const mockResponse: HealerResponse = {
        fixedContent: fileContent.replace('taxRate', 'tax'), // Simple mock logic for verification
        explanation: "Noté que intentabas usar 'taxRate' que no estaba definido. Asumí que te referías a 'tax' basándome en los argumentos, ¡así que lo corregí por ti!",
        confidenceScore: 0.99
      };

      const response = await callGemini<HealerResponse>(output, fileContent, systemPrompt, mockResponse);

      const { fixedContent, explanation, confidenceScore } = response;

      console.log('\n💬 \x1b[36mAI Explanation:\x1b[0m'); // Cyan color for header
      console.log(`\x1b[33m"${explanation}"\x1b[0m`); // Yellow for the text
      console.log(`📊 Confidence: ${(confidenceScore * 100).toFixed(1)}%\n`);

      // 4. Aplicar el fix
      fs.writeFileSync(filePath, fixedContent);
      console.log(`✨ Applied fix to ${filePath}`);

      // 5. Verificar
      console.log('🩺 Verifying fix...');
      try {
        execSync(commandToFix, { stdio: 'ignore' });
        console.log('✅ Fix verified!');
        process.exit(0);
      } catch (e) {
        console.error('💔 The fix did not work. Reverting...');
        fs.writeFileSync(filePath, fileContent);
        process.exit(1);
      }

    } catch (aiError) {
      console.error('🤖 Generation failed:', aiError);
      process.exit(1);
    }
  }
}

heal();
