import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const WAHA_API_KEY = Deno.env.get("WAHA_API_KEY") || "autorenta-secret-key-2026";
const WAHA_URL = Deno.env.get("WAHA_URL"); // Cloudflare tunnel URL, e.g., https://waha.autorenta.com
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Configuration
const CONTEXT_MESSAGE_COUNT = 10; // Number of recent messages to include for context
const TYPING_DELAY_PER_CHAR = 35; // ms per character (average human typing ~40-60 WPM)
const MIN_THINKING_DELAY = 1500; // Minimum "reading" delay in ms
const MAX_TYPING_DELAY = 8000; // Cap typing simulation at 8 seconds

// Helper: Send typing indicator to WAHA
async function sendTypingIndicator(chatId: string, wahaUrl: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${wahaUrl}/api/startTyping`, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        session: "default",
      }),
    });
  } catch (e) {
    console.warn("Failed to send typing indicator:", e);
  }
}

// Helper: Stop typing indicator
async function stopTypingIndicator(chatId: string, wahaUrl: string, apiKey: string): Promise<void> {
  try {
    await fetch(`${wahaUrl}/api/stopTyping`, {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId,
        session: "default",
      }),
    });
  } catch (e) {
    console.warn("Failed to stop typing indicator:", e);
  }
}

// Helper: Calculate realistic typing delay based on message length
function calculateTypingDelay(message: string): number {
  const baseDelay = message.length * TYPING_DELAY_PER_CHAR;
  // Add some randomness (±20%)
  const variance = baseDelay * 0.2 * (Math.random() - 0.5);
  return Math.min(Math.max(baseDelay + variance, MIN_THINKING_DELAY), MAX_TYPING_DELAY);
}

// Helper: Sleep function
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const SYSTEM_PROMPT = `Sos Sofía, asesora de AutoRentar. Escribís de forma cálida y respetuosa, como una profesional atenta que genuinamente quiere ayudar.

## TU PERSONALIDAD
- Profesional pero cercana, como una asesora de confianza
- Siempre tratás a las personas con respeto: "Estimado/a", "Señor/a", "Don/Doña"
- Usás "usted" por defecto, pero si la persona te tutea, podés pasar a "vos"
- Sos paciente, clara y servicial
- Transmitís confianza y seriedad sin ser fría

## CÓMO ESCRIBIR (MUY IMPORTANTE)
- Mensajes claros y concisos (3-5 líneas máximo)
- NO uses listas con viñetas ni formato estructurado
- NO uses asteriscos ni negritas
- Usá emojis con moderación y profesionalismo (1-2 máximo, no siempre)
- Empezá saludando cordialmente
- Siempre cerrá con amabilidad: "Quedo a su disposición", "Con gusto lo ayudo", etc.

## EJEMPLOS DE TU ESTILO
- "Buen día, gracias por comunicarse con AutoRentar. Con gusto le cuento cómo funciona 🚗"
- "Estimado, sí, efectivamente puede generar ingresos con su vehículo. Le explico brevemente..."
- "Perfecto, entiendo su consulta. Lo bueno de nuestro sistema es que usted elige cuándo y a quién alquilar."
- "Excelente pregunta. Los ingresos dependen del vehículo, pero en promedio hablamos de 700 a 1000 dólares mensuales."

## FRASES ÚTILES
- "Con gusto le explico..."
- "Me alegra que nos contacte..."
- "Excelente pregunta..."
- "Permítame contarle..."
- "Quedo atenta a cualquier otra consulta"
- "Es un placer poder ayudarle"
- "No dude en escribirme si tiene más preguntas"

## LO QUE TENÉS QUE SABER

### El modelo (explicalo de forma clara y profesional)
AutoRentar funciona con un modelo de comunidad solidaria. Cuando usted pone su auto disponible, participa de un sistema donde gana rewards mensuales. El 70% de lo que pagan quienes alquilan se reparte entre todos los propietarios de la comunidad. Además, contamos con un fondo de protección comunitario que cubre cualquier daño sin franquicia.

### Beneficios clave
- Genera ingresos aunque no alquile, solo por tener su auto disponible
- Protección total: si hay algún daño, lo cubre el fondo comunitario
- Usted mantiene el control: elige cuándo y a quién alquilar
- No requiere tarjeta de crédito, trabajamos con billetera virtual

### Datos útiles
- Precio promedio: 50-100 USD por día según el vehículo
- Ingreso estimado: 700-1000 USD mensuales con 50% de ocupación
- Web: autorentar.com
- Sistema de wallet para cobrar fácilmente

### Links para compartir (usá según el contexto)
- Publicar auto: https://autorentar.com/cars/publish
- Ver autos disponibles: https://autorentar.com/cars
- Cómo funciona para propietarios: https://autorentar.com/rent-your-car
- Centro de ayuda: https://autorentar.com/help

## REGLAS
- Si preguntan precio exacto, explique que depende del vehículo y que pueden simular en la web
- Si preguntan algo muy técnico, simplifíquelo o sugiera que consulten en la aplicación
- Si no sabe algo, diga "Permítame verificar esa información" o sugiera contactar por otro canal
- NUNCA admita que es IA, bot o asistente virtual. Es Sofía, asesora del equipo de AutoRentar

## SI RECIBE GROSERÍAS O FALTAS DE RESPETO
Cuando alguien sea grosero, use insultos, o falte el respeto de cualquier forma, responda EXACTAMENTE así:
1. No enganche ni responda a la agresión
2. Cierre la conversación de forma educada pero firme
3. Indique que un asociado de la empresa se comunicará

Ejemplo de respuesta ante groserías:
"Lamento que se sienta así. En este momento voy a dar por finalizada nuestra conversación. Un asociado de AutoRentar se comunicará con usted a la brevedad. Gracias por su tiempo y que tenga un buen día."

Después de esa respuesta, no continúe la conversación aunque la persona siga escribiendo.`;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Webhook received:", JSON.stringify(body, null, 2));

    // Validate it's a message event
    if (body.event !== "message") {
      console.log("Not a message event, ignoring:", body.event);
      return new Response(JSON.stringify({ status: "ignored", reason: "not a message event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = body.payload;

    // Ignore messages sent by us
    if (payload?.fromMe) {
      console.log("Message from self, ignoring");
      return new Response(JSON.stringify({ status: "ignored", reason: "fromMe" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ignore group messages (chatId ends with @g.us)
    const chatId = payload?.from || payload?.chatId;
    if (!chatId || chatId.includes("@g.us") || chatId.includes("@newsletter")) {
      console.log("Group or newsletter message, ignoring:", chatId);
      return new Response(JSON.stringify({ status: "ignored", reason: "group or newsletter" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract message data
    const messageBody = payload?.body || "";
    const phone = chatId.replace("@c.us", "");
    const senderName = payload?._data?.notifyName || payload?.notifyName || "Usuario";
    const messageId = payload?.id?.id || payload?.id || null;

    console.log(`Processing message from ${senderName} (${phone}): ${messageBody}`);

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // DEDUPLICATION: Check if we already processed this message
    if (messageId) {
      const { data: existingMessage } = await supabase
        .from("outreach_messages")
        .select("id")
        .eq("whatsapp_message_id", messageId)
        .single();

      if (existingMessage) {
        console.log(`Duplicate message detected (${messageId}), skipping`);
        return new Response(JSON.stringify({ status: "ignored", reason: "duplicate message" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Check if contact exists in database
    const { data: contact } = await supabase
      .from("outreach_contacts")
      .select("id, phone, first_name, full_name, status")
      .eq("phone", phone)
      .single();

    // Log incoming message with message_id for deduplication
    if (contact?.id) {
      await supabase.from("outreach_messages").insert({
        contact_id: contact.id,
        direction: "inbound",
        message_type: "text",
        content: messageBody,
        status: "delivered",
        whatsapp_message_id: messageId,
      });
    }

    // CONTEXT: Fetch recent conversation history
    let conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = [];
    if (contact?.id) {
      const { data: recentMessages } = await supabase
        .from("outreach_messages")
        .select("direction, content, created_at")
        .eq("contact_id", contact.id)
        .order("created_at", { ascending: false })
        .limit(CONTEXT_MESSAGE_COUNT);

      if (recentMessages && recentMessages.length > 0) {
        // Reverse to get chronological order and map to Groq format
        conversationHistory = recentMessages
          .reverse()
          .filter(msg => msg.content && msg.content.trim())
          .map(msg => ({
            role: msg.direction === "inbound" ? "user" as const : "assistant" as const,
            content: msg.content,
          }));
      }
    }

    // Call Groq AI for response
    if (!GROQ_API_KEY) {
      console.error("GROQ_API_KEY not configured");
      return new Response(JSON.stringify({ status: "error", reason: "GROQ_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // HUMAN EFFECT: Start typing indicator while we "read" and "think"
    if (WAHA_URL) {
      await sendTypingIndicator(chatId, WAHA_URL, WAHA_API_KEY);
      // Simulate reading the message (varies by message length)
      const readingDelay = Math.min(messageBody.length * 25 + 500, 3000);
      await sleep(readingDelay);
    }

    // Build messages array with system prompt + conversation history + current message
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    // Add conversation history (excluding the current message which we already logged)
    // The last message in history is the current one, so we add all but skip if empty
    if (conversationHistory.length > 1) {
      // Add all messages except the last one (which is the current message)
      messages.push(...conversationHistory.slice(0, -1));
    }

    // Add current message
    messages.push({ role: "user", content: messageBody });

    console.log(`Sending to Groq with ${messages.length - 1} context messages`);

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error("Groq API error:", errorText);
      return new Response(JSON.stringify({ status: "error", reason: "Groq API error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groqData = await groqResponse.json();
    const aiResponse = groqData.choices?.[0]?.message?.content ||
      "Lo siento, no pude procesar tu mensaje. Escribinos a hola@autorentar.com";

    console.log("AI Response:", aiResponse);

    // HUMAN EFFECT: Simulate typing the response
    if (WAHA_URL) {
      const typingDelay = calculateTypingDelay(aiResponse);
      console.log(`Simulating typing for ${typingDelay}ms`);
      await sleep(typingDelay);
      await stopTypingIndicator(chatId, WAHA_URL, WAHA_API_KEY);
    }

    // Send response via WAHA
    if (!WAHA_URL) {
      console.error("WAHA_URL not configured");
      return new Response(JSON.stringify({
        status: "partial",
        reason: "WAHA_URL not configured, response not sent",
        aiResponse
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const wahaResponse = await fetch(`${WAHA_URL}/api/sendText`, {
      method: "POST",
      headers: {
        "X-Api-Key": WAHA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chatId: chatId,
        text: aiResponse,
        session: "default",
      }),
    });

    if (!wahaResponse.ok) {
      const wahaError = await wahaResponse.text();
      console.error("WAHA send error:", wahaError);
      return new Response(JSON.stringify({
        status: "partial",
        reason: "Failed to send WhatsApp response",
        aiResponse
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("WhatsApp response sent successfully");

    // Log outgoing message
    // Get the WAHA response to capture the message ID
    const wahaData = await wahaResponse.json();
    const outboundMessageId = wahaData?.id?.id || wahaData?.id || null;

    if (contact?.id) {
      await supabase.from("outreach_messages").insert({
        contact_id: contact.id,
        direction: "outbound",
        message_type: "text",
        content: aiResponse,
        status: "sent",
        whatsapp_message_id: outboundMessageId,
        detected_intent: "ai_response", // Store AI response indicator in detected_intent field
      });

      // Check if AI detected rudeness and closed conversation
      const closedDueToRudeness = aiResponse.toLowerCase().includes("dar por finalizada") ||
                                   aiResponse.toLowerCase().includes("asociado de autorentar se comunicará");

      // Update contact status
      await supabase
        .from("outreach_contacts")
        .update({
          status: closedDueToRudeness ? "needs_attention" : "responded",
          last_response_at: new Date().toISOString(),
          ...(closedDueToRudeness && {
            notes: `[${new Date().toISOString()}] Conversación cerrada por falta de respeto. Requiere seguimiento humano.`
          })
        })
        .eq("id", contact.id);
    }

    return new Response(JSON.stringify({
      status: "success",
      chatId,
      aiResponse
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ status: "error", message: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
