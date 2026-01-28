#!/usr/bin/env node

/**
 * AI Content Generator for Guerrilla Marketing
 * 
 * Genera contenido auténtico usando Groq/OpenAI basado en contexto del post objetivo
 * y el perfil de la persona asignada.
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// MULTI-PROVIDER CONFIGURATION
// ============================================
// Priority: GROQ > OPENROUTER > OPENAI
// System auto-selects first available provider

const PROVIDERS = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        key: process.env.GROQ_API_KEY,
        model: 'llama-3.3-70b-versatile',
        name: 'Groq (Llama 3.3)',
    },
    openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        key: process.env.OPENROUTER_API_KEY,
        model: 'meta-llama/llama-3.3-70b-instruct',  // Free model
        name: 'OpenRouter (Llama 3.3)',
        headers: {
            'HTTP-Referer': 'https://autorenta.com',
            'X-Title': 'AutoRenta Marketing',
        }
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        key: process.env.OPENAI_API_KEY,
        model: 'gpt-4o-mini',
        name: 'OpenAI (GPT-4o Mini)',
    },
};

/**
 * Selecciona el provider disponible (primero con API key)
 */
function getActiveProvider() {
    for (const [id, config] of Object.entries(PROVIDERS)) {
        if (config.key) {
            console.log(`✅ Using AI provider: ${config.name}`);
            return { id, ...config };
        }
    }
    return null;
}

/**
 * Carga el system prompt desde archivo
 */
async function loadSystemPrompt() {
    const promptPath = path.join(__dirname, '../prompts/guerrilla-system-prompt.md');
    return await fs.readFile(promptPath, 'utf-8');
}

/**
 * Carga las personas desde config
 */
async function loadPersonas() {
    const personasPath = path.join(__dirname, '../config/personas.json');
    const data = await fs.readFile(personasPath, 'utf-8');
    return JSON.parse(data);
}

/**
 * Adapta el system prompt a la persona específica
 */
function personalizePrompt(basePrompt, persona) {
    const { name, profile_metadata } = persona;
    const { age, job, car, location, tone, emoji_frequency, personality } = profile_metadata;

    const personaContext = `
## TU IDENTIDAD ACTUAL

Nombre: ${name}
Edad: ${age}
Trabajo: ${job}
Auto: ${car}
Ubicación: ${location}
Tono de comunicación: ${tone}
Frecuencia de emojis: ${emoji_frequency}
Personalidad: ${personality}

Habla desde esta identidad. Usa referencias personales coherentes con tu perfil.
`;

    return basePrompt + '\n\n' + personaContext;
}

/**
 * Genera variaciones de frases de apertura
 */
function getRandomOpening(tone) {
    const openings = {
        casual: ['Che', 'Uf', 'Loco', 'Man', 'Hermano', 'Tal cual'],
        professional: ['Personalmente', 'En mi experiencia', 'Desde mi punto de vista'],
        technical: ['Técnicamente', 'Por experiencia', 'Lo que yo haría'],
        very_casual: ['Boludo', 'Amigo', 'Viejo', 'Crack', 'Rey'],
    };

    const category = tone.includes('casual') ? 'casual'
        : tone.includes('professional') ? 'professional'
            : tone.includes('technical') ? 'technical'
                : 'casual';

    const options = openings[category] || openings.casual;
    return options[Math.floor(Math.random() * options.length)];
}

/**
 * Llama a cualquier API compatible con OpenAI
 */
async function callAIProvider(provider, systemPrompt, userPrompt) {
    const headers = {
        'Authorization': `Bearer ${provider.key}`,
        'Content-Type': 'application/json',
        ...provider.headers,
    };

    const response = await fetch(provider.url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            model: provider.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt },
            ],
            temperature: 0.9,
            max_tokens: 300,
            top_p: 0.95,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`${provider.name} API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
}

/**
 * Analiza el contexto del post objetivo
 */
function analyzePostContext(postContent, postMetadata = {}) {
    const keywords = postMetadata.keywords || [];
    const platform = postMetadata.platform || 'facebook';

    // Detectar pain points
    const painPoints = [];
    if (postContent.match(/rob[oó]|afan[oó]|estaf[oó]/i)) {
        painPoints.push('insecurity_theft');
    }
    if (postContent.match(/garant[íi]a|segur[io]/i)) {
        painPoints.push('lack_of_guarantees');
    }
    if (postContent.match(/ingres[oi]s|plata|guita|generar/i)) {
        painPoints.push('passive_income');
    }
    if (postContent.match(/BYD|Dolphin|el[ée]ctric/i)) {
        painPoints.push('electric_cars');
    }
    if (postContent.match(/alquil|rent|arrendar/i)) {
        painPoints.push('car_rental');
    }

    return {
        keywords,
        platform,
        painPoints,
        postLength: postContent.length,
        hasQuestions: postContent.includes('?'),
    };
}

/**
 * Valida que el contenido generado no sea spam
 */
function validateContent(content) {
    const spamIndicators = [
        /descarga.*app/i,
        /visita.*sitio/i,
        /haz.*clic/i,
        /increíble.*oferta/i,
        /revolucionario/i,
        /garantizado.*100%/i,
    ];

    for (const pattern of spamIndicators) {
        if (pattern.test(content)) {
            return { valid: false, reason: 'Contains spam indicators' };
        }
    }

    // Validar longitud
    if (content.length < 30) {
        return { valid: false, reason: 'Content too short' };
    }
    if (content.length > 600) {
        return { valid: false, reason: 'Content too long' };
    }

    // Validar emojis excesivos
    const emojiCount = (content.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 3) {
        return { valid: false, reason: 'Too many emojis' };
    }

    return { valid: true };
}

/**
 * Función principal: Genera contenido para un post
 */
export async function generateContent({
    postContent,
    postMetadata = {},
    personaId = null,
    contentType = 'comment', // 'comment' | 'post' | 'reply'
}) {
    try {
        // Cargar recursos
        const [basePrompt, personas] = await Promise.all([
            loadSystemPrompt(),
            loadPersonas(),
        ]);

        // Seleccionar persona (aleatoria si no se especifica)
        const persona = personaId
            ? personas.find(p => p.id === personaId)
            : personas[Math.floor(Math.random() * personas.length)];

        if (!persona) {
            throw new Error(`Persona ${personaId} not found`);
        }

        // Personalizar prompt
        const systemPrompt = personalizePrompt(basePrompt, persona);

        // Analizar contexto
        const context = analyzePostContext(postContent, postMetadata);

        // Si no hay pain points relevantes, no generar contenido
        if (context.painPoints.length === 0 && !postMetadata.forceGenerate) {
            return {
                content: null,
                should_post: false,
                confidence: 0,
                reasoning: 'No relevant pain points detected in post',
                persona_used: persona.name,
            };
        }

        // Construir user prompt
        const userPrompt = `
POST OBJETIVO (${postMetadata.platform || 'Facebook'}):
"${postContent}"

CONTEXTO:
- Pain points detectados: ${context.painPoints.join(', ')}
- Tipo de contenido a generar: ${contentType}
- Nivel de engagement del post: ${postMetadata.engagement || 'unknown'}

INSTRUCCIONES:
Genera un ${contentType} auténtico respondiendo a este post. 
IMPORTANTE: Debes retornar SOLO un JSON válido con la siguiente estructura:
{
  "content": "tu respuesta aquí",
  "should_post": true/false,
  "confidence": 0.0-1.0,
  "reasoning": "por qué es relevante (o no)",
  "estimated_engagement": "low/medium/high"
}

NO incluyas markdown, NO incluyas explicaciones fuera del JSON.
`;

        // Obtener provider activo
        const provider = getActiveProvider();
        if (!provider) {
            throw new Error('No AI provider configured. Set GROQ_API_KEY, OPENROUTER_API_KEY, or OPENAI_API_KEY in .env');
        }

        // Llamar a IA
        const rawResponse = await callAIProvider(provider, systemPrompt, userPrompt);

        // Parsear respuesta JSON
        let response;
        try {
            // Limpiar respuesta (remover markdown si existe)
            const cleanedResponse = rawResponse
                .replace(/```json\n?/g, '')
                .replace(/```\n?/g, '')
                .trim();
            response = JSON.parse(cleanedResponse);
        } catch (parseError) {
            console.error('Failed to parse AI response:', rawResponse);
            throw new Error(`AI response is not valid JSON: ${parseError.message}`);
        }

        // Validar contenido
        if (response.should_post && response.content) {
            const validation = validateContent(response.content);
            if (!validation.valid) {
                response.should_post = false;
                response.reasoning = `Content validation failed: ${validation.reason}`;
                response.confidence = 0;
            }
        }

        // Agregar metadata
        response.persona_used = persona.name;
        response.persona_id = persona.id;
        response.context = context;
        response.generated_at = new Date().toISOString();

        return response;
    } catch (error) {
        console.error('Error generating content:', error);
        return {
            content: null,
            should_post: false,
            confidence: 0,
            reasoning: `Error: ${error.message}`,
            error: error.message,
        };
    }
}

// CLI execution
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log(`
Usage:
  node generate-content.js <post-content> [options]

Options:
  --persona-id <id>     Specific persona to use
  --platform <name>     Platform (facebook, instagram, twitter)
  --type <type>         Content type (comment, post, reply)
  --force               Force generation even without pain points

Example:
  node generate-content.js "Alguien sabe dónde alquilar un auto seguro en CABA?" --platform facebook
    `);
        process.exit(0);
    }

    const postContent = args[0];
    const personaId = args.includes('--persona-id') ? args[args.indexOf('--persona-id') + 1] : null;
    const platform = args.includes('--platform') ? args[args.indexOf('--platform') + 1] : 'facebook';
    const contentType = args.includes('--type') ? args[args.indexOf('--type') + 1] : 'comment';
    const forceGenerate = args.includes('--force');

    generateContent({
        postContent,
        postMetadata: { platform, forceGenerate },
        personaId,
        contentType,
    }).then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.should_post ? 0 : 1);
    });
}
