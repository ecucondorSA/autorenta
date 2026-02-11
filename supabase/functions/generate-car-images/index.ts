import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.9.1/mod.ts";

// Configuración
// El usuario debe configurar estas variables en Supabase Secrets
const GOOGLE_PROJECT_ID = Deno.env.get("GOOGLE_CLOUD_PROJECT_ID");
const GOOGLE_LOCATION = Deno.env.get("GOOGLE_CLOUD_LOCATION") || "us-central1";
// El JSON completo de la Service Account minificado en una sola línea
const GOOGLE_SERVICE_ACCOUNT_JSON = Deno.env.get("GOOGLE_SERVICE_ACCOUNT"); 

serve(async (req) => {
  // Manejo de CORS (Permite localhost y dominios de producción)
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { brand, model, year, color, setting } = await req.json();

    if (!brand || !model) {
      throw new Error("Marca y Modelo son requeridos");
    }

    // Prompt Optimizado para Fotografía Automotriz
    const prompt = `Professional automotive photography of a ${year} ${brand} ${model}, ${color} paint, parked in a ${setting || "modern architectural setting"}, natural lighting, 8k resolution, highly detailed, photorealistic, cinematic angle, commercial car advertisement style.`;

    console.log(`[Google AI] Generando imagen para: ${brand} ${model}`);

    let imageUrls: string[] = [];
    let isMock = true;

    // Verificar si tenemos credenciales reales configuradas
    if (GOOGLE_PROJECT_ID && GOOGLE_SERVICE_ACCOUNT_JSON) {
      isMock = false;
      try {
        const serviceAccount = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
        const accessToken = await getAccessToken(serviceAccount);

        const endpoint = `https://${GOOGLE_LOCATION}-aiplatform.googleapis.com/v1/projects/${GOOGLE_PROJECT_ID}/locations/${GOOGLE_LOCATION}/publishers/google/models/imagegeneration@006:predict`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8'
          },
          body: JSON.stringify({
            instances: [
              { prompt: prompt }
            ],
            parameters: {
              sampleCount: 3, // Generar 3 variaciones
              aspectRatio: "4:3",
              personGeneration: "allow_adult", // Opcional, dependiendo de la política
            }
          })
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Google AI API Error (${response.status}): ${errorText}`);
        }

        const data = await response.json();
        
        if (data.predictions) {
          // Las imágenes vienen en base64 raw, añadimos el prefijo para el frontend
          imageUrls = data.predictions.map((p: any) => `data:image/png;base64,${p.bytesBase64Encoded}`);
        } else {
          console.error("Respuesta inesperada de Google:", data);
          throw new Error("Google AI no devolvió predicciones.");
        }

      } catch (authError) {
        console.error("Error de autenticación o API de Google:", authError);
        // Si falla la API real, lanzamos el error para que el usuario sepa que debe revisar sus keys
        throw authError; 
      }
    } else {
      // MOCK MODE: Si faltan las keys
      console.log("⚠️ Modo Mock: Faltan credenciales (GOOGLE_CLOUD_PROJECT_ID o GOOGLE_SERVICE_ACCOUNT).");
      await new Promise(r => setTimeout(r, 1500)); // Simular latencia de red
      imageUrls = [
        `https://placehold.co/800x600/1e1e1e/FFF?text=${brand}+${model}+Front`,
        `https://placehold.co/800x600/1e1e1e/FFF?text=${brand}+${model}+Side`,
        `https://placehold.co/800x600/1e1e1e/FFF?text=${brand}+${model}+Interior`
      ];
    }

    return new Response(
      JSON.stringify({
        success: true, 
        images: imageUrls,
        mock: isMock 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("Error en function:", error);
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to generate images' }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/**
 * Genera un Access Token de Google usando la Service Account (JWT Flow)
 * Sin dependencias pesadas de npm, usando 'djwt' nativo de Deno.
 */
async function getAccessToken(serviceAccount: any): Promise<string> {
  const algorithm = { name: "RS256", hash: "SHA-256" };
  
  // Importar la llave privada
  // Nota: Deno web crypto es estricto con el formato PEM
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  
  // Limpiar la clave del JSON (a veces trae \n literales)
  let pemContents = serviceAccount.private_key;
  if (!pemContents.includes(pemHeader)) {
     // Si el JSON viene raro, intentar arreglarlo, pero usualmente Google lo da bien
  }
  
  // Para djwt, necesitamos importar la key primero
  // Simplificación: usaremos una función fetch directa a oauth2 con JWT firmado
  
  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: getNumericDate(0),
    exp: getNumericDate(60 * 60), // 1 hora
    scope: "https://www.googleapis.com/auth/cloud-platform"
  };

  const header = { alg: "RS256", typ: "JWT", kid: serviceAccount.private_key_id };
  
  // Import key for signing
  const key = await importKey(serviceAccount.private_key);
  
  // Sign JWT
  const jwt = await create(header, payload, key);

  // Exchange JWT for Access Token
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResp.json();
  
  if (!tokenResp.ok) {
    throw new Error(`Error obteniendo token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

// Helper para importar la private key (PEM string) a CryptoKey
async function importKey(pem: string): Promise<CryptoKey> {
  // Eliminar headers/footers y saltos de línea para obtener solo el b64
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
    
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  
  return await crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
}
