/**
 * Supabase Edge Function: verify-user-docs
 *
 * Dispara la verificación automática de documentación (licencia, DNI, cédula verde) utilizando
 * un servicio externo basado en ONNX. Cuando no hay modelo configurado, valida con reglas
 * básicas y deja el estado en pendiente.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DOC_VERIFIER_URL = Deno.env.get('DOC_VERIFIER_URL');
const DOC_VERIFIER_TOKEN = Deno.env.get('DOC_VERIFIER_TOKEN');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const MANUAL_REVIEW_EMAIL_TO = Deno.env.get('MANUAL_REVIEW_EMAIL_TO') || 'ecucondor@gmail.com';
const MANUAL_REVIEW_EMAIL_FROM =
  Deno.env.get('MANUAL_REVIEW_EMAIL_FROM') || 'AutoRenta <no-reply@autorentar.com>';

const MANUAL_REVIEW_DOC_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

interface DocumentRecord {
  id: string;
  kind: string;
  status: string;
  storage_path: string;
  notes?: string | null;
  created_at: string;
}

interface VerificationResult {
  user_id: string;
  role: 'driver' | 'owner';
  status: 'VERIFICADO' | 'PENDIENTE' | 'RECHAZADO';
  missing_docs: string[];
  notes?: string;
  metadata?: Record<string, unknown>;
}

const mapStatusToKyc = (status: VerificationResult['status']): string => {
  switch (status) {
    case 'VERIFICADO':
      return 'verified';
    case 'RECHAZADO':
      return 'rejected';
    default:
      return 'pending';
  }
};

function base64Url(bytes: Uint8Array): string {
  // RFC 4648 base64url (no padding)
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function newRandomToken(bytes: number = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64Url(buf);
}

async function sendResendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!RESEND_API_KEY) {
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: MANUAL_REVIEW_EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    return { success: false, error: `Resend error ${res.status}: ${body || res.statusText}` };
  }

  const data = await res.json().catch(() => null);
  const id = data?.id ? String(data.id) : '';
  return { success: true, id };
}


serve(async (req) => {
  // ✅ SECURITY: CORS con whitelist de dominios permitidos
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {
      status: 405,
      headers: corsHeaders
    });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('Unauthorized', {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data: authData, error: userError } = await userClient.auth.getUser();
  if (userError || !authData?.user) {
    console.error('[verify-user-docs] auth error:', userError);
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const userId = authData.user.id;
  const payload = await req.json().catch(() => ({}));
  const requestedRole: 'driver' | 'owner' | undefined =
    payload?.role && ['driver', 'owner'].includes(payload.role) ? payload.role : undefined;

  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    // NOTE: `profiles.kyc` does NOT exist in production schema.
    // Identity level 2 is tracked via `profiles.id_verified`.
    .select('id, full_name, role, id_verified')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    console.error('[verify-user-docs] profile not found', profileError);
    return new Response(JSON.stringify({ error: 'Perfil no encontrado' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: documents, error: documentsError } = await adminClient
    .from('user_documents')
    .select('*')
    .eq('user_id', userId);

  if (documentsError) {
    console.error('[verify-user-docs] error fetching documents', documentsError);
    return new Response(JSON.stringify({ error: 'No pudimos obtener los documentos' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const documentList = (documents ?? []) as DocumentRecord[];
  const docByKind = Object.fromEntries(documentList.map((doc) => [doc.kind, doc]));

  const rolesToEvaluate: ('driver' | 'owner')[] = [];
  const profileRole = profile.role ?? 'renter';

  if (requestedRole) {
    rolesToEvaluate.push(requestedRole);
  } else {
    if (profileRole === 'renter' || profileRole === 'both') {
      rolesToEvaluate.push('driver');
    }
    if (profileRole === 'owner' || profileRole === 'both') {
      rolesToEvaluate.push('owner');
    }
  }

  const signedDocuments = await buildSignedDocuments(adminClient, documentList);
  const aiPayload = await runExternalVerifier(signedDocuments, profile, rolesToEvaluate).catch(
    (error) => {
      console.warn('[verify-user-docs] external verifier not available:', error);
      return null;
    },
  );

  const results: VerificationResult[] = [];

  for (const role of rolesToEvaluate) {
    if (role === 'driver') {
      results.push(evaluateDriver(userId, docByKind, aiPayload?.driver, profile));
    } else {
      results.push(evaluateOwner(userId, docByKind, aiPayload?.owner, profile));
    }
  }

  const updates: Promise<unknown>[] = [];

  for (const result of results) {
    updates.push(
      adminClient
        .from('user_verifications')
        .upsert(
          {
            user_id: result.user_id,
            role: result.role,
            status: result.status,
            missing_docs: result.missing_docs,
            notes: result.notes ?? null,
            metadata: result.metadata ?? null,
          },
          { onConflict: 'user_id,role' },
        ),
    );
  }

  const profileUpdates: Record<string, unknown> = {};

  const driverResult = results.find((result) => result.role === 'driver');
  if (driverResult) {
    const licenseDocs = ['driver_license', 'license_front', 'license_back']
      .map((kind) => docByKind[kind])
      .filter(Boolean) as DocumentRecord[];

    if (licenseDocs.length > 0) {
      const nextStatus = mapStatusToKyc(driverResult.status);
      licenseDocs.forEach((doc) => {
        updates.push(
          adminClient
            .from('user_documents')
            .update({
              status: nextStatus,
              notes: driverResult.notes ?? doc.notes ?? null,
            })
            .eq('id', doc.id),
        );
      });
    }
  }

  const ownerResult = results.find((result) => result.role === 'owner');
  if (ownerResult) {
    const ownerDocumentKinds: Record<string, string[]> = {
      dni: ['gov_id_front', 'gov_id_back'],
      cedula_auto: ['vehicle_registration'],
    };

    Object.values(ownerDocumentKinds).forEach((kinds) => {
      kinds
        .map((kind) => docByKind[kind])
        .filter(Boolean)
        .forEach((doc) => {
          updates.push(
            adminClient
              .from('user_documents')
              .update({
                status: mapStatusToKyc(ownerResult.status),
                notes: ownerResult.notes ?? doc?.notes ?? null,
              })
              .eq('id', doc!.id),
          );
        });
    });
  }

  // Keep `id_verified` as our single Level 2 identity gate.
  // If any evaluated role is verified, mark the user as verified. Never auto-unverify here.
  const anyRoleVerified = results.some((result) => result.status === 'VERIFICADO');
  profileUpdates.id_verified = profile.id_verified === true || anyRoleVerified;

  if (Object.keys(profileUpdates).length > 0) {
    updates.push(adminClient.from('profiles').update(profileUpdates).eq('id', userId));
  }

  await Promise.all(updates).catch((error) => {
    console.error('[verify-user-docs] error persisting results:', error);
  });

  // If the user has uploaded all required identity docs but the system cannot auto-verify
  // (low confidence / external verifier unavailable), request a manual review by email.
  if (driverResult) {
    try {
      await requestManualDriverReviewByEmail(adminClient, userId, profile, docByKind, driverResult);
    } catch (error) {
      console.error('[verify-user-docs] manual review email error:', error);
    }
  }

  // After Level 2 verification, check if we should process Level 3 (face verification)
  // Run asynchronously to not block the response
  evaluateLevel3FaceVerification(adminClient, userId).catch((error) => {
    console.error('[verify-user-docs] Level 3 evaluation error:', error);
  });

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

const DOCUMENT_BUCKETS = ['identity-documents', 'documents', 'verification-docs'] as const;
const KNOWN_DOC_KINDS = new Set([
  'gov_id_front',
  'gov_id_back',
  'driver_license',
  'license_front',
  'license_back',
  'vehicle_registration',
  'vehicle_insurance',
  'utility_bill',
  'selfie',
  'criminal_record',
]);

const MISSING_DOC_ALIASES: Record<string, string[]> = {
  licencia: ['driver_license'],
  'driver_license': ['driver_license'],
  license: ['driver_license'],
  'license_front': ['driver_license'],
  'license_back': ['driver_license'],
  dni: ['gov_id_front', 'gov_id_back'],
  'gov_id': ['gov_id_front', 'gov_id_back'],
  'gov_id_front': ['gov_id_front'],
  'gov_id_back': ['gov_id_back'],
  cedula: ['gov_id_front', 'gov_id_back'],
  cedula_auto: ['vehicle_registration'],
  'vehicle_registration': ['vehicle_registration'],
  'vehicle_insurance': ['vehicle_insurance'],
};

function normalizeMissingDoc(raw: string): string[] {
  const trimmed = raw.trim();
  const key = trimmed.toLowerCase().replace(/\s+/g, '_');
  if (MISSING_DOC_ALIASES[key]) {
    return MISSING_DOC_ALIASES[key];
  }

  if (KNOWN_DOC_KINDS.has(trimmed)) {
    return [trimmed];
  }

  const lowered = trimmed.toLowerCase();
  if (KNOWN_DOC_KINDS.has(lowered)) {
    return [lowered];
  }

  return [];
}

async function createSignedUrl(
  adminClient: ReturnType<typeof createClient>,
  storagePath: string,
  expiresInSeconds: number = 60 * 60,
): Promise<string | null> {
  for (const bucket of DOCUMENT_BUCKETS) {
    const { data, error } = await adminClient.storage.from(bucket).createSignedUrl(
      storagePath,
      expiresInSeconds,
    );

    if (!error && data?.signedUrl) {
      return data.signedUrl;
    }
  }

  return null;
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

async function ensureSignedUrl(
  adminClient: ReturnType<typeof createClient>,
  value: string | null,
): Promise<string | null> {
  if (!value) {
    return null;
  }

  if (isHttpUrl(value)) {
    return value;
  }

  return await createSignedUrl(adminClient, value);
}

async function buildSignedDocuments(
  adminClient: ReturnType<typeof createClient>,
  documents: DocumentRecord[],
) {
  const signed: Array<Record<string, unknown>> = [];
  for (const doc of documents) {
    const signedUrl = await createSignedUrl(adminClient, doc.storage_path, 60 * 60);

    if (!signedUrl) {
      console.warn('[verify-user-docs] Could not create signed URL for', doc.id);
      continue;
    }

    signed.push({
      id: doc.id,
      kind: doc.kind,
      status: doc.status,
      url: signedUrl,
      created_at: doc.created_at,
    });
  }
  return signed;
}

function hasCompleteDriverDocs(docByKind: Record<string, DocumentRecord>): boolean {
  const hasGovFront = !!docByKind['gov_id_front'];
  const hasGovBack = !!docByKind['gov_id_back'];
  const hasLicense =
    !!docByKind['driver_license'] || (!!docByKind['license_front'] && !!docByKind['license_back']);

  return hasGovFront && hasGovBack && hasLicense;
}

function isManualReviewEligible(params: {
  profile: Record<string, any>;
  driverResult: VerificationResult;
  docByKind: Record<string, DocumentRecord>;
}): boolean {
  if (params.profile.id_verified === true) {
    return false;
  }

  if (!hasCompleteDriverDocs(params.docByKind)) {
    return false;
  }

  // Eligible when all docs exist but verification is still pending.
  return params.driverResult.status === 'PENDIENTE';
}

async function requestManualDriverReviewByEmail(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  profile: Record<string, any>,
  docByKind: Record<string, DocumentRecord>,
  driverResult: VerificationResult,
): Promise<void> {
  if (!isManualReviewEligible({ profile, driverResult, docByKind })) {
    return;
  }

  const reviewerEmail = MANUAL_REVIEW_EMAIL_TO;
  if (!reviewerEmail) {
    console.warn('[verify-user-docs] MANUAL_REVIEW_EMAIL_TO not configured, skipping');
    return;
  }

  const requiredKinds = [
    'gov_id_front',
    'gov_id_back',
    'driver_license',
    'license_front',
    'license_back',
  ] as const;

  const docsForReview = requiredKinds
    .map((kind) => docByKind[kind])
    .filter(Boolean) as DocumentRecord[];

  const fingerprintPayload = docsForReview
    .slice()
    .sort((a, b) => (a.kind + a.storage_path).localeCompare(b.kind + b.storage_path))
    .map((doc) => `${doc.kind}:${doc.storage_path}:${doc.created_at}`)
    .join('|');

  const fingerprint = await sha256Hex(fingerprintPayload);

  // Check if there's already a pending request for this exact doc set (avoid spam).
  const { data: existingPending, error: existingError } = await adminClient
    .from('manual_identity_review_email_requests')
    .select('id, fingerprint')
    .eq('user_id', userId)
    .eq('status', 'PENDING')
    .maybeSingle();

  if (existingError) {
    console.error('[verify-user-docs] error checking existing manual requests:', existingError);
  }

  if (existingPending?.fingerprint && existingPending.fingerprint === fingerprint) {
    return;
  }

  if (existingPending?.id) {
    await adminClient
      .from('manual_identity_review_email_requests')
      .update({ status: 'CANCELLED', decided_at: new Date().toISOString() })
      .eq('id', existingPending.id);
  }

  const token = newRandomToken(32);
  const tokenHash = await sha256Hex(token);
  const expiresAt = new Date(Date.now() + MANUAL_REVIEW_DOC_URL_TTL_SECONDS * 1000).toISOString();

  const requestMeta = {
    kind: 'driver_identity',
    driver_status: driverResult.status,
    driver_notes: driverResult.notes ?? null,
    docs: docsForReview.map((doc) => ({
      id: doc.id,
      kind: doc.kind,
      storage_path: doc.storage_path,
      created_at: doc.created_at,
      status: doc.status,
    })),
  };

  const { data: inserted, error: insertError } = await adminClient
    .from('manual_identity_review_email_requests')
    .insert({
      user_id: userId,
      reviewer_email: reviewerEmail,
      token_hash: tokenHash,
      fingerprint,
      status: 'PENDING',
      expires_at: expiresAt,
      metadata: requestMeta,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('[verify-user-docs] error inserting manual review request:', insertError);
    return;
  }

  // Mark the identity level as pending manual review (server-controlled fields).
  await adminClient.from('user_identity_levels').upsert(
    {
      user_id: userId,
      manual_review_required: true,
      manual_review_decision: 'PENDING',
      manual_review_notes: driverResult.notes ?? 'Pending manual review (email)',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  const docLinks: Record<string, string | null> = {};
  for (const kind of requiredKinds) {
    const doc = docByKind[kind];
    if (!doc) {
      docLinks[kind] = null;
      continue;
    }
    docLinks[kind] =
      (await createSignedUrl(adminClient, doc.storage_path, MANUAL_REVIEW_DOC_URL_TTL_SECONDS)) ??
      (await createSignedUrl(adminClient, doc.storage_path, 60 * 60));
  }

  const actionBaseUrl = `${SUPABASE_URL.replace(/\\/$/, '')}/functions/v1/manual-identity-review`;
  const approveUrl = `${actionBaseUrl}?token=${encodeURIComponent(token)}&decision=yes`;
  const rejectUrl = `${actionBaseUrl}?token=${encodeURIComponent(token)}&decision=no`;

  const subject = `Revisión manual (SI/NO): Identidad y licencia - ${profile.full_name || userId}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.5;">
      <h2 style="margin: 0 0 12px 0;">Revisión manual requerida</h2>
      <p style="margin: 0 0 12px 0;">
        Usuario: <strong>${profile.full_name || 'Sin nombre'}</strong><br/>
        User ID: <code>${userId}</code><br/>
        Request ID: <code>${inserted?.id || ''}</code>
      </p>

      <p style="margin: 0 0 12px 0;">
        Resultado automático: <strong>${driverResult.status}</strong><br/>
        Notas: ${driverResult.notes ? `<em>${driverResult.notes}</em>` : '<em>(sin notas)</em>'}
      </p>

      <div style="margin: 16px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <p style="margin: 0 0 10px 0;"><strong>Documentos</strong> (links expiran: ${new Date(
          expiresAt,
        ).toLocaleString('es-AR')})</p>
        <ul style="margin: 0; padding-left: 18px;">
          <li>DNI frente: ${docLinks.gov_id_front ? `<a href="${docLinks.gov_id_front}">Ver</a>` : 'Falta'}</li>
          <li>DNI dorso: ${docLinks.gov_id_back ? `<a href="${docLinks.gov_id_back}">Ver</a>` : 'Falta'}</li>
          <li>Licencia (archivo): ${docLinks.driver_license ? `<a href="${docLinks.driver_license}">Ver</a>` : 'N/A'}</li>
          <li>Licencia frente: ${docLinks.license_front ? `<a href="${docLinks.license_front}">Ver</a>` : 'N/A'}</li>
          <li>Licencia dorso: ${docLinks.license_back ? `<a href="${docLinks.license_back}">Ver</a>` : 'N/A'}</li>
        </ul>
      </div>

      <div style="display: flex; gap: 12px; margin: 18px 0;">
        <a href="${approveUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #16a34a; color: #fff; text-decoration: none; font-weight: 700;">SI (Aprobar)</a>
        <a href="${rejectUrl}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #dc2626; color: #fff; text-decoration: none; font-weight: 700;">NO (Rechazar)</a>
      </div>

      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        Este enlace procesa la decisión en AutoRenta y actualiza el estado de los documentos.
      </p>
    </div>
  `.trim();

  const sendResult = await sendResendEmail({ to: reviewerEmail, subject, html });
  if (!sendResult.success) {
    console.error('[verify-user-docs] resend email failed:', sendResult.error);
    // Keep the request pending (token remains valid) even if sending failed.
    return;
  }

  await adminClient
    .from('manual_identity_review_email_requests')
    .update({
      metadata: { ...requestMeta, email_message_id: sendResult.id, email_sent_at: new Date().toISOString() },
    })
    .eq('id', inserted.id);
}

async function runExternalVerifier(
  documents: Array<Record<string, unknown>>,
  profile: Record<string, any>,
  roles: ('driver' | 'owner')[],
) {
  if (!DOC_VERIFIER_URL) {
    return null;
  }

  const body = {
    user: {
      id: profile.id,
      full_name: profile.full_name,
      role: profile.role,
    },
    roles,
    documents,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (DOC_VERIFIER_TOKEN) {
    headers.Authorization = `Bearer ${DOC_VERIFIER_TOKEN}`;
  }

  const response = await fetch(DOC_VERIFIER_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    console.error('[verify-user-docs] External verifier error:', await response.text());
    throw new Error(`External verifier responded ${response.status}`);
  }

  return await response.json();
}

function evaluateDriver(
  userId: string,
  docs: Record<string, DocumentRecord>,
  aiResult: Record<string, unknown> | undefined,
  profile: Record<string, any>,
): VerificationResult {
  const missing = new Set<string>();
  const licenseDocs = [
    docs['driver_license'],
    docs['license_front'],
    docs['license_back'],
  ].filter(Boolean) as DocumentRecord[];

  if (licenseDocs.length === 0) {
    missing.add('driver_license');
  }

  let status: VerificationResult['status'] = 'PENDIENTE';
  let notes: string | undefined;

  if (aiResult && typeof aiResult.status === 'string') {
    const aiStatus = aiResult.status.toUpperCase();
    if (aiStatus === 'VERIFICADO' || aiStatus === 'RECHAZADO' || aiStatus === 'PENDIENTE') {
      status = aiStatus as VerificationResult['status'];
    }
    if (typeof aiResult.notes === 'string') {
      notes = aiResult.notes;
    }
    if (Array.isArray(aiResult.missing_docs)) {
      aiResult.missing_docs.forEach((item: unknown) => {
        if (typeof item === 'string') {
          normalizeMissingDoc(item).forEach((docId) => missing.add(docId));
        }
      });
    }
  } else if (!DOC_VERIFIER_URL) {
    // ⚠️ SEGURIDAD: Sin verificador externo, NUNCA auto-aprobar.
    // Requiere verificación manual por admin o configuración de DOC_VERIFIER_URL.
    status = 'PENDIENTE';
    notes = 'Requiere verificación manual (DOC_VERIFIER_URL no configurado).';
  }

  if (missing.size > 0 && status === 'VERIFICADO') {
    status = 'PENDIENTE';
  }

  return {
    user_id: userId,
    role: 'driver',
    status,
    missing_docs: Array.from(missing),
    notes,
    metadata: {
      full_name: profile.full_name,
      ai: aiResult ?? null,
    },
  };
}

function evaluateOwner(
  userId: string,
  docs: Record<string, DocumentRecord>,
  aiResult: Record<string, unknown> | undefined,
  profile: Record<string, any>,
): VerificationResult {
  const missing = new Set<string>();

  const hasGovFront = !!docs['gov_id_front'];
  const hasGovBack = !!docs['gov_id_back'];

  if (!hasGovFront) {
    missing.add('gov_id_front');
  }
  if (!hasGovBack) {
    missing.add('gov_id_back');
  }

  if (!docs['vehicle_registration']) {
    missing.add('vehicle_registration');
  }

  let status: VerificationResult['status'] = 'PENDIENTE';
  let notes: string | undefined;

  if (aiResult && typeof aiResult.status === 'string') {
    const aiStatus = aiResult.status.toUpperCase();
    if (aiStatus === 'VERIFICADO' || aiStatus === 'RECHAZADO' || aiStatus === 'PENDIENTE') {
      status = aiStatus as VerificationResult['status'];
    }
    if (typeof aiResult.notes === 'string') {
      notes = aiResult.notes;
    }
    if (Array.isArray(aiResult.missing_docs)) {
      aiResult.missing_docs.forEach((item: unknown) => {
        if (typeof item === 'string') {
          normalizeMissingDoc(item).forEach((docId) => missing.add(docId));
        }
      });
    }
  } else if (!DOC_VERIFIER_URL) {
    // ⚠️ SEGURIDAD: Sin verificador externo, NUNCA auto-aprobar.
    // Requiere verificación manual por admin o configuración de DOC_VERIFIER_URL.
    status = 'PENDIENTE';
    notes = 'Requiere verificación manual (DOC_VERIFIER_URL no configurado).';
  }

  if (missing.size > 0 && status === 'VERIFICADO') {
    status = 'PENDIENTE';
  }

  return {
    user_id: userId,
    role: 'owner',
    status,
    missing_docs: Array.from(missing),
    notes,
    metadata: {
      full_name: profile.full_name,
      ai: aiResult ?? null,
    },
  };
}

/**
 * Evaluate Level 3 face verification
 * Called separately after Level 2 (documents) is complete
 */
async function evaluateLevel3FaceVerification(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<void> {
  // Get identity level data
  const { data: levelData, error: levelError } = await adminClient
    .from('user_identity_levels')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (levelError || !levelData) {
    console.log('[verify-user-docs] No identity level data for Level 3 check');
    return;
  }

  // Only proceed if Level 2 is complete and selfie exists but not verified
  if (levelData.current_level < 2) {
    console.log('[verify-user-docs] User not at Level 2, skipping Level 3 verification');
    return;
  }

  if (!levelData.selfie_url) {
    console.log('[verify-user-docs] No selfie uploaded, skipping Level 3 verification');
    return;
  }

  if (levelData.selfie_verified_at && levelData.face_match_score >= 70) {
    console.log('[verify-user-docs] Level 3 already verified');
    return;
  }

  // Get document URL for face matching
  const rawDocumentUrl = levelData.document_front_url || levelData.driver_license_url;
  if (!rawDocumentUrl) {
    console.error('[verify-user-docs] No document photo available for face matching');
    return;
  }

  try {
    console.log('[verify-user-docs] Calling face verification for user:', userId);

    // Call Cloudflare Worker for face verification
    const faceVerifyUrl = DOC_VERIFIER_URL
      ? DOC_VERIFIER_URL.replace(/\/$/, '') + '/verify-face'
      : null;

    if (!faceVerifyUrl) {
      console.log('[verify-user-docs] DOC_VERIFIER_URL not configured, skipping face verification');
      return;
    }

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (DOC_VERIFIER_TOKEN) {
      headers.Authorization = `Bearer ${DOC_VERIFIER_TOKEN}`;
    }

    const selfieUrl = await ensureSignedUrl(adminClient, levelData.selfie_url);
    const documentUrl = await ensureSignedUrl(adminClient, rawDocumentUrl);

    if (!selfieUrl || !documentUrl) {
      console.error('[verify-user-docs] Unable to generate signed URLs for face verification');
      return;
    }

    const response = await fetch(faceVerifyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        video_url: selfieUrl,
        document_url: documentUrl,
        user_id: userId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[verify-user-docs] Face verification error:', errorText);
      return;
    }

    const result = await response.json();

    if (!result.success) {
      console.error('[verify-user-docs] Face verification failed:', result.error);
      return;
    }

    console.log('[verify-user-docs] Face verification result:', {
      face_match_score: result.face_match_score,
      liveness_score: result.liveness_score,
    });

    // Update user_identity_levels with results
    const updates: Record<string, unknown> = {
      face_match_score: result.face_match_score,
      liveness_score: result.liveness_score || null,
      updated_at: new Date().toISOString(),
    };

    // Mark as verified if score is good (>= 70%)
    if (result.face_match_score >= 70) {
      updates.selfie_verified_at = new Date().toISOString();
      console.log('[verify-user-docs] ✅ Level 3 face verification PASSED');
    } else {
      console.log('[verify-user-docs] ❌ Level 3 face verification score too low:', result.face_match_score);
    }

    await adminClient
      .from('user_identity_levels')
      .update(updates)
      .eq('user_id', userId);

    console.log('[verify-user-docs] Level 3 verification results saved');
  } catch (error) {
    console.error('[verify-user-docs] Error in Level 3 face verification:', error);
  }
}
