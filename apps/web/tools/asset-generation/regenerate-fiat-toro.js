const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=AIzaSyCaCYhyWhBrOSfNsIKsiWH4MMgD7J7_zVw';
const MAX_DIMENSION = 1200;
const OUTPUT_DIR = 'src/assets/images/cars';

async function generateAndSave(prompt, filename) {
  console.log(`   🎨 Regenerando: ${filename}...`);
  console.log(`      Prompt: ${prompt.substring(0, 100)}...`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '4:3' },
        },
      }),
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const base64Data = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Data) throw new Error('No image data returned');

    const buffer = Buffer.from(base64Data, 'base64');
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: MAX_DIMENSION, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(filename, optimizedBuffer);
    console.log(`      ✅ Guardada (${(optimizedBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    console.error(`      ❌ Error: ${error.message}`);
  }
}

async function main() {
  const toro = {
    id: "d8e47708-b9f9-460a-bf7b-81ed68bf601c",
    brand: "Fiat",
    model: "Toro",
    year: 2025,
    color: "black pickup"
  };
  
  // Prompt corregido: Estacionado junto al cordón, adoquines reales, contexto Brasil frontera
  const frontPrompt = `Snapshot of a ${toro.year} ${toro.color} ${toro.brand} ${toro.model} parked properly next to the curb on a cobblestone street in a small Brazilian town. Foreground shows the sidewalk edge. Background shows simple colorful houses. Bright sunlight. Realistic amateur photo, not a render. The car is dirty from road dust.`;
  
  await generateAndSave(frontPrompt, path.join(OUTPUT_DIR, `${toro.id}-front.jpg`));
}

main();
