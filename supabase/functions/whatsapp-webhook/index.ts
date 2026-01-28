/**
 * WhatsApp Webhook - AI Bot con Debounce Redis
 *
 * Solución de debounce usando timestamp en Redis (patrón de grandes empresas):
 * 1. Cada mensaje guarda su timestamp en Redis
 * 2. Después de esperar, verifica si llegó uno más nuevo
 * 3. Solo el último mensaje de una ráfaga responde
 *
 * @see https://community.n8n.io/t/whatsapp-debounce-flow-combine-multiple-rapid-messages-into-one-ai-response-using-redis-n8n/225494
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuración
const DEBOUNCE_MS = 4000 // 4 segundos de espera para agrupar mensajes
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL') || 'http://localhost:3000'
const WAHA_SESSION = Deno.env.get('WAHA_SESSION') || 'default'

// Upstash Redis REST API
const UPSTASH_REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL')
const UPSTASH_REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN')

// Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============ REDIS HELPERS ============

async function redisSet(key: string, value: string, exSeconds?: number): Promise<void> {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
    console.log('[Redis] Not configured, skipping')
    return
  }

  const body = exSeconds
    ? ['SET', key, value, 'EX', exSeconds.toString()]
    : ['SET', key, value]

  await fetch(`${UPSTASH_REDIS_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
}

async function redisGet(key: string): Promise<string | null> {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
    return null
  }

  const res = await fetch(`${UPSTASH_REDIS_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(['GET', key]),
  })

  const data = await res.json()
  return data.result
}

// ============ WAHA HELPERS ============

async function sendTyping(chatId: string): Promise<void> {
  try {
    await fetch(`${WAHA_BASE_URL}/api/sendSeen`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: WAHA_SESSION, chatId }),
    })

    await fetch(`${WAHA_BASE_URL}/api/startTyping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: WAHA_SESSION, chatId }),
    })
  } catch (e) {
    console.error('[Typing] Error:', e)
  }
}

async function stopTyping(chatId: string): Promise<void> {
  try {
    await fetch(`${WAHA_BASE_URL}/api/stopTyping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: WAHA_SESSION, chatId }),
    })
  } catch (e) {
    console.error('[StopTyping] Error:', e)
  }
}

async function sendMessage(chatId: string, text: string): Promise<void> {
  await fetch(`${WAHA_BASE_URL}/api/sendText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId,
      text,
    }),
  })
}

// ============ AI HELPERS ============

function buildSystemPrompt(): string {
  return `Eres un asistente de AutoRenta, la primera plataforma de alquiler de autos entre personas en Argentina y Brasil.

TONO: Formal y respetuoso. Usá "usted", "Estimado/a", "Señor/a". Sé amable pero profesional.

MODELO COMODATO (MUY IMPORTANTE):
- 15% va a la plataforma AutoRenta
- 70% va al Pool de Rewards (se reparte entre TODOS los owners de la comunidad mensualmente)
- 15% va al FGO (Fondo de Garantía de Owners) que protege a todos sin franquicia
- El owner NO recibe pago directo por cada alquiler
- El owner GANA rewards mensuales basados en: disponibilidad, rating, antigüedad, referidos, tiempo de respuesta

BENEFICIOS CLAVE:
- Sin franquicia - el fondo comunitario protege a todos
- Vos elegís cuándo alquilar y a quién
- Podés aprobar o rechazar cada reserva
- Inspección documentada antes y después de cada alquiler
- Seguro incluido durante el alquiler

CUANDO DETECTES INTENCIÓN, incluí al final de tu respuesta (NO visible al usuario):
[INTENT:PUBLICAR] - quiere poner su auto a alquilar
[INTENT:ALQUILAR] - quiere alquilar un auto
[INTENT:DUDAS] - tiene preguntas generales
[INTENT:PRECIO] - pregunta sobre precios/ganancias
[INTENT:NO_INTERESADO] - no le interesa

SI EL USUARIO ES GROSERO O IRRESPETUOSO:
- Respondé con calma: "Lamento que se sienta así. Un asociado de AutoRenta se comunicará con usted personalmente para asistirlo."
- Agregá [INTENT:RUDE] al final

LINKS ÚTILES (incluí según el contexto):
- Publicar auto: https://autorenta.app/publicar
- Ver autos disponibles: https://autorenta.app/autos
- Cómo funciona: https://autorenta.app/como-funciona
- Preguntas frecuentes: https://autorenta.app/faq

Sé conciso (máximo 3-4 oraciones). No uses emojis excesivos.`
}

async function getContactId(phone: string): Promise<string | null> {
  const { data } = await supabase
    .from('outreach_contacts')
    .select('id')
    .eq('phone', phone)
    .single()

  return data?.id || null
}

async function getConversationContext(contactId: string): Promise<string> {
  const { data } = await supabase
    .from('outreach_messages')
    .select('direction, content, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (!data || data.length === 0) return ''

  return data
    .reverse()
    .map(m => `${m.direction === 'outbound' ? 'AutoRenta' : 'Usuario'}: ${m.content}`)
    .join('\n')
}

async function generateAIResponse(userMessage: string, context: string): Promise<string> {
  const groqKey = Deno.env.get('GROQ_API_KEY')
  if (!groqKey) {
    console.error('[Groq] API key not configured')
    return 'Gracias por contactarnos. Un asociado se comunicará con usted pronto.'
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
  ]

  if (context) {
    messages.push({ role: 'user', content: `Contexto de la conversación:\n${context}` })
  }

  messages.push({ role: 'user', content: userMessage })

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${groqKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Gracias por su mensaje. Lo atenderemos a la brevedad.'
}

// ============ HELPERS ============

function extractIntent(response: string): string | null {
  const match = response.match(/\[INTENT:(\w+)\]/)
  return match ? match[1] : null
}

function cleanResponse(response: string): string {
  return response.replace(/\[INTENT:\w+\]/g, '').trim()
}

function addSmartLinks(response: string, intent: string | null): string {
  if (!intent) return response

  const links: Record<string, string> = {
    PUBLICAR: '\n\n👉 Publicá tu auto: https://autorenta.app/publicar',
    ALQUILAR: '\n\n👉 Ver autos disponibles: https://autorenta.app/autos',
    PRECIO: '\n\n👉 Calculá tus ganancias: https://autorenta.app/publicar',
    DUDAS: '\n\n👉 Más info: https://autorenta.app/como-funciona',
  }

  return response + (links[intent] || '')
}

// ============ MAIN HANDLER ============

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  }

  try {
    const payload = await req.json()
    console.log('[Webhook] Received:', JSON.stringify(payload).slice(0, 500))

    // Solo procesar mensajes entrantes de texto
    if (payload.event !== 'message' || payload.payload?.fromMe) {
      return new Response('OK', { status: 200 })
    }

    const message = payload.payload
    const chatId = message.from
    const phone = chatId.replace('@c.us', '')
    const messageId = message.id
    const messageText = message.body || message.text || ''
    const myTimestamp = Date.now()

    if (!messageText.trim()) {
      return new Response('OK', { status: 200 })
    }

    console.log(`[Message] From ${phone}: "${messageText}"`)

    // ========== DEDUPLICACIÓN ==========
    // Verificar si ya procesamos este mensaje
    const { data: existing } = await supabase
      .from('outreach_messages')
      .select('id')
      .eq('whatsapp_message_id', messageId)
      .single()

    if (existing) {
      console.log(`[Dedup] Message ${messageId} already processed`)
      return new Response('OK', { status: 200 })
    }

    // Obtener o crear contacto
    let contactId = await getContactId(phone)

    if (!contactId) {
      // Crear contacto si no existe
      const { data: newContact } = await supabase
        .from('outreach_contacts')
        .insert({ phone, status: 'responded', source: 'whatsapp_inbound' })
        .select('id')
        .single()

      contactId = newContact?.id
    }

    if (!contactId) {
      console.error('[Error] Could not get or create contact for', phone)
      return new Response('Error', { status: 500 })
    }

    // Guardar mensaje entrante inmediatamente
    await supabase.from('outreach_messages').insert({
      contact_id: contactId,
      direction: 'inbound',
      content: messageText,
      whatsapp_message_id: messageId,
    })

    // ========== DEBOUNCE CON REDIS ==========
    const debounceKey = `whatsapp:debounce:${phone}`

    // Guardar nuestro timestamp en Redis
    await redisSet(debounceKey, myTimestamp.toString(), 60) // TTL 60 segundos

    console.log(`[Debounce] Set timestamp ${myTimestamp} for ${phone}, waiting ${DEBOUNCE_MS}ms...`)

    // Esperar el período de debounce
    await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS))

    // Verificar si llegó un mensaje más nuevo
    const lastTimestamp = await redisGet(debounceKey)

    if (lastTimestamp && parseInt(lastTimestamp) > myTimestamp) {
      console.log(`[Debounce] Newer message exists (${lastTimestamp} > ${myTimestamp}), skipping response`)
      return new Response('OK', { status: 200 })
    }

    console.log(`[Debounce] This is the latest message, proceeding with response`)

    // ========== OBTENER TODOS LOS MENSAJES DEL BATCH ==========
    // Obtener mensajes de los últimos 5 segundos para combinarlos
    const batchStart = new Date(myTimestamp - DEBOUNCE_MS - 1000).toISOString()
    const { data: batchMessages } = await supabase
      .from('outreach_messages')
      .select('content')
      .eq('contact_id', contactId)
      .eq('direction', 'inbound')
      .gte('created_at', batchStart)
      .order('created_at', { ascending: true })

    // Combinar mensajes del batch
    const combinedMessage = batchMessages
      ?.map(m => m.content)
      .join(' ') || messageText

    console.log(`[Batch] Combined ${batchMessages?.length || 1} messages: "${combinedMessage}"`)

    // ========== GENERAR RESPUESTA ==========
    // Mostrar "escribiendo..."
    await sendTyping(chatId)

    // Obtener contexto de conversación
    const context = await getConversationContext(contactId)

    // Generar respuesta con IA
    const aiResponse = await generateAIResponse(combinedMessage, context)

    // Extraer intención y limpiar respuesta
    const intent = extractIntent(aiResponse)
    let finalResponse = cleanResponse(aiResponse)

    // Agregar links inteligentes
    finalResponse = addSmartLinks(finalResponse, intent)

    // Simular tiempo de escritura humano
    const typingDelay = Math.min(finalResponse.length * 30, 3000) // ~30ms por caracter, max 3s
    await new Promise(resolve => setTimeout(resolve, typingDelay))

    // Enviar respuesta
    await stopTyping(chatId)
    await sendMessage(chatId, finalResponse)

    // Guardar respuesta en DB
    await supabase.from('outreach_messages').insert({
      contact_id: contactId,
      direction: 'outbound',
      content: finalResponse,
    })

    // Actualizar estado del contacto
    const updateData: Record<string, unknown> = {
      last_message_received_at: new Date().toISOString(),
      messages_received: supabase.rpc('increment_column', { row_id: contactId, col: 'messages_received' }),
    }

    if (intent) {
      updateData.detected_intent = intent

      if (intent === 'RUDE') {
        updateData.status = 'needs_attention'
        updateData.requires_human = true
      } else if (intent === 'PUBLICAR' || intent === 'ALQUILAR') {
        updateData.status = 'interested'
      }
    }

    await supabase
      .from('outreach_contacts')
      .update(updateData)
      .eq('id', contactId)

    console.log(`[Done] Responded to ${phone} with intent: ${intent}`)

    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('[Error]', error)
    return new Response('Error', { status: 500 })
  }
})
