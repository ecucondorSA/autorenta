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
  const car = { id: 'ford-ka', model: '2021 Ford Ka red hatchback', context: 'parked on a street in a working class neighborhood (barrio) in Buenos Aires, metal gates (rejas) visible' };
  
  const frontPrompt = `Realistic amateur smartphone photo of a ${car.model}. Location: ${car.context}. View: front 3/4 view from the left, shot from eye level standing up. Lighting: overcast day with soft flat light. Detail: reflections of a house on the hood. Style: Realistic street photography, Latin American working class neighborhood aesthetic, authentic, not staged.`;
  
  await generateAndSave(frontPrompt, path.join(OUTPUT_DIR, `${car.id}-front.jpg`));
}

main();
