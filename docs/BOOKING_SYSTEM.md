# PROMPT PARA GEMINI - BOOKING_SYSTEM.md

## Objetivo
Documentar el flujo completo de reservas en Autorenta.

## Instrucciones para Gemini

Analiza los archivos del sistema de bookings:

### Archivos a analizar:
1. `apps/web/src/app/features/bookings/**` - Todos los componentes de booking
2. `apps/web/src/app/core/services/bookings/**` - Servicios de booking
3. `apps/web/src/app/features/cars/detail/**` - Pagina de detalle del auto
4. `supabase/migrations/*booking*` - Migraciones de bookings
5. `supabase/functions/*booking*` - Edge functions de bookings
6. `apps/web/src/app/core/models/booking*.ts` - Modelos

### Secciones requeridas:

```markdown
# Booking System

## Estados de una Reserva

### Diagrama de estados
```
[draft] -> [pending] -> [confirmed] -> [active] -> [completed]
                    \-> [cancelled]
                    \-> [rejected]
```

### Descripcion de estados
| Estado | Descripcion | Quien puede cambiar |
|--------|-------------|---------------------|
[Listar TODOS los estados de booking_status enum]

## Flujo Completo de Reserva

### 1. Seleccion del Auto
- Pagina: `/cars/:id`
- Componente: [Nombre del componente]
- Acciones del usuario: [Lista]

### 2. Seleccion de Fechas
- Componente: [booking-dates-step o similar]
- Validaciones:
  - [Disponibilidad]
  - [Minimo de dias]
  - [Maximo de dias]

### 3. Calculo de Precio
- Servicio: [pricing.service.ts]
- Formula: [precio_por_dia * dias + fees]
- Descuentos: [Si aplican]

### 4. Garantia / Pre-autorizacion
- Componente: [booking-detail-payment]
- Opciones:
  - Tarjeta (pre-auth MercadoPago)
  - Wallet (lock de saldo)
- Monto: [Como se calcula - ver subscription tiers]

### 5. Envio de Solicitud
- Estado inicial: `pending`
- Notificacion al owner: [Como se notifica]
- Tiempo de respuesta: [Limite]

### 6. Aprobacion/Rechazo del Owner
- Interfaz del owner: [Donde aprueba]
- Si aprueba: Estado -> `confirmed`
- Si rechaza: Estado -> `rejected`, liberar garantia

### 7. Check-in
- Cuando: [Fecha de inicio]
- Proceso:
  - Firma de contrato digital
  - Fotos del vehiculo
  - Entrega de llaves
- Estado: `active`

### 8. Durante el Alquiler
- GPS tracking: [Si existe]
- Soporte: [Como contactar]
- Extensiones: [Como extender]

### 9. Check-out
- Proceso:
  - Fotos finales
  - Revision de danos
  - Devolucion de llaves
- Estado: `completed`

### 10. Post-Alquiler
- Reviews: [Sistema de reviews]
- Payout al owner: [Cuando se paga]
- Liberacion de garantia: [Cuando se libera]

## Cancelaciones

### Por el Renter
- Politica: [cancel_policy enum]
- Penalizaciones: [Segun tiempo]

### Por el Owner
- Penalizaciones: [Si las hay]

### Automaticas
- Por timeout: [Si el owner no responde]
- Por falta de pago: [Si aplica]

## Disputas

### Apertura de disputa
- Cuando: [En que estados se puede abrir]
- Proceso: [Flujo de disputa]

### Resolucion
- Quien resuelve: [Admin]
- Opciones: [Reembolso total, parcial, a favor de owner]

## Componentes Angular

### Paginas
| Ruta | Componente | Descripcion |
|------|------------|-------------|
[Listar todas las rutas de /bookings/*]

### Servicios
| Servicio | Responsabilidad |
|----------|-----------------|
[Listar todos los servicios de bookings]

## Base de Datos

### Tabla bookings
[Referencia a DATABASE_SCHEMA.md]

### Queries importantes
[Queries comunes con ejemplos]

## Edge Functions

### Funciones relacionadas
[Lista con referencia a EDGE_FUNCTIONS.md]

## Notificaciones

### Eventos que disparan notificaciones
| Evento | Destinatario | Canal |
|--------|--------------|-------|
[Lista completa]
```

### Formato de salida:
- Diagramas ASCII de flujos
- Tablas claras
- Referencias a otros docs
- Maximo 500 lineas
