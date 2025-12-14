const fs = require('fs');
const https = require('https');

// Configuración
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=AIzaSyCaCYhyWhBrOSfNsIKsiWH4MMgD7J7_zVw';

// ==========================================
// 1. GENERADOR DE PROMPTS "HUMANIZADOS"
// ==========================================
function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const scenarios = [
  "parked on a gravel shoulder next to a rural road",
  "parked on a quiet suburban street with dappled sunlight",
  "parked near a small coffee shop with asphalt pavement",
  "stopped on a dirt road with a scenic background",
  "parked in a public parking lot with faint white lines"
];

const weathers = [
  "sunny day with hard shadows",
  "overcast day with soft diffused light",
  "late afternoon golden hour",
  "slightly windy day with dust in the air"
];

const humanDetails = [
  "a paper coffee cup in the center console",
  "a pair of sunglasses left on the dashboard",
  "a charging cable plugged in",
  "a jacket thrown casually on the passenger seat",
  "a water bottle in the door pocket"
];

const wearAndTear = [
  "light road dust on the lower panels",
  "tires looking slightly used and gray",
  "very subtle water spots on the glass",
  "everyday use condition, not showroom clean"
];

const selectedScenario = getRandomElement(scenarios);
const selectedWeather = getRandomElement(weathers);
const selectedDetail = getRandomElement(humanDetails);
const selectedWear = getRandomElement(wearAndTear);

// Prompt construido dinámicamente
const prompt = `Generate a hyper-realistic photo of a 2022 Toyota Corolla. 
Context: ${selectedScenario}. 
Lighting/Weather: ${selectedWeather}. 
Interior/Visible Detail: If interior is visible, show ${selectedDetail}. 
Condition: ${selectedWear}. 
Style: Handheld smartphone photo taken at eye level. 
Important: The car should look used by a real human, not a pristine 3D render. Avoid perfect reflections. 
Framing: 3/4 front view.`;

const requestBody = {
  contents: [
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ],
  generationConfig: {
    responseModalities: ['IMAGE'],
    imageConfig: {
      aspectRatio: '4:3',
    },
  },
};

console.log('🚀 Iniciando generación con Prompt Humanizado:');
console.log(`"${prompt}"`);

// ==========================================
// 3. EJECUCIÓN PRINCIPAL
// ==========================================
async function generateImage() {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error HTTP: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const inlineData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData;

    if (!inlineData || !inlineData.data) {
      console.error('❌ No se encontraron datos de imagen.');
      return;
    }

    const filename = `humanized-car.jpg`;
    console.log('🔄 Guardando imagen (sin compresión en este entorno de prueba)...');
    
    // Guardar directamente el base64
    fs.writeFileSync(filename, inlineData.data, 'base64');
    
    const stats = fs.statSync(filename);
    console.log(`🎉 Imagen generada guardada: ${filename}`);
    console.log(`📏 Tamaño original: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`⚠️ Nota: La compresión a 500KB se realizará en el navegador del usuario usando canvas.`);

  } catch (error) {
    console.error('🚨 Error:', error.message);
  }
}

generateImage();
