/**
 * Verify Document Edge Function
 *
 * Uses Google Cloud Vision API for OCR and validates
 * Argentina/Ecuador identity documents and driver's licenses.
 *
 * Endpoints:
 * POST /verify-document
 *   Body: { image_url, document_type, side, country, user_id }
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import { getCorsHeaders } from '../_shared/cors.ts';
import { callVisionApi, OcrResult } from '../_shared/vision-api.ts';
import { validateArgentinaDocument, DocumentValidationResult as ArgentinaResult } from '../_shared/validators/argentina.ts';
import { validateEcuadorDocument, DocumentValidationResult as EcuadorResult } from '../_shared/validators/ecuador.ts';
import { initSentry, captureError } from '../_shared/sentry.ts';

// Types
type DocumentType = 'dni' | 'license';
type DocumentSide = 'front' | 'back';
type Country = 'AR' | 'EC';

interface VerifyDocumentRequest {
  image_url?: string;
  image_base64?: string;
  document_type: DocumentType;
  side: DocumentSide;
  country: Country;
  user_id: string;
}

interface VerifyDocumentResponse {
  success: boolean;
  ocr_confidence: number;
  validation: ArgentinaResult | EcuadorResult;
  extracted_data: Record<string, unknown>;
  errors: string[];
  warnings: string[];
}

// Environment
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// =============================================================================
// MAIN HANDLER
// =============================================================================

serve(async (req: Request) => {
  // Initialize Sentry for error tracking
  const sentry = initSentry('verify-document');
  
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Parse request with error handling
    let payload: VerifyDocumentRequest;
    try {
      payload = await req.json();
    } catch (parseError) {
      console.error('[verify-document] Failed to parse request body:', parseError);
      return new Response(
        JSON.stringify({
          error: 'INVALID_REQUEST',
          message: 'El cuerpo de la solicitud no es un JSON válido'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image_url, image_base64, document_type, side, country, user_id } = payload;

    // Validate required fields
    if ((!image_url && !image_base64) || !document_type || !side || !country || !user_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: (image_url OR image_base64), document_type, side, country, user_id'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate enum values
    if (!['dni', 'license'].includes(document_type)) {
      return new Response(
        JSON.stringify({ error: 'document_type must be "dni" or "license"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['front', 'back'].includes(side)) {
      return new Response(
        JSON.stringify({ error: 'side must be "front" or "back"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['AR', 'EC'].includes(country)) {
      return new Response(
        JSON.stringify({ error: 'country must be "AR" or "EC"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-document] Processing ${country} ${document_type} ${side} for user ${user_id}`);

    // Step 1: Call Vision API for OCR with retry logic
    let ocrResult: OcrResult;
    const maxRetries = 3;
    let lastError: Error | unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Prefer base64 if available (more reliable), fallback to URL
        const imageSource = image_base64
          ? { base64: image_base64 }
          : image_url!;

        console.log(`[verify-document] OCR attempt ${attempt}/${maxRetries} for user ${user_id}`);
        ocrResult = await callVisionApi(imageSource);
        console.log(`[verify-document] OCR completed. Text length: ${ocrResult.text.length}, Face detected: ${ocrResult.hasFace}`);
        lastError = null;
        break; // Success, exit retry loop
      } catch (ocrError) {
        lastError = ocrError;
        console.error(`[verify-document] OCR attempt ${attempt}/${maxRetries} failed:`, ocrError);

        // Don't retry on certain errors (invalid image, auth errors)
        if (ocrError instanceof Error) {
          const errorMsg = ocrError.message.toLowerCase();
          if (errorMsg.includes('invalid') || errorMsg.includes('auth') || errorMsg.includes('permission')) {
            console.error('[verify-document] Non-retryable error detected, aborting retries');
            break;
          }
        }

        // Wait before retry (exponential backoff)
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Max 5s
          console.log(`[verify-document] Retrying in ${delayMs}ms...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }

    // If all retries failed
    if (lastError || !ocrResult!) {
      const errorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
      console.error('[verify-document] OCR failed after all retries:', errorMessage);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'OCR_FAILED',
          message: 'No se pudo procesar la imagen después de varios intentos. Por favor, intenta con una foto más clara y asegúrate de que el documento esté completo y bien iluminado.',
          details: errorMessage,
          retries: maxRetries
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Validate document based on country
    let validation: ArgentinaResult | EcuadorResult;

    if (country === 'AR') {
      validation = validateArgentinaDocument(ocrResult.text, document_type, side);
    } else {
      validation = validateEcuadorDocument(ocrResult.text, document_type, side);
    }

    // SECURITY: Hard Gate for Expired Documents
    // If the document is expired, it must be rejected immediately regardless of other checks.
    if (validation.extracted.expiryDate) {
      // Parse date format: DD/MM/YYYY or YYYY-MM-DD
      const expiryStr = String(validation.extracted.expiryDate).trim();
      let expiryDate: Date | null = null;
      
      // Try parsing DD/MM/YYYY
      const dmyParts = expiryStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (dmyParts) {
        expiryDate = new Date(parseInt(dmyParts[3]), parseInt(dmyParts[2]) - 1, parseInt(dmyParts[1]));
      } else {
        // Try standard date parsing
        const parsed = new Date(expiryStr);
        if (!isNaN(parsed.getTime())) {
          expiryDate = parsed;
        }
      }

      if (expiryDate) {
        // Reset time to start of day for fair comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (expiryDate < today) {
          console.warn(`[verify-document] REJECTED: Document expired on ${expiryStr} for user ${user_id}`);
          validation.isValid = false;
          validation.errors.push(`El documento vencio el ${expiryStr}`);
          validation.confidence = 0; // Force rejection score
        }
      }
    }

    // Add face detection bonus for front documents
    if (side === 'front' && ocrResult.hasFace) {
      validation.confidence = Math.min(validation.confidence + 10, 100);
    } else if (side === 'front' && !ocrResult.hasFace && document_type === 'dni') {
      validation.warnings.push('No se detecto rostro en el documento');
    }

    console.log(`[verify-document] Validation result: valid=${validation.isValid}, confidence=${validation.confidence}`);

    // Step 3: Update database with results
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Determine which fields to update based on document type and side
    const updateData = buildUpdateData(validation, document_type, side, country, ocrResult);

    // Update user_identity_levels table
    const { error: updateError } = await supabase
      .from('user_identity_levels')
      .upsert({
        user_id,
        ...updateData,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id',
      });

    if (updateError) {
      console.error('[verify-document] Database update failed:', updateError);
      // Don't fail the request, just log the error
      validation.warnings.push('No se pudieron guardar los datos extraidos');
    }

    // Also update user_documents table for audit trail
    await updateDocumentRecord(supabase, user_id, document_type, side, country, validation, ocrResult);

    // IMPORTANT: For DNI front with high confidence, auto-update profile and lock identity
    if (document_type === 'dni' && side === 'front' && validation.confidence >= 70) {
      console.log(`[verify-document] Auto-verification triggered. Updating profile for user ${user_id}`);

      // Parse birth date if present
      let birthDate: string | null = null;
      if (validation.extracted.birthDate) {
        // Convert DD/MM/YYYY to YYYY-MM-DD
        const dateStr = validation.extracted.birthDate as string;
        const parts = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
        if (parts) {
          birthDate = `${parts[3]}-${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
        }
      }

      const profileUpdateResult = await supabase.rpc('update_profile_from_ocr', {
        p_user_id: user_id,
        p_full_name: validation.extracted.fullName as string || null,
        p_date_of_birth: birthDate,
        p_document_number: validation.extracted.documentNumber as string || null,
        p_country: country,
        p_ocr_confidence: validation.confidence,
      });

      if (profileUpdateResult.error) {
        console.error('[verify-document] Failed to update profile:', profileUpdateResult.error);
        validation.warnings.push('Datos verificados pero no se pudo actualizar el perfil');
      } else if (profileUpdateResult.data?.success) {
        console.log(`[verify-document] Profile updated and locked for user ${user_id}`);
        // Mark as auto-verified
        validation.warnings.push('Identidad verificada automaticamente. Los datos del perfil han sido actualizados.');
      } else if (profileUpdateResult.data?.error === 'ALREADY_LOCKED') {
        console.log(`[verify-document] Profile already locked for user ${user_id}`);
      }
    }

    // Build response
    const response: VerifyDocumentResponse = {
      success: validation.isValid,
      ocr_confidence: ocrResult.confidence,
      validation,
      extracted_data: validation.extracted,
      errors: validation.errors,
      warnings: validation.warnings,
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[verify-document] Unexpected error:', error);
    
    // Capture error in Sentry
    if (sentry) {
      captureError(error instanceof Error ? error : new Error(String(error)), {
        context: 'verify-document-handler',
      });
    }
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Build update data for user_identity_levels based on validation result
 */
function buildUpdateData(
  validation: ArgentinaResult | EcuadorResult,
  documentType: DocumentType,
  side: DocumentSide,
  country: Country,
  ocrResult: OcrResult
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    country,
  };

  const extracted = validation.extracted;

  // Common fields
  if (extracted.documentNumber) {
    data.document_number = extracted.documentNumber;
  }

  if (extracted.fullName) {
    data.extracted_full_name = extracted.fullName;
  }

  if (extracted.birthDate) {
    data.extracted_birth_date = extracted.birthDate;
  }

  if (extracted.gender) {
    data.extracted_gender = extracted.gender;
  }

  // DNI-specific fields
  if (documentType === 'dni') {
    if (side === 'front') {
      data.document_type = country === 'AR' ? 'DNI' : 'CEDULA';
      data.document_ai_score = validation.confidence;

      if (validation.isValid) {
        const now = new Date().toISOString();
        data.document_verified_at = now;
        // FIX: Also set id_verified_at for get_verification_progress compatibility
        data.id_verified_at = now;
      }
    }

    // Argentina-specific
    if (country === 'AR' && 'cuil' in extracted && extracted.cuil) {
      data.cuil = extracted.cuil;
    }

    // Ecuador-specific
    if (country === 'EC' && 'province' in extracted && extracted.province) {
      data.document_province = extracted.province;
    }
  }

  // License-specific fields
  if (documentType === 'license') {
    if (extracted.categories) {
      data.driver_license_categories = extracted.categories;
    }

    if (extracted.expiryDate) {
      data.driver_license_expiry = extracted.expiryDate;
    }

    if (extracted.isProfessional !== undefined) {
      data.driver_license_professional = extracted.isProfessional;
    }

    if (side === 'front') {
      data.driver_license_ai_score = validation.confidence;

      if (validation.isValid) {
        data.driver_license_verified_at = new Date().toISOString();
      }
    }

    // Ecuador points
    if (country === 'EC' && 'points' in extracted && extracted.points !== undefined) {
      data.driver_license_points = extracted.points;
    }
  }

  // OCR metadata
  data.last_ocr_text_preview = ocrResult.text.substring(0, 500);
  data.last_ocr_confidence = ocrResult.confidence;
  data.last_ocr_has_face = ocrResult.hasFace;
  data.last_ocr_face_confidence = ocrResult.faceConfidence;

  return data;
}

/**
 * Update user_documents table for audit trail
 */
async function updateDocumentRecord(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  documentType: DocumentType,
  side: DocumentSide,
  country: Country,
  validation: ArgentinaResult | EcuadorResult,
  ocrResult: OcrResult
): Promise<void> {
  try {
    // Map to document_kind enum
    let kind: string;
    if (documentType === 'dni') {
      kind = country === 'AR'
        ? (side === 'front' ? 'gov_id_front' : 'gov_id_back')
        : (side === 'front' ? 'gov_id_front' : 'gov_id_back');
    } else {
      kind = side === 'front' ? 'license_front' : 'license_back';
    }

    const status = validation.isValid ? 'verified' : 'pending';

    await supabase
      .from('user_documents')
      .upsert({
        user_id: userId,
        kind,
        status,
        analyzed_at: new Date().toISOString(),
        notes: validation.errors.length > 0
          ? validation.errors.join('; ')
          : (validation.warnings.length > 0 ? validation.warnings.join('; ') : null),
        metadata: {
          country,
          ocr_confidence: ocrResult.confidence,
          validation_confidence: validation.confidence,
          extracted: validation.extracted,
          has_face: ocrResult.hasFace,
          face_confidence: ocrResult.faceConfidence,
        }
      }, {
        onConflict: 'user_id,kind',
      });
  } catch (error) {
    console.error('[verify-document] Failed to update user_documents:', error);
    // Don't throw, this is just audit data
  }
}
