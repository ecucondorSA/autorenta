const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');
const { getGeminiApiUrl } = require('./config');

// Configuración
const API_URL = getGeminiApiUrl();
const MAX_DIMENSION_LANDING = 1920; 
const QUALITY = 85;

// Prompts LATAM (Con gente y contexto, ya que el error era de código, no de API)
const RENTER_PROMPT_LATAM = `A young couple (latin american, 25-35 years old) joyfully driving a modern, clean car (sedan or compact SUV) on a sunny coastal road in Uruguay (like Punta del Este or Rocha). View from the back of the car looking forward, showing their happy faces reflected in the rearview mirror and the road ahead. Clear blue sky, authentic travel vibe.`;

const OWNER_PROMPT_LATAM = `A confident latin american car owner (man or woman, 30-45 years old) casually leaning against their car (a modern sedan) on a residential street in a middle-class neighborhood of Buenos Aires, Argentina. They are smiling warmly and looking at their smartphone. The scene includes typical Latin American architecture (metal gate, colorful wall), some jacaranda trees. Bright, natural light. Passive income vibe.`;

// Función de generación
async function generate(prompt, outputName) {
  console.log(`🚀 Generando: ${outputName}...`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '16:9' }, 
        },
      }),
    });

    if (!response.ok) throw new Error(await response.text());

    const data = await response.json();
    
    // CORRECCIÓN: Acceder correctamente al objeto part primero
    const part = data?.candidates?.[0]?.content?.parts?.[0];
    const inlineData = part?.inlineData;

    if (!inlineData || !inlineData.data) {
      console.error('API Response (no image data):', JSON.stringify(data, null, 2));
      throw new Error('No image data returned from API.');
    }

    const rawBuffer = Buffer.from(inlineData.data, 'base64');
    console.log(`✅ Imagen cruda recibida: ${(rawBuffer.length / 1024).toFixed(2)} KB`);

    // Optimización con Sharp
    console.log(`🔄 Optimizando...`);
    const optimizedBuffer = await sharp(rawBuffer)
      .resize({ width: MAX_DIMENSION_LANDING, withoutEnlargement: true })
      .jpeg({ quality: QUALITY, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(outputName, optimizedBuffer);
    console.log(`🎉 Guardada: ${outputName} (${(optimizedBuffer.length / 1024).toFixed(0)} KB)`);

  } catch (error) {
    console.error(`🚨 Error generando ${outputName}:`, error.message);
  }
}

async function main() {
  const OUTPUT_DIR_IMAGES = 'src/assets/images';
  if (!fs.existsSync(OUTPUT_DIR_IMAGES)) {
    fs.mkdirSync(OUTPUT_DIR_IMAGES, { recursive: true });
  }

  await generate(RENTER_PROMPT_LATAM, path.join(OUTPUT_DIR_IMAGES, 'renter-lifestyle.jpg'));
  await generate(OWNER_PROMPT_LATAM, path.join(OUTPUT_DIR_IMAGES, 'owner-lifestyle.jpg'));
}

main();