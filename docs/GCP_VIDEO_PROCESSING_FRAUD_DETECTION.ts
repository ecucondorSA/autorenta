// video-processing-service/index.ts (Cloud Run)
// Este código se ejecuta en GCP cuando llega un video

import { Gemini } from '@google-cloud/vertexai';

interface FraudDetection {
  suspicious: boolean;
  confidence: number;
  reasons: string[];
  requiresManualReview: boolean;
  detectedTechniques: string[];
}

interface DamageAnalysisResult {
  damages: DetectedDamage[];
  fraudDetection: FraudDetection;
  summary: string;
  overallConfidence: number;
}

async function analyzeInspectionVideo(videoPath: string): Promise<DamageAnalysisResult> {
  const gemini = new Gemini({ model: 'gemini-2.0-flash-exp' });
  
  // Prompt optimizado para detectar fraude
  const prompt = `
# ANÁLISIS DE INSPECCIÓN VEHICULAR

Analiza este video de inspección de un vehículo de alquiler.

## TAREA 1: DETECCIÓN DE DAÑOS
Identifica todos los daños visibles:
- Rayones (scratches)
- Abolladuras (dents)
- Luces rotas (broken_lights)
- Desgaste de llantas (tire_wear)
- Daños en interiores (interior_damage)

Para cada daño detectado, proporciona:
- tipo: tipo de daño
- ubicación: parte específica del auto (e.g., "front-left-door", "rear-bumper")
- severidad: "minor", "moderate", "severe"
- timestamp: segundo exacto en el video donde se ve
- descripción: breve descripción
- confianza: 0.0 a 1.0

## TAREA 2: DETECCIÓN DE FRAUDE (CRÍTICO)
Analiza el comportamiento de la persona grabando:

### SEÑALES DE ALERTA:
1. **Evasión de áreas**: ¿La cámara evita deliberadamente ciertas zonas?
2. **Objetos sospechosos**: ¿Hay objetos tapando partes del auto (trapos, bolsas, manos)?
3. **Ángulos raros**: ¿La cámara usa ángulos extraños para evitar mostrar algo?
4. **Velocidad sospechosa**: ¿Se mueve muy rápido sobre ciertas áreas?
5. **Iluminación manipulada**: ¿Usa poca luz para ocultar daños?
6. **Edición de video**: ¿Hay cortes o saltos sospechosos?
7. **Obstrucciones**: ¿Hay suciedad, barro o mugre convenientemente ubicada?

### COMPARACIÓN CON ESTÁNDARES:
- ¿El video muestra TODO el auto en 360°?
- ¿Se ven claramente: 4 puertas, capó, techo, cajuela, 4 llantas, luces?
- ¿La iluminación es suficiente para ver detalles?
- ¿El video dura al menos 90 segundos? (mínimo requerido)

## FORMATO DE RESPUESTA JSON:
\`\`\`json
{
  "damages": [
    {
      "id": "dmg_1",
      "type": "scratch",
      "location": "front-left-door",
      "severity": "minor",
      "timestamp": 15.2,
      "description": "Rayón horizontal de 10cm aprox",
      "confidence": 0.92,
      "estimatedCostUsd": 50
    }
  ],
  "fraudDetection": {
    "suspicious": true,
    "confidence": 0.85,
    "reasons": [
      "La cámara evita deliberadamente el parachoques trasero",
      "Movimiento muy rápido al pasar por puerta trasera derecha",
      "Hay una mano tapando parte de la puerta durante 3 segundos (timestamp 32-35)"
    ],
    "requiresManualReview": true,
    "detectedTechniques": ["area_avoidance", "hand_obstruction", "fast_movement"],
    "missingCoverage": ["rear-bumper", "trunk-lid"],
    "videoDuration": 67,
    "recommendedAction": "REJECT_AND_REQUEST_NEW_VIDEO"
  },
  "summary": "Se detectaron 2 daños menores. ALERTA: Comportamiento sospechoso detectado - el video evita mostrar el parachoques trasero.",
  "overallConfidence": 0.88
}
\`\`\`

## REGLAS DE DECISIÓN:
- Si \`fraudDetection.confidence > 0.7\` → marcar como sospechoso
- Si \`missingCoverage.length > 0\` → rechazar inspección
- Si \`videoDuration < 90\` → rechazar inspección (muy corto)
- Si \`detectedTechniques\` incluye más de 2 técnicas → revisión manual obligatoria

Analiza el video ahora:
  `;

  const response = await gemini.generateContent({
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { 
            fileData: {
              mimeType: 'video/mp4',
              fileUri: videoPath
            }
          }
        ]
      }
    ]
  });

  const result = JSON.parse(response.text) as DamageAnalysisResult;
  
  // Validaciones adicionales
  if (result.fraudDetection.suspicious && result.fraudDetection.confidence > 0.7) {
    // Enviar alerta a equipo de soporte
    await sendFraudAlert({
      videoPath,
      reasons: result.fraudDetection.reasons,
      confidence: result.fraudDetection.confidence
    });
  }
  
  return result;
}

async function sendFraudAlert(data: {
  videoPath: string;
  reasons: string[];
  confidence: number;
}) {
  // Notificar a Supabase + Email a admin
  await fetch('https://YOUR_SUPABASE_URL/functions/v1/fraud-alert', {
    method: 'POST',
    body: JSON.stringify({
      type: 'video_inspection_fraud',
      severity: data.confidence > 0.85 ? 'high' : 'medium',
      details: data
    })
  });
}

export { analyzeInspectionVideo };
