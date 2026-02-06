#!/usr/bin/env node

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
};

const oneDayMs = 24 * 60 * 60 * 1000;
const thirtyDaysMs = 30 * oneDayMs;

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

async function main() {
  console.log('[marketing-reset-daily] Starting daily reset...');

  await fetchJson(`${supabaseUrl}/rest/v1/rpc/reset_marketing_daily_counters`, {
    method: 'POST',
    headers,
    body: '{}',
  });

  console.log('[marketing-reset-daily] Counters reset successfully');

  const thirtyDaysAgo = new Date(Date.now() - thirtyDaysMs).toISOString();
  try {
    const cleanupResponse = await fetch(
      `${supabaseUrl}/rest/v1/marketing_alerts?resolved=eq.true&resolved_at=lt.${encodeURIComponent(thirtyDaysAgo)}`,
      {
        method: 'DELETE',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!cleanupResponse.ok) {
      const cleanupText = await cleanupResponse.text();
      console.warn('[marketing-reset-daily] Failed to cleanup alerts:', cleanupText);
    } else {
      console.log('[marketing-reset-daily] Old alerts cleaned');
    }
  } catch (error) {
    console.warn('[marketing-reset-daily] Cleanup error:', error);
  }

  const oneDayAgo = new Date(Date.now() - oneDayMs).toISOString();

  let personas = [];
  let contentStats = [];

  try {
    personas = await fetchJson(`${supabaseUrl}/rest/v1/marketing_personas?select=*`, { headers }) || [];
  } catch (error) {
    console.warn('[marketing-reset-daily] Failed to fetch personas:', error);
  }

  try {
    contentStats = await fetchJson(
      `${supabaseUrl}/rest/v1/marketing_content?select=status,created_at&created_at=gte.${encodeURIComponent(oneDayAgo)}`,
      { headers }
    ) || [];
  } catch (error) {
    console.warn('[marketing-reset-daily] Failed to fetch content stats:', error);
  }

  const report = {
    date: new Date().toISOString().split('T')[0],
    personas: {
      total: personas.length || 0,
      active: personas.filter((p) => p.is_active).length || 0,
      shadowbanned: personas.filter((p) => p.is_shadowbanned).length || 0,
    },
    content_last_24h: {
      total: contentStats.length || 0,
      posted: contentStats.filter((c) => c.status === 'posted').length || 0,
      failed: contentStats.filter((c) => c.status === 'failed').length || 0,
      pending: contentStats.filter((c) => c.status === 'pending').length || 0,
    },
  };

  console.log('[marketing-reset-daily] Daily report:', JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error('[marketing-reset-daily] Fatal error:', error);
  process.exit(1);
});
