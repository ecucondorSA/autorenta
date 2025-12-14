const fs = require('fs');
const https = require('https');
const sharp = require('sharp');
const path = require('path');

const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=AIzaSyCaCYhyWhBrOSfNsIKsiWH4MMgD7J7_zVw';
const MAX_DIMENSION = 1200;
const OUTPUT_DIR = 'src/assets/images/cars';

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
  "slightly high angle looking down"
];

const LIGHTING = [
  "bright harsh sunlight with strong shadows",
  "overcast day with soft flat light",
  "late afternoon golden hour",
  "morning cool light"
];

const IMPERFECTIONS = [
  "reflections of a house on the hood",
  "slightly dirty tires from road use",
  "leaves on the ground near the tires",
  "background slightly cluttered with neighborhood elements"
];

// --- LISTA REAL (BARRIOS REALES) ---
const REAL_FLEET = [
  {
    id: 'vw-gol',
    model: '2022 Volkswagen Gol silver hatchback',
    context: 'parked on a simple residential street in Ezeiza, Argentina, modest brick houses in background, not wealthy area'
  },
  {
    id: 'fiat-cronos',
    model: '2023 Fiat Cronos white sedan',
    context: 'parked on a quiet street in Durazno, Uruguay, green grass on sidewalk, one story houses'
  },
  {
    id: 'ford-ka',
    model: '2021 Ford Ka red hatchback',
    context: 'parked on a street in a working class neighborhood (barrio) in Buenos Aires, metal gates (rejas) visible'
  },
  {
    id: 'fiat-toro',
    model: '2023 Fiat Toro black pickup',
    context: 'parked on a cobblestone street in Santana do Livramento, Brazil, border town vibe'
  },
  {
    id: 'chevrolet-cruze',
    model: '2023 Chevrolet Cruze black sedan',
    context: 'parked on a concrete driveway of a middle class house in Cordoba, Argentina'
  },
  {
    id: 'fiat-ducato',
    model: '2023 Fiat Ducato white van',
    context: 'parked near a small local shop (almacen) in a town in Santa Fe, Argentina'
  },
  {
    id: 'porsche-911',
    model: '2024 Porsche 911 silver convertible',
    context: 'parked on a street in Punta del Este, Uruguay, pine trees in background'
  },
  {
    id: 'toyota-corolla',
    model: '2022 Toyota Corolla white sedan',
    context: 'parked on a street in a residential barrio of Rosario, Argentina, tile sidewalk'
  }
];

const delay = ms => new Promise(res => setTimeout(res, ms));

async function generateAndSave(prompt, filename) {
  console.log(`   🎨 Generando: ${filename}...`);
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
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  console.log('🚀 Iniciando Generación de Flota: Variabilidad Humana + Contexto BARRIO...');

  for (const car of REAL_FLEET) {
    console.log(`
🚗 Procesando: ${car.id} en ${car.context.substring(0, 30)}...`);
    
    const variations = ['front', 'interior', 'rear'];
    
    for (const suffix of variations) {
      const filename = path.join(OUTPUT_DIR, `${car.id}-${suffix}.jpg`);
      
      let specificPrompt = "";
      const angle = pick(ANGLES);
      const height = pick(CAMERA_HEIGHTS);
      const light = pick(LIGHTING);
      const imp = pick(IMPERFECTIONS);
      
      if (suffix === 'front') {
        specificPrompt = `Realistic amateur smartphone photo of a ${car.model}. Location: ${car.context}. View: ${angle}, taken from ${height}. Lighting: ${light}. Detail: ${imp}. Style: Realistic street photography, Latin American working class neighborhood aesthetic, authentic, not staged.`;
      } else if (suffix === 'interior') {
        specificPrompt = `POV photo from driver seat of a ${car.model}. Steering wheel, dashboard. Outside window view shows a neighborhood street in South America with ${light}. Style: Quick snapshot, realistic textures.`;
      } else if (suffix === 'rear') {
        specificPrompt = `Realistic amateur smartphone photo of the rear of a ${car.model}, ${car.context}. Angle: 3/4 rear view. Lighting: ${light}. Style: Authentic snapshot in South American barrio.`;
      }

      await generateAndSave(specificPrompt, filename);
      await delay(2500);
    }
  }
}

main();
