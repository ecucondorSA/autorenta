/**
 * TikTok Lead Gen Webhook
 *
 * Receives TikTok Instant Form leads and stores them in marketing_leads.
 * Optionally upserts outreach_contacts and email_subscribers for follow-up.
 *
 * Endpoint: /functions/v1/tiktok-leadgen-webhook
 * Method: POST
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const WEBHOOK_VERIFY = Deno.env.get('TIKTOK_WEBHOOK_VERIFY') === 'true';
const WEBHOOK_SECRET =
  Deno.env.get('TIKTOK_WEBHOOK_SECRET') ||
  Deno.env.get('TIKTOK_CLIENT_SECRET') ||
  '';

const MAX_AGE_SECONDS = parseInt(
  Deno.env.get('TIKTOK_WEBHOOK_MAX_AGE_SECONDS') || '300',
  10,
);

const AUTO_ENROLL_SEQUENCE_SLUG = Deno.env.get('TIKTOK_LEAD_SEQUENCE_SLUG') || '';

interface LeadExtracted {
  leadId?: string;
  formId?: string;
  adId?: string;
  adGroupId?: string;
  campaignId?: string;
  advertiserId?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  city?: string;
  region?: string;
  country?: string;
  carBrand?: string;
  carModel?: string;
  carYear?: number;
  hasCar?: boolean;
  submittedAt?: string;
  fields: Record<string, string>;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const challenge = url.searchParams.get('challenge');
    if (challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(
      JSON.stringify({ success: false, error: 'Supabase not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  try {
    const rawBody = await req.text();

    if (WEBHOOK_VERIFY) {
      if (!WEBHOOK_SECRET) {
        return new Response(
          JSON.stringify({ success: false, error: 'Webhook secret not configured' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const signatureHeader =
        req.headers.get('tiktok-signature') ||
        req.headers.get('TikTok-Signature') ||
        req.headers.get('Tiktok-Signature');
      const verified = await verifySignature(signatureHeader, rawBody, WEBHOOK_SECRET, MAX_AGE_SECONDS);
      if (!verified) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const parsedPayload = safeJsonParse(rawBody) || { raw: rawBody };
    const leadPayload = extractPayload(parsedPayload);
    const extracted = extractLead(leadPayload);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    const leadRow = {
      platform: 'tiktok',
      lead_id: extracted.leadId || null,
      lead_type: 'instant_form',
      form_id: extracted.formId || null,
      ad_id: extracted.adId || null,
      adgroup_id: extracted.adGroupId || null,
      campaign_id: extracted.campaignId || null,
      advertiser_id: extracted.advertiserId || null,
      full_name: extracted.fullName || null,
      first_name: extracted.firstName || null,
      last_name: extracted.lastName || null,
      email: extracted.email || null,
      phone: extracted.phone || null,
      city: extracted.city || null,
      region: extracted.region || null,
      country: extracted.country || null,
      car_brand: extracted.carBrand || null,
      car_model: extracted.carModel || null,
      car_year: extracted.carYear || null,
      has_car: typeof extracted.hasCar === 'boolean' ? extracted.hasCar : null,
      submitted_at: extracted.submittedAt || null,
      raw_payload: parsedPayload,
      metadata: { fields: extracted.fields },
    };

    const { data: leadData, error: leadError } = await supabase
      .from('marketing_leads')
      .upsert(leadRow, { onConflict: 'platform,lead_id' })
      .select('id')
      .single();

    if (leadError) {
      console.error('[tiktok-leadgen-webhook] Failed to upsert marketing_leads:', leadError);
      return new Response(
        JSON.stringify({ success: false, error: leadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const leadId = leadData?.id;

    // Upsert outreach contact if phone exists
    if (extracted.phone) {
      const outreachPayload = {
        phone: extracted.phone,
        first_name: extracted.firstName || extracted.fullName || null,
        full_name: extracted.fullName || null,
        source: 'tiktok',
        tiktok_lead_id: leadId || null,
        metadata: {
          lead_id: extracted.leadId || null,
          form_id: extracted.formId || null,
          ad_id: extracted.adId || null,
          adgroup_id: extracted.adGroupId || null,
          campaign_id: extracted.campaignId || null,
        },
      };

      const { error: outreachError } = await supabase
        .from('outreach_contacts')
        .upsert(outreachPayload, { onConflict: 'phone' });

      if (outreachError) {
        console.warn('[tiktok-leadgen-webhook] outreach_contacts upsert failed:', outreachError.message);
      }
    }

    // Upsert email subscriber if email exists
    if (extracted.email) {
      const subscriberPayload = {
        email: extracted.email,
        first_name: extracted.firstName || extracted.fullName || null,
        last_name: extracted.lastName || null,
        user_type: 'lead',
        source: 'tiktok',
        status: 'active',
        metadata: {
          lead_id: extracted.leadId || null,
          form_id: extracted.formId || null,
          ad_id: extracted.adId || null,
          adgroup_id: extracted.adGroupId || null,
          campaign_id: extracted.campaignId || null,
        },
      };

      const { data: subscriberData, error: subscriberError } = await supabase
        .from('email_subscribers')
        .upsert(subscriberPayload, { onConflict: 'email' })
        .select('id, active_sequences')
        .single();

      if (subscriberError) {
        console.warn('[tiktok-leadgen-webhook] email_subscribers upsert failed:', subscriberError.message);
      } else if (AUTO_ENROLL_SEQUENCE_SLUG) {
        await autoEnrollSequence(supabase, subscriberData, AUTO_ENROLL_SEQUENCE_SLUG);
      }
    }

    return new Response(
      JSON.stringify({ success: true, lead_id: leadId, external_lead_id: extracted.leadId || null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[tiktok-leadgen-webhook] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function autoEnrollSequence(
  supabase: ReturnType<typeof createClient>,
  subscriber: { id?: string; active_sequences?: Array<{ sequence_id: string }> } | null,
  sequenceSlug: string,
) {
  if (!subscriber?.id) return;

  const { data: sequence, error: sequenceError } = await supabase
    .from('email_sequences')
    .select('id')
    .eq('slug', sequenceSlug)
    .eq('is_active', true)
    .single();

  if (sequenceError || !sequence?.id) {
    console.warn('[tiktok-leadgen-webhook] Sequence not found:', sequenceSlug);
    return;
  }

  const existing = Array.isArray(subscriber.active_sequences) ? subscriber.active_sequences : [];
  if (existing.some((seq) => seq.sequence_id === sequence.id)) {
    return; // already enrolled
  }

  const updatedSequences = [
    ...existing,
    {
      sequence_id: sequence.id,
      current_step: 1,
      started_at: new Date().toISOString(),
    },
  ];

  await supabase
    .from('email_subscribers')
    .update({ active_sequences: updatedSequences, updated_at: new Date().toISOString() })
    .eq('id', subscriber.id);
}

function safeJsonParse(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractPayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;

  if (typeof payload.content === 'string') {
    const parsed = safeJsonParse(payload.content);
    if (parsed) return parsed;
  }

  if (payload.content && typeof payload.content === 'object') {
    return payload.content;
  }

  if (typeof payload.data === 'string') {
    const parsed = safeJsonParse(payload.data);
    if (parsed) return parsed;
  }

  if (payload.data && typeof payload.data === 'object') {
    return payload.data;
  }

  return payload;
}

function extractLead(payload: any): LeadExtracted {
  const fields = extractFieldMap(payload);

  const leadId = coalesceString(
    deepFind(payload, ['lead_id', 'leadid', 'lead'])?.toString(),
    fields['leadid'],
  );

  const formId = coalesceString(
    deepFind(payload, ['form_id', 'formid'])?.toString(),
    fields['formid'],
  );

  const adId = coalesceString(
    deepFind(payload, ['ad_id', 'adid'])?.toString(),
    fields['adid'],
  );

  const adGroupId = coalesceString(
    deepFind(payload, ['adgroup_id', 'adgroupid', 'ad_group_id'])?.toString(),
    fields['adgroupid'],
  );

  const campaignId = coalesceString(
    deepFind(payload, ['campaign_id', 'campaignid'])?.toString(),
    fields['campaignid'],
  );

  const advertiserId = coalesceString(
    deepFind(payload, ['advertiser_id', 'advertiserid', 'advertiser'])?.toString(),
    fields['advertiserid'],
  );

  const email = coalesceString(fields['email'], fields['correo'], fields['mail']);
  const phone = coalesceString(fields['telefono'], fields['phone'], fields['celular'], fields['whatsapp']);

  const fullName = coalesceString(fields['nombrecompleto'], fields['fullname'], fields['nombre'], fields['name']);
  const firstName = coalesceString(fields['nombre'], fields['firstname']);
  const lastName = coalesceString(fields['apellido'], fields['lastname']);

  const city = coalesceString(fields['ciudad'], fields['city'], fields['localidad'], fields['zona']);
  const region = coalesceString(fields['region'], fields['provincia'], fields['state']);
  const country = coalesceString(fields['pais'], fields['country']);

  const carBrand = coalesceString(fields['marca'], fields['carbrand'], fields['brand']);
  const carModel = coalesceString(fields['modelo'], fields['carmodel'], fields['model']);
  const carYear = parseYear(coalesceString(fields['anio'], fields['ano'], fields['year'], fields['caryear']));

  const hasCar = parseBoolean(coalesceString(fields['tenesauto'], fields['tienesauto'], fields['hascar'], fields['tengoauto']));

  const submittedAtValue = deepFind(payload, ['create_time', 'created_time', 'event_time', 'submit_time', 'submitted_at']);
  const submittedAt = parseTimestamp(submittedAtValue);

  return {
    leadId,
    formId,
    adId,
    adGroupId,
    campaignId,
    advertiserId,
    fullName: fullName || undefined,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    email: email || undefined,
    phone: phone || undefined,
    city: city || undefined,
    region: region || undefined,
    country: country || undefined,
    carBrand: carBrand || undefined,
    carModel: carModel || undefined,
    carYear: carYear || undefined,
    hasCar,
    submittedAt,
    fields,
  };
}

function extractFieldMap(payload: any): Record<string, string> {
  const pairs: Array<{ key: string; value: string }> = [];
  extractFieldPairs(payload, pairs);

  const directPairs = extractDirectFields(payload);
  pairs.push(...directPairs);

  const map: Record<string, string> = {};
  for (const pair of pairs) {
    const key = normalizeKey(pair.key);
    if (!key) continue;
    if (!map[key]) {
      map[key] = pair.value;
    }
  }
  return map;
}

function extractDirectFields(payload: any): Array<{ key: string; value: string }> {
  const output: Array<{ key: string; value: string }> = [];
  if (!payload || typeof payload !== 'object') return output;

  const candidates = ['email', 'phone', 'full_name', 'first_name', 'last_name', 'city', 'country', 'region'];
  for (const candidate of candidates) {
    const value = deepFind(payload, [candidate]);
    if (value !== undefined && value !== null) {
      output.push({ key: candidate, value: String(value) });
    }
  }

  return output;
}

function extractFieldPairs(node: any, pairs: Array<{ key: string; value: string }>) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) {
      extractFieldPairs(item, pairs);
    }
    return;
  }

  if (typeof node !== 'object') return;

  const keyCandidates = ['name', 'field', 'field_name', 'question', 'label', 'key', 'title'];
  const valueCandidates = ['value', 'values', 'answer', 'answers', 'response', 'field_value', 'field_values'];

  let foundKey: string | undefined;
  let foundValue: any = undefined;

  for (const key of keyCandidates) {
    if (typeof node[key] === 'string') {
      foundKey = node[key];
      break;
    }
  }

  for (const key of valueCandidates) {
    if (node[key] !== undefined) {
      foundValue = node[key];
      break;
    }
  }

  if (foundKey && foundValue !== undefined) {
    let value: string;
    if (Array.isArray(foundValue)) {
      value = foundValue.map(v => String(v)).join(' | ');
    } else {
      value = String(foundValue);
    }
    pairs.push({ key: foundKey, value });
  }

  for (const value of Object.values(node)) {
    if (typeof value === 'object') {
      extractFieldPairs(value, pairs);
    }
  }
}

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function deepFind(obj: any, keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  const normalizedKeys = new Set(keys.map(normalizeKey));

  const stack: any[] = [obj];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    for (const [key, value] of Object.entries(current)) {
      if (normalizedKeys.has(normalizeKey(key))) {
        return value;
      }
      if (typeof value === 'object') {
        stack.push(value);
      }
    }
  }
  return undefined;
}

function coalesceString(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    if (value && String(value).trim().length > 0) {
      return String(value).trim();
    }
  }
  return undefined;
}

function parseYear(value?: string): number | undefined {
  if (!value) return undefined;
  const match = value.match(/(19\d{2}|20\d{2})/);
  if (!match) return undefined;
  const year = parseInt(match[1], 10);
  if (year < 1950 || year > 2100) return undefined;
  return year;
}

function parseBoolean(value?: string): boolean | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase().trim();
  if (['si', 'sí', 'yes', 'y', 'true', '1'].includes(normalized)) return true;
  if (['no', 'false', '0'].includes(normalized)) return false;
  return undefined;
}

function parseTimestamp(value: any): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') {
    const ms = value > 10_000_000_000 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === 'string') {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return parseTimestamp(numeric);
    }
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  return undefined;
}

async function verifySignature(
  signatureHeader: string | null,
  rawBody: string,
  secret: string,
  maxAgeSeconds: number,
): Promise<boolean> {
  if (!signatureHeader) return false;

  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;

  if (maxAgeSeconds > 0) {
    const timestamp = parseInt(parsed.timestamp, 10);
    if (!Number.isFinite(timestamp)) return false;
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > maxAgeSeconds) {
      return false;
    }
  }

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expected = await hmacSHA256Hex(secret, signedPayload);
  return timingSafeEqual(expected, parsed.signature);
}

function parseSignatureHeader(header: string): { timestamp: string; signature: string } | null {
  const parts = header.split(',').map((part) => part.trim());
  let timestamp = '';
  let signature = '';
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (!key || !value) continue;
    if (key === 't') timestamp = value;
    if (key === 's') signature = value;
  }
  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

async function hmacSHA256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
