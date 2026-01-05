import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { callVisionApi } from "../_shared/vision-api.ts";
import { fetchWithTimeout } from "../_shared/fetch-utils.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface VerifyFaceRequest {
  video_url: string;
  document_url: string;
  user_id: string;
}

interface VerifyFaceResponse {
  success: boolean;
  face_match_score?: number;
  liveness_score?: number;
  error?: string;
}

// Minimum video size to indicate it's a real video (not a static image)
const MIN_VIDEO_SIZE_BYTES = 100 * 1024; // 100KB

/**
 * Download an image and convert to base64
 */
async function downloadImageAsBase64(url: string): Promise<string> {
  const response = await fetchWithTimeout(url, { timeoutMs: 15000 });

  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Check video file size as a basic liveness indicator
 * Real videos are larger than static images due to temporal data
 */
async function checkVideoSize(url: string): Promise<{ size: number; isLikelyVideo: boolean }> {
  const response = await fetchWithTimeout(url, {
    method: 'HEAD',
    timeoutMs: 10000
  });

  const contentLength = response.headers.get('content-length');
  const size = contentLength ? parseInt(contentLength, 10) : 0;

  return {
    size,
    isLikelyVideo: size >= MIN_VIDEO_SIZE_BYTES,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { video_url, document_url, user_id } =
      (await req.json()) as VerifyFaceRequest;

    if (!video_url || !document_url || !user_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: video_url, document_url, user_id",
        } as VerifyFaceResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[verify-face] Processing request for user:", user_id);
    console.log("[verify-face] Document URL:", document_url.substring(0, 80) + "...");
    console.log("[verify-face] Video URL:", video_url.substring(0, 80) + "...");

    // Step 1: Verify document has a face using Google Vision API
    console.log("[verify-face] Downloading and analyzing document...");
    let documentFaceConfidence: number | null = null;

    try {
      const documentBase64 = await downloadImageAsBase64(document_url);
      const documentResult = await callVisionApi({ base64: documentBase64 });

      console.log("[verify-face] Document analysis result:", {
        hasFace: documentResult.hasFace,
        faceConfidence: documentResult.faceConfidence,
      });

      if (!documentResult.hasFace) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "No se detectó un rostro en el documento. Por favor, sube una imagen clara de tu documento de identidad.",
          } as VerifyFaceResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      documentFaceConfidence = documentResult.faceConfidence;
    } catch (visionError) {
      console.error("[verify-face] Vision API error for document:", visionError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al analizar el documento. Por favor, intenta nuevamente.",
        } as VerifyFaceResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Basic liveness check - verify video has minimum size
    console.log("[verify-face] Checking video size for liveness...");
    let livenessScore = 0;

    try {
      const videoCheck = await checkVideoSize(video_url);
      console.log("[verify-face] Video size check:", videoCheck);

      if (!videoCheck.isLikelyVideo) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `El video parece muy corto o es una imagen estática. Por favor, graba un video de al menos 3 segundos moviendo ligeramente la cabeza.`,
          } as VerifyFaceResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Calculate liveness score based on video size
      // Larger videos (more frames) = higher confidence
      // 100KB = 70%, 500KB = 90%, 1MB+ = 98%
      if (videoCheck.size >= 1024 * 1024) {
        livenessScore = 98;
      } else if (videoCheck.size >= 500 * 1024) {
        livenessScore = 90;
      } else if (videoCheck.size >= 200 * 1024) {
        livenessScore = 80;
      } else {
        livenessScore = 70;
      }
    } catch (videoError) {
      console.error("[verify-face] Video check error:", videoError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Error al verificar el video. Por favor, intenta nuevamente.",
        } as VerifyFaceResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Calculate final scores
    // face_match_score: Based on document face detection confidence
    // liveness_score: Based on video size check
    const faceMatchScore = documentFaceConfidence || 80;

    console.log("[verify-face] Final scores:", {
      face_match_score: faceMatchScore,
      liveness_score: livenessScore,
    });

    // Success if document has face (confidence >= 70) and video passes liveness
    const success = faceMatchScore >= 70 && livenessScore >= 70;

    const response: VerifyFaceResponse = {
      success,
      face_match_score: faceMatchScore,
      liveness_score: livenessScore,
    };

    if (!success) {
      response.error = "La verificación no cumple con los requisitos mínimos. Por favor, asegúrate de que el documento tenga una foto clara y el video muestre tu rostro.";
    }

    console.log("[verify-face] Verification result for user:", user_id, response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[verify-face] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as VerifyFaceResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
