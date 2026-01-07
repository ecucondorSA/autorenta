# PROMPT PARA GEMINI - TROUBLESHOOTING.md

## Objetivo
Documentar problemas comunes y sus soluciones en Autorenta.

## Instrucciones para Gemini

Analiza el codigo para identificar posibles puntos de fallo:

### Archivos a analizar:
1. `apps/web/src/app/core/services/**` - Todos los servicios (manejo de errores)
2. `supabase/functions/**` - Edge functions (try/catch, error handling)
3. `apps/web/src/app/core/interceptors/**` - Interceptors HTTP
4. `supabase/migrations/**` - Constraints y validaciones DB
5. Buscar patrones: `catch`, `error`, `throw`, `console.error`

### Secciones requeridas:

```markdown
# Troubleshooting Guide

## Errores de Autenticacion

### "Session expired" / Token expirado
- **Causa**: [JWT expirado]
- **Solucion usuario**: [Reloguear]
- **Solucion dev**: [Verificar refresh token logic]

### "Invalid credentials"
- **Causa**: [Email/password incorrectos]
- **Verificar**: [Tabla auth.users]

### OAuth Google falla
- **Causa**: [Configuracion OAuth]
- **Verificar**: [Variables GOOGLE_*]
- **Solucion**: [Pasos]

### OAuth MercadoPago falla
- **Causa**: [Tokens MP]
- **Verificar**: [Variables MP_*]
- **Solucion**: [Pasos]

## Errores de Pagos

### Pre-autorizacion rechazada
- **Causas posibles**:
  - Tarjeta sin fondos
  - Tarjeta bloqueada
  - Limite de tarjeta
- **Verificar**: [Logs de MP]
- **Solucion**: [Usar otra tarjeta]

### Webhook no llega
- **Causa**: [URL incorrecta, firewall]
- **Verificar**: [Panel MP > Webhooks]
- **Solucion**: [Reconfigurar webhook URL]

### Payment stuck in "pending"
- **Causa**: [Webhook no procesado]
- **Verificar**: [Tabla de payments, logs edge function]
- **Solucion manual**: [SQL para actualizar estado]

### Wallet balance incorrecto
- **Causa**: [Transaccion no registrada]
- **Verificar**: [wallet_transactions]
- **Solucion**: [Recalcular balance]

### Payout fallido
- **Causa**: [Cuenta MP no vinculada]
- **Verificar**: [mp_seller_credentials]
- **Solucion**: [Re-vincular cuenta]

## Errores de Reservas

### "Car not available"
- **Causa**: [Fechas bloqueadas]
- **Verificar**: [bookings table, car_availability]
- **Solucion**: [Verificar calendario del auto]

### Booking no cambia de estado
- **Causa**: [Trigger no ejecuto]
- **Verificar**: [Logs, triggers]
- **Solucion**: [Update manual con precaucion]

### Contrato no genera
- **Causa**: [Edge function fallo]
- **Verificar**: [Logs de contract-generate]
- **Solucion**: [Re-invocar funcion]

## Errores de Base de Datos

### "Row level security policy violation"
- **Causa**: [Usuario sin permisos]
- **Verificar**: [Policies de la tabla]
- **Solucion**: [Verificar user_id, roles]

### "Foreign key constraint violation"
- **Causa**: [Referencia a registro inexistente]
- **Verificar**: [Tabla referenciada]
- **Solucion**: [Crear registro padre primero]

### "Unique constraint violation"
- **Causa**: [Registro duplicado]
- **Verificar**: [Constraint violado]
- **Solucion**: [Usar upsert o verificar antes]

### Migracion falla
- **Causa**: [SQL invalido, constraint]
- **Verificar**: [Contenido de migracion]
- **Solucion**: [Corregir SQL, reset si es local]

## Errores de Edge Functions

### "Function not found"
- **Causa**: [No deployada]
- **Verificar**: [supabase functions list]
- **Solucion**: [supabase functions deploy]

### "Internal server error" (500)
- **Causa**: [Error en codigo]
- **Verificar**: [Logs: supabase functions logs <name>]
- **Solucion**: [Debugear segun log]

### Timeout
- **Causa**: [Funcion muy lenta]
- **Verificar**: [Tiempo de ejecucion]
- **Solucion**: [Optimizar, aumentar timeout]

### "Missing environment variable"
- **Causa**: [Secret no configurado]
- **Verificar**: [supabase secrets list]
- **Solucion**: [supabase secrets set KEY=value]

## Errores de Frontend

### Pagina en blanco
- **Causa**: [Error JS, lazy load fallo]
- **Verificar**: [Console del browser]
- **Solucion**: [Segun error]

### "Cannot read property of undefined"
- **Causa**: [Dato no cargado]
- **Verificar**: [Network tab, respuesta API]
- **Solucion**: [Agregar null checks]

### Mapa no carga
- **Causa**: [Token Mapbox invalido]
- **Verificar**: [MAPBOX_TOKEN]
- **Solucion**: [Renovar token]

### Imagenes no cargan
- **Causa**: [Storage permissions]
- **Verificar**: [Policies de storage]
- **Solucion**: [Verificar bucket policies]

## Errores de Mobile (Android)

### App crashea al abrir
- **Causa**: [Plugin no inicializado]
- **Verificar**: [adb logcat]
- **Solucion**: [Segun log]

### Push notifications no llegan
- **Causa**: [FCM mal configurado]
- **Verificar**: [google-services.json]
- **Solucion**: [Reconfigurar Firebase]

## Comandos Utiles de Debug

### Ver logs de Supabase
```bash
supabase functions logs <function-name> --project-ref <ref>
```

### Conectar a DB produccion
```bash
psql <connection-string>
```

### Ver estado de migraciones
```bash
supabase migration list
```

### Limpiar cache Angular
```bash
rm -rf .angular/cache && pnpm build
```

## Contacto de Soporte

### Problemas con MercadoPago
[Link a documentacion MP, soporte]

### Problemas con Supabase
[Link a docs, Discord]
```

### Formato de salida:
- Errores REALES encontrados en el codigo
- Comandos especificos del proyecto
- Maximo 500 lineas
