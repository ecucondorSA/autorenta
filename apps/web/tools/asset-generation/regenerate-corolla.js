const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');
const { getGeminiApiUrl } = require('./config');

const API_URL = getGeminiApiUrl();
const MAX_DIMENSION = 1200;
const OUTPUT_DIR = 'src/assets/images/cars';

async function generateAndSave(prompt, filename) {
  console.log(`   🎨 Regenerando: ${filename}...`);
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
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(filename, optimizedBuffer);
    console.log(`      ✅ Guardada (${(optimizedBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    console.error(`      ❌ Error: ${error.message}`);
  }
}

async function main() {
  const car = { id: 'toyota-corolla', model: '2022 Toyota Corolla white sedan' };
  
  // Prompt LATAM específico
  const latamContext = "parked on a cobblestone street in Palermo Soho, Buenos Aires, with local architecture style houses in background, jacaranda trees";
  const latamLighting = "warm afternoon sunlight typical of South America";

  // Front
  await generateAndSave(
    `Realistic smartphone photo of a ${car.model}, ${latamContext}. Angle: 3/4 front view. Lighting: ${latamLighting}. Style: Amateur street photography, authentic Latin American urban vibe.`, 
    path.join(OUTPUT_DIR, `${car.id}-front.jpg`)
  );

  // Rear
  await generateAndSave(
    `Realistic smartphone photo of the rear of a ${car.model}, ${latamContext}. Angle: 3/4 rear view. Lighting: ${latamLighting}. Style: Casual snapshot.`,
    path.join(OUTPUT_DIR, `${car.id}-rear.jpg`)
  );
  
  // Interior (Neutral, pero con vibe realista)
  await generateAndSave(
    `POV photo from driver seat of a ${car.model}. Steering wheel, dashboard. Outside window view shows a latin american street. Lighting: Natural daylight.`,
    path.join(OUTPUT_DIR, `${car.id}-interior.jpg`)
  );
}

main();
