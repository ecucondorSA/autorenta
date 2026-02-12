/**
 * Supabase Edge Function: manual-identity-review
 *
 * Public endpoint consumed from email links.
 * Processes a one-click YES/NO decision for manual identity verification.
 *
 * Query params:
 * - token: one-time random token (stored hashed in DB)
 * - decision: yes|no (also accepts si/no, approve/reject)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function htmlPage(title: string, body: string, status: number = 200): Response {
  const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; padding: 24px; line-height: 1.5;">
    <h2 style="margin: 0 0 12px 0;">${title}</h2>
    ${body}
  </body>
</html>
  `.trim();

  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method !== 'GET') {
    return htmlPage('Método no permitido', '<p>Solo se permite GET.</p>', 405);
  }

  const url = new URL(req.url);
  const token = url.searchParams.get('token')?.trim() || '';
  const decision = url.searchParams.get('decision')?.trim() || '';

  if (!token || !decision) {
    return htmlPage(
      'Solicitud inválida',
      '<p>Falta <code>token</code> o <code>decision</code>.</p>',
      400,
    );
  }

  const tokenHash = await sha256Hex(token);
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data, error } = await adminClient.rpc('process_manual_identity_review_email', {
    p_token_hash: tokenHash,
    p_decision: decision,
    p_notes: null,
  });

  if (error) {
    console.error('[manual-identity-review] rpc error:', error);
    return htmlPage(
      'Error',
      '<p>No pudimos procesar la decisión. Intenta de nuevo o contacta a soporte.</p>',
      500,
    );
  }

  const result = (data ?? {}) as Record<string, unknown>;

  if (result['success'] === true) {
    if (result['already_processed'] === true) {
      return htmlPage(
        'Decisión ya procesada',
        `<p>Estado actual: <strong>${String(result['status'] || '')}</strong></p>`,
      );
    }

    const status = String(result['status'] || '');
    if (status === 'APPROVED') {
      return htmlPage('Aprobado', '<p>Se aprobó la verificación manual.</p>');
    }
    if (status === 'REJECTED') {
      return htmlPage('Rechazado', '<p>Se rechazó la verificación manual.</p>');
    }

    return htmlPage('Procesado', `<p>Estado: <strong>${status}</strong></p>`);
  }

  const errorCode = String(result['error'] || 'UNKNOWN');
  if (errorCode === 'NOT_FOUND') {
    return htmlPage('Link inválido', '<p>El enlace no es válido o ya no existe.</p>', 404);
  }
  if (errorCode === 'EXPIRED') {
    return htmlPage('Link expirado', '<p>El enlace expiró. Solicita una nueva revisión.</p>', 410);
  }
  if (errorCode === 'INVALID_DECISION') {
    return htmlPage('Decisión inválida', '<p>Usa <code>yes</code> o <code>no</code>.</p>', 400);
  }

  return htmlPage('No procesado', '<p>No se pudo completar la operación.</p>', 400);
});

