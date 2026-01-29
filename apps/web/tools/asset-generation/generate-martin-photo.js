const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');
const { getGeminiApiUrl } = require('./config');

const API_URL = getGeminiApiUrl();
const MAX_DIMENSION = 800; // Suficiente para un avatar o imagen pequeña en un bloque
const OUTPUT_DIR = 'src/assets/images';

async function generateAndSave(prompt, filename) {
  console.log(`   🎨 Generando: ${filename}...`);
  console.log(`      Prompt: ${prompt.substring(0, 100)}...`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '1:1' }, // Cuadrada para avatar
        },
      }),
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const base64Data = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Data) throw new Error('No image data returned');

    const buffer = Buffer.from(base64Data, 'base64');
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'cover' })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(filename, optimizedBuffer);
    console.log(`      ✅ Guardada (${(optimizedBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    console.error(`      ❌ Error: ${error.message}`);
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const martinPrompt = "A friendly and confident young adult man (28-35 years old, Latin American features) smiling gently, looking slightly off-camera towards the right. He is standing next to a modern compact car (like a VW Polo or Fiat Cronos) on a typical residential street in a middle-class neighborhood of Buenos Aires, Argentina. The background is slightly blurred. Natural daylight. Realistic amateur phone photo. The image should convey reliability and approachability.";
  
  await generateAndSave(martinPrompt, path.join(OUTPUT_DIR, 'martin-testimonial.jpg'));
  console.log('\n✨ ¡Foto de Martín generada!');
}

main();
