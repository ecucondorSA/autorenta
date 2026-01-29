/**
 * Authority Report Edge Function
 *
 * Genera un reporte ejecutivo semanal del rendimiento de los conceptos de autoridad.
 * Analiza con Gemini y envía por webhook (Telegram/Discord/Email).
 *
 * POST /authority-report
 *   Body: { webhook_url?: string, email?: string }
 *
 * Triggered by:
 * - Cron job semanal
 * - Manual invocation
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

// ============================================================================
// CONFIGURATION
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')!;
const GEMINI_MODEL = 'gemini-3-flash-preview';

// Default webhook (configure in Supabase secrets)
const DEFAULT_WEBHOOK_URL = Deno.env.get('AUTHORITY_REPORT_WEBHOOK') || '';

// ============================================================================
// TYPES
// ============================================================================

interface AuthorityPerformance {
  term_name: string;
  times_used: number;
  total_impressions: number;
  total_engagements: number;
  engagement_rate_pct: number;
  performance_score: number;
  last_used_at: string | null;
  tier: string;
  selection_probability_pct: number;
}

interface ReportRequest {
  webhook_url?: string;
  email?: string;
  force_update?: boolean;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let request: ReportRequest = {};
    try {
      request = await req.json();
    } catch {
      // Empty body is OK
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    console.log('[authority-report] Generating weekly report...');

    // 1. ACTUALIZAR MÉTRICAS SI SE SOLICITA
    if (request.force_update) {
      console.log('[authority-report] Force updating metrics...');
      await supabase.rpc('update_authority_metrics');
    }

    // 2. OBTENER DATOS DE RENDIMIENTO
    const { data: performanceData, error: perfError } = await supabase
      .from('authority_performance_dashboard')
      .select('*')
      .order('performance_score', { ascending: false });

    if (perfError) {
      throw new Error(`Failed to get performance data: ${perfError.message}`);
    }

    const concepts = performanceData as AuthorityPerformance[];

    if (!concepts || concepts.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authority concepts found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. OBTENER POSTS DE LA ÚLTIMA SEMANA
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data: weeklyPosts } = await supabase
      .from('marketing_posts_log')
      .select('*')
      .gte('published_at', oneWeekAgo.toISOString())
      .not('metadata->authority_term', 'is', null);

    const weeklyCount = weeklyPosts?.length || 0;

    // 4. GENERAR ANÁLISIS CON GEMINI
    const analysis = await generateAnalysis(concepts, weeklyCount);

    // 5. FORMATEAR REPORTE
    const report = formatReport(concepts, analysis, weeklyCount);

    // 6. ENVIAR A WEBHOOK SI ESTÁ CONFIGURADO
    const webhookUrl = request.webhook_url || DEFAULT_WEBHOOK_URL;
    let webhookSent = false;

    if (webhookUrl) {
      webhookSent = await sendToWebhook(webhookUrl, report);
    }

    // 7. LOG DEL REPORTE
    await supabase.from('social_publishing_scheduler_log').insert({
      job_name: 'authority-weekly-report',
      execution_time: new Date().toISOString(),
      status: 'success',
      campaigns_processed: concepts.length,
      campaigns_published: weeklyCount,
      error_message: `Report generated. Webhook sent: ${webhookSent}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        report,
        webhook_sent: webhookSent,
        concepts_analyzed: concepts.length,
        posts_this_week: weeklyCount,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[authority-report] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ============================================================================
// ANALYSIS GENERATION
// ============================================================================

async function generateAnalysis(
  concepts: AuthorityPerformance[],
  weeklyPostCount: number
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return 'Análisis no disponible (GEMINI_API_KEY no configurada)';
  }

  const topPerformer = concepts.find(c => c.tier === 'TOP') || concepts[0];
  const underperformers = concepts.filter(c => c.tier === 'LOW' || c.tier === 'AVERAGE');
  const untested = concepts.filter(c => c.tier === 'UNTESTED');

  const analysisPrompt = `
Actúa como el Director de Growth de AutoRentar. Analiza estos datos de rendimiento de contenido de autoridad:

DATOS DE CONCEPTOS:
${JSON.stringify(concepts, null, 2)}

MÉTRICAS CLAVE:
- Posts publicados esta semana: ${weeklyPostCount}
- Mejor performer: ${topPerformer?.term_name || 'N/A'} (ER: ${topPerformer?.engagement_rate_pct || 0}%)
- Conceptos con bajo rendimiento: ${underperformers.map(c => c.term_name).join(', ') || 'Ninguno'}
- Conceptos sin probar: ${untested.map(c => c.term_name).join(', ') || 'Ninguno'}

Genera un reporte BRUTALMENTE HONESTO con esta estructura:

1. 🏆 EL GANADOR
   - Qué término psicológico movió más a la audiencia
   - Por qué crees que funcionó (hipótesis basada en el dolor que toca)

2. ❌ EL FRACASO
   - Qué término fue ignorado
   - Por qué pudo haber fallado (¿muy abstracto? ¿mal timing? ¿imagen no conectó?)

3. 🧠 DIAGNÓSTICO PSICOLÓGICO
   - ¿La audiencia responde más al miedo al riesgo o al dolor del gasto fijo?
   - ¿Prefieren drama familiar o data fría?

4. 🔧 ACCIÓN CONCRETA
   - Qué cambiar en los prompts de imagen para el término que falló
   - Qué día/hora parece funcionar mejor (si hay patrón)

5. ⚠️ ALERTA
   - Si detectas algún riesgo (saturación, fatiga de audiencia, sesgo de datos)

Sé directo, no corporativo. Máximo 300 palabras.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: analysisPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          },
        }),
      }
    );

    if (!response.ok) {
      console.error('[authority-report] Gemini error:', await response.text());
      return 'Análisis no disponible (error de API)';
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Análisis no disponible';
  } catch (error) {
    console.error('[authority-report] Analysis generation error:', error);
    return 'Análisis no disponible (error de generación)';
  }
}

// ============================================================================
// REPORT FORMATTING
// ============================================================================

function formatReport(
  concepts: AuthorityPerformance[],
  analysis: string,
  weeklyCount: number
): string {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const topConcepts = concepts.filter(c => c.tier === 'TOP' || c.tier === 'GOOD');
  const lowConcepts = concepts.filter(c => c.tier === 'LOW');

  let report = `
📊 **REPORTE SEMANAL DE AUTORIDAD - AutoRentar**
📅 Semana: ${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 **RESUMEN EJECUTIVO**
• Posts de autoridad publicados: ${weeklyCount}
• Conceptos activos: ${concepts.length}
• Top performers: ${topConcepts.length}
• Bajo rendimiento: ${lowConcepts.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏅 **RANKING DE CONCEPTOS**
`;

  concepts.forEach((c, i) => {
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '  ';
    const tierEmoji = c.tier === 'TOP' ? '🔥' : c.tier === 'GOOD' ? '✅' : c.tier === 'LOW' ? '⚠️' : '🆕';
    report += `${medal} ${tierEmoji} **${c.term_name}**
   ER: ${c.engagement_rate_pct?.toFixed(1) || 0}% | Usos: ${c.times_used} | Prob: ${c.selection_probability_pct?.toFixed(1) || 0}%
`;
  });

  report += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 **ANÁLISIS DE GEMINI**

${analysis}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 Dashboard: ${Deno.env.get('SUPABASE_URL')}/project/default/editor

_Generado automáticamente por AutoRentar Authority System_
`;

  return report;
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

async function sendToWebhook(webhookUrl: string, report: string): Promise<boolean> {
  try {
    // Detect webhook type by URL
    const isTelegram = webhookUrl.includes('api.telegram.org');
    const isDiscord = webhookUrl.includes('discord.com/api/webhooks');
    const isSlack = webhookUrl.includes('hooks.slack.com');

    let body: string;
    let contentType = 'application/json';

    if (isTelegram) {
      // Telegram Bot API format
      const chatId = new URL(webhookUrl).searchParams.get('chat_id') || '';
      body = JSON.stringify({
        chat_id: chatId,
        text: report,
        parse_mode: 'Markdown',
      });
    } else if (isDiscord) {
      // Discord Webhook format
      body = JSON.stringify({
        content: report.substring(0, 2000), // Discord limit
        username: 'AutoRentar Authority Bot',
      });
    } else if (isSlack) {
      // Slack Webhook format
      body = JSON.stringify({
        text: report,
        mrkdwn: true,
      });
    } else {
      // Generic webhook
      body = JSON.stringify({
        report,
        timestamp: new Date().toISOString(),
        source: 'autorentar-authority-system',
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    });

    if (!response.ok) {
      console.error('[authority-report] Webhook failed:', await response.text());
      return false;
    }

    console.log('[authority-report] Webhook sent successfully');
    return true;
  } catch (error) {
    console.error('[authority-report] Webhook error:', error);
    return false;
  }
}
