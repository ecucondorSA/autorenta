const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=AIzaSyCaCYhyWhBrOSfNsIKsiWH4MMgD7J7_zVw';
const OUTPUT_DIR_AVATARS = 'src/assets/images/avatars';
const OUTPUT_DIR_UI = 'src/assets/images/ui';

// Asegurar directorios
if (!fs.existsSync(OUTPUT_DIR_AVATARS)) fs.mkdirSync(OUTPUT_DIR_AVATARS, { recursive: true });
if (!fs.existsSync(OUTPUT_DIR_UI)) fs.mkdirSync(OUTPUT_DIR_UI, { recursive: true });

async function generateAndSave(prompt, filename, size = 800) {
  console.log(`   🎨 Generando: ${filename}...`);
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
          imageConfig: { aspectRatio: '1:1' }, // Cuadrada para todo
        },
      }),
    });

    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    const base64Data = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Data) throw new Error('No image data returned');

    const buffer = Buffer.from(base64Data, 'base64');
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: size, height: size, fit: 'cover' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(filename, optimizedBuffer);
    console.log(`      ✅ Guardada (${(optimizedBuffer.length / 1024).toFixed(0)} KB)`);
  } catch (error) {
    console.error(`      ❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🚀 Iniciando Generación de Assets de Delight (Empty States & Avatars)...');

  // 1. Empty State
  const emptyStatePrompt = "A beautiful, empty cobblestone street in San Telmo, Buenos Aires or Colonia, Uruguay. Late afternoon warm light. A vintage bicycle leaning against a wall. No cars, no people. Peaceful, nostalgic atmosphere. Realistic photography.";
  await generateAndSave(emptyStatePrompt, path.join(OUTPUT_DIR_UI, 'empty-search-street.jpg'), 1000);

  // 2. Avatares (Diversidad LATAM)
  const avatars = [
    { name: 'avatar-1.jpg', prompt: "Selfie of a young latin american woman (25 years old) smiling naturally outdoors. Casual clothing, city park background. Friendly and approachable. Amateur phone photo quality." },
    { name: 'avatar-2.jpg', prompt: "Selfie of a middle-aged latin american man (40 years old) with a beard, smiling warmly. Wearing a t-shirt. Urban street background. Authentic look." },
    { name: 'avatar-3.jpg', prompt: "Selfie of a young latin american man (22 years old) laughing. Casual style, maybe a cap. Sunny day outdoors. High energy." },
    { name: 'avatar-4.jpg', prompt: "Selfie of a senior latin american woman (60 years old) smiling gently. Garden background. Natural light. Grandmotherly vibe." }
  ];

  for (const avatar of avatars) {
    await generateAndSave(avatar.prompt, path.join(OUTPUT_DIR_AVATARS, avatar.name), 400);
  }

  console.log('\n✨ ¡Assets generados!');
}

main();
