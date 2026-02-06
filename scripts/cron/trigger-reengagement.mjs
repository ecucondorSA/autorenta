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
  console.log('[trigger-reengagement] Buscando usuarios inactivos (+30 dias)...');

  const sequences = await fetchJson(
    `${supabaseUrl}/rest/v1/email_sequences?select=id&slug=eq.re-engagement&is_active=eq.true&limit=1`,
    { headers }
  );

  const sequence = Array.isArray(sequences) ? sequences[0] : null;
  if (!sequence?.id) {
    throw new Error('Re-engagement sequence not found or inactive');
  }

  const inactiveUsers = await fetchJson(
    `${supabaseUrl}/rest/v1/v_inactive_subscribers?select=id,email,first_name,days_inactive,active_sequences&days_inactive=gte.30&limit=100`,
    { headers }
  );

  if (!inactiveUsers || inactiveUsers.length === 0) {
    console.log('[trigger-reengagement] No inactive users found');
    return;
  }

  let added = 0;
  let skipped = 0;

  for (const user of inactiveUsers) {
    const activeSeqs = Array.isArray(user.active_sequences) ? user.active_sequences : [];
    const alreadyInSequence = activeSeqs.some((seq) => seq.sequence_id === sequence.id);

    if (alreadyInSequence) {
      skipped++;
      continue;
    }

    try {
      await fetchJson(`${supabaseUrl}/rest/v1/rpc/add_subscriber_to_sequence`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          p_subscriber_id: user.id,
          p_sequence_slug: 're-engagement',
        }),
      });

      added++;
      console.log(
        `✅ Added ${user.email} to re-engagement (${user.days_inactive} days inactive)`
      );
    } catch (error) {
      console.error(`Failed to add ${user.email} to re-engagement:`, error);
    }
  }

  console.log(`✅ Usuarios inactivos encontrados: ${inactiveUsers.length}`);
  console.log(`➕ Agregados a re-engagement: ${added}`);
  console.log(`⏭️  Saltados (ya en secuencia): ${skipped}`);
}

main().catch((error) => {
  console.error('[trigger-reengagement] Error:', error);
  process.exit(1);
});
