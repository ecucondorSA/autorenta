# PROMPT PARA GEMINI - PAYMENT_FLOWS.md

## Objetivo
Documentar todos los flujos de pago con MercadoPago en Autorenta.

## Instrucciones para Gemini

Analiza EXHAUSTIVAMENTE los siguientes archivos:

### Archivos a analizar:
1. `supabase/functions/mp-*/**` - TODAS las funciones de MercadoPago
2. `supabase/functions/mercadopago-*/**` - Funciones adicionales MP
3. `apps/web/src/app/core/services/payments/**` - Servicios de pago frontend
4. `apps/web/src/app/features/bookings/booking-detail-payment/**` - UI de pago
5. `apps/web/src/app/features/wallet/**` - Sistema de wallet
6. `supabase/migrations/*wallet*` - Migraciones de wallet
7. `supabase/migrations/*payment*` - Migraciones de pagos

### Secciones requeridas:

```markdown
# Payment Flows - MercadoPago Integration

## Resumen de Integracion
[Descripcion general de como funciona MP en Autorenta]

## Credenciales y Configuracion

### Variables de entorno
[Listar TODAS las variables MP_* encontradas]

### OAuth de Sellers
[Explicar flujo de conexion de owners con MP]

## Flujo 1: Pre-autorizacion de Garantia

### Diagrama de secuencia
[ASCII diagram: Usuario -> Frontend -> Edge Function -> MP API -> Webhook -> DB]

### Edge Functions involucradas
[Listar cada funcion con su proposito]

### Codigo relevante
[Snippets de las funciones principales]

### Estados de la pre-autorizacion
[authorized, pending, cancelled, etc]

## Flujo 2: Cobro del Alquiler

### Cuando se cobra
[Trigger del cobro]

### Edge Function
[Cual funcion procesa el cobro]

### Calculo de montos
[Como se calcula: alquiler + comision]

## Flujo 3: Wallet System

### Estructura de wallet
[Tablas involucradas: wallets, wallet_transactions, wallet_locks]

### Operaciones
- Deposito
- Retiro
- Lock de garantia
- Release de garantia

### Edge Functions de wallet
[Listar funciones wallet_*]

## Flujo 4: Payouts a Owners

### Cuando se paga al owner
[Trigger y condiciones]

### Calculo de payout
[Monto alquiler - comision plataforma]

### Edge Function
[Funcion de payout]

## Flujo 5: Reembolsos

### Casos de reembolso
[Cancelacion, disputa, etc]

### Edge Function
[Funcion de refund]

## Webhooks (IPN)

### Endpoint
[URL del webhook]

### Eventos manejados
[Lista de eventos: payment.created, etc]

### Procesamiento
[Como se procesa cada evento]

## Manejo de Errores

### Errores comunes
[Lista de errores y como manejarlos]

### Reintentos
[Politica de reintentos]

## Testing

### Tarjetas de prueba
[Tarjetas de test de MP]

### Modo sandbox
[Como activar sandbox]

## Troubleshooting

### Payment stuck in pending
[Solucion]

### Webhook not received
[Solucion]
```

### Formato de salida:
- Incluir snippets de codigo REALES del proyecto
- Diagramas ASCII de flujos
- Nombres exactos de funciones y tablas
- Maximo 600 lineas (este es el doc mas importante)
