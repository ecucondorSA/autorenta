/**
 * Genera contenido de newsletter semanal con Gemini AI
 *
 * Usage: bun scripts/generate-newsletter.ts
 */

import { GoogleGenAI } from "@google/genai";

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!GOOGLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Variables de entorno requeridas: GOOGLE_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

interface NewsletterContent {
  subject: string;
  previewText: string;
  greeting: string;
  mainStory: {
    title: string;
    content: string;
    cta: string;
  };
  tips: Array<{
    title: string;
    content: string;
  }>;
  stats?: {
    label: string;
    value: string;
  };
  closing: string;
}

async function generateNewsletterContent(): Promise<NewsletterContent> {
  const weekNumber = Math.ceil((new Date().getTime() - new Date(new Date().getFullYear(), 0, 1).getTime()) / 604800000);
  const currentMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date());

  const prompt = `Eres el copywriter de AutoRenta, una plataforma de alquiler de autos peer-to-peer (como Airbnb para autos) en Ecuador, Argentina, Uruguay y Brasil.

Genera contenido para el newsletter semanal #${weekNumber} de ${currentMonth}.

CONTEXTO:
- Plataforma P2P donde propietarios ganan dinero alquilando sus autos
- Arrendatarios alquilan autos de particulares a precios más económicos
- Features: Billetera Virtual, Apertura Digital, Seguro incluido

TONO:
- Cercano pero profesional
- Español latinoamericano neutro (tú/ustedes)
- Evitar jerga técnica
- Máximo 2-3 emojis por sección

GENERA UN JSON con esta estructura exacta:
{
  "subject": "Línea de asunto atractiva (máx 50 chars)",
  "previewText": "Preview text para email clients (máx 100 chars)",
  "greeting": "Saludo personalizado con {{first_name}}",
  "mainStory": {
    "title": "Título de la historia principal",
    "content": "Contenido principal (2-3 párrafos, máx 200 palabras)",
    "cta": "Texto del botón CTA"
  },
  "tips": [
    {
      "title": "Título del tip 1",
      "content": "Contenido del tip (1-2 oraciones)"
    },
    {
      "title": "Título del tip 2",
      "content": "Contenido del tip (1-2 oraciones)"
    }
  ],
  "stats": {
    "label": "Métrica destacada",
    "value": "Valor impactante"
  },
  "closing": "Mensaje de cierre con CTA suave"
}

TEMAS POSIBLES PARA ESTA SEMANA:
- Consejos para propietarios que quieren maximizar ganancias
- Tips de viaje para arrendatarios
- Novedades de la plataforma
- Historias de éxito
- Promociones de temporada

Responde SOLO con el JSON válido, sin explicaciones.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: prompt,
  });

  const text = response.text?.trim() || "";

  // Parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No se pudo extraer JSON de la respuesta de Gemini");
  }

  return JSON.parse(jsonMatch[0]) as NewsletterContent;
}

function buildNewsletterHtml(content: NewsletterContent): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${content.subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 40px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 700;">🚗 AutoRenta</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Newsletter Semanal</p>
            </td>
          </tr>

          <!-- Greeting -->
          <tr>
            <td style="padding: 30px 40px 20px;">
              <p style="margin: 0; color: #374151; font-size: 18px; line-height: 1.6;">
                ${content.greeting}
              </p>
            </td>
          </tr>

          <!-- Main Story -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background-color: #eff6ff; border-radius: 8px; padding: 24px; border-left: 4px solid #3b82f6;">
                <h2 style="margin: 0 0 16px 0; color: #1e40af; font-size: 22px;">${content.mainStory.title}</h2>
                <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 16px; line-height: 1.7;">
                  ${content.mainStory.content}
                </p>
                <a href="https://autorentar.com"
                   style="display: inline-block; padding: 12px 28px; background-color: #3b82f6; color: white; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 15px;">
                  ${content.mainStory.cta}
                </a>
              </div>
            </td>
          </tr>

          <!-- Tips Section -->
          <tr>
            <td style="padding: 20px 40px;">
              <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 18px;">💡 Tips de la Semana</h3>
              <table width="100%" cellpadding="0" cellspacing="0">
                ${content.tips.map(tip => `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <strong style="color: #374151; font-size: 15px;">${tip.title}</strong>
                    <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.5;">
                      ${tip.content}
                    </p>
                  </td>
                </tr>
                `).join('')}
              </table>
            </td>
          </tr>

          ${content.stats ? `
          <!-- Stats Highlight -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 20px; text-align: center;">
                <p style="margin: 0; color: #92400e; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${content.stats.label}</p>
                <p style="margin: 8px 0 0 0; color: #78350f; font-size: 36px; font-weight: 700;">${content.stats.value}</p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Closing -->
          <tr>
            <td style="padding: 20px 40px 30px;">
              <p style="margin: 0; color: #6b7280; font-size: 15px; line-height: 1.6;">
                ${content.closing}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
                Síguenos en redes sociales
              </p>
              <p style="margin: 0 0 16px 0;">
                <a href="https://instagram.com/auto.rentar" style="color: #3b82f6; text-decoration: none; margin: 0 8px;">Instagram</a>
                <a href="https://facebook.com/autorentar" style="color: #3b82f6; text-decoration: none; margin: 0 8px;">Facebook</a>
                <a href="https://tiktok.com/@autorentar" style="color: #3b82f6; text-decoration: none; margin: 0 8px;">TikTok</a>
              </p>
              <p style="margin: 0 0 8px 0; color: #9ca3af; font-size: 12px;">
                <a href="{{unsubscribe_url}}" style="color: #9ca3af;">Cancelar suscripción</a>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                © ${new Date().getFullYear()} AutoRenta. Ecuador | Argentina | Uruguay | Brasil
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

async function saveNewsletterEdition(content: NewsletterContent, html: string) {
  // Get current edition number
  const countResponse = await fetch(
    `${SUPABASE_URL}/rest/v1/newsletter_editions?select=edition_number&order=edition_number.desc&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY!,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    }
  );

  const editions = await countResponse.json();
  const nextEdition = (editions[0]?.edition_number || 0) + 1;

  // Save newsletter edition
  const response = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_editions`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      title: content.subject,
      edition_number: nextEdition,
      subject: content.subject,
      preview_text: content.previewText,
      html_content: html,
      target_audience: "all",
      status: "scheduled",
      scheduled_at: new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to save newsletter: ${JSON.stringify(error)}`);
  }

  const saved = await response.json();
  return saved[0];
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("   Generador de Newsletter AutoRenta");
  console.log("═══════════════════════════════════════\n");

  console.log("🤖 Generando contenido con Gemini...");
  const content = await generateNewsletterContent();

  console.log("✅ Contenido generado:");
  console.log(`   Subject: ${content.subject}`);
  console.log(`   Preview: ${content.previewText}`);

  console.log("\n📧 Construyendo HTML...");
  const html = buildNewsletterHtml(content);

  console.log("💾 Guardando edición...");
  const saved = await saveNewsletterEdition(content, html);

  console.log("\n─── Resultado ───");
  console.log(`Edition ID: ${saved.id}`);
  console.log(`Edition #: ${saved.edition_number}`);
  console.log(`Subject: ${saved.subject}`);
  console.log(`Status: ${saved.status}`);

  console.log("\n✅ Newsletter listo para enviar");
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exit(1);
});
