import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";
import { fromRequest } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const log = fromRequest(req).child('verify-bounty-photo');

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { claim_id } = await req.json();

    // 1. Obtener Datos del Claim y del Auto
    const { data: claim, error: claimError } = await supabase
      .from('bounty_claims')
      .select(`
        *,
        bounties (
          car_id,
          target_location,
          cars (
            brand, model, color, license_plate
          )
        )
      `)
      .eq('id', claim_id)
      .single();

    if (claimError || !claim) {
      log.warn('Claim not found', { claim_id });
      throw new Error('Claim not found');
    }

    const car = claim.bounties.cars;
    const carDescription = `${car.color} ${car.brand} ${car.model}`;
    const targetPlate = car.license_plate;

    // 2. Descargar la Imagen
    const { data: imageBlob, error: imageError } = await supabase.storage
      .from('evidence')
      .download(claim.photo_url);

    if (imageError) throw new Error('Image download failed');

    // 3. Invocar Gemini Vision
    const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
      You are an automated license plate verification system.
      Task: Verify if the car in the image matches the target description and license plate.
      
      Target Car: ${carDescription}
      Target Plate: ${targetPlate}
      
      Analyze the image strictly.
      Return a JSON object:
      {
        "is_car_visible": boolean,
        "car_match_description": boolean, (Is it roughly the same model/color?)
        "plate_visible": boolean,
        "plate_read": string (The text you see on the plate, or null),
        "plate_match_confidence": number (0.0 to 1.0),
        "verdict": "MATCH" | "MISMATCH" | "UNCLEAR"
      }
    `;

    const imageParts = [
      {
        inlineData: {
          data: await blobToBase64(imageBlob),
          mimeType: "image/jpeg",
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON safely (handling markdown blocks)
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const analysis = JSON.parse(jsonString);

    // 4. Lógica de Decisión
    let finalStatus = 'REJECTED';
    let rejectionReason = null;

    if (analysis.verdict === 'MATCH' && analysis.plate_match_confidence > 0.85) {
      finalStatus = 'APPROVED';
    } else if (analysis.verdict === 'MISMATCH') {
      rejectionReason = 'Vehicle mismatch identified by AI';
    } else {
      finalStatus = 'PENDING_MANUAL_REVIEW'; // No rechazamos, pero no pagamos auto
    }

    // 5. Actualizar Claim
    await supabase
      .from('bounty_claims')
      .update({
        ai_verification_json: analysis,
        is_verified: finalStatus === 'APPROVED',
        status: finalStatus === 'APPROVED' ? 'APPROVED' : 'PENDING', // Pending si es manual
        rejection_reason: rejectionReason,
        confidence_score: analysis.plate_match_confidence
      })
      .eq('id', claim_id);

    // 6. Si es Aprobado, Disparar Pago (Placeholder)
    if (finalStatus === 'APPROVED') {
       // await capturePreAuth(claim.bounties.booking_id);
    }

    log.info('Bounty photo verified', { claim_id, finalStatus, confidence: analysis.plate_match_confidence });

    return new Response(
      JSON.stringify({ success: true, analysis, finalStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log.error('Bounty photo verification failed', error instanceof Error ? error : new Error(String(error)));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Helper
async function blobToBase64(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
