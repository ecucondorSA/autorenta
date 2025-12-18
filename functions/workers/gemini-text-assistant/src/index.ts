/**
 * Gemini Text Assistant Worker
 *
 * Provides 6 AI-powered features for Autorenta:
 * 1. Chat Suggestions - Generate 3 response suggestions for chat
 * 2. Legal Assistant - Answer questions about rental terms
 * 3. Trip Planner - Generate travel itineraries
 * 4. Vehicle Checklist - Generate inspection checklists
 * 5. Reputation Analysis - Analyze user reviews and generate reputation summary
 * 6. Car Recommendation - Suggest next car based on rental history
 *
 * API Key is stored in Worker secrets (never exposed to frontend).
 */

// ============================================
// TYPES
// ============================================

export interface Env {
  /** Gemini API key (set via `wrangler secret put GEMINI_API_KEY`) */
  GEMINI_API_KEY: string;
  /** Gemini text model (default: gemini-2.0-flash) */
  GEMINI_TEXT_MODEL?: string;
}

interface ChatSuggestionsRequest {
  conversationHistory: Array<{ role: 'user' | 'recipient'; text: string }>;
  userRole: 'owner' | 'renter';
  bookingContext: {
    bookingId: string;
    status: string;
    startDate: string;
    endDate: string;
    carBrand: string;
    carModel: string;
    ownerName: string;
    renterName: string;
  };
}

interface LegalQuestionRequest {
  question: string;
  bookingTerms: {
    cancellationPolicy: string;
    mileageLimit?: number | null;
    extraKmPrice?: number | null;
    fuelPolicy?: string | null;
    allowedProvinces?: string[] | null;
    maxDistanceKm?: number | null;
    insuranceDeductibleUsd?: number | null;
    allowSecondDriver?: boolean | null;
    secondDriverCost?: number | null;
    allowSmoking?: boolean | null;
    allowPets?: boolean | null;
    allowRideshare?: boolean | null;
  };
  vehicleInfo: {
    brand: string;
    model: string;
    year: number;
  };
}

interface TripPlannerRequest {
  days: number;
  startLocation: string;
  endLocation?: string;
  vehicleType: string;
  preferences?: {
    interests?: string[];
    budget?: 'economico' | 'moderado' | 'premium';
    travelersCount?: number;
    withPets?: boolean;
    withKids?: boolean;
  };
}

interface VehicleChecklistRequest {
  brand: string;
  model: string;
  year: number;
  inspectionType: 'check_in' | 'check_out';
}

interface ReputationAnalysisRequest {
  reviews: Array<{
    rating: number;
    comment: string;
    date: string;
    reviewerName: string;
  }>;
  summary: {
    totalCount: number;
    averageRating: number;
    categoryAverages?: Record<string, number>;
  };
  userProfile: {
    completedTrips: number;
    memberSince: string;
    tier: 'elite' | 'trusted' | 'standard';
  };
}

interface CarRecommendationRequest {
  rentalHistory: Array<{
    carBrand: string;
    carModel: string;
    carYear: number;
    carType: string;
    rentalDays: number;
    rating: number;
    pricePerDay: number;
  }>;
  userPreferences?: {
    budget?: 'economico' | 'moderado' | 'premium';
    preferredType?: string;
    preferredTransmission?: 'manual' | 'automatico';
  };
}

// ============================================
// MAIN HANDLER
// ============================================

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    };

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only POST
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405, corsHeaders);
    }

    // Parse URL to get endpoint
    const url = new URL(request.url);
    const endpoint = url.pathname.split('/').pop();

    try {
      const body = await request.json();
      let result: unknown;

      switch (endpoint) {
        case 'chat-suggestions':
          result = await handleChatSuggestions(env, body as ChatSuggestionsRequest);
          break;
        case 'legal-assistant':
          result = await handleLegalQuestion(env, body as LegalQuestionRequest);
          break;
        case 'trip-planner':
          result = await handleTripPlanner(env, body as TripPlannerRequest);
          break;
        case 'vehicle-checklist':
          result = await handleVehicleChecklist(env, body as VehicleChecklistRequest);
          break;
        case 'reputation-analysis':
          result = await handleReputationAnalysis(env, body as ReputationAnalysisRequest);
          break;
        case 'car-recommendation':
          result = await handleCarRecommendation(env, body as CarRecommendationRequest);
          break;
        default:
          return jsonResponse(
            { success: false, error: `Unknown endpoint: ${endpoint}` },
            404,
            corsHeaders,
          );
      }

      return jsonResponse({ success: true, data: result }, 200, corsHeaders);
    } catch (error) {
      console.error('[Gemini Worker] Error:', error);
      return jsonResponse(
        { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
        500,
        corsHeaders,
      );
    }
  },
};

// ============================================
// ENDPOINT HANDLERS
// ============================================

async function handleChatSuggestions(
  env: Env,
  req: ChatSuggestionsRequest,
): Promise<unknown> {
  const { conversationHistory, userRole, bookingContext } = req;

  const historyText = conversationHistory
    .map((m) => `${m.role === 'user' ? 'Yo' : 'Otro'}: ${m.text}`)
    .join('\n');

  const prompt = `Eres un asistente de comunicacion para Autorentar, plataforma de alquiler de autos P2P en Argentina.

CONTEXTO:
- Estado reserva: ${bookingContext.status}
- Auto: ${bookingContext.carBrand} ${bookingContext.carModel}
- Fechas: ${bookingContext.startDate} - ${bookingContext.endDate}
- Tu rol: ${userRole === 'owner' ? 'Propietario del auto' : 'Locatario (quien alquila)'}

CONVERSACION RECIENTE:
${historyText}

TAREA:
Genera exactamente 3 sugerencias de respuesta para el ${userRole === 'owner' ? 'propietario' : 'locatario'}. Deben ser:
- Cortas (maximo 50 caracteres)
- Apropiadas al contexto de la conversacion
- Profesionales pero amigables
- En espanol argentino informal (tuteo)

FORMATO JSON (responde SOLO el JSON, sin markdown ni explicaciones):
{
  "suggestions": [
    {"id": "1", "text": "texto de la sugerencia", "tone": "friendly", "intent": "confirmation"},
    {"id": "2", "text": "texto de la sugerencia", "tone": "neutral", "intent": "question"},
    {"id": "3", "text": "texto de la sugerencia", "tone": "formal", "intent": "info"}
  ]
}

Valores validos para tone: formal, friendly, neutral
Valores validos para intent: question, confirmation, request, info, greeting`;

  const response = await callGemini(env, prompt);
  const parsed = parseJsonResponse(response);

  return parsed.suggestions || [];
}

async function handleLegalQuestion(env: Env, req: LegalQuestionRequest): Promise<unknown> {
  const { question, bookingTerms, vehicleInfo } = req;

  const termsText = buildTermsText(bookingTerms);

  const prompt = `Eres un asistente legal de Autorentar especializado en alquiler de vehiculos en Argentina.

TERMINOS DEL ALQUILER ACTUAL:
${termsText}

VEHICULO: ${vehicleInfo.brand} ${vehicleInfo.model} ${vehicleInfo.year}

PREGUNTA DEL USUARIO: "${question}"

INSTRUCCIONES:
1. Responde SOLO basandote en los terminos proporcionados arriba
2. Si la informacion no esta en los terminos, indica claramente que no hay info disponible
3. Usa lenguaje simple y directo
4. La respuesta debe ser concisa (maximo 2-3 oraciones)
5. Incluye un disclaimer breve

FORMATO JSON (responde SOLO el JSON, sin markdown ni explicaciones):
{
  "answer": "respuesta a la pregunta",
  "sources": ["nombre del termino usado"],
  "disclaimer": "Esta informacion es orientativa. Consulta el contrato para detalles.",
  "relatedQuestions": ["pregunta relacionada 1", "pregunta relacionada 2"]
}`;

  const response = await callGemini(env, prompt);
  return parseJsonResponse(response);
}

async function handleTripPlanner(env: Env, req: TripPlannerRequest): Promise<unknown> {
  const { days, startLocation, endLocation, vehicleType, preferences } = req;

  const prefsText = preferences
    ? `
- Intereses: ${preferences.interests?.join(', ') || 'No especificado'}
- Presupuesto: ${preferences.budget || 'moderado'}
- Viajeros: ${preferences.travelersCount || 2}
- Con mascotas: ${preferences.withPets ? 'Si' : 'No'}
- Con ninos: ${preferences.withKids ? 'Si' : 'No'}`
    : 'Sin preferencias especificas';

  const prompt = `Eres un experto planificador de viajes en Argentina.

VIAJE:
- Duracion: ${days} dias
- Origen: ${startLocation}
- Destino: ${endLocation || startLocation + ' (viaje circular)'}
- Vehiculo: ${vehicleType}
- Preferencias:${prefsText}

INSTRUCCIONES:
1. Crea un itinerario realista dia por dia
2. Maximo 4 horas de manejo continuo
3. Incluye paradas de descanso cada 2 horas
4. Considera estado de rutas argentinas
5. Incluye tips de seguridad vial
6. Estima kilometros por dia y total
7. Sugiere lugares para pernoctar

FORMATO JSON (responde SOLO el JSON, sin markdown ni explicaciones):
{
  "totalDays": ${days},
  "totalKm": numero_estimado,
  "days": [
    {
      "dayNumber": 1,
      "title": "Titulo del dia (ej: Buenos Aires - Mar del Plata)",
      "activities": [
        {"time": "09:00", "activity": "Descripcion", "location": "Lugar", "duration": "2h", "notes": "opcional"}
      ],
      "overnightLocation": "Ciudad donde pernoctar",
      "estimatedKm": numero
    }
  ],
  "tips": ["tip 1", "tip 2", "tip 3"],
  "warnings": ["advertencia si aplica"]
}`;

  const response = await callGemini(env, prompt);
  return parseJsonResponse(response);
}

async function handleVehicleChecklist(env: Env, req: VehicleChecklistRequest): Promise<unknown> {
  const { brand, model, year, inspectionType } = req;
  const typeText = inspectionType === 'check_in' ? 'RECEPCION (check-in)' : 'DEVOLUCION (check-out)';

  const prompt = `Eres un experto en inspeccion de vehiculos para alquiler P2P.

VEHICULO: ${brand} ${model} (${year})
TIPO DE INSPECCION: ${typeText}

INSTRUCCIONES:
1. Genera un checklist completo para ${typeText} de este vehiculo
2. Incluye items especificos para el modelo ${brand} ${model}
3. Organiza en 4 categorias: Exterior, Interior, Mecanica, Documentacion
4. Marca items criticos (que DEBEN verificarse)
5. Incluye items especificos del modelo si aplica
6. Agrega tips utiles para este modelo

FORMATO JSON (responde SOLO el JSON, sin markdown ni explicaciones):
{
  "vehicleName": "${brand} ${model} ${year}",
  "inspectionType": "${inspectionType}",
  "categories": [
    {
      "name": "Exterior",
      "icon": "car",
      "items": [
        {"id": "ext_1", "label": "Carroceria sin golpes ni rayones", "description": "Revisar todos los paneles", "critical": true, "modelSpecific": false},
        {"id": "ext_2", "label": "Item especifico del modelo", "critical": false, "modelSpecific": true}
      ]
    },
    {
      "name": "Interior",
      "icon": "armchair",
      "items": []
    },
    {
      "name": "Mecanica",
      "icon": "wrench",
      "items": []
    },
    {
      "name": "Documentacion",
      "icon": "file-text",
      "items": []
    }
  ],
  "tips": ["tip especifico para ${brand} ${model}"]
}`;

  const response = await callGemini(env, prompt);
  return parseJsonResponse(response);
}

async function handleReputationAnalysis(
  env: Env,
  req: ReputationAnalysisRequest,
): Promise<unknown> {
  const { reviews, summary, userProfile } = req;

  // Build reviews text
  const reviewsText = reviews
    .slice(0, 10) // Limit to last 10 reviews
    .map((r) => `- ${r.reviewerName}: "${r.comment}" (${r.rating}/5)`)
    .join('\n');

  const tierLabel =
    userProfile.tier === 'elite'
      ? 'Elite (mejor nivel)'
      : userProfile.tier === 'trusted'
        ? 'Trusted (confiable)'
        : 'Standard';

  const prompt = `Eres un analista de reputacion de conductores para Autorentar, plataforma de alquiler de autos P2P en Argentina.

PERFIL DEL USUARIO:
- Nivel: ${tierLabel}
- Viajes completados: ${userProfile.completedTrips}
- Miembro desde: ${userProfile.memberSince}
- Rating promedio: ${summary.averageRating.toFixed(1)}/5
- Total de reviews: ${summary.totalCount}

REVIEWS RECIENTES (de propietarios de autos):
${reviewsText || 'Sin reviews aun'}

INSTRUCCIONES:
1. Genera un resumen CORTO (1-2 frases) de la reputacion del usuario
2. Usa tono positivo y constructivo
3. Incluye 1-2 emojis relevantes
4. Destaca 2-3 puntos positivos si hay reviews
5. Si hay areas de mejora, mencionarlas con tacto
6. Nivel de confianza segun cantidad de reviews (>5: high, 2-5: medium, <2: low)

FORMATO JSON (responde SOLO el JSON, sin markdown ni explicaciones):
{
  "summary": "Resumen en 1-2 frases con emojis",
  "highlights": ["Punto positivo 1", "Punto positivo 2"],
  "improvementAreas": ["Area de mejora si aplica"],
  "confidence": "high" | "medium" | "low"
}`;

  const response = await callGemini(env, prompt);
  return parseJsonResponse(response);
}

async function handleCarRecommendation(
  env: Env,
  req: CarRecommendationRequest,
): Promise<unknown> {
  const { rentalHistory, userPreferences } = req;

  // Build history text
  const historyText = rentalHistory
    .slice(0, 5) // Limit to last 5 rentals
    .map(
      (r) =>
        `- ${r.carBrand} ${r.carModel} (${r.carYear}): ${r.rentalDays} dias, ${r.rating}/5 estrellas, $${r.pricePerDay}/dia`,
    )
    .join('\n');

  // Analyze patterns
  const brands = [...new Set(rentalHistory.map((r) => r.carBrand))];
  const types = [...new Set(rentalHistory.map((r) => r.carType))];
  const avgPrice =
    rentalHistory.reduce((sum, r) => sum + r.pricePerDay, 0) / (rentalHistory.length || 1);
  const avgRating =
    rentalHistory.reduce((sum, r) => sum + r.rating, 0) / (rentalHistory.length || 1);

  const prefsText = userPreferences
    ? `
- Presupuesto preferido: ${userPreferences.budget || 'No especificado'}
- Tipo preferido: ${userPreferences.preferredType || 'No especificado'}
- Transmision: ${userPreferences.preferredTransmission || 'No especificado'}`
    : 'Sin preferencias especificas';

  const prompt = `Eres un asesor de autos para Autorentar, plataforma de alquiler de autos P2P en Argentina.

HISTORIAL DE ALQUILERES DEL USUARIO:
${historyText || 'Sin historial previo'}

PATRONES DETECTADOS:
- Marcas usadas: ${brands.join(', ') || 'Ninguna'}
- Tipos de auto: ${types.join(', ') || 'Ninguno'}
- Precio promedio por dia: $${avgPrice.toFixed(0)} ARS
- Rating promedio dado: ${avgRating.toFixed(1)}/5

PREFERENCIAS DEL USUARIO:
${prefsText}

INSTRUCCIONES:
1. Recomienda UN tipo de auto para su proximo alquiler
2. Basa la recomendacion en patrones de su historial
3. Si dio buenos ratings a ciertos tipos, recomendar similar
4. Si dio malos ratings, evitar esos tipos
5. Considera el presupuesto promedio
6. La explicacion debe ser de 1-2 frases, amigable
7. Sugiere filtros de busqueda concretos

FORMATO JSON (responde SOLO el JSON, sin markdown ni explicaciones):
{
  "recommendedType": "Tipo de auto (ej: SUV compacto, Sedan ejecutivo)",
  "reasoning": "Explicacion de 1-2 frases de por que se recomienda",
  "searchFilters": {
    "brand": "marca sugerida o null",
    "carType": "tipo sugerido",
    "transmission": "manual o automatico o null",
    "minYear": 2018,
    "maxPricePerDay": numero o null
  },
  "alternativeSuggestions": ["Alternativa 1", "Alternativa 2"]
}`;

  const response = await callGemini(env, prompt);
  return parseJsonResponse(response);
}

// ============================================
// HELPERS
// ============================================

async function callGemini(env: Env, prompt: string): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const model = env.GEMINI_TEXT_MODEL || 'gemini-2.0-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini] API Error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from Gemini');
  }

  return text;
}

function parseJsonResponse(text: string): Record<string, unknown> {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    console.error('[Gemini] Failed to parse JSON:', cleaned);
    throw new Error('Invalid JSON response from AI');
  }
}

function buildTermsText(terms: LegalQuestionRequest['bookingTerms']): string {
  const lines: string[] = [];

  lines.push(`- Politica de cancelacion: ${terms.cancellationPolicy}`);

  if (terms.mileageLimit === null || terms.mileageLimit === 0) {
    lines.push('- Kilometraje: ILIMITADO');
  } else if (terms.mileageLimit) {
    lines.push(`- Kilometraje limite: ${terms.mileageLimit} km`);
    if (terms.extraKmPrice) {
      lines.push(`- Costo por km extra: $${terms.extraKmPrice} ARS`);
    }
  }

  if (terms.fuelPolicy) {
    lines.push(`- Politica de combustible: ${terms.fuelPolicy}`);
  }

  if (terms.insuranceDeductibleUsd) {
    lines.push(`- Franquicia del seguro: USD $${terms.insuranceDeductibleUsd}`);
  }

  if (terms.allowedProvinces && terms.allowedProvinces.length > 0) {
    lines.push(`- Provincias permitidas: ${terms.allowedProvinces.join(', ')}`);
  } else if (terms.maxDistanceKm) {
    lines.push(`- Distancia maxima: ${terms.maxDistanceKm} km del punto de origen`);
  } else {
    lines.push('- Limite geografico: Sin restricciones (todo el pais)');
  }

  if (terms.allowSecondDriver !== null && terms.allowSecondDriver !== undefined) {
    if (terms.allowSecondDriver) {
      lines.push(
        `- Segundo conductor: Permitido${terms.secondDriverCost ? ` ($${terms.secondDriverCost} ARS extra)` : ''}`,
      );
    } else {
      lines.push('- Segundo conductor: No permitido');
    }
  }

  if (terms.allowSmoking !== null && terms.allowSmoking !== undefined) {
    lines.push(`- Fumar: ${terms.allowSmoking ? 'Permitido' : 'No permitido'}`);
  }

  if (terms.allowPets !== null && terms.allowPets !== undefined) {
    lines.push(`- Mascotas: ${terms.allowPets ? 'Permitidas' : 'No permitidas'}`);
  }

  if (terms.allowRideshare !== null && terms.allowRideshare !== undefined) {
    lines.push(`- Uso en apps (Uber/Cabify): ${terms.allowRideshare ? 'Permitido' : 'No permitido'}`);
  }

  return lines.join('\n');
}

function jsonResponse(
  data: unknown,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
