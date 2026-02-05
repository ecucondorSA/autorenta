/**
 * Gemini Nano Banana Pro - Image Generator
 * Genera imágenes usando el modelo Gemini 3 Pro Image (Nano Banana Pro)
 *
 * Uso: GEMINI_API_KEY=xxx bun run tools/ai/gemini-image-generator.ts "prompt" output.png
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'nano-banana-pro-preview';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY no está configurada');
  process.exit(1);
}

const prompt = process.argv[2];
const outputFile = process.argv[3] || 'output.png';

if (!prompt) {
  console.error('❌ Uso: bun run gemini-image-generator.ts "prompt" [output.png]');
  process.exit(1);
}

async function generateImage(prompt: string): Promise<string> {
  console.log(`🎨 Generando imagen con Nano Banana Pro...`);
  console.log(`📝 Prompt: ${prompt}`);

  const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT']
      }
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API Error: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();

  // Extract image data
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData);

  if (!imagePart) {
    // Check for text response
    const textPart = parts.find((p: any) => p.text);
    if (textPart) {
      console.log(`📄 Respuesta de texto: ${textPart.text}`);
    }
    throw new Error('No se generó imagen en la respuesta');
  }

  return imagePart.inlineData.data;
}

async function main() {
  try {
    const base64Data = await generateImage(prompt);

    // Decode and save
    const buffer = Buffer.from(base64Data, 'base64');
    await Bun.write(outputFile, buffer);

    const stats = await Bun.file(outputFile).size;
    console.log(`✅ Imagen guardada: ${outputFile} (${Math.round(stats / 1024)} KB)`);

  } catch (error) {
    console.error(`❌ Error: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

main();
