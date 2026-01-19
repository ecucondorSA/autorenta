const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');
const { getGeminiApiUrl } = require('./config');

// Configuración API
const API_URL = getGeminiApiUrl();
const MAX_DIMENSION = 1200; // Calidad Web
const OUTPUT_DIR = 'src/assets/images/cars';

// Definición de la Flota a Generar
const FLEET = [
  {
    id: 'toyota-corolla',
    prompt_base: '2023 Toyota Corolla, white sedan',
    context: 'parked on a modern suburban street with trees',
    vibe: 'clean, reliable, family friendly'
  },
  {
    id: 'ford-ranger',
    prompt_base: '2023 Ford Ranger, silver pickup truck',
    context: 'driving on a dirt road with dust kicking up, golden hour',
    vibe: 'rugged, powerful, adventure'
  },
  {
    id: 'vw-gol',
    prompt_base: '2022 Volkswagen Gol, red compact hatchback',
    context: 'parked near a trendy coffee shop in the city',
    vibe: 'urban, agile, young'
  },
  {
    id: 'jeep-compass',
    prompt_base: '2023 Jeep Compass, dark blue SUV',
    context: 'parked at a scenic overlook with mountains in background',
    vibe: 'premium, travel, comfort'
  }
];

const ANGLES = [
  {
    suffix: 'front',
    prompt_mod: 'Angle: 3/4 front view. Style: High quality automotive photography, realistic lighting, natural shadows.'
  },
  {
    suffix: 'interior',
    prompt_mod: 'Interior view from driver seat looking at dashboard and steering wheel. Details: Coffee cup in holder, modern infotainment screen. Style: POV, inviting, clean.'
  },
  {
    suffix: 'rear',
    prompt_mod: 'Angle: 3/4 rear view. Style: Cinematic lighting, realistic environment, depth of field.'
  }
];

// Función Helper para Delay (evitar rate limits)
const delay = ms => new Promise(res => setTimeout(res, ms));

async function generateAndSave(prompt, filename) {
  console.log(`   🎨 Generando: ${filename}...`);
  // console.log(`      Prompt: ${prompt.substring(0, 50)}...`);

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

    // Optimizar con Sharp
    const optimizedBuffer = await sharp(buffer)
      .resize({ width: MAX_DIMENSION, withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(filename, optimizedBuffer);
    console.log(`      ✅ Guardada (${(optimizedBuffer.length / 1024).toFixed(0)} KB)`);
    return true;

  } catch (error) {
    console.error(`      ❌ Error: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🚀 Iniciando Generación de Flota (12 Fotos)...');

  for (const car of FLEET) {
    console.log(`
🚗 Procesando: ${car.id} (${car.prompt_base})`);
    
    for (const angle of ANGLES) {
      const filename = path.join(OUTPUT_DIR, `${car.id}-${angle.suffix}.jpg`);
      
      // Construir Prompt Completo
      const fullPrompt = `Generate a photo-realistic image of a ${car.prompt_base}, ${car.context}. ${car.vibe}. ${angle.prompt_mod}. No text, no watermarks, realistic textures.`;
      
      await generateAndSave(fullPrompt, filename);
      
      // Pequeña pausa para ser gentiles con la API
      await delay(2000);
    }
  }

  console.log('\n✨ ¡Proceso finalizado!');
}

main();
