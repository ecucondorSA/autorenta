import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import https from 'https';

// Configuración
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
// Usamos el modelo solicitado. Si en el futuro cambia el nombre público, se ajusta aquí.
const MODEL_NAME = 'gemini-3-pro-preview'; 

if (!GOOGLE_API_KEY) {
  console.error('❌ Error: GOOGLE_API_KEY is not set in environment variables.');
  process.exit(1);
}

// Interfaces para Google AI API
interface GeminiPart {
  text: string;
}

interface GeminiContent {
  role: string;
  parts: GeminiPart[];
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
  systemInstruction?: {
      parts: GeminiPart[];
  };
}

// Función para llamar a Google Gemini API
async function callGemini(prompt: string, context: string): Promise<string> {
  // Construcción del endpoint
  const hostname = 'generativelanguage.googleapis.com';
  const path = `/v1beta/models/${MODEL_NAME}:generateContent?key=${GOOGLE_API_KEY}`;

  const data: GeminiRequest = {
    systemInstruction: {
        parts: [{
            text: `You are an automated CI Repair Agent. Your goal is to fix code errors.
            RULES:
            1. Return ONLY the full content of the fixed file.
            2. Do NOT wrap code in markdown blocks (no \`\`\`).
            3. Do NOT add comments explaining what you did.
            4. Maintain existing coding style.
            5. Fix only the error specified.`
        }]
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: `CONTEXT (File Content):\n${context}\n\nERROR LOG:\n${prompt}\n\nPlease provide the corrected file content.` }]
      }
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 8192 // Gemini soporta outputs largos
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          
          if (response.error) {
            reject(new Error(`Gemini API Error: ${response.error.message}`));
            return;
          }

          if (!response.candidates || response.candidates.length === 0) {
            reject(new Error('Gemini returned no candidates.'));
            return;
          }

          const text = response.candidates[0].content.parts[0].text;
          resolve(text.trim());
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(JSON.stringify(data));
    req.end();
  });
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
    console.log('🧠 Asking Gemini for a fix...');
    try {
      const fixedContent = await callGemini(output, fileContent);
      
      // Limpieza de Markdown si Gemini lo incluye
      const cleanContent = fixedContent.replace(/^```[a-z]*\n/, '').replace(/```$/, '');

      // 4. Aplicar el fix
      fs.writeFileSync(filePath, cleanContent);
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
