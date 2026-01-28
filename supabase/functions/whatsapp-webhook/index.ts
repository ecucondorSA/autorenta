/**
 * WhatsApp Webhook - AI Bot con Registro de Usuarios
 *
 * Features:
 * - Debounce con Supabase
 * - Detección de intención
 * - Registro de usuarios via chat (email + contraseña)
 * - Contexto conversacional
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Configuración
const DEBOUNCE_MS = 4000
const GROQ_MODEL = 'llama-3.3-70b-versatile'
const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL') || 'http://localhost:3000'
const WAHA_SESSION = Deno.env.get('WAHA_SESSION') || 'default'
const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY') || ''

const wahaHeaders = {
  'Content-Type': 'application/json',
  'X-Api-Key': WAHA_API_KEY,
}

// Supabase
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// ============ DEBOUNCE ============

async function debounceSet(phone: string, timestamp: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('whatsapp_debounce_set', {
    p_phone: phone,
    p_timestamp: timestamp,
  })
  if (error) {
    console.error('[Debounce] Error setting:', error)
    return true
  }
  return data === true
}

async function debounceCheck(phone: string, timestamp: number): Promise<boolean> {
  const { data, error } = await supabase.rpc('whatsapp_debounce_check', {
    p_phone: phone,
    p_timestamp: timestamp,
  })
  if (error) {
    console.error('[Debounce] Error checking:', error)
    return true
  }
  return data === true
}

// ============ REGISTRATION STATE ============

interface RegistrationState {
  phone: string
  state: 'idle' | 'waiting_email' | 'waiting_password' | 'completed'
  email?: string
}

async function getRegistrationState(phone: string): Promise<RegistrationState | null> {
  const { data } = await supabase
    .from('whatsapp_registration')
    .select('*')
    .eq('phone', phone)
    .single()

  return data
}

async function setRegistrationState(phone: string, state: string, email?: string): Promise<void> {
  await supabase
    .from('whatsapp_registration')
    .upsert({
      phone,
      state,
      email: email || null,
      updated_at: new Date().toISOString(),
    })
}

async function clearRegistrationState(phone: string): Promise<void> {
  await supabase
    .from('whatsapp_registration')
    .delete()
    .eq('phone', phone)
}

// ============ USER CREATION ============

async function createUserAccount(phone: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      phone: `+${phone}`,
      email_confirm: true, // Auto-confirmar email ya que verificamos por WhatsApp
      phone_confirm: true, // El teléfono ya está verificado (es WhatsApp)
    })

    if (authError) {
      console.error('[Auth] Error creating user:', authError)
      if (authError.message.includes('already registered')) {
        return { success: false, error: 'email_exists' }
      }
      return { success: false, error: 'auth_error' }
    }

    // Actualizar el perfil con el teléfono
    if (authData.user) {
      await supabase
        .from('profiles')
        .update({
          phone: `+${phone}`,
          phone_verified: true,
          onboarding_completed: false,
        })
        .eq('id', authData.user.id)
    }

    console.log(`[Auth] User created: ${email} (${phone})`)
    return { success: true }

  } catch (error) {
    console.error('[Auth] Unexpected error:', error)
    return { success: false, error: 'unexpected' }
  }
}

// ============ WAHA HELPERS ============

async function sendTyping(chatId: string): Promise<void> {
  try {
    await fetch(`${WAHA_BASE_URL}/api/sendSeen`, {
      method: 'POST',
      headers: wahaHeaders,
      body: JSON.stringify({ session: WAHA_SESSION, chatId }),
    })
    await fetch(`${WAHA_BASE_URL}/api/startTyping`, {
      method: 'POST',
      headers: wahaHeaders,
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
      headers: wahaHeaders,
      body: JSON.stringify({ session: WAHA_SESSION, chatId }),
    })
  } catch (e) {
    console.error('[StopTyping] Error:', e)
  }
}

async function sendMessage(chatId: string, text: string): Promise<void> {
  await fetch(`${WAHA_BASE_URL}/api/sendText`, {
    method: 'POST',
    headers: wahaHeaders,
    body: JSON.stringify({
      session: WAHA_SESSION,
      chatId,
      text,
    }),
  })
}

// ============ VALIDATION HELPERS ============

function isValidEmail(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
  const match = text.match(emailRegex)
  return match ? match[0].toLowerCase() : null
}

function isValidPassword(text: string): boolean {
  return text.trim().length >= 6
}

function looksLikeYes(text: string): boolean {
  const yesWords = ['si', 'sí', 'yes', 'dale', 'ok', 'bueno', 'claro', 'por supuesto', 'quiero', 'acepto', 'va', 'vamos']
  const lower = text.toLowerCase().trim()
  return yesWords.some(w => lower.includes(w))
}

function looksLikeNo(text: string): boolean {
  const noWords = ['no', 'nop', 'nel', 'nunca', 'negativo', 'despues', 'después', 'luego', 'ahora no']
  const lower = text.toLowerCase().trim()
  return noWords.some(w => lower.includes(w))
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
[INTENT:REGISTRAR] - quiere crear una cuenta o registrarse

SI EL USUARIO ES GROSERO O IRRESPETUOSO:
- Respondé con calma: "Lamento que se sienta así. Un asociado de AutoRenta se comunicará con usted personalmente para asistirlo."
- Agregá [INTENT:RUDE] al final

LINKS ÚTILES (incluí según el contexto):
- Publicar auto: https://autorentar.com/publicar
- Ver autos disponibles: https://autorentar.com/autos
- Cómo funciona: https://autorentar.com/como-funciona
- Preguntas frecuentes: https://autorentar.com/faq

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
    PUBLICAR: '\n\n👉 Publicá tu auto: https://autorentar.com/publicar',
    ALQUILAR: '\n\n👉 Ver autos disponibles: https://autorentar.com/autos',
    PRECIO: '\n\n👉 Calculá tus ganancias: https://autorentar.com/publicar',
    DUDAS: '\n\n👉 Más info: https://autorentar.com/como-funciona',
  }

  return response + (links[intent] || '')
}

// ============ REGISTRATION FLOW MESSAGES ============

const MESSAGES = {
  askEmail: `¡Excelente! Para crear su cuenta, necesito su correo electrónico.

Por favor, envíeme su email:`,

  invalidEmail: `No pude reconocer un email válido. Por favor, envíeme su correo electrónico en formato correcto (ejemplo: nombre@email.com):`,

  askPassword: (email: string) => `Perfecto, su email es: ${email}

Ahora elija una contraseña segura (mínimo 6 caracteres):`,

  invalidPassword: `La contraseña debe tener al menos 6 caracteres. Por favor, elija otra:`,

  accountCreated: (email: string) => `✅ ¡Cuenta creada exitosamente!

📧 Email: ${email}
📱 Teléfono: Verificado via WhatsApp

Ya puede ingresar a la app:
👉 https://autorentar.com/auth/login

Use su email y la contraseña que eligió para acceder.`,

  emailExists: `Este email ya está registrado en AutoRenta.

¿Ya tiene cuenta? Puede ingresar directamente:
👉 https://autorentar.com/auth/login

Si olvidó su contraseña:
👉 https://autorentar.com/auth/reset-password`,

  accountError: `Hubo un problema al crear su cuenta. Por favor, intente nuevamente más tarde o regístrese directamente en:
👉 https://autorentar.com/auth/register`,

  offerRegistration: `¿Le gustaría crear su cuenta ahora mismo? Solo necesito su email y una contraseña.

Responda "Sí" para comenzar o "No" si prefiere hacerlo después.`,

  registrationDeclined: `Entendido. Cuando esté listo, puede registrarse en:
👉 https://autorentar.com/auth/register

¿Hay algo más en lo que pueda ayudarlo?`,
}

// ============ MAIN HANDLER ============

Deno.serve(async (req) => {
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

    // Guardar mensaje entrante
    await supabase.from('outreach_messages').insert({
      contact_id: contactId,
      direction: 'inbound',
      content: messageText,
      whatsapp_message_id: messageId,
    })

    // ========== DEBOUNCE ==========
    await debounceSet(phone, myTimestamp)
    console.log(`[Debounce] Set timestamp ${myTimestamp} for ${phone}, waiting ${DEBOUNCE_MS}ms...`)

    await new Promise(resolve => setTimeout(resolve, DEBOUNCE_MS))

    const isLatest = await debounceCheck(phone, myTimestamp)
    if (!isLatest) {
      console.log(`[Debounce] Newer message exists, skipping`)
      return new Response('OK', { status: 200 })
    }

    // Obtener mensajes del batch
    const batchStart = new Date(myTimestamp - DEBOUNCE_MS - 1000).toISOString()
    const { data: batchMessages } = await supabase
      .from('outreach_messages')
      .select('content')
      .eq('contact_id', contactId)
      .eq('direction', 'inbound')
      .gte('created_at', batchStart)
      .order('created_at', { ascending: true })

    const combinedMessage = batchMessages?.map(m => m.content).join(' ') || messageText

    await sendTyping(chatId)

    // ========== REGISTRATION FLOW ==========
    const regState = await getRegistrationState(phone)
    let finalResponse = ''

    if (regState?.state === 'waiting_email') {
      // Usuario debe enviar email
      const email = isValidEmail(combinedMessage)

      if (email) {
        // Email válido - pedir contraseña
        await setRegistrationState(phone, 'waiting_password', email)
        finalResponse = MESSAGES.askPassword(email)
        console.log(`[Registration] Email received: ${email}`)
      } else {
        // Email inválido
        finalResponse = MESSAGES.invalidEmail
      }

    } else if (regState?.state === 'waiting_password') {
      // Usuario debe enviar contraseña
      if (isValidPassword(combinedMessage)) {
        const email = regState.email!
        const password = combinedMessage.trim()

        const result = await createUserAccount(phone, email, password)

        if (result.success) {
          await clearRegistrationState(phone)
          finalResponse = MESSAGES.accountCreated(email)

          // Actualizar estado del contacto
          await supabase
            .from('outreach_contacts')
            .update({ status: 'registered', converted_at: new Date().toISOString() })
            .eq('id', contactId)

          console.log(`[Registration] Account created for ${email}`)
        } else if (result.error === 'email_exists') {
          await clearRegistrationState(phone)
          finalResponse = MESSAGES.emailExists
        } else {
          await clearRegistrationState(phone)
          finalResponse = MESSAGES.accountError
        }
      } else {
        finalResponse = MESSAGES.invalidPassword
      }

    } else {
      // Flujo normal - IA
      const context = await getConversationContext(contactId)
      const aiResponse = await generateAIResponse(combinedMessage, context)
      const intent = extractIntent(aiResponse)
      finalResponse = cleanResponse(aiResponse)

      // Si detectamos intención de registro o interés alto, ofrecer registro
      if (intent === 'REGISTRAR') {
        await setRegistrationState(phone, 'waiting_email')
        finalResponse = finalResponse + '\n\n' + MESSAGES.askEmail
      } else if ((intent === 'PUBLICAR' || intent === 'ALQUILAR') && !regState) {
        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', `+${phone}`)
          .single()

        if (!existingUser) {
          finalResponse = finalResponse + '\n\n' + MESSAGES.offerRegistration
          // Marcar que ofrecimos registro (para detectar respuesta)
          await setRegistrationState(phone, 'idle')
        } else {
          finalResponse = addSmartLinks(finalResponse, intent)
        }
      } else if (regState?.state === 'idle') {
        // Verificar si responde a la oferta de registro
        if (looksLikeYes(combinedMessage)) {
          await setRegistrationState(phone, 'waiting_email')
          finalResponse = MESSAGES.askEmail
        } else if (looksLikeNo(combinedMessage)) {
          await clearRegistrationState(phone)
          finalResponse = MESSAGES.registrationDeclined
        } else {
          // Respuesta no relacionada con registro
          await clearRegistrationState(phone)
          finalResponse = addSmartLinks(finalResponse, intent)
        }
      } else {
        finalResponse = addSmartLinks(finalResponse, intent)
      }

      // Actualizar intención en contacto
      if (intent) {
        const updateData: Record<string, unknown> = {
          last_message_received_at: new Date().toISOString(),
          detected_intent: intent,
        }

        if (intent === 'RUDE') {
          updateData.status = 'needs_attention'
          updateData.requires_human = true
        } else if (intent === 'PUBLICAR' || intent === 'ALQUILAR') {
          updateData.status = 'interested'
        }

        await supabase
          .from('outreach_contacts')
          .update(updateData)
          .eq('id', contactId)
      }
    }

    // Simular typing
    const typingDelay = Math.min(finalResponse.length * 30, 3000)
    await new Promise(resolve => setTimeout(resolve, typingDelay))

    await stopTyping(chatId)
    await sendMessage(chatId, finalResponse)

    // Guardar respuesta
    await supabase.from('outreach_messages').insert({
      contact_id: contactId,
      direction: 'outbound',
      content: finalResponse,
    })

    console.log(`[Done] Responded to ${phone}`)
    return new Response('OK', { status: 200 })

  } catch (error) {
    console.error('[Error]', error)
    return new Response('Error', { status: 500 })
  }
})
