# Soluciones para el Error de Cuota de Gemini

## 🔴 Problema Actual
```
Error 429: You exceeded your current quota
- Modelo: gemini-2.5-pro
- Límite Free Tier: 2 requests/minuto
- Estado: RESOURCE_EXHAUSTED
```

## ✅ Solución 1: Usar Modelo con Mayor Cuota (RECOMENDADO)

Cambia de `gemini-2.5-pro` a `gemini-1.5-flash` que tiene límites más generosos:

```bash
# En tu archivo de configuración o script de Gemini
# Cambiar de:
model: "gemini-2.5-pro"

# A:
model: "gemini-1.5-flash"
```

**Límites de gemini-1.5-flash (Free Tier):**
- 15 RPM (requests por minuto)
- 1,000,000 TPM (tokens por minuto)
- 1,500 RPD (requests por día)

## ✅ Solución 2: Implementar Rate Limiting

Añade delays entre las llamadas:

```typescript
// Ejemplo de implementación
async function callGeminiWithRateLimit(prompt: string) {
  const DELAY_MS = 30000; // 30 segundos entre llamadas
  
  const result = await callGemini(prompt);
  await new Promise(resolve => setTimeout(resolve, DELAY_MS));
  
  return result;
}
```

## ✅ Solución 3: Actualizar a Plan de Pago

Si necesitas usar `gemini-2.5-pro` con límites más altos:

1. Ve a: https://ai.google.dev/pricing
2. Activa el billing en tu proyecto de Google Cloud
3. Límites con pago:
   - 1,000 RPM (requests por minuto)
   - 4,000,000 TPM (tokens por minuto)

## ✅ Solución 4: Usar Múltiples API Keys (Multi-Account)

Rota entre diferentes API keys:

```typescript
const API_KEYS = [
  process.env.GEMINI_KEY_1,
  process.env.GEMINI_KEY_2,
  process.env.GEMINI_KEY_3
];

let currentKeyIndex = 0;

function getNextApiKey() {
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return API_KEYS[currentKeyIndex];
}
```

## 🎯 Acción Inmediata Recomendada

### Opción A: Cambiar a gemini-1.5-flash (Gratis, Rápido)

```bash
# 1. Encuentra tu configuración de Gemini
find /home/edu/autorenta -name "*.json" -o -name "*.config.*" | xargs grep -l "gemini-2.5-pro"

# 2. Reemplaza el modelo
sed -i 's/gemini-2\.5-pro/gemini-1.5-flash/g' <archivo_de_config>

# 3. O actualiza la variable de entorno
export GEMINI_MODEL="gemini-1.5-flash"
```

### Opción B: Esperar y Reintentar (Temporal)

El error indica que debes esperar **~14-57 segundos** antes de reintentar.

```bash
# Espera 60 segundos y reintenta
sleep 60
# Vuelve a ejecutar tu comando de Gemini
```

## 📊 Monitoreo de Uso

Verifica tu uso actual en:
- https://ai.dev/usage?tab=rate-limit
- https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

## 🔍 Verificar Configuración Actual

```bash
# Ver qué modelo estás usando
cat /home/edu/autorenta/.env | grep GEMINI
cat /home/edu/autorenta/gemini.md
grep -r "gemini-2.5-pro" /home/edu/autorenta --include="*.ts" --include="*.js" --include="*.json"
```

## 📝 Nota Técnica

El free tier de `gemini-2.5-pro` es muy restrictivo (solo 2 RPM). Para desarrollo activo, considera:

1. **Desarrollo:** `gemini-1.5-flash` (gratis, 15 RPM)
2. **Producción:** `gemini-2.5-pro` con billing activado
3. **Testing:** Usa mocks o respuestas cacheadas
