/**
 * WhatsApp Follow-up - Seguimiento automático después de 48h sin respuesta
 *
 * Se ejecuta via cron job cada hora para detectar contactos sin respuesta.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WAHA_BASE_URL = Deno.env.get('WAHA_BASE_URL') || 'http://localhost:3000'
const WAHA_SESSION = Deno.env.get('WAHA_SESSION') || 'default'
const WAHA_API_KEY = Deno.env.get('WAHA_API_KEY') || ''

const wahaHeaders = {
  'Content-Type': 'application/json',
  'X-Api-Key': WAHA_API_KEY,
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mensajes de seguimiento según la intención detectada
const FOLLOWUP_MESSAGES: Record<string, string> = {
  PUBLICAR: `Estimado/a, ¿pudo revisar la información sobre cómo publicar su auto en AutoRenta?

Recuerde que con nuestro modelo Comodato:
- 70% del pago va a un pool que se reparte entre todos los owners
- 15% va a un fondo comunitario que lo protege (sin franquicia)
- Usted elige cuándo alquilar y a quién

👉 Publique su auto: https://autorentar.com/publicar

Quedamos a su disposición.`,

  ALQUILAR: `Estimado/a, ¿encontró el auto ideal para su viaje?

Tenemos cientos de autos disponibles en toda Argentina y Brasil, con seguro incluido y sin franquicia.

👉 Ver autos disponibles: https://autorentar.com/autos

Estamos para ayudarlo.`,

  PRECIO: `Estimado/a, ¿le quedaron dudas sobre cómo funcionan las ganancias en AutoRenta?

Con nuestro modelo Comodato, usted gana rewards mensuales basados en:
- Disponibilidad de su auto
- Su rating como anfitrión
- Antigüedad en la comunidad
- Referidos

👉 Calcule sus ganancias: https://autorentar.com/publicar

Cualquier consulta, aquí estamos.`,

  DEFAULT: `Estimado/a, ¿hay algo más en lo que podamos ayudarlo?

AutoRenta es la primera plataforma de alquiler de autos entre personas en Argentina y Brasil.

👉 Conozca más: https://autorentar.com/como-funciona

Quedamos a su disposición.`,
}

async function sendMessage(chatId: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(`${WAHA_BASE_URL}/api/sendText`, {
      method: 'POST',
      headers: wahaHeaders,
      body: JSON.stringify({
        session: WAHA_SESSION,
        chatId,
        text,
      }),
    })
    return res.ok
  } catch (e) {
    console.error(`[Send] Error to ${chatId}:`, e)
    return false
  }
}

Deno.serve(async (req) => {
  // Solo permitir POST o GET (para cron)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Buscar contactos que:
    // 1. Recibieron mensaje de outreach hace más de 48h
    // 2. No han respondido
    // 3. No están cerrados ni marcados para humano
    // 4. No han recibido follow-up aún
    const cutoffTime = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: contacts, error } = await supabase
      .from('outreach_contacts')
      .select('id, phone, detected_intent, status')
      .lt('last_outreach_at', cutoffTime)
      .is('last_message_received_at', null)
      .eq('followup_sent', false)
      .not('status', 'in', '("not_interested","active")')
      .neq('requires_human', true)
      .limit(50) // Procesar en batches

    if (error) {
      console.error('[DB] Error fetching contacts:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500 })
    }

    if (!contacts || contacts.length === 0) {
      console.log('[Followup] No contacts pending follow-up')
      return new Response(JSON.stringify({ processed: 0 }), { status: 200 })
    }

    console.log(`[Followup] Processing ${contacts.length} contacts`)

    let successCount = 0

    for (const contact of contacts) {
      const chatId = `${contact.phone}@c.us`
      const intent = contact.detected_intent || 'DEFAULT'
      const message = FOLLOWUP_MESSAGES[intent] || FOLLOWUP_MESSAGES.DEFAULT

      const sent = await sendMessage(chatId, message)

      if (sent) {
        // Marcar como enviado
        await supabase
          .from('outreach_contacts')
          .update({
            followup_sent: true,
            followup_sent_at: new Date().toISOString(),
          })
          .eq('id', contact.id)

        // Guardar mensaje
        await supabase.from('outreach_messages').insert({
          contact_id: contact.id,
          direction: 'outbound',
          content: message,
          message_type: 'template',
        })

        successCount++
        console.log(`[Followup] Sent to ${contact.phone} (intent: ${intent})`)
      }

      // Rate limiting - esperar 2 segundos entre mensajes
      await new Promise(resolve => setTimeout(resolve, 2000))
    }

    return new Response(
      JSON.stringify({
        processed: contacts.length,
        success: successCount,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('[Error]', error)
    return new Response(JSON.stringify({ error: String(error) }), { status: 500 })
  }
})
