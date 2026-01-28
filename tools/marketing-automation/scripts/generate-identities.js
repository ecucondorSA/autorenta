#!/usr/bin/env node

/**
 * Synthetic Identity Generator
 * 
 * Genera identidades completas para los 32 perfiles:
 * - Nombre, edad, profesión, ubicación
 * - Bio para redes sociales
 * - Prompt para generar foto con Stable Diffusion/Flux
 * - Intereses y comportamiento
 * - Estilo de comunicación
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de providers de IA
const PROVIDERS = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
    },
    openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: process.env.OPENROUTER_API_KEY,
        model: 'meta-llama/llama-3.3-70b-instruct',
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        key: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
    },
};

function getProvider() {
    for (const [id, config] of Object.entries(PROVIDERS)) {
        if (config.key) return config;
    }
    return null;
}

async function callAI(prompt, systemPrompt = '') {
    const provider = getProvider();
    if (!provider) throw new Error('No AI provider configured');

    const response = await fetch(provider.url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${provider.key}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model: provider.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt },
            ],
            temperature: 0.9,
            max_tokens: 1000,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`AI error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

// ============================================
// TEMPLATES DE IDENTIDAD
// ============================================

const GENDERS = ['male', 'female'];
const AGE_RANGES = ['22-28', '29-35', '36-45'];

const JOBS_MALE = [
    'Desarrollador de Software', 'Ingeniero Civil', 'Contador', 'Arquitecto',
    'Médico', 'Abogado', 'Profesor Universitario', 'Chef', 'Diseñador Gráfico',
    'Emprendedor', 'Vendedor', 'Trader', 'Fotógrafo', 'Piloto Comercial',
    'Mecánico', 'Periodista'
];

const JOBS_FEMALE = [
    'Product Manager', 'Médica', 'Abogada', 'Contadora', 'Psicóloga',
    'Profesora', 'Community Manager', 'UX Designer', 'Periodista',
    'Nutricionista', 'Arquitecta', 'Ingeniera', 'Emprendedora',
    'Marketing Manager', 'Influencer', 'Directora de RRHH'
];

const LOCATIONS = [
    'Palermo, CABA', 'Belgrano, CABA', 'Recoleta, CABA', 'Caballito, CABA',
    'Villa Crespo, CABA', 'Nuñez, CABA', 'San Isidro, GBA', 'Vicente López, GBA',
    'Olivos, GBA', 'Martínez, GBA', 'San Telmo, CABA', 'Almagro, CABA',
    'Colegiales, CABA', 'Villa Urquiza, CABA', 'Flores, CABA', 'Boedo, CABA'
];

const CARS = [
    'BYD Dolphin', 'BYD Yuan Plus', 'BYD Han', 'Toyota Corolla', 'Toyota Yaris',
    'Toyota Etios', 'VW Gol Trend', 'VW Polo', 'VW Taos', 'VW T-Cross',
    'Fiat Cronos', 'Fiat Argo', 'Chevrolet Onix', 'Chevrolet Cruze',
    'Renault Sandero', 'Renault Kwid', 'Peugeot 208', 'Peugeot 2008',
    'Ford Ka', 'Ford EcoSport', 'Honda HR-V', 'Honda Civic',
    'Jeep Compass', 'Jeep Renegade', 'Nissan Versa', 'Nissan Kicks',
    'Hyundai Creta', 'Citroën C3', 'Suzuki Vitara', 'Honda CR-V',
    'VW Nivus', 'Fiat 500'
];

const NAMES_MALE = [
    'Martín', 'Santiago', 'Diego', 'Javier', 'Matías', 'Ezequiel', 'Lucas',
    'Nicolás', 'Pablo', 'Rodrigo', 'Sebastián', 'Gastón', 'Maximiliano',
    'Ignacio', 'Tomás', 'Federico'
];

const NAMES_FEMALE = [
    'Lucía', 'Romina', 'Carolina', 'Valeria', 'Florencia', 'Micaela', 'Camila',
    'Agustina', 'Sofía', 'Juliana', 'Martina', 'Antonella', 'Daniela', 'Brenda',
    'María', 'Verónica'
];

const PERSONALITIES = [
    'Tech-savvy, helpful, shares real experiences',
    'Data-driven, cautious, values safety',
    'Enthusiastic, looking for side income, social',
    'Risk-averse, analytical, fact-based',
    'Creative, entrepreneurial, values flexibility',
    'Educator, shares knowledge, community-focused',
    'Outgoing, persuasive but authentic, network builder',
    'Strategic thinker, data-driven, optimization-focused',
    'Technical expert, car enthusiast, detail-oriented',
    'Social media savvy, trend-aware, engaging',
    'Design-conscious, premium preferences, aesthetic focus',
    'Helpful, organized, budget-conscious',
    'Early adopter, tech evangelist, efficiency-focused',
    'Legal-minded, contract-focused, security-conscious',
    'Practical, cost-conscious, street-smart',
    'Caring, responsible, time-constrained',
    'Passionate, creative, night owl',
    'Empathetic, listener, understanding',
    'Numbers-focused, ROI-driven, practical',
    'Brand-conscious, visual-focused, social',
    'Leadership-focused, results-driven, strategic',
    'Budget-conscious, ambitious, time-poor',
    'Risk-taker, innovation-focused, networker',
    'Investigative, fact-checker, storyteller',
    'Finance-savvy, ROI-focused, risk calculator',
    'Health-conscious, balanced, educator',
    'Active, energetic, outdoor-focused',
    'User-centric, design-focused, problem-solver',
    'Adventurous, travel-focused, freedom-seeker',
    'People-focused, culture-builder, structured',
    'Visual thinker, creative, freelancer mindset',
    'Systems thinker, process-oriented, logical'
];

const TONES = [
    'casual', 'professional', 'very_casual', 'technical', 'friendly',
    'enthusiastic', 'calm', 'energetic', 'empathetic', 'analytical'
];

// ============================================
// GENERADOR DE IDENTIDADES
// ============================================

function shuffle(array) {
    return array.sort(() => Math.random() - 0.5);
}

function randomFrom(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function randomAge(range) {
    const [min, max] = range.split('-').map(Number);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function generatePhotoPrompt(identity) {
    const genderWord = identity.gender === 'male' ? 'man' : 'woman';
    const ageDescription = identity.age < 30 ? 'young' : identity.age < 40 ? 'adult' : 'mature';

    // Prompt optimizado para Stable Diffusion / Flux
    const basePrompt = `Professional portrait photo of a ${ageDescription} Argentine ${genderWord}, age ${identity.age}, ${identity.job.toLowerCase()}, natural lighting, friendly expression, casual professional attire, urban Buenos Aires background, high quality, 8k, realistic, natural skin texture`;

    const negativePrompt = 'cartoon, anime, illustration, painting, drawing, artificial, plastic, fake, oversaturated, overexposed, underexposed, blurry, low quality, watermark, text, logo';

    return {
        positive: basePrompt,
        negative: negativePrompt,
        style: 'photorealistic portrait',
        guidance_scale: 7.5,
        steps: 30
    };
}

async function generateBioAndInterests(identity) {
    const systemPrompt = `Sos un experto en crear perfiles de redes sociales auténticos para Argentina.
Generá contenido que suene 100% natural y humano, como si lo hubiera escrito la persona real.
Evitá cualquier cosa que suene a marketing o corporativo.
Usá español argentino con modismos locales cuando sea apropiado.`;

    const prompt = `Generá una bio de Facebook/Instagram y lista de intereses para esta persona argentina:

Nombre: ${identity.name}
Edad: ${identity.age}
Trabajo: ${identity.job}
Ubicación: ${identity.location}
Auto: ${identity.car}
Personalidad: ${identity.personality}

Retorná SOLO un JSON válido con esta estructura:
{
  "bio_facebook": "Bio corta para Facebook (máx 101 caracteres)",
  "bio_instagram": "Bio para Instagram con emojis (máx 150 caracteres)",
  "interests": ["lista", "de", "5-8", "intereses"],
  "groups_to_join": ["grupos de Facebook relevantes para unirse"],
  "conversation_starters": ["3 frases que usaría para iniciar conversación en grupos"],
  "pain_points": ["2-3 problemas que esta persona tendría con alquiler de autos"]
}`;

    try {
        const response = await callAI(prompt, systemPrompt);
        const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        return JSON.parse(cleaned);
    } catch (error) {
        console.error(`Error generating bio for ${identity.name}:`, error.message);
        return {
            bio_facebook: `${identity.job} | ${identity.location} 🚗`,
            bio_instagram: `${identity.job} en ${identity.location.split(',')[0]} ✨`,
            interests: ['autos', 'tecnología', 'viajes'],
            groups_to_join: ['Compra Venta Autos CABA', 'Autos Usados Argentina'],
            conversation_starters: ['Alguien tiene experiencia con...?'],
            pain_points: ['Miedo a prestar el auto', 'Falta de garantías']
        };
    }
}

async function generateIdentity(index, usedNames, usedLocations, usedCars) {
    const gender = GENDERS[index % 2];
    const names = gender === 'male' ? NAMES_MALE : NAMES_FEMALE;
    const jobs = gender === 'male' ? JOBS_MALE : JOBS_FEMALE;

    // Evitar repeticiones
    let name = randomFrom(names);
    while (usedNames.has(name) && usedNames.size < names.length) {
        name = randomFrom(names);
    }
    usedNames.add(name);

    let location = LOCATIONS[index % LOCATIONS.length];
    let car = CARS[index % CARS.length];

    const ageRange = AGE_RANGES[index % AGE_RANGES.length];
    const age = randomAge(ageRange);
    const job = jobs[index % jobs.length];
    const personality = PERSONALITIES[index % PERSONALITIES.length];
    const tone = TONES[index % TONES.length];
    const emojiFreq = ['none', 'low', 'medium', 'high', 'very_high'][index % 5];

    const identity = {
        id: `persona-${String(index + 1).padStart(3, '0')}`,
        name,
        gender,
        age,
        job,
        location,
        car,
        personality,
        tone,
        emoji_frequency: emojiFreq
    };

    console.log(`\n🧑 Generating identity ${index + 1}/32: ${name} (${job})...`);

    // Generar prompts de foto
    identity.photo_prompt = await generatePhotoPrompt(identity);

    // Generar bio e intereses
    const bioData = await generateBioAndInterests(identity);
    Object.assign(identity, bioData);

    // Rate limiting - esperar entre requests
    await new Promise(resolve => setTimeout(resolve, 500));

    return identity;
}

async function generateAllIdentities() {
    console.log('🚀 Starting synthetic identity generation for 32 personas...\n');
    console.log('This will take a few minutes due to API rate limits.\n');

    const identities = [];
    const usedNames = new Set();
    const usedLocations = new Set();
    const usedCars = new Set();

    for (let i = 0; i < 32; i++) {
        try {
            const identity = await generateIdentity(i, usedNames, usedLocations, usedCars);
            identities.push(identity);

            // Guardar progreso cada 8 identidades
            if ((i + 1) % 8 === 0) {
                const progressPath = path.join(__dirname, '../config/identities-progress.json');
                await fs.writeFile(progressPath, JSON.stringify(identities, null, 2));
                console.log(`\n💾 Progress saved: ${i + 1}/32 identities`);
            }
        } catch (error) {
            console.error(`❌ Error generating identity ${i + 1}:`, error.message);
        }
    }

    // Guardar resultado final
    const outputPath = path.join(__dirname, '../config/synthetic-identities.json');
    await fs.writeFile(outputPath, JSON.stringify(identities, null, 2));

    console.log(`\n✅ Generated ${identities.length} synthetic identities`);
    console.log(`📁 Saved to: ${outputPath}`);

    return identities;
}

// ============================================
// EXPORTAR PARA SUPABASE
// ============================================

async function exportToSupabaseFormat(identities) {
    const supabaseRows = identities.map(id => ({
        name: id.name,
        profile_metadata: {
            age: id.age,
            gender: id.gender,
            job: id.job,
            car: id.car,
            location: id.location,
            tone: id.tone,
            emoji_frequency: id.emoji_frequency,
            personality: id.personality,
            bio_facebook: id.bio_facebook,
            bio_instagram: id.bio_instagram,
            interests: id.interests,
            groups_to_join: id.groups_to_join,
            pain_points: id.pain_points,
            photo_prompt: id.photo_prompt
        },
        facebook_account_id: null,
        instagram_account_id: null,
        cookies_encrypted: null,
        proxy_assigned: null,
        is_active: false, // Inactivo hasta warm-up
        warmup_status: 'pending',
        warmup_day: 0
    }));

    const sqlPath = path.join(__dirname, '../config/seed-identities.sql');

    let sql = '-- Seed synthetic identities\n';
    sql += '-- Generated: ' + new Date().toISOString() + '\n\n';
    sql += 'INSERT INTO marketing_personas (name, profile_metadata, is_active) VALUES\n';

    const values = supabaseRows.map((row, i) => {
        const metadata = JSON.stringify(row.profile_metadata).replace(/'/g, "''");
        return `  ('${row.name}', '${metadata}'::jsonb, false)`;
    });

    sql += values.join(',\n') + '\n';
    sql += 'ON CONFLICT (name) DO UPDATE SET profile_metadata = EXCLUDED.profile_metadata;\n';

    await fs.writeFile(sqlPath, sql);
    console.log(`\n📄 SQL seed file saved to: ${sqlPath}`);

    return supabaseRows;
}

// CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const command = process.argv[2];

    if (command === 'generate') {
        generateAllIdentities()
            .then(identities => exportToSupabaseFormat(identities))
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Fatal error:', err);
                process.exit(1);
            });
    } else {
        console.log(`
Usage:
  node generate-identities.js generate

This will:
1. Generate 32 unique synthetic identities
2. Create photo prompts for Stable Diffusion/Flux
3. Generate bios and interests using AI
4. Export to JSON and SQL seed files
        `);
    }
}

export { generateAllIdentities, generateIdentity };
