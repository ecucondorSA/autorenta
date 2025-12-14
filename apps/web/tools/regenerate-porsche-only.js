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
      .jpeg({ quality: 80, mozjpeg: true }) // Calidad un poco menor para ayudar al look amateur
      .toBuffer();

    fs.writeFileSync(filename, optimizedBuffer);
    console.log(`      ✅ Guardada (${(optimizedBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    console.error(`      ❌ Error: ${error.message}`);
  }
}

async function main() {
  const porsche = {
    id: "d2cfd10d-701b-4671-a75a-86a8b31fdb95",
    brand: "Porsche",
    model: "911 Carrera 4 GTS Cabri. 3.0 24V (992)",
    year: 2024,
    color: "silver convertible"
  };
  
  // Prompt "Dirty Realism" para lujo
  const imperfectContext = "parked on a street near the beach in Punta del Este, Uruguay. Real street background, maybe a sidewalk curb.";
  const imperfectStyle = "Amateur smartphone photo, slightly overexposed sunlight, harsh shadows. The car looks real, with reflections of the street. Not a studio render. Slightly unlevel horizon.";
  
  const frontPrompt = `Snapshot of a ${porsche.year} ${porsche.color} ${porsche.brand} ${porsche.model}, ${imperfectContext}. ${imperfectStyle}. No filters.`;
  
  await generateAndSave(frontPrompt, path.join(OUTPUT_DIR, `${porsche.id}-front.jpg`));
}

main();