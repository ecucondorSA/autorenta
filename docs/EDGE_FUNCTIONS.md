# PROMPT PARA GEMINI - EDGE_FUNCTIONS.md

## Objetivo
Documentar todas las 69 Edge Functions de Supabase en Autorenta.

## Instrucciones para Gemini

Analiza TODAS las Edge Functions:

### Archivos a analizar:
1. `supabase/functions/*/index.ts` - TODAS las funciones (69)
2. `supabase/functions/_shared/**` - Codigo compartido
3. `supabase/config.toml` - Configuracion

### Secciones requeridas:

```markdown
# Edge Functions Reference

## Resumen
Total: 69 funciones
Categorias: [Listar categorias]

## Configuracion Global

### Variables de entorno requeridas
[Listar TODAS las env vars usadas en las funciones]

### Shared utilities
[Documentar _shared/ si existe]

## Categoria: MercadoPago (15 funciones)

### mp-create-preference
- **Endpoint**: POST /functions/v1/mp-create-preference
- **Proposito**: [Descripcion]
- **Input**:
```json
{
  // Schema del request
}
```
- **Output**:
```json
{
  // Schema del response
}
```
- **Errores posibles**: [Lista]

### mp-webhook
[Mismo formato]

### mp-oauth-callback
[Mismo formato]

[... todas las funciones mp-*]

## Categoria: Wallet (X funciones)

### wallet-deposit
[Documentar]

### wallet-withdraw
[Documentar]

[... todas las funciones wallet-*]

## Categoria: AI/Gemini (X funciones)

### gemini-document-analyzer
- **Proposito**: Analizar documentos de verificacion KYC
- **Input**: [Schema]
- **Output**: [Schema]
- **Modelo usado**: [gemini-pro-vision o similar]

### damage-analysis
[Documentar]

### car-image-generator
[Documentar]

## Categoria: Bookings (X funciones)

[Todas las funciones relacionadas a bookings]

## Categoria: Notifications (X funciones)

[Todas las funciones de notificaciones]

## Categoria: Admin (X funciones)

[Funciones administrativas]

## Categoria: Cron Jobs (X funciones)

### Funciones programadas
[Listar funciones que corren en schedule]

## Categoria: Otros

[Funciones que no encajan en otras categorias]

## Autenticacion

### Funciones publicas (sin auth)
[Lista]

### Funciones que requieren JWT
[Lista]

### Funciones admin-only
[Lista]

## Rate Limiting

[Si hay rate limiting configurado]

## Logs y Debugging

### Como ver logs
[Comandos]

### Errores comunes
[Lista con soluciones]

## Testing Local

### Correr funciones localmente
[Comandos]

### Invocar funciones
[Ejemplos con curl]
```

### Formato de salida:
- Una seccion por cada funcion
- Input/Output schemas reales del codigo
- Ejemplos de curl para invocar
- Maximo 1000 lineas
