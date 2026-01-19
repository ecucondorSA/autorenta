const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');
const { getGeminiApiUrl } = require('./config');

const API_URL = getGeminiApiUrl();
const MAX_DIMENSION = 1200;
const OUTPUT_DIR = 'src/assets/images/cars';
const MANIFEST_FILE = 'src/assets/generated_photos_manifest.json';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// --- VARIABLES DE CAOS (Variabilidad Humana) ---
const ANGLES = [
  "front 3/4 view from the left",
  "front 3/4 view from the right",
  "direct front view",
  "side profile slightly angled to front",
  "wide angle shot from the corner",
  "close up front view from standing height"
];

const CAMERA_HEIGHTS = [
  "shot from eye level standing up",
  "low angle shot (crouching)",
  "slightly high angle looking down",
  "chest level shot"
];

const LIGHTING = [
  "bright harsh sunlight with strong shadows",
  "overcast day with soft flat light",
  "dappled sunlight through trees",
  "golden hour warm light",
  "morning cool light"
];

const IMPERFECTIONS = [
  "reflections of a house on the hood",
  "slightly dirty tires from road use",
  "leaves on the ground near the tires",
  "background slightly cluttered with neighborhood elements",
  "a small puddle nearby",
  "a crack in the pavement"
];

// --- CONTEXTOS LATAM GENERALES para variabilidad ---
const LATAM_CONTEXTS = [
  "parked on a residential street in Buenos Aires with cobblestones and old trees",
  "parked in front of a house with a metal gate (rejas) typical of South America",
  "on a dusty street in a small town in Argentina",
  "parked near a kiosk with spanish signage",
  "on a concrete driveway of a latin american style house",
  "parked on the side of a street with some cracked sidewalk"
];


// --- LISTA REAL BASADA EN LA DB (IDs) ---
const DB_CARS = [
  {"id":"628e8fa3-78b8-46de-bd4d-ad8fd5f1ad0e","brand":"VW - VolksWagen","model":"Gol 1.0 Flex 12V 5p","year":2022,"color":null},
  {"id":"75a7efe3-dc31-4346-a126-c5e3fa734e63","brand":"Fiat","model":"Cronos","year":2023,"color":null},
  {"id":"b288ed1c-9544-44e1-b159-8e3335425051","brand":"Ford","model":"Ka","year":2023,"color":"Rojo"},
  {"id":"10326ee8-2bb1-41a5-ac6e-0f639126b797","brand":"Volkswagen","model":"Gol","year":2021,"color":"Gris"},
  {"id":"d8e47708-b9f9-460a-bf7b-81ed68bf601c","brand":"Fiat","model":"Toro","year":2025,"color":"negro"},
  {"id":"cf33b6b0-94a6-4e8b-844d-8aaa0a32eb14","brand":"Chevrolet","model":"Cruze","year":2025,"color":"negro"},
  {"id":"4da4c7ed-33e9-4a30-92b8-342332d660a9","brand":"Fiat","model":"Ducato","year":2025,"color":"negro"},
  // Saltamos IDs nulos o incompletos del curl
  {"id":"d2cfd10d-701b-4671-a75a-86a8b31fdb95","brand":"Porsche","model":"911 Carrera 4 GTS Cabri. 3.0 24V (992)","year":2024,"color":"No especificado", "context": "parked in front of a modern luxury villa in Punta del Este, Uruguay, with a yacht harbor in the background"},
  {"id":"96091859-8921-46fb-9466-ba409750acdf","brand":"Fiat","model":"Toro Volcano 2.4 16V Flex Aut.","year":2021,"color":"No especificado"},
  {"id":"e4b6542a-8bb9-466d-83bc-54b999a7aec9","brand":"Fiat","model":"Toro Volcano 2.4 16V Flex Aut.","year":2021,"color":"No especificado"},
  {"id":"9fe9a17d-f33c-48e9-9889-8d4f1e876fc6","brand":"Toyota","model":"Corolla","year":2022,"color":"Blanco"}
];

const delay = ms => new Promise(res => setTimeout(res, ms));

async function generateAndSave(prompt, filename) {
  // console.log(`   🎨 Generando: ${filename}...`); // Demasiado output
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

  const generatedIds = []; // IDs de autos con fotos generadas exitosamente

  console.log('🚀 Iniciando Generación de Fotos INDIVIDUALES para cada Auto (Solo Frontal)...');

  for (const car of DB_CARS) {
    console.log(`
🚗 Procesando Auto ID: ${car.id.substring(0, 8)} - ${car.brand} ${car.model}`);
    
    const angle = pick(ANGLES);
    const height = pick(CAMERA_HEIGHTS);
    const light = pick(LIGHTING);
    const imp = pick(IMPERFECTIONS);
    const latamContext = pick(LATAM_CONTEXTS); 
    const carColor = car.color === 'No especificado' || !car.color ? '' : `${car.color} `;

    const fullPrompt = `Realistic amateur smartphone photo of a ${car.year} ${carColor}${car.brand} ${car.model}. Location: ${car.context || latamContext}. View: ${angle}, taken from ${height}. Lighting: ${light}. Detail: ${imp}. Style: Realistic street photography, Latin American working class neighborhood aesthetic, authentic, not staged. No US style houses.`;
    
    const filename = path.join(OUTPUT_DIR, `${car.id}-front.jpg`); 
    const success = await generateAndSave(fullPrompt, filename);

    if (success) {
      generatedIds.push(car.id);
    }

    await delay(3000); 
  }

  // Guardar manifest
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(generatedIds, null, 2));
  console.log(`
📄 Manifest de IDs generados: ${MANIFEST_FILE}`);
  console.log('✨ ¡Generación de fotos individuales finalizada!');
}

main();