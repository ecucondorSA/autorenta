// ============================================================================
// RENTARFAST AGENT - Supabase Edge Function
// Intelligent AI Agent with Gemini 3 Flash + Function Calling
// Upgraded to Gemini 3 for PhD-level reasoning and faster results
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// TYPES
// ============================================================================

interface ChatRequest {
  message: string;
  sessionId?: string;
  context?: {
    userId?: string;
    locale?: string;
    currency?: string;
  };
}

interface ChatResponse {
  success: boolean;
  response: string;
  sessionId: string;
  toolsUsed: string[];
  timestamp: string;
  suggestions?: Array<{ label: string; action: string; icon?: string }>;
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
}

// ============================================================================
// GEMINI 3 FLASH CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
// Gemini 2.5 Flash - Latest frontier-level intelligence with faster results
// Upgraded from gemini-2.0-flash-exp for better PhD-level reasoning
const GEMINI_MODEL = 'gemini-2.5-flash';

// System prompt for Rentarfast agent - AUTONOMOUS MODE
const SYSTEM_PROMPT = `Eres Rentarfast, un agente AUTÓNOMO de la plataforma Autorentar.

## FECHA ACTUAL: ${new Date().toISOString().split('T')[0]}

## DETECCIÓN AUTOMÁTICA DE IDIOMA (IMPORTANTE)

Detecta automáticamente el idioma del usuario y responde SIEMPRE en ese mismo idioma:

### Español (default):
- Indicadores: español, castellano, palabras en español
- Responde en español

### Português (Brasileiro):
- Indicadores: "oi", "olá", "bom dia", "obrigado", "carro", "alugar", "reservar", "quanto custa", "disponível"
- Responde COMPLETAMENTE en portugués brasileño
- Usa vocabulario BR: "carro" (no "coche"), "celular" (no "móvil"), "você" (informal)
- Formato de moneda: R$ para reais, US$ para dólares

### English:
- Indicadores: "hello", "hi", "I want", "car", "rent", "book", "available"
- Responde COMPLETAMENTE en inglés

### Reglas de idioma:
1. DETECTA el idioma en el PRIMER mensaje del usuario
2. MANTÉN ese idioma durante toda la conversación
3. Si el usuario cambia de idioma, ADAPTA tu respuesta al nuevo idioma
4. Los nombres de funciones y datos técnicos pueden mantenerse en inglés
5. Los mensajes de error y explicaciones SIEMPRE en el idioma del usuario

## MODO DE OPERACIÓN: AGÉNTICO AUTÓNOMO

Tu rol es ejecutar acciones de forma AUTÓNOMA sin pedir confirmación.
Piensa paso a paso (chain-of-thought) y explica tu razonamiento ANTES de actuar.

### PROTOCOLO DE RAZONAMIENTO:
1. ANALIZA el mensaje del usuario
2. IDENTIFICA qué necesita (buscar, reservar, consultar, etc.)
3. DETERMINA qué herramientas usar y en qué orden
4. EJECUTA las herramientas necesarias
5. INTERPRETA los resultados
6. COMUNICA el resultado al usuario de forma clara

### EJEMPLO DE RAZONAMIENTO VERBOSE:
Usuario: "Reservar el Toyota del 5 al 7 de febrero"
Mi análisis:
- El usuario quiere RESERVAR un auto
- Menciona "Toyota" = marca del auto
- Fechas: "del 5 al 7 de febrero" = 2025-02-05 a 2025-02-07
- No especifica pago = usar wallet por defecto

Pasos a ejecutar:
1. Buscar Toyota disponible → search_available_cars({ brand: "Toyota" })
2. Si encuentro uno, crear reserva → create_booking({ car_id, start_date, end_date, payment_method: "wallet" })

[EJECUTO]

## PARSEO DE FECHAS (IMPORTANTE):
Convierte SIEMPRE las fechas naturales a formato YYYY-MM-DD:
- "mañana" → fecha de mañana
- "pasado mañana" → fecha +2 días
- "próximo lunes/martes/etc" → calcular fecha
- "del 1 al 3 de febrero" → 2025-02-01 a 2025-02-03
- "por 3 días" → desde hoy hasta hoy+3
- "fin de semana" → próximo sábado a domingo
- "la semana que viene" → lunes a viernes próximos

## PARSEO DE AUTOS:
- "el Toyota" / "un Toyota" → search_available_cars({ brand: "Toyota" })
- "el Corolla" → search_available_cars({ model: "Corolla" })
- "Toyota Corolla" → search_available_cars({ brand: "Toyota", model: "Corolla" })
- "el primero" → usa el primer resultado de la última búsqueda
- UUID directo → úsalo directamente en create_booking

## MÉTODO DE PAGO:
- DEFAULT: payment_method: "wallet"
- "con tarjeta", "card" → payment_method: "card"
- "con wallet", "con saldo" → payment_method: "wallet"

## EJEMPLOS DE FUNCTION CALLS:

### Ejemplo 1: "Reservar el Toyota del 5 al 7 de febrero"
1. search_available_cars({ brand: "Toyota" })
2. Si encuentra un Toyota con id="abc-123", entonces:
3. create_booking({ car_id: "abc-123", start_date: "2025-02-05", end_date: "2025-02-07", payment_method: "wallet" })

### Ejemplo 2: "Buscar autos"
- search_available_cars({}) ← sin filtros, devuelve todos

### Ejemplo 3: "Mostrar Fiat en Buenos Aires"
- search_available_cars({ brand: "Fiat", city: "Buenos Aires" })

## HERRAMIENTAS PRINCIPALES:
- search_available_cars: { brand?, model?, city?, maxPrice?, transmission? }
- create_booking: { car_id, start_date, end_date, payment_method }
- get_wallet_status: Ver saldo
- get_user_bookings: Ver reservas

## Capacidades COMPLETAS:

### LECTURA (consulta de datos):
- get_wallet_status: Saldo disponible, bloqueado, total
- get_blocked_funds_details: Detalle de cada bloqueo con razón
- get_user_bookings: Reservas como renter y owner
- get_user_stats: Estadísticas del usuario
- search_available_cars: Buscar autos disponibles
- get_booking_details: Detalle completo de una reserva

### ESCRITURA (acciones autónomas):
- create_booking: Crear reserva (valida disponibilidad y saldo automáticamente)
- approve_booking: Aprobar reserva pendiente (solo owner)
- reject_booking: Rechazar reserva con razón (solo owner)
- cancel_booking: Cancelar con política de reembolso (+48h=100%, 24-48h=90%, <24h=75%)
- process_wallet_payment: Pagar con fondos de wallet
- initiate_card_payment: Generar URL para pago con tarjeta

## Sistema de Pagos:

### Para ARRENDATARIO:
1. Al reservar: preautorización o lock de wallet (rental + USD 250 depósito)
2. Al completar: rental va al owner, depósito vuelve si no hay daños

### Para PROPIETARIO (Modelo Comodato):
1. No recibe pago directo del booking
2. Gana rewards mensuales basados en participación en comunidad
3. 70% del pago va al pool de rewards, 15% a plataforma, 15% a fondo de protección
4. Confirmación bilateral libera: depósito al renter si no hay daños

### Política de Cancelación:
- +48h antes: 100% reembolso
- 24-48h antes: 90% reembolso
- <24h antes: 75% reembolso
- Owner cancela: 100% reembolso + penalización al owner

## Post-Acción:
Después de ejecutar SIEMPRE explica:
- QUÉ hiciste exactamente
- El resultado (éxito/error)
- Próximos pasos si aplica

## COMPORTAMIENTO PROACTIVO (MUY IMPORTANTE):

Cuando una acción FALLA, sé PROACTIVO y ofrece alternativas REALES:

### Si create_booking falla por "propio auto":
1. Informá al usuario: "No podés reservar tu propio auto"
2. INMEDIATAMENTE llamá search_available_cars({}) para buscar OTROS autos
3. Mostrá los resultados con precios y ubicación REALES
4. Ejemplo de respuesta:
   "No podés reservar tu propio auto. Pero encontré estos otros cerca tuyo:
   - Toyota Corolla $80/día en Palermo (2.1 km)
   - Fiat Cronos $65/día en Belgrano (3.5 km)
   ¿Querés que reserve alguno?"

### Si create_booking falla por "fechas no disponibles":
1. Informá qué fechas no están disponibles
2. Llamá get_booking_details o search_available_cars para sugerir alternativas
3. Mostrá opciones concretas

### Si falla por "saldo insuficiente":
1. Mostrá cuánto falta
2. Llamá get_wallet_status para mostrar saldo actual
3. Sugerí "cargar saldo" o "pagar con tarjeta"

NUNCA respondas solo con el error. SIEMPRE buscá y mostrá alternativas útiles.

## Seguridad:
- No puedes reservar tu propio auto (validación automática)
- Pagos con tarjeta: solo generas URL, no manejas tokens
- Todas las acciones quedan auditadas
- RLS de Supabase aplica automáticamente`;

// ============================================================================
// TOOL DEFINITIONS (Function Calling)
// ============================================================================

const TOOLS = {
  functionDeclarations: [
    {
      name: 'get_wallet_status',
      description: 'Obtiene el estado completo de la wallet del usuario: saldo disponible, bloqueado, total y retirable. Usa esta herramienta cuando el usuario pregunte sobre su dinero, saldo o wallet.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_blocked_funds_details',
      description: 'Obtiene el detalle de los fondos bloqueados del usuario con las razones específicas de cada bloqueo. Usa esta herramienta cuando el usuario pregunte por qué tiene dinero bloqueado.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'get_user_bookings',
      description: 'Obtiene las reservas del usuario, tanto como arrendatario como propietario. Incluye estado, fechas y montos.',
      parameters: {
        type: 'object',
        properties: {
          role: {
            type: 'string',
            enum: ['renter', 'owner', 'all'],
            description: 'Filtrar por rol: renter (arrendatario), owner (propietario) o all (todos)',
          },
          status: {
            type: 'string',
            enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'all'],
            description: 'Filtrar por estado de la reserva',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_user_stats',
      description: 'Obtiene estadísticas generales del usuario: cantidad de autos, reservas completadas, calificación promedio, etc.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    {
      name: 'search_available_cars',
      description: 'Busca autos disponibles para alquilar. Puede buscar por marca, modelo, ciudad, precio.',
      parameters: {
        type: 'object',
        properties: {
          brand: {
            type: 'string',
            description: 'Marca del auto (Toyota, Ford, Fiat, etc.)',
          },
          model: {
            type: 'string',
            description: 'Modelo del auto (Corolla, Ka, Cronos, etc.)',
          },
          city: {
            type: 'string',
            description: 'Ciudad donde buscar autos',
          },
          startDate: {
            type: 'string',
            description: 'Fecha de inicio del alquiler (YYYY-MM-DD)',
          },
          endDate: {
            type: 'string',
            description: 'Fecha de fin del alquiler (YYYY-MM-DD)',
          },
          maxPrice: {
            type: 'number',
            description: 'Precio máximo por día en USD',
          },
          transmission: {
            type: 'string',
            enum: ['manual', 'automatic'],
            description: 'Tipo de transmisión',
          },
        },
        required: [],
      },
    },
    {
      name: 'get_booking_details',
      description: 'Obtiene los detalles completos de una reserva específica.',
      parameters: {
        type: 'object',
        properties: {
          bookingId: {
            type: 'string',
            description: 'ID de la reserva',
          },
        },
        required: ['bookingId'],
      },
    },
    // ========================================================================
    // WRITE TOOLS (Autonomous Actions)
    // ========================================================================
    {
      name: 'create_booking',
      description: 'Crea una reserva de auto. SOLO necesita 4 parámetros. El userId se obtiene automáticamente del token JWT. NO requiere ubicación ni clienteId - esos datos se coordinan después. Llama esta función cuando el usuario diga que quiere reservar/alquilar un auto específico.',
      parameters: {
        type: 'object',
        properties: {
          car_id: {
            type: 'string',
            description: 'UUID del auto a reservar',
          },
          start_date: {
            type: 'string',
            description: 'Fecha de inicio en formato YYYY-MM-DD',
          },
          end_date: {
            type: 'string',
            description: 'Fecha de fin en formato YYYY-MM-DD',
          },
          payment_method: {
            type: 'string',
            enum: ['wallet', 'card'],
            description: 'Método de pago: wallet para pagar con saldo, card para tarjeta',
          },
        },
        required: ['car_id', 'start_date', 'end_date', 'payment_method'],
      },
    },
    {
      name: 'approve_booking',
      description: 'Aprueba una reserva pendiente. Solo el propietario del auto puede aprobar.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'UUID de la reserva a aprobar',
          },
        },
        required: ['booking_id'],
      },
    },
    {
      name: 'reject_booking',
      description: 'Rechaza una reserva pendiente. Solo el propietario del auto puede rechazar. Libera fondos bloqueados automáticamente.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'UUID de la reserva a rechazar',
          },
          reason: {
            type: 'string',
            description: 'Motivo del rechazo',
          },
        },
        required: ['booking_id', 'reason'],
      },
    },
    {
      name: 'cancel_booking',
      description: 'Cancela una reserva. Aplica política de reembolso: +48h=100%, 24-48h=90%, <24h=75%. Owner tiene penalización.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'UUID de la reserva a cancelar',
          },
          reason: {
            type: 'string',
            description: 'Motivo de la cancelación (opcional)',
          },
        },
        required: ['booking_id'],
      },
    },
    {
      name: 'process_wallet_payment',
      description: 'Procesa el pago de una reserva usando fondos de wallet. Bloquea rental + depósito.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'UUID de la reserva a pagar',
          },
        },
        required: ['booking_id'],
      },
    },
    {
      name: 'initiate_card_payment',
      description: 'Inicia pago con tarjeta. Retorna la URL para completar el pago en la UI (el agente no maneja tokens de tarjeta por seguridad).',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'UUID de la reserva a pagar',
          },
        },
        required: ['booking_id'],
      },
    },
    // ========================================================================
    // AI VISION TOOLS (Gemini 3 Flash)
    // ========================================================================
    {
      name: 'analyze_vehicle_damage',
      description: 'Analiza daños en un vehículo comparando fotos de check-in vs check-out. Detecta rayones, abolladuras, vidrios rotos y otros daños. Usa esta herramienta cuando el usuario pregunte sobre daños en una reserva.',
      parameters: {
        type: 'object',
        properties: {
          booking_id: {
            type: 'string',
            description: 'UUID de la reserva a analizar',
          },
        },
        required: ['booking_id'],
      },
    },
    {
      name: 'smart_verify_document',
      description: 'Verifica un documento de identidad con IA avanzada. Detecta fraude y extrae datos cuando el OCR falla. Usa esta herramienta cuando el usuario tenga problemas verificando su identidad.',
      parameters: {
        type: 'object',
        properties: {
          image_url: {
            type: 'string',
            description: 'URL de la imagen del documento',
          },
          document_type: {
            type: 'string',
            enum: ['cedula', 'dni', 'license', 'vehicle_registration'],
            description: 'Tipo de documento',
          },
          country: {
            type: 'string',
            enum: ['EC', 'AR', 'BR', 'CL', 'CO'],
            description: 'País del documento',
          },
        },
        required: ['image_url', 'document_type', 'country'],
      },
    },
  ],
};

// ============================================================================
// TOOL IMPLEMENTATIONS
// ============================================================================

async function executeGetWalletStatus(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.rpc('wallet_get_balance');

  if (error) {
    console.error('Wallet query error:', error);
    return { error: 'No se pudo obtener el estado de la wallet' };
  }

  const wallet = data?.[0] || {};
  return {
    available_balance: wallet.available_balance || 0,
    locked_balance: wallet.locked_balance || 0,
    total_balance: wallet.total_balance || 0,
    withdrawable_balance: wallet.withdrawable_balance || 0,
    currency: 'USD',
  };
}

async function executeGetBlockedFundsDetails(supabase: SupabaseClient, userId: string) {
  // Get locked transactions from wallet_ledger
  const { data: lockedTransactions, error } = await supabase
    .from('wallet_ledger')
    .select(`
      id,
      amount,
      type,
      description,
      created_at,
      booking_id,
      bookings:booking_id (
        id,
        status,
        start_at,
        end_at,
        car:car_id (
          brand,
          model
        )
      )
    `)
    .eq('user_id', userId)
    .in('type', ['lock', 'rental_lock', 'deposit_lock'])
    .is('released_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Blocked funds query error:', error);
    return { error: 'No se pudo obtener el detalle de fondos bloqueados' };
  }

  const blockedDetails = (lockedTransactions || []).map((tx: any) => ({
    amount: Math.abs(tx.amount),
    type: tx.type,
    reason: tx.description || getBlockedReasonByType(tx.type),
    created_at: tx.created_at,
    booking_id: tx.booking_id,
    booking_info: tx.bookings ? {
      status: tx.bookings.status,
      dates: `${tx.bookings.start_at} - ${tx.bookings.end_at}`,
      car: tx.bookings.car ? `${tx.bookings.car.brand} ${tx.bookings.car.model}` : 'N/A',
    } : null,
  }));

  return {
    total_blocked: blockedDetails.reduce((sum: number, tx: any) => sum + tx.amount, 0),
    blocked_items: blockedDetails,
    explanation: generateBlockedFundsExplanation(blockedDetails),
  };
}

function getBlockedReasonByType(type: string): string {
  const reasons: Record<string, string> = {
    lock: 'Fondos bloqueados por reserva',
    rental_lock: 'Pago del alquiler bloqueado hasta completar el viaje',
    deposit_lock: 'Depósito de garantía (se devuelve si no hay daños)',
  };
  return reasons[type] || 'Fondos bloqueados';
}

function generateBlockedFundsExplanation(blockedItems: any[]): string {
  if (blockedItems.length === 0) {
    return 'No tienes fondos bloqueados actualmente.';
  }

  const rentalLocks = blockedItems.filter((i) => i.type === 'rental_lock');
  const depositLocks = blockedItems.filter((i) => i.type === 'deposit_lock');

  let explanation = '📊 Resumen de fondos bloqueados:\n\n';

  if (rentalLocks.length > 0) {
    const rentalTotal = rentalLocks.reduce((sum, i) => sum + i.amount, 0);
    explanation += `💰 Pagos de alquiler pendientes: USD ${rentalTotal.toFixed(2)}\n`;
    explanation += '   → Se liberan al propietario cuando completes el viaje exitosamente\n\n';
  }

  if (depositLocks.length > 0) {
    const depositTotal = depositLocks.reduce((sum, i) => sum + i.amount, 0);
    explanation += `🔒 Depósitos de garantía: USD ${depositTotal.toFixed(2)}\n`;
    explanation += '   → Se te devuelven automáticamente si no hay daños reportados\n';
  }

  return explanation;
}

async function executeGetUserBookings(
  supabase: SupabaseClient,
  userId: string,
  params: { role?: string; status?: string }
) {
  const role = params.role || 'all';
  const statusFilter = params.status || 'all';

  let query = supabase
    .from('bookings')
    .select(`
      id,
      status,
      start_at,
      end_at,
      total_amount,
      created_at,
      renter_id,
      car:car_id (
        id,
        brand,
        model,
        owner_id
      )
    `)
    .order('created_at', { ascending: false })
    .limit(20);

  // Apply status filter
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data: bookings, error } = await query;

  if (error) {
    console.error('Bookings query error:', error);
    return { error: 'No se pudieron obtener las reservas' };
  }

  // Filter by role
  const filteredBookings = (bookings || []).filter((b: any) => {
    if (role === 'renter') return b.renter_id === userId;
    if (role === 'owner') return b.car?.owner_id === userId;
    return b.renter_id === userId || b.car?.owner_id === userId;
  });

  // Separate by role for summary
  const asRenter = filteredBookings.filter((b: any) => b.renter_id === userId);
  const asOwner = filteredBookings.filter((b: any) => b.car?.owner_id === userId);

  return {
    as_renter: {
      total: asRenter.length,
      pending: asRenter.filter((b: any) => b.status === 'pending').length,
      confirmed: asRenter.filter((b: any) => b.status === 'confirmed').length,
      completed: asRenter.filter((b: any) => b.status === 'completed').length,
      bookings: asRenter.slice(0, 5).map((b: any) => ({
        id: b.id,
        status: b.status,
        dates: `${b.start_at} - ${b.end_at}`,
        car: b.car ? `${b.car.brand} ${b.car.model}` : 'N/A',
        amount: b.total_amount,
      })),
    },
    as_owner: {
      total: asOwner.length,
      pending: asOwner.filter((b: any) => b.status === 'pending').length,
      confirmed: asOwner.filter((b: any) => b.status === 'confirmed').length,
      completed: asOwner.filter((b: any) => b.status === 'completed').length,
      bookings: asOwner.slice(0, 5).map((b: any) => ({
        id: b.id,
        status: b.status,
        dates: `${b.start_at} - ${b.end_at}`,
        car: b.car ? `${b.car.brand} ${b.car.model}` : 'N/A',
        amount: b.total_amount,
      })),
    },
  };
}

async function executeGetUserStats(supabase: SupabaseClient, userId: string) {
  const [profileResult, carsResult, bookingsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('full_name, created_at, rating_average, total_ratings')
      .eq('id', userId)
      .single(),
    supabase
      .from('cars')
      .select('id, status')
      .eq('owner_id', userId),
    supabase
      .from('bookings')
      .select('id, status, renter_id')
      .or(`renter_id.eq.${userId}`),
  ]);

  const profile = profileResult.data || {};
  const cars = carsResult.data || [];
  const bookings = bookingsResult.data || [];

  const renterBookings = bookings.filter((b: any) => b.renter_id === userId);

  return {
    profile: {
      name: profile.full_name || 'Usuario',
      member_since: profile.created_at,
      rating: profile.rating_average || 0,
      total_ratings: profile.total_ratings || 0,
    },
    as_owner: {
      total_cars: cars.length,
      active_cars: cars.filter((c: any) => c.status === 'active').length,
    },
    as_renter: {
      total_rentals: renterBookings.length,
      completed_rentals: renterBookings.filter((b: any) => b.status === 'completed').length,
      pending_rentals: renterBookings.filter((b: any) => b.status === 'pending').length,
    },
  };
}

async function executeSearchCars(
  supabase: SupabaseClient,
  params: { brand?: string; model?: string; city?: string; startDate?: string; endDate?: string; maxPrice?: number; transmission?: string }
) {
  console.log('[SEARCH] Input params:', JSON.stringify(params));

  // Build query - start with basic select
  let query = supabase
    .from('cars')
    .select(`
      id,
      brand,
      model,
      year,
      price_per_day,
      currency,
      location_city,
      location_lat,
      location_lng,
      transmission,
      seats
    `)
    .eq('status', 'active')
    .limit(10);

  // Filter by brand (case-insensitive)
  if (params.brand) {
    console.log('[SEARCH] Filtering by brand:', params.brand);
    query = query.ilike('brand', `%${params.brand}%`);
  }
  // Filter by model (case-insensitive)
  if (params.model) {
    console.log('[SEARCH] Filtering by model:', params.model);
    query = query.ilike('model', `%${params.model}%`);
  }
  // Filter by city (case-insensitive)
  if (params.city) {
    console.log('[SEARCH] Filtering by city:', params.city);
    query = query.ilike('location_city', `%${params.city}%`);
  }
  if (params.maxPrice) {
    console.log('[SEARCH] Filtering by maxPrice:', params.maxPrice);
    query = query.lte('price_per_day', params.maxPrice);
  }
  if (params.transmission) {
    console.log('[SEARCH] Filtering by transmission:', params.transmission);
    query = query.eq('transmission', params.transmission);
  }

  console.log('[SEARCH] Executing query...');
  const { data, error } = await query;

  if (error) {
    console.error('[SEARCH] ERROR:', JSON.stringify(error));
    return { error: `Error en búsqueda: ${error.message}` };
  }

  console.log('[SEARCH] Raw data count:', data?.length || 0);
  if (data && data.length > 0) {
    console.log('[SEARCH] First result:', JSON.stringify(data[0]));
  }

  const cars = (data || []).map((car: any) => ({
    id: car.id,
    name: `${car.brand || ''} ${car.model || ''} ${car.year || ''}`.trim(),
    brand: car.brand,
    model: car.model,
    price_per_day: car.price_per_day,
    currency: car.currency || 'USD',
    location: car.location_city || 'Sin ubicación',
    transmission: car.transmission,
    seats: car.seats,
  }));

  // Generar sugerencias interactivas (estilo Supabase)
  const suggestions = cars.slice(0, 5).map((car, index) => ({
    label: `${car.name} - $${car.price_per_day}/día${car.location !== 'Sin ubicación' ? ` - ${car.location}` : ''}`,
    action: `reservar ${car.id} del mañana por 3 días`,
    icon: '🚗',
  }));

  const result = {
    total_found: cars.length,
    cars,
    suggestions,  // Para renderizar botones en el frontend
  };

  console.log('[SEARCH] Returning:', result.total_found, 'cars with', suggestions.length, 'suggestions');
  return result;
}

async function executeGetBookingDetails(supabase: SupabaseClient, bookingId: string) {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      car:car_id (
        brand,
        model,
        year,
        photos
      ),
      renter:renter_id (
        full_name
      )
    `)
    .eq('id', bookingId)
    .single();

  if (error) {
    console.error('Booking details error:', error);
    return { error: 'No se encontró la reserva' };
  }

  return {
    id: data.id,
    status: data.status,
    dates: {
      start: data.start_at,
      end: data.end_at,
    },
    car: data.car ? `${data.car.brand} ${data.car.model} ${data.car.year}` : 'N/A',
    renter: data.renter?.full_name || 'N/A',
    amounts: {
      total: data.total_amount,
      rental: data.rental_amount,
      deposit: data.deposit_amount,
      platform_fee: data.platform_fee,
    },
    payment_status: data.payment_status,
  };
}

// ============================================================================
// WRITE TOOL IMPLEMENTATIONS (Autonomous Actions)
// ============================================================================

async function executeCreateBooking(
  supabase: SupabaseClient,
  userId: string,
  args: { car_id: string; start_date: string; end_date: string; payment_method: 'wallet' | 'card' }
) {
  console.log('[AUTONOMOUS] Creating booking:', args);

  // 1. Get car details and validate ownership
  const { data: car, error: carError } = await supabase
    .from('cars')
    .select('id, owner_id, brand, model, price_per_day, status')
    .eq('id', args.car_id)
    .single();

  if (carError || !car) {
    return {
      error: 'Auto no encontrado',
      success: false,
      suggestions: [
        { label: 'Buscar otros autos', action: 'buscar autos disponibles', icon: '🔍' },
      ]
    };
  }

  // 2. Prevent self-booking
  if (car.owner_id === userId) {
    return {
      error: 'No puedes reservar tu propio auto',
      success: false,
      suggestions: [
        { label: 'Buscar otros autos', action: 'buscar autos disponibles', icon: '🔍' },
        { label: 'Ver mis autos publicados', action: 'mostrar mis autos', icon: '🚗' },
      ]
    };
  }

  // 3. Check car is active
  if (car.status !== 'active') {
    return {
      error: 'Este auto no está disponible para reservas',
      success: false,
      suggestions: [
        { label: 'Buscar otros autos', action: 'buscar autos disponibles', icon: '🔍' },
      ]
    };
  }

  // 4. Check availability using RPC
  const { data: isAvailable, error: availError } = await supabase.rpc('is_car_available', {
    p_car_id: args.car_id,
    p_start_date: args.start_date,
    p_end_date: args.end_date,
  });

  if (availError) {
    console.error('Availability check error:', availError);
    return { error: 'Error verificando disponibilidad', success: false };
  }

  if (!isAvailable) {
    return { error: 'El auto no está disponible en esas fechas', success: false };
  }

  // 5. Calculate days and amounts
  const startDate = new Date(args.start_date);
  const endDate = new Date(args.end_date);
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const rentalAmount = days * (car.price_per_day || 0);
  const depositAmount = 250; // Standard deposit in USD
  const totalAmount = rentalAmount + depositAmount;

  // 6. If wallet payment, check balance
  if (args.payment_method === 'wallet') {
    const { data: walletData, error: walletError } = await supabase.rpc('wallet_get_balance');

    if (walletError) {
      return { error: 'Error verificando saldo', success: false };
    }

    const balance = walletData?.[0]?.available_balance || 0;
    if (balance < totalAmount) {
      return {
        error: `Saldo insuficiente. Necesitas USD ${totalAmount.toFixed(2)} pero tienes USD ${balance.toFixed(2)}`,
        success: false,
      };
    }
  }

  // 7. Create the booking using request_booking RPC
  // Convert dates to ISO timestamps (RPC expects timestamptz)
  const startTimestamp = new Date(args.start_date + 'T10:00:00Z').toISOString();
  const endTimestamp = new Date(args.end_date + 'T10:00:00Z').toISOString();

  const { data: booking, error: bookingError } = await supabase.rpc('request_booking', {
    p_car_id: args.car_id,
    p_start: startTimestamp,
    p_end: endTimestamp,
  });

  if (bookingError) {
    console.error('Booking creation error:', bookingError);
    return { error: `Error creando reserva: ${bookingError.message}`, success: false };
  }

  const bookingId = booking?.booking_id || booking?.id || booking;

  // 8. If wallet payment, lock the funds
  if (args.payment_method === 'wallet' && bookingId) {
    const { data: lockResult, error: lockError } = await supabase.rpc('wallet_lock_rental_and_deposit', {
      p_booking_id: bookingId,
      p_rental_amount: rentalAmount,
      p_deposit_amount: depositAmount,
    });

    console.log('Wallet lock result:', JSON.stringify(lockResult));
    console.log('Wallet lock error:', lockError);

    // RPC returns a record with (success, error_message, ...)
    const lockData = Array.isArray(lockResult) ? lockResult[0] : lockResult;

    if (lockError || !lockData?.success) {
      const errorMsg = lockError?.message || lockData?.error_message || 'Error desconocido al bloquear fondos';
      console.error('Wallet lock failed:', errorMsg);
      return {
        error: `Reserva creada (ID: ${bookingId}) pero error al bloquear fondos: ${errorMsg}`,
        booking_id: bookingId,
        success: false,
      };
    }
  }

  return {
    success: true,
    booking_id: bookingId,
    car: `${car.brand} ${car.model}`,
    dates: `${args.start_date} - ${args.end_date}`,
    days,
    rental_amount: rentalAmount,
    deposit_amount: depositAmount,
    total_amount: totalAmount,
    payment_method: args.payment_method,
    payment_status: args.payment_method === 'wallet' ? 'funds_locked' : 'pending',
    next_step: args.payment_method === 'card'
      ? `Completa el pago en: /bookings/${bookingId}/pay`
      : 'Esperando aprobación del propietario',
  };
}

async function executeApproveBooking(
  supabase: SupabaseClient,
  userId: string,
  args: { booking_id: string }
) {
  console.log('[AUTONOMOUS] Approving booking:', args.booking_id);

  // 1. Get booking and verify ownership
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, status, renter_id,
      car:car_id (id, owner_id, brand, model)
    `)
    .eq('id', args.booking_id)
    .single();

  if (bookingError || !booking) {
    return { error: 'Reserva no encontrada', success: false };
  }

  // 2. Verify user is the owner
  if ((booking.car as any)?.owner_id !== userId) {
    return { error: 'Solo el propietario del auto puede aprobar esta reserva', success: false };
  }

  // 3. Verify booking is pending
  if (booking.status !== 'pending') {
    return { error: `La reserva no está pendiente (estado actual: ${booking.status})`, success: false };
  }

  // 4. Call approve_booking RPC
  const { error: approveError } = await supabase.rpc('approve_booking', {
    p_booking_id: args.booking_id,
  });

  if (approveError) {
    console.error('Approve booking error:', approveError);
    return { error: `Error al aprobar: ${approveError.message}`, success: false };
  }

  return {
    success: true,
    booking_id: args.booking_id,
    car: `${(booking.car as any)?.brand} ${(booking.car as any)?.model}`,
    new_status: 'confirmed',
    message: 'Reserva aprobada exitosamente. El arrendatario ha sido notificado.',
  };
}

async function executeRejectBooking(
  supabase: SupabaseClient,
  userId: string,
  args: { booking_id: string; reason: string }
) {
  console.log('[AUTONOMOUS] Rejecting booking:', args.booking_id);

  // 1. Get booking and verify ownership
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, status, renter_id,
      car:car_id (id, owner_id, brand, model)
    `)
    .eq('id', args.booking_id)
    .single();

  if (bookingError || !booking) {
    return { error: 'Reserva no encontrada', success: false };
  }

  // 2. Verify user is the owner
  if ((booking.car as any)?.owner_id !== userId) {
    return { error: 'Solo el propietario del auto puede rechazar esta reserva', success: false };
  }

  // 3. Verify booking is pending
  if (booking.status !== 'pending') {
    return { error: `La reserva no está pendiente (estado actual: ${booking.status})`, success: false };
  }

  // 4. Call reject_booking RPC
  const { error: rejectError } = await supabase.rpc('reject_booking', {
    p_booking_id: args.booking_id,
    p_reason: args.reason,
  });

  if (rejectError) {
    console.error('Reject booking error:', rejectError);
    return { error: `Error al rechazar: ${rejectError.message}`, success: false };
  }

  return {
    success: true,
    booking_id: args.booking_id,
    car: `${(booking.car as any)?.brand} ${(booking.car as any)?.model}`,
    reason: args.reason,
    new_status: 'rejected',
    message: 'Reserva rechazada. Los fondos bloqueados han sido liberados al arrendatario.',
  };
}

async function executeCancelBooking(
  supabase: SupabaseClient,
  userId: string,
  args: { booking_id: string; reason?: string }
) {
  console.log('[AUTONOMOUS] Cancelling booking:', args.booking_id);

  // 1. Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, status, renter_id, start_at, total_amount,
      car:car_id (id, owner_id, brand, model)
    `)
    .eq('id', args.booking_id)
    .single();

  if (bookingError || !booking) {
    return { error: 'Reserva no encontrada', success: false };
  }

  const isOwner = (booking.car as any)?.owner_id === userId;
  const isRenter = booking.renter_id === userId;

  if (!isOwner && !isRenter) {
    return { error: 'No tienes permiso para cancelar esta reserva', success: false };
  }

  // 2. Check if booking can be cancelled
  if (!['pending', 'confirmed'].includes(booking.status)) {
    return { error: `No se puede cancelar una reserva en estado: ${booking.status}`, success: false };
  }

  // 3. Calculate refund based on policy
  const startDate = new Date(booking.start_at);
  const now = new Date();
  const hoursUntilStart = (startDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundPercentage = 100;
  let refundReason = '';

  if (isRenter) {
    if (hoursUntilStart >= 48) {
      refundPercentage = 100;
      refundReason = 'Cancelación con +48h de anticipación: reembolso completo';
    } else if (hoursUntilStart >= 24) {
      refundPercentage = 90;
      refundReason = 'Cancelación 24-48h antes: reembolso 90%';
    } else {
      refundPercentage = 75;
      refundReason = 'Cancelación <24h antes: reembolso 75%';
    }
  }

  // 4. Call appropriate RPC based on role
  let cancelError;
  if (isOwner) {
    const { error } = await supabase.rpc('owner_cancel_booking', {
      p_booking_id: args.booking_id,
      p_reason: args.reason || 'Cancelado por el propietario',
    });
    cancelError = error;
    refundReason = 'Cancelado por propietario: reembolso completo + penalización al owner';
    refundPercentage = 100;
  } else {
    // Renter cancellation - use generic cancel with refund calculation
    const { error } = await supabase.rpc('cancel_booking', {
      p_booking_id: args.booking_id,
      p_reason: args.reason || 'Cancelado por el arrendatario',
      p_refund_percentage: refundPercentage,
    });
    cancelError = error;
  }

  if (cancelError) {
    console.error('Cancel booking error:', cancelError);
    return { error: `Error al cancelar: ${cancelError.message}`, success: false };
  }

  return {
    success: true,
    booking_id: args.booking_id,
    car: `${(booking.car as any)?.brand} ${(booking.car as any)?.model}`,
    cancelled_by: isOwner ? 'owner' : 'renter',
    reason: args.reason || 'Sin motivo especificado',
    refund_percentage: refundPercentage,
    refund_explanation: refundReason,
    new_status: 'cancelled',
    message: 'Reserva cancelada. Los fondos se procesan según la política de reembolso.',
  };
}

async function executeProcessWalletPayment(
  supabase: SupabaseClient,
  userId: string,
  args: { booking_id: string }
) {
  console.log('[AUTONOMOUS] Processing wallet payment:', args.booking_id);

  // 1. Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, status, renter_id, total_amount, rental_amount, deposit_amount, payment_status,
      car:car_id (id, owner_id, brand, model)
    `)
    .eq('id', args.booking_id)
    .single();

  if (bookingError || !booking) {
    return { error: 'Reserva no encontrada', success: false };
  }

  // 2. Verify user is the renter
  if (booking.renter_id !== userId) {
    return { error: 'Solo el arrendatario puede pagar esta reserva', success: false };
  }

  // 3. Check booking status
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return { error: `No se puede pagar una reserva en estado: ${booking.status}`, success: false };
  }

  // 4. Check if already paid
  if (booking.payment_status === 'paid' || booking.payment_status === 'funds_locked') {
    return { error: 'Esta reserva ya está pagada o tiene fondos bloqueados', success: false };
  }

  const rentalAmount = booking.rental_amount || booking.total_amount;
  const depositAmount = booking.deposit_amount || 250;
  const totalNeeded = rentalAmount + depositAmount;

  // 5. Check wallet balance
  const { data: walletData, error: walletError } = await supabase.rpc('wallet_get_balance');

  if (walletError) {
    return { error: 'Error verificando saldo', success: false };
  }

  const balance = walletData?.[0]?.available_balance || 0;
  if (balance < totalNeeded) {
    return {
      error: `Saldo insuficiente. Necesitas USD ${totalNeeded.toFixed(2)} pero tienes USD ${balance.toFixed(2)}`,
      success: false,
    };
  }

  // 6. Lock funds
  const { error: lockError } = await supabase.rpc('wallet_lock_rental_and_deposit', {
    p_booking_id: args.booking_id,
    p_rental_amount: rentalAmount,
    p_deposit_amount: depositAmount,
  });

  if (lockError) {
    console.error('Wallet lock error:', lockError);
    return { error: `Error al bloquear fondos: ${lockError.message}`, success: false };
  }

  return {
    success: true,
    booking_id: args.booking_id,
    car: `${(booking.car as any)?.brand} ${(booking.car as any)?.model}`,
    amount_locked: totalNeeded,
    rental_locked: rentalAmount,
    deposit_locked: depositAmount,
    payment_status: 'funds_locked',
    message: 'Pago procesado exitosamente. Fondos bloqueados hasta completar el viaje.',
    next_step: booking.status === 'pending'
      ? 'Esperando aprobación del propietario'
      : 'Reserva confirmada - disfruta tu viaje!',
  };
}

async function executeInitiateCardPayment(
  supabase: SupabaseClient,
  userId: string,
  args: { booking_id: string }
) {
  console.log('[AUTONOMOUS] Initiating card payment:', args.booking_id);

  // 1. Get booking details
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, status, renter_id, total_amount, rental_amount, deposit_amount, payment_status,
      car:car_id (id, brand, model)
    `)
    .eq('id', args.booking_id)
    .single();

  if (bookingError || !booking) {
    return { error: 'Reserva no encontrada', success: false };
  }

  // 2. Verify user is the renter
  if (booking.renter_id !== userId) {
    return { error: 'Solo el arrendatario puede pagar esta reserva', success: false };
  }

  // 3. Check booking status
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return { error: `No se puede pagar una reserva en estado: ${booking.status}`, success: false };
  }

  // 4. Check if already paid
  if (booking.payment_status === 'paid' || booking.payment_status === 'funds_locked') {
    return { error: 'Esta reserva ya está pagada', success: false };
  }

  const totalAmount = (booking.rental_amount || booking.total_amount) + (booking.deposit_amount || 250);

  return {
    success: true,
    booking_id: args.booking_id,
    car: `${(booking.car as any)?.brand} ${(booking.car as any)?.model}`,
    amount_to_pay: totalAmount,
    payment_url: `/bookings/${args.booking_id}/pay`,
    message: 'Para pagar con tarjeta, completa el pago en la siguiente URL:',
    security_note: 'Por seguridad, el agente no procesa datos de tarjeta directamente. Usa la interfaz de pago segura.',
  };
}

// ============================================================================
// AI VISION TOOLS (Gemini 3 Flash)
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

async function executeAnalyzeVehicleDamage(
  supabase: SupabaseClient,
  userId: string,
  args: { booking_id: string }
) {
  console.log('[AI VISION] Analyzing vehicle damage for booking:', args.booking_id);

  try {
    // 1. Get booking with check-in/check-out images
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        id, status, renter_id, owner_id,
        check_in_photos, check_out_photos,
        car:car_id (id, brand, model, plate)
      `)
      .eq('id', args.booking_id)
      .single();

    if (bookingError || !booking) {
      return { error: 'Reserva no encontrada', success: false };
    }

    // 2. Verify user is part of the booking
    if (booking.renter_id !== userId && booking.owner_id !== userId) {
      return { error: 'No tienes acceso a esta reserva', success: false };
    }

    // 3. Check if we have images
    const checkInPhotos = booking.check_in_photos || [];
    const checkOutPhotos = booking.check_out_photos || [];

    if (checkInPhotos.length === 0 || checkOutPhotos.length === 0) {
      return {
        success: false,
        error: 'Se requieren fotos de check-in y check-out para analizar daños',
        has_check_in: checkInPhotos.length > 0,
        has_check_out: checkOutPhotos.length > 0,
      };
    }

    // 4. Call the analyze-damage-images edge function
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/analyze-damage-images`;

    // Get session token
    const { data: { session } } = await supabase.auth.getSession();

    // Analyze each pair of images
    const allDamages: any[] = [];
    const pairCount = Math.min(checkInPhotos.length, checkOutPhotos.length);

    for (let i = 0; i < pairCount; i++) {
      try {
        const response = await fetch(edgeFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify({
            check_in_image_url: checkInPhotos[i],
            check_out_image_url: checkOutPhotos[i],
            pair_index: i + 1,
            booking_id: args.booking_id,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.damages) {
            allDamages.push(...result.damages);
          }
        }
      } catch (pairError) {
        console.error(`Error analyzing pair ${i + 1}:`, pairError);
      }
    }

    // 5. Calculate totals
    const totalEstimatedCost = allDamages.reduce((sum, d) => {
      const baseCosts: Record<string, number> = {
        scratch: 150, dent: 300, broken_glass: 400,
        tire_damage: 200, mechanical: 500, interior: 250,
        missing_item: 100, other: 200,
      };
      const severityMultiplier: Record<string, number> = {
        minor: 1, moderate: 1.5, severe: 2,
      };
      const base = baseCosts[d.type] || 200;
      const mult = severityMultiplier[d.severity] || 1;
      return sum + (base * mult);
    }, 0);

    const car = booking.car as any;

    return {
      success: true,
      booking_id: args.booking_id,
      car: `${car?.brand} ${car?.model} (${car?.plate})`,
      images_analyzed: pairCount,
      damages_found: allDamages.length,
      damages: allDamages,
      total_estimated_cost_usd: Math.round(totalEstimatedCost),
      recommendation: allDamages.length === 0
        ? 'No se detectaron daños nuevos. El vehículo parece estar en buen estado.'
        : allDamages.some(d => d.severity === 'severe')
          ? 'Se detectaron daños graves. Se recomienda revisar y crear una disputa si es necesario.'
          : 'Se detectaron algunos daños menores. Revisa los detalles.',
    };
  } catch (error) {
    console.error('[AI VISION] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al analizar daños',
    };
  }
}

async function executeSmartVerifyDocument(
  supabase: SupabaseClient,
  userId: string,
  args: { image_url: string; document_type: string; country: string }
) {
  console.log('[AI VISION] Smart document verification:', args.document_type, args.country);

  try {
    // Call the gemini3-document-analyzer edge function
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/gemini3-document-analyzer`;

    // Get session token
    const { data: { session } } = await supabase.auth.getSession();

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        image_url: args.image_url,
        document_type: args.document_type,
        country: args.country,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI VISION] Edge function error:', errorText);
      return {
        success: false,
        error: 'Error al verificar documento',
      };
    }

    const result = await response.json();

    // Format response for chat
    if (result.success) {
      const extracted = result.extracted_data || {};
      const fraud = result.fraud_check || {};

      return {
        success: true,
        confidence: result.confidence,
        extracted_data: {
          nombre: extracted.full_name || null,
          documento: extracted.document_number || null,
          fecha_nacimiento: extracted.birth_date || null,
          fecha_vencimiento: extracted.expiry_date || null,
          genero: extracted.gender || null,
          nacionalidad: extracted.nationality || null,
          categorias_licencia: extracted.license_categories || null,
        },
        fraud_check: {
          is_suspicious: fraud.is_suspicious || false,
          recommendation: fraud.recommendation || 'manual_review',
          indicators: fraud.indicators || [],
        },
        validation_errors: result.validation_errors || [],
        validation_warnings: result.validation_warnings || [],
        message: fraud.is_suspicious
          ? 'Se detectaron indicadores de posible fraude. El documento requiere revisión manual.'
          : result.confidence >= 0.7
            ? 'Documento verificado exitosamente con alta confianza.'
            : 'Documento analizado pero requiere verificación adicional.',
      };
    }

    return {
      success: false,
      error: result.error || 'No se pudo analizar el documento',
    };
  } catch (error) {
    console.error('[AI VISION] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error al verificar documento',
    };
  }
}

// ============================================================================
// TOOL EXECUTOR
// ============================================================================

async function executeTool(
  toolName: string,
  args: any,
  supabase: SupabaseClient,
  userId: string
): Promise<any> {
  console.log(`Executing tool: ${toolName}`, args);

  switch (toolName) {
    // Read tools
    case 'get_wallet_status':
      return executeGetWalletStatus(supabase, userId);
    case 'get_blocked_funds_details':
      return executeGetBlockedFundsDetails(supabase, userId);
    case 'get_user_bookings':
      return executeGetUserBookings(supabase, userId, args);
    case 'get_user_stats':
      return executeGetUserStats(supabase, userId);
    case 'search_available_cars':
      return executeSearchCars(supabase, args);
    case 'get_booking_details':
      return executeGetBookingDetails(supabase, args.bookingId);

    // Write tools (Autonomous Actions)
    case 'create_booking':
      return executeCreateBooking(supabase, userId, args);
    case 'approve_booking':
      return executeApproveBooking(supabase, userId, args);
    case 'reject_booking':
      return executeRejectBooking(supabase, userId, args);
    case 'cancel_booking':
      return executeCancelBooking(supabase, userId, args);
    case 'process_wallet_payment':
      return executeProcessWalletPayment(supabase, userId, args);
    case 'initiate_card_payment':
      return executeInitiateCardPayment(supabase, userId, args);

    // AI Vision tools (Gemini 3 Flash)
    case 'analyze_vehicle_damage':
      return executeAnalyzeVehicleDamage(supabase, userId, args);
    case 'smart_verify_document':
      return executeSmartVerifyDocument(supabase, userId, args);

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// GEMINI API INTERACTION - REST API with Function Calling
// ============================================================================

async function callGemini(
  messages: GeminiMessage[],
  tools: any
): Promise<{ text?: string; functionCalls?: any[] }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: messages,
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    tools: [tools],
    toolConfig: {
      functionCallingConfig: {
        mode: 'AUTO',
      },
    },
    generationConfig: {
      temperature: 0.1,
      topK: 20,
      topP: 0.9,
      maxOutputTokens: 4096, // Gemini 3 Flash supports more tokens
    },
  };

  console.log('[Gemini REST] Calling', GEMINI_MODEL, 'with', tools.functionDeclarations.length, 'tools');
  console.log('[Gemini REST] Messages:', messages.length);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Gemini REST] Error response:', errorText);
    throw new Error(`Gemini API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const content = candidate?.content;

  if (!content) {
    throw new Error('No content in Gemini response');
  }

  const functionCalls = content.parts
    ?.filter((part: any) => part.functionCall)
    .map((part: any) => part.functionCall);

  const textParts = content.parts?.filter((part: any) => part.text);
  const text = textParts?.map((part: any) => part.text).join('');

  console.log('[Gemini REST] Function calls:', functionCalls?.length || 0);
  console.log('[Gemini REST] Text response:', text ? text.substring(0, 100) + '...' : 'no');

  return {
    text: text || undefined,
    functionCalls: functionCalls?.length > 0 ? functionCalls : undefined,
  };
}

// ============================================================================
// MAIN AGENT LOOP
// ============================================================================

interface AgentSuggestion {
  label: string;
  action: string;
  icon?: string;
}

async function runAgent(
  userMessage: string,
  supabase: SupabaseClient,
  userId: string
): Promise<{ response: string; toolsUsed: string[]; suggestions?: AgentSuggestion[] }> {
  const messages: GeminiMessage[] = [];
  const toolsUsed: string[] = [];
  let collectedSuggestions: AgentSuggestion[] = [];

  // Add user context as system context in the first message
  // This informs Gemini that the user is authenticated
  const userContext = `[CONTEXTO DEL SISTEMA: Usuario autenticado con ID ${userId}. Todas las herramientas de escritura (create_booking, approve_booking, etc.) ya tienen acceso al ID del usuario. NO necesitas pedir el ID del cliente - ya lo tienes. Ejecuta las acciones directamente.]

Mensaje del usuario: ${userMessage}`;

  // Add user message with context
  messages.push({
    role: 'user',
    parts: [{ text: userContext }],
  });

  // Agent loop (max 5 iterations to prevent infinite loops)
  for (let i = 0; i < 5; i++) {
    const result = await callGemini(messages, TOOLS);

    // If there are function calls, execute them
    if (result.functionCalls && result.functionCalls.length > 0) {
      // Add model's function call to messages
      messages.push({
        role: 'model',
        parts: result.functionCalls.map((fc: any) => ({ functionCall: fc })),
      });

      // Execute each function call
      const functionResponses: any[] = [];
      for (const fc of result.functionCalls) {
        toolsUsed.push(fc.name);
        const toolResult = await executeTool(fc.name, fc.args || {}, supabase, userId);

        // Capturar sugerencias de search_available_cars
        if (fc.name === 'search_available_cars' && toolResult.suggestions) {
          collectedSuggestions = toolResult.suggestions;
        }

        functionResponses.push({
          functionResponse: {
            name: fc.name,
            response: toolResult,
          },
        });
      }

      // Add function responses to messages
      messages.push({
        role: 'user',
        parts: functionResponses,
      });

      continue; // Continue the loop to get the final response
    }

    // If we have a text response and no more function calls, we're done
    if (result.text) {
      return {
        response: result.text,
        toolsUsed: [...new Set(toolsUsed)], // Remove duplicates
        suggestions: collectedSuggestions.length > 0 ? collectedSuggestions : undefined,
      };
    }
  }

  return {
    response: 'Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.',
    toolsUsed,
    suggestions: collectedSuggestions.length > 0 ? collectedSuggestions : undefined,
  };
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();

    // Handle health check
    if (body.healthCheck) {
      return new Response(
        JSON.stringify({
          status: 'ok',
          model: GEMINI_MODEL,
          apiKeyConfigured: !!GEMINI_API_KEY,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Verify API key is configured
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const { message, sessionId, context } = body as ChatRequest;

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Create Supabase client with user's auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_ANON_KEY') || '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401,
        }
      );
    }

    console.log(`Processing message for user: ${user.id}`);

    // Run the agent
    const { response, toolsUsed, suggestions } = await runAgent(message, supabase, user.id);

    const chatResponse: ChatResponse = {
      success: true,
      response,
      sessionId: sessionId || crypto.randomUUID(),
      toolsUsed,
      timestamp: new Date().toISOString(),
      suggestions,  // Sugerencias clickeables para el frontend
    };

    return new Response(
      JSON.stringify(chatResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Agent error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to process message',
        message: error instanceof Error ? error.message : String(error),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
