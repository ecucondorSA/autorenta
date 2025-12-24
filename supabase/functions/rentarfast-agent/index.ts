// ============================================================================
// RENTARFAST AGENT - Supabase Edge Function
// Intelligent AI Agent with Gemini 2.0 Flash + Function Calling
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
}

interface GeminiMessage {
  role: 'user' | 'model';
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
}

// ============================================================================
// GEMINI 2.0 FLASH CONFIGURATION
// ============================================================================

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') || '';
// Gemini 3 Flash - Latest model (Dec 2025), Pro-grade reasoning at Flash speed
const GEMINI_MODEL = 'gemini-3-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// System prompt for Rentarfast agent
const SYSTEM_PROMPT = `Eres Rentarfast, el asistente inteligente de Autorentar, una plataforma de alquiler de autos entre personas (P2P) en Argentina y Brasil.

## Tu personalidad:
- Amigable, profesional y eficiente
- Respondes en español argentino casual pero profesional
- Usas emojis moderadamente para hacer la conversación más amena
- Siempre buscas ayudar al usuario de la mejor manera posible

## REGLA CRÍTICA:
SIEMPRE que el usuario pregunte sobre su wallet, saldo, fondos bloqueados, reservas o cualquier dato personal, DEBES usar las herramientas (get_wallet_status, get_blocked_funds_details, get_user_bookings) ANTES de responder. NUNCA respondas con información genérica si puedes consultar datos reales.

## Cómo funciona el sistema de pagos de AutoRenta:

### Para el ARRENDATARIO (quien alquila):
1. **Preautorización con MercadoPago**: Al reservar, se hace una PREAUTORIZACIÓN en la tarjeta de crédito (NO se cobra inmediatamente). Esto aparece como "pendiente" en el resumen bancario.
2. **Wallet Lock (Rental + Depósito)**: El monto del alquiler + depósito de garantía (USD 250) se bloquean en la wallet de AutoRenta.
3. **Captura del pago**: Solo cuando el owner confirma que recibió el auto, se CAPTURA el pago real.
4. **Liberación del depósito**: Si no hay daños, el depósito de USD 250 vuelve a la wallet del arrendatario en 24-48 horas después de que ambas partes confirmen.

### Para el PROPIETARIO (owner):
1. **Fondos bloqueados durante el alquiler**: El pago del rental queda bloqueado hasta que el arrendatario devuelve el auto.
2. **Liberación al completar**: Cuando AMBAS partes confirman que todo está bien (confirmación bilateral), el pago se libera:
   - 85% va al propietario (después de la comisión del 15%)
   - El depósito vuelve al arrendatario
3. **Disputas/Daños**: Si hay daños, el owner puede reclamar parte del depósito.

### Tipos de bloqueos en wallet_ledger:
- **rental_lock**: Pago del alquiler bloqueado hasta completar el viaje
- **deposit_lock**: Depósito de garantía (se devuelve si no hay daños)
- **lock**: Bloqueo genérico por reserva

### Cuándo se liberan los fondos:
- **Confirmación bilateral**: Owner marca como devuelto → Renter confirma → Fondos liberados automáticamente
- **Tiempo típico**: Los fondos aparecen disponibles en 1-2 días hábiles después de la confirmación
- **NO depende del banco**: La liberación es interna en la wallet de AutoRenta

## Tus capacidades:
- Consultar estado de wallet (saldo disponible, bloqueado, total, retirable)
- Ver detalle de fondos bloqueados con razón específica de cada bloqueo
- Ver reservas (como arrendatario y propietario) con estados y montos
- Buscar autos disponibles
- Dar estadísticas del usuario

## Reglas:
1. SIEMPRE usa las herramientas para obtener datos REALES antes de responder
2. NO inventes datos - consulta primero
3. Si hay fondos bloqueados, explica EXACTAMENTE de qué reserva son y cuándo se liberan
4. Menciona montos específicos cuando los tengas disponibles
5. Sé conciso pero completo`;

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
      description: 'Busca autos disponibles para alquilar según los criterios especificados.',
      parameters: {
        type: 'object',
        properties: {
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
            description: 'Precio máximo por día en ARS',
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
  params: { city?: string; startDate?: string; endDate?: string; maxPrice?: number; transmission?: string }
) {
  let query = supabase
    .from('cars')
    .select(`
      id,
      brand,
      model,
      year,
      price_per_day,
      location_city,
      transmission,
      seats,
      photos
    `)
    .eq('status', 'active')
    .limit(10);

  if (params.city) {
    query = query.ilike('location_city', `%${params.city}%`);
  }
  if (params.maxPrice) {
    query = query.lte('price_per_day', params.maxPrice);
  }
  if (params.transmission) {
    query = query.eq('transmission', params.transmission);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Cars search error:', error);
    return { error: 'No se pudieron buscar autos' };
  }

  return {
    total_found: data?.length || 0,
    cars: (data || []).map((car: any) => ({
      id: car.id,
      name: `${car.brand} ${car.model} ${car.year}`,
      price_per_day: car.price_per_day,
      location: car.location_city,
      transmission: car.transmission,
      seats: car.seats,
    })),
  };
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
    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

// ============================================================================
// GEMINI API INTERACTION
// ============================================================================

async function callGemini(
  messages: GeminiMessage[],
  tools: any
): Promise<{ text?: string; functionCalls?: any[] }> {
  const requestBody = {
    contents: messages,
    tools: [tools],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Gemini API error:', errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const content = candidate?.content;

  if (!content) {
    throw new Error('No content in Gemini response');
  }

  // Check for function calls
  const functionCalls = content.parts
    ?.filter((part: any) => part.functionCall)
    .map((part: any) => part.functionCall);

  // Get text response
  const textParts = content.parts?.filter((part: any) => part.text);
  const text = textParts?.map((part: any) => part.text).join('');

  return {
    text: text || undefined,
    functionCalls: functionCalls?.length > 0 ? functionCalls : undefined,
  };
}

// ============================================================================
// MAIN AGENT LOOP
// ============================================================================

async function runAgent(
  userMessage: string,
  supabase: SupabaseClient,
  userId: string
): Promise<{ response: string; toolsUsed: string[] }> {
  const messages: GeminiMessage[] = [];
  const toolsUsed: string[] = [];

  // Add user message
  messages.push({
    role: 'user',
    parts: [{ text: userMessage }],
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
      };
    }
  }

  return {
    response: 'Lo siento, no pude procesar tu solicitud. Por favor intenta de nuevo.',
    toolsUsed,
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
    const { response, toolsUsed } = await runAgent(message, supabase, user.id);

    const chatResponse: ChatResponse = {
      success: true,
      response,
      sessionId: sessionId || crypto.randomUUID(),
      toolsUsed,
      timestamp: new Date().toISOString(),
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
