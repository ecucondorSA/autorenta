#!/usr/bin/env bun

/**
 * Edison WhatsApp Heartbeat - Autonomous Outreach
 *
 * Contacts new prospects from outreach_contacts using OpenClaw WhatsApp.
 * Runs every 30 minutes during business hours (9am-8pm).
 *
 * Usage:
 *   bun edison-wa-heartbeat.ts              # Send to 5 contacts
 *   bun edison-wa-heartbeat.ts --limit 3    # Send to 3 contacts
 *   bun edison-wa-heartbeat.ts --dry-run    # Preview without sending
 *   bun edison-wa-heartbeat.ts --stats      # Show campaign stats
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURATION
// ============================================

// Load env from project root if not already set
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const envPath = '/home/edu/autorenta/.env.local';
  try {
    const envContent = await Bun.file(envPath).text();
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length) {
        process.env[key.trim()] = valueParts.join('=').trim();
      }
    }
  } catch {
    // .env.local not found, continue with existing env
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL
  || process.env.NG_APP_SUPABASE_URL
  || 'https://aceacpaockyxgogxsfyc.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_KEY) {
  console.error('[Edison WA] Error: SUPABASE_SERVICE_ROLE_KEY not set');
  console.error('[Edison WA] Set it in environment or /home/edu/autorenta/.env.local');
  process.exit(1);
}

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

const DEFAULT_LIMIT = 5;
const MIN_MESSAGE_SPACING_MS = 120000; // 2 minutes between messages
const MAX_MESSAGE_SPACING_MS = 300000; // 5 minutes between messages

// ============================================
// MESSAGE TEMPLATES (Edison Style)
// ============================================

interface Contact {
  id: string;
  phone: string;
  first_name: string | null;
  full_name: string | null;
  notes: string | null;
  metadata: Record<string, any> | null;
}

const TEMPLATES = [
  // Template 1: Direct value proposition
  (c: Contact) => `Che ${c.first_name || ''}! Vi que tenés un auto para alquilar.

Desde Autorentar te conseguimos reservas con turistas. Comisión 15% (vs 25-30% de otras apps).

La franquicia la pagamos nosotros. ¿Te interesa?

autorentar.com/cars/publish`,

  // Template 2: Community approach
  (c: Contact) => `Hola ${c.first_name || ''}!

Estamos armando una red de propietarios que quieren ganar más con su auto.

autorentar: 15% comisión, cobrás en 24hs, vos decidís precio y disponibilidad.

¿Te cuento cómo funciona?`,

  // Template 3: Benefits focused
  (c: Contact) => `${c.first_name || 'Hola'}!

3 razones por las que propietarios eligen autorentar:

1. Comisión 15% (no 25-30%)
2. Cobrás en 24hs
3. La franquicia la cubrimos nosotros

¿Sumamos tu auto?

autorentar.com/cars/publish`,

  // Template 4: Casual approach
  (c: Contact) => `Che ${c.first_name || ''}!

Buscamos autos para turistas en Argentina. Si tenés uno disponible, autorentar te lo llena de reservas.

Comisión justa del 15%, protección incluida.

¿Te interesa?`,

  // Template 5: Question opener
  (c: Contact) => `Hola ${c.first_name || ''}!

¿Sabías que con autorentar podés generar entre $150.000 y $300.000 extra por mes alquilando tu auto?

Comisión 15%, cobrás en 24hs, franquicia cubierta.

¿Hablamos?`
];

function getTemplate(index: number, contact: Contact): string {
  const templateFn = TEMPLATES[index % TEMPLATES.length];
  let message = templateFn(contact);

  // Clean up if no name
  if (!contact.first_name) {
    message = message.replace(/Che\s+!/g, 'Che!');
    message = message.replace(/Hola\s+!/g, 'Hola!');
  }

  return message.trim();
}

// ============================================
// OPENCLAW INTEGRATION
// ============================================

async function sendWhatsAppMessage(phone: string, message: string, dryRun: boolean = false): Promise<boolean> {
  // Normalize phone to E.164 format
  let normalizedPhone = phone.replace(/\D/g, '');
  if (!normalizedPhone.startsWith('+')) {
    if (normalizedPhone.startsWith('54')) {
      normalizedPhone = '+' + normalizedPhone;
    } else if (normalizedPhone.startsWith('9')) {
      normalizedPhone = '+54' + normalizedPhone;
    } else {
      normalizedPhone = '+549' + normalizedPhone;
    }
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would send to ${normalizedPhone}:`);
    console.log(`---\n${message}\n---\n`);
    return true;
  }

  try {
    const proc = Bun.spawn([
      'openclaw', 'message', 'send',
      '--channel', 'whatsapp',
      '--target', normalizedPhone,
      '--message', message
    ], {
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const exitCode = await proc.exited;

    if (exitCode === 0) {
      console.log(`[Edison WA] Sent to ${normalizedPhone}`);
      return true;
    } else {
      const stderr = await new Response(proc.stderr).text();
      console.error(`[Edison WA] Failed to send to ${normalizedPhone}: ${stderr}`);
      return false;
    }
  } catch (e: any) {
    console.error(`[Edison WA] Error sending to ${phone}:`, e.message);
    return false;
  }
}

// ============================================
// DATABASE OPERATIONS
// ============================================

async function getNewContacts(limit: number): Promise<Contact[]> {
  const { data, error } = await supabase
    .from('outreach_contacts')
    .select('id, phone, first_name, full_name, notes, metadata')
    .eq('status', 'new')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[Edison WA] Database error:', error.message);
    return [];
  }

  return data || [];
}

async function updateContactStatus(
  contactId: string,
  status: string,
  messagesSent: number = 1
): Promise<void> {
  const { error } = await supabase
    .from('outreach_contacts')
    .update({
      status,
      messages_sent: messagesSent,
      last_message_sent_at: new Date().toISOString(),
      last_outreach_at: new Date().toISOString()
    })
    .eq('id', contactId);

  if (error) {
    console.error(`[Edison WA] Failed to update contact ${contactId}:`, error.message);
  }
}

async function logMessage(
  contactId: string,
  phone: string,
  message: string,
  success: boolean
): Promise<void> {
  // Log to a messages table if it exists
  try {
    await supabase.from('outreach_messages').insert({
      contact_id: contactId,
      direction: 'outbound',
      message_text: message,
      sent_at: new Date().toISOString(),
      status: success ? 'sent' : 'failed'
    });
  } catch {
    // Table might not exist, that's OK
  }
}

// ============================================
// STATE MANAGEMENT
// ============================================

interface HeartbeatState {
  lastRunAt: string | null;
  messagesToday: number;
  lastDate: string;
}

async function loadState(): Promise<HeartbeatState> {
  try {
    const file = Bun.file('./edison-wa-state.json');
    if (await file.exists()) {
      return await file.json();
    }
  } catch {}

  return {
    lastRunAt: null,
    messagesToday: 0,
    lastDate: new Date().toISOString().split('T')[0]
  };
}

async function saveState(state: HeartbeatState): Promise<void> {
  await Bun.write('./edison-wa-state.json', JSON.stringify(state, null, 2));
}

// ============================================
// MAIN FUNCTIONS
// ============================================

function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

async function runHeartbeat(limit: number, dryRun: boolean): Promise<void> {
  console.log('\n[Edison WA] ========== HEARTBEAT ==========\n');

  // Load state
  let state = await loadState();
  const today = new Date().toISOString().split('T')[0];

  if (state.lastDate !== today) {
    console.log('[Edison WA] New day, resetting counter');
    state.messagesToday = 0;
    state.lastDate = today;
  }

  // Check business hours (9am - 8pm Argentina)
  const now = new Date();
  const argentinaHour = parseInt(now.toLocaleString('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: 'numeric',
    hour12: false
  }));

  if (argentinaHour < 9 || argentinaHour >= 20) {
    console.log(`[Edison WA] Outside business hours (${argentinaHour}:00 Argentina)`);
    console.log('[Edison WA] Running anyway for testing...');
  }

  // Get contacts
  const contacts = await getNewContacts(limit);

  if (contacts.length === 0) {
    console.log('[Edison WA] No new contacts to message');
    return;
  }

  console.log(`[Edison WA] Found ${contacts.length} contacts to message\n`);

  let successCount = 0;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const template = getTemplate(state.messagesToday + i, contact);

    console.log(`[Edison WA] Contact ${i + 1}/${contacts.length}: ${contact.first_name || 'Unknown'} (${contact.phone})`);

    const success = await sendWhatsAppMessage(contact.phone, template, dryRun);

    if (success) {
      successCount++;

      if (!dryRun) {
        await updateContactStatus(contact.id, 'contacted', 1);
        await logMessage(contact.id, contact.phone, template, true);

        state.messagesToday++;
        state.lastRunAt = new Date().toISOString();
        await saveState(state);
      }
    } else {
      if (!dryRun) {
        await logMessage(contact.id, contact.phone, template, false);
      }
    }

    // Wait between messages
    if (i < contacts.length - 1 && !dryRun) {
      const waitMs = randomDelay(MIN_MESSAGE_SPACING_MS, MAX_MESSAGE_SPACING_MS);
      console.log(`[Edison WA] Waiting ${Math.round(waitMs / 1000)}s...\n`);
      await new Promise(r => setTimeout(r, waitMs));
    }
  }

  // Summary
  console.log('\n[Edison WA] ========== COMPLETE ==========');
  console.log(`[Edison WA] Sent: ${successCount}/${contacts.length}`);
  console.log(`[Edison WA] Total today: ${state.messagesToday}`);
}

async function showStats(): Promise<void> {
  console.log('\n[Edison WA] Campaign Statistics\n');

  // Get counts by status
  const { data: statusCounts } = await supabase
    .from('outreach_contacts')
    .select('status')
    .eq('is_active', true);

  if (statusCounts) {
    const counts: Record<string, number> = {};
    for (const row of statusCounts) {
      counts[row.status] = (counts[row.status] || 0) + 1;
    }

    console.log('Status breakdown:');
    for (const [status, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${status}: ${count}`);
    }

    const total = statusCounts.length;
    const contacted = counts['contacted'] || 0;
    const responded = counts['responded'] || 0;

    console.log(`\nTotal: ${total}`);
    console.log(`Contact rate: ${((contacted / total) * 100).toFixed(1)}%`);
    if (contacted > 0) {
      console.log(`Response rate: ${((responded / contacted) * 100).toFixed(1)}%`);
    }
  }

  // Load local state
  const state = await loadState();
  console.log(`\nToday (${state.lastDate}):`);
  console.log(`  Messages sent: ${state.messagesToday}`);
  console.log(`  Last run: ${state.lastRunAt || 'never'}`);
}

// ============================================
// CLI
// ============================================

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const showStatsFlag = args.includes('--stats');

let limit = DEFAULT_LIMIT;
const limitIndex = args.indexOf('--limit');
if (limitIndex !== -1 && args[limitIndex + 1]) {
  limit = parseInt(args[limitIndex + 1]) || DEFAULT_LIMIT;
}

if (showStatsFlag) {
  await showStats();
} else if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Edison WhatsApp Heartbeat - Autonomous Outreach
================================================

Usage:
  bun edison-wa-heartbeat.ts              # Send to ${DEFAULT_LIMIT} contacts
  bun edison-wa-heartbeat.ts --limit 3    # Send to 3 contacts
  bun edison-wa-heartbeat.ts --dry-run    # Preview without sending
  bun edison-wa-heartbeat.ts --stats      # Show campaign statistics

Configuration:
  SUPABASE_URL                 Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY    Supabase service role key

Requires:
  - OpenClaw CLI with WhatsApp connected
  - outreach_contacts table in Supabase
`);
} else {
  await runHeartbeat(limit, dryRun);
}
