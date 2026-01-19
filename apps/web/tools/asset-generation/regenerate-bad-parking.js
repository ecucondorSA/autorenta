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
  // console.log(`      Prompt: ${prompt.substring(0, 100)}...`);
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
  // 1. Ford Ka
  const ka = { id: 'b288ed1c-9544-44e1-b159-8e3335425051', model: '2021 Ford Ka red hatchback' };
  const kaPrompt = `Snapshot of a ${ka.model} parked parallel to the curb on a residential street in Buenos Aires. Visible sidewalk in foreground. The car is parked next to a house gate (rejas). Not in the middle of the road. Realistic, slightly dirty.`;
  await generateAndSave(kaPrompt, path.join(OUTPUT_DIR, `${ka.id}-front.jpg`));

  // 2. VW Gol
  const gol = { id: '628e8fa3-78b8-46de-bd4d-ad8fd5f1ad0e', model: '2022 Volkswagen Gol silver hatchback' };
  const golPrompt = `Snapshot of a ${gol.model} parked next to the sidewalk in Ezeiza, Argentina. The car is clearly parked on the side of the road, not driving. Background of modest brick houses. Casual photo style.`;
  await generateAndSave(golPrompt, path.join(OUTPUT_DIR, `${gol.id}-front.jpg`));
}

main();
