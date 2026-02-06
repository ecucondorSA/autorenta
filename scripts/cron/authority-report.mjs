#!/usr/bin/env node

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const defaultWebhookUrl = process.env.AUTHORITY_REPORT_WEBHOOK || '';
const webhookUrl = process.env.WEBHOOK_URL || defaultWebhookUrl;
const forceUpdate = String(process.env.FORCE_UPDATE || 'true').toLowerCase() === 'true';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
};

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Request failed ${response.status}: ${text}`);
  }
  if (!text) {
    return null;
  }
  return JSON.parse(text);
}

async function supabaseRpc(name, body = {}) {
  return fetchJson(`${supabaseUrl}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function supabaseGet(path) {
  return fetchJson(`${supabaseUrl}/rest/v1/${path}`, { headers });
}

async function generateAnalysis(concepts, weeklyPostCount) {
  if (!geminiApiKey) {
    return 'Analisis no disponible (GEMINI_API_KEY no configurada)';
  }

  const topPerformer = concepts.find((c) => c.tier === 'TOP') || concepts[0];
  const underperformers = concepts.filter((c) => c.tier === 'LOW' || c.tier === 'AVERAGE');
  const untested = concepts.filter((c) => c.tier === 'UNTESTED');

  const analysisPrompt = `
Actua como el Director de Growth de AutoRentar. Analiza estos datos de rendimiento de contenido de autoridad:

DATOS DE CONCEPTOS:
${JSON.stringify(concepts, null, 2)}

METRICAS CLAVE:
- Posts publicados esta semana: ${weeklyPostCount}
- Mejor performer: ${topPerformer?.term_name || 'N/A'} (ER: ${topPerformer?.engagement_rate_pct || 0}%)
- Conceptos con bajo rendimiento: ${underperformers.map((c) => c.term_name).join(', ') || 'Ninguno'}
- Conceptos sin probar: ${untested.map((c) => c.term_name).join(', ') || 'Ninguno'}

Genera un reporte BRUTALMENTE HONESTO con esta estructura:

1. EL GANADOR
   - Que termino psicologico movio mas a la audiencia
   - Por que crees que funciono (hipotesis basada en el dolor que toca)

2. EL FRACASO
   - Que termino fue ignorado
   - Por que pudo haber fallado (muy abstracto? mal timing? imagen no conecto?)

3. DIAGNOSTICO PSICOLOGICO
   - La audiencia responde mas al miedo al riesgo o al dolor del gasto fijo?
   - Prefieren drama familiar o data fria?

4. ACCION CONCRETA
   - Que cambiar en los prompts de imagen para el termino que fallo
   - Que dia/hora parece funcionar mejor (si hay patron)

5. ALERTA
   - Si detectas algun riesgo (saturacion, fatiga de audiencia, sesgo de datos)

Se directo, no corporativo. Maximo 300 palabras.
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
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
      return 'Analisis no disponible (error de API)';
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Analisis no disponible';
  } catch (error) {
    console.error('[authority-report] Analysis generation error:', error);
    return 'Analisis no disponible (error de generacion)';
  }
}

function formatReport(concepts, analysis, weeklyCount) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const topConcepts = concepts.filter((c) => c.tier === 'TOP' || c.tier === 'GOOD');
  const lowConcepts = concepts.filter((c) => c.tier === 'LOW');

  let report = `REPORTE SEMANAL DE AUTORIDAD - AutoRentar\n` +
    `Semana: ${weekStart.toISOString().split('T')[0]} - ${now.toISOString().split('T')[0]}\n\n` +
    `==============================\n\n` +
    `RESUMEN EJECUTIVO\n` +
    `- Posts de autoridad publicados: ${weeklyCount}\n` +
    `- Conceptos activos: ${concepts.length}\n` +
    `- Top performers: ${topConcepts.length}\n` +
    `- Bajo rendimiento: ${lowConcepts.length}\n\n` +
    `==============================\n\n` +
    `RANKING DE CONCEPTOS\n`;

  concepts.forEach((c, i) => {
    const rank = i + 1;
    const tierLabel = c.tier === 'TOP'
      ? 'TOP'
      : c.tier === 'GOOD'
        ? 'GOOD'
        : c.tier === 'LOW'
          ? 'LOW'
          : 'NEW';

    report += `${rank}. [${tierLabel}] ${c.term_name}\n` +
      `   ER: ${c.engagement_rate_pct?.toFixed(1) || 0}% | Usos: ${c.times_used} | Prob: ${c.selection_probability_pct?.toFixed(1) || 0}%\n`;
  });

  report += `\n==============================\n\n` +
    `ANALISIS DE GEMINI\n\n` +
    `${analysis}\n\n` +
    `==============================\n\n` +
    `Dashboard: ${supabaseUrl}/project/default/editor\n\n` +
    `Generado automaticamente por AutoRentar Authority System`;

  return report;
}

async function sendToWebhook(url, report) {
  try {
    const isTelegram = url.includes('api.telegram.org');
    const isDiscord = url.includes('discord.com/api/webhooks');
    const isSlack = url.includes('hooks.slack.com');

    let body;
    let contentType = 'application/json';

    if (isTelegram) {
      const chatId = new URL(url).searchParams.get('chat_id') || '';
      body = JSON.stringify({
        chat_id: chatId,
        text: report,
        parse_mode: 'Markdown',
      });
    } else if (isDiscord) {
      body = JSON.stringify({
        content: report.substring(0, 2000),
        username: 'AutoRentar Authority Bot',
      });
    } else if (isSlack) {
      body = JSON.stringify({
        text: report,
        mrkdwn: true,
      });
    } else {
      body = JSON.stringify({
        report,
        timestamp: new Date().toISOString(),
        source: 'autorentar-authority-system',
      });
    }

    const response = await fetch(url, {
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

async function logRun({ status, errorMessage, conceptsCount, weeklyCount, webhookSent }) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/social_publishing_scheduler_log`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=minimal' },
      body: JSON.stringify({
        job_name: 'authority-weekly-report',
        execution_time: new Date().toISOString(),
        status,
        campaigns_processed: conceptsCount || 0,
        campaigns_published: weeklyCount || 0,
        error_message: errorMessage || `Report generated. Webhook sent: ${webhookSent}`,
      }),
    });
  } catch (error) {
    console.warn('[authority-report] Failed to log run:', error);
  }
}

async function main() {
  console.log('[authority-report] Generating weekly report...');

  if (forceUpdate) {
    console.log('[authority-report] Updating authority metrics...');
    await supabaseRpc('update_authority_metrics');
  }

  const concepts = await supabaseGet('authority_performance_dashboard?select=*&order=performance_score.desc');

  if (!concepts || concepts.length === 0) {
    await logRun({ status: 'failed', errorMessage: 'No authority concepts found' });
    throw new Error('No authority concepts found');
  }

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  let weeklyPosts = [];
  try {
    weeklyPosts = await supabaseGet(
      `marketing_posts_log?select=*&published_at=gte.${encodeURIComponent(oneWeekAgo.toISOString())}&metadata->authority_term=is.not.null`
    );
  } catch (error) {
    console.warn('[authority-report] Failed to fetch weekly posts:', error);
  }

  const weeklyCount = weeklyPosts?.length || 0;
  const analysis = await generateAnalysis(concepts, weeklyCount);
  const report = formatReport(concepts, analysis, weeklyCount);

  let webhookSent = false;
  if (webhookUrl) {
    webhookSent = await sendToWebhook(webhookUrl, report);
  }

  await logRun({
    status: 'success',
    conceptsCount: concepts.length,
    weeklyCount,
    webhookSent,
  });

  console.log(report);
}

main().catch(async (error) => {
  console.error('[authority-report] Error:', error);
  await logRun({ status: 'failed', errorMessage: error instanceof Error ? error.message : String(error) });
  process.exit(1);
});
