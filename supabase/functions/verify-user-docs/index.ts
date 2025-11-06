/**
 * Supabase Edge Function: verify-user-docs
 *
 * Dispara la verificación automática de documentación (licencia, DNI, cédula verde) utilizando
 * un servicio externo basado en ONNX. Cuando no hay modelo configurado, valida con reglas
 * básicas y deja el estado en pendiente.
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DOC_VERIFIER_URL = Deno.env.get('DOC_VERIFIER_URL');
const DOC_VERIFIER_TOKEN = Deno.env.get('DOC_VERIFIER_TOKEN');

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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
    .select('id, full_name, role, is_driver_verified, kyc')
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
    profileUpdates.is_driver_verified = driverResult.status === 'VERIFICADO';
    if (docByKind['driver_license']) {
      updates.push(
        adminClient
          .from('user_documents')
          .update({
            status: mapStatusToKyc(driverResult.status),
            notes: driverResult.notes ?? docByKind['driver_license'].notes ?? null,
          })
          .eq('id', docByKind['driver_license'].id),
      );
    }
  }

  const ownerResult = results.find((result) => result.role === 'owner');
  if (ownerResult) {
    profileUpdates.kyc =
      ownerResult.status === 'VERIFICADO'
        ? 'verified'
        : ownerResult.status === 'RECHAZADO'
        ? 'rejected'
        : 'pending';

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

  if (Object.keys(profileUpdates).length > 0) {
    updates.push(adminClient.from('profiles').update(profileUpdates).eq('id', userId));
  }

  await Promise.all(updates).catch((error) => {
    console.error('[verify-user-docs] error persisting results:', error);
  });

  // After Level 2 verification, check if we should process Level 3 (face verification)
  // Run asynchronously to not block the response
  evaluateLevel3FaceVerification(adminClient, userId).catch((error) => {
    console.error('[verify-user-docs] Level 3 evaluation error:', error);
  });

  return new Response(JSON.stringify(results, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});

async function buildSignedDocuments(
  adminClient: ReturnType<typeof createClient>,
  documents: DocumentRecord[],
) {
  const signed: Array<Record<string, unknown>> = [];
  for (const doc of documents) {
    const { data, error } = await adminClient.storage
      .from('documents')
      .createSignedUrl(doc.storage_path, 60 * 60);

    if (error || !data?.signedUrl) {
      console.warn('[verify-user-docs] Could not create signed URL for', doc.id, error);
      continue;
    }

    signed.push({
      id: doc.id,
      kind: doc.kind,
      status: doc.status,
      url: data.signedUrl,
      created_at: doc.created_at,
    });
  }
  return signed;
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
  const missing: string[] = [];
  const licenseDoc = docs['driver_license'];

  if (!licenseDoc) {
    missing.push('licencia');
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
        if (typeof item === 'string' && !missing.includes(item)) {
          missing.push(item);
        }
      });
    }
  } else if (!DOC_VERIFIER_URL && missing.length === 0) {
    // Auto-aprobar en entornos de desarrollo sin verificador externo.
    status = 'VERIFICADO';
    notes = 'Validación automática (modo desarrollo).';
  }

  if (missing.length > 0 && status === 'VERIFICADO') {
    status = 'PENDIENTE';
  }

  return {
    user_id: userId,
    role: 'driver',
    status,
    missing_docs: missing,
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

  if (!docs['gov_id_front'] && !docs['gov_id_back']) {
    missing.add('dni');
  }

  if (!docs['vehicle_registration']) {
    missing.add('cedula_auto');
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
          missing.add(item);
        }
      });
    }
  } else if (!DOC_VERIFIER_URL && missing.size === 0) {
    status = 'VERIFICADO';
    notes = 'Validación automática (modo desarrollo).';
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
  const documentUrl = levelData.document_front_url || levelData.driver_license_url;
  if (!documentUrl) {
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

    const response = await fetch(faceVerifyUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        video_url: levelData.selfie_url,
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
