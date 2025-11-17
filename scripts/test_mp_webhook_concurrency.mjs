#!/usr/bin/env node
// Test script para enviar webhooks concurrentes al endpoint de MercadoPago
// Uso:
// WEBHOOK_URL="https://..." HMAC_SECRET="secreto" node scripts/test_mp_webhook_concurrency.mjs --count 20 --concurrency 5 --mode duplicate

import crypto from 'crypto';
import { argv } from 'process';

function parseArgs() {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i+1];
      if (!next || next.startsWith('--')) {
        args[key] = true;
      } else {
        args[key] = next;
        i++;
      }
    }
  }
  return args;
}

const args = parseArgs();
const WEBHOOK_URL = process.env.WEBHOOK_URL || args.url;
const HMAC_SECRET = process.env.HMAC_SECRET || args.hmac || process.env.HMAC;
const COUNT = parseInt(args.count || 10, 10);
const CONCURRENCY = parseInt(args.concurrency || 5, 10);
const MODE = args.mode || 'unique'; // 'unique' or 'duplicate'

if (!WEBHOOK_URL) {
  console.error('Falta WEBHOOK_URL. Seteá WEBHOOK_URL en el environment o pasá --url');
  process.exit(1);
}

console.log(`Webhook URL: ${WEBHOOK_URL}`);
console.log(`Mode: ${MODE} — count ${COUNT}, concurrency ${CONCURRENCY}`);

function signPayload(secret, payload) {
  if (!secret) return null;
  return crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}

function makePayload(i, sharedEventId) {
  const eventId = sharedEventId ?? `evt_${Date.now()}_${Math.floor(Math.random() * 100000)}_${i}`;
  return {
    id: eventId,
    type: 'payment',
    data: {
      id: `payment_${Math.floor(Math.random() * 1000000)}`,
      status: 'approved',
      amount: Math.floor(Math.random() * 10000)/100,
      metadata: { test: true }
    }
  };
}

async function send(payload) {
  const signature = signPayload(HMAC_SECRET, payload);
  const requestId = payload.id + '_' + Math.floor(Math.random()*100000);
  const headers = {
    'Content-Type': 'application/json',
    'x-request-id': requestId,
  };
  if (signature) headers['x-hmac-signature'] = signature;

  try {
    const res = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    const text = await res.text();
    return { status: res.status, body: text };
  } catch (err) {
    return { status: 'ERR', body: String(err) };
  }
}

async function run() {
  const results = [];
  const sharedEventId = MODE === 'duplicate' ? `dup_${Date.now()}` : null;

  const queue = [];
  for (let i = 0; i < COUNT; i++) {
    queue.push(async () => {
      const payload = makePayload(i, sharedEventId);
      const r = await send(payload);
      results.push({ payloadId: payload.id, status: r.status, body: r.body });
      process.stdout.write('.');
    });
  }

  // simple concurrency runner
  const workers = new Array(CONCURRENCY).fill(null).map(async () => {
    while (queue.length) {
      const job = queue.shift();
      if (!job) break;
      try { await job(); } catch (e) { console.error('job error', e); }
    }
  });

  await Promise.all(workers);
  console.log('\n--- Results ---');
  const counts = results.reduce((acc, r) => {
    const k = String(r.status);
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  console.log('Counts by status:', counts);
  console.log('Sample responses:');
  results.slice(0, 10).forEach((r, i) => console.log(i, r.status, r.payloadId, '->', r.body));
}

run().catch(e => { console.error(e); process.exit(2); });
