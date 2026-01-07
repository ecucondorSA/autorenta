# PROMPT PARA GEMINI - DATABASE_SCHEMA.md

## Objetivo
Documentar el schema completo de PostgreSQL y politicas RLS de Autorenta.

## Instrucciones para Gemini

Analiza TODOS los archivos de migraciones:

### Archivos a analizar:
1. `supabase/migrations/*.sql` - TODAS las migraciones (49 archivos)
2. `apps/web/src/app/core/types/database.types.ts` - Types generados
3. `supabase/config.toml` - Config de Supabase

### Secciones requeridas:

```markdown
# Database Schema

## Diagrama ER (ASCII)
[Diagrama de entidad-relacion de las tablas principales]

## Tablas Principales

### users (auth.users + profiles)
| Column | Type | Description |
|--------|------|-------------|
[Listar TODAS las columnas de profiles]

### cars
| Column | Type | Description |
|--------|------|-------------|
[Listar TODAS las columnas]

### bookings
| Column | Type | Description |
|--------|------|-------------|
[Listar TODAS las columnas]

### wallets
[Estructura completa]

### wallet_transactions
[Estructura completa]

### wallet_locks
[Estructura completa]

### subscriptions
[Estructura completa]

### subscription_events
[Estructura completa]

### disputes
[Estructura completa]

### messages
[Estructura completa]

### reviews
[Estructura completa]

### notifications
[Estructura completa]

## Enums

### booking_status
[Valores posibles]

### car_status
[Valores posibles]

### payment_status
[Valores posibles]

[... todos los enums encontrados]

## Politicas RLS (Row Level Security)

### Tabla: profiles
[Listar TODAS las policies con su SQL]

### Tabla: cars
[Listar TODAS las policies]

### Tabla: bookings
[Listar TODAS las policies]

### Tabla: wallets
[Listar TODAS las policies - CRITICO]

[... todas las tablas con RLS]

## Funciones de Base de Datos

### wallet_* functions
[Listar todas las funciones de wallet con su firma y descripcion]

### calculate_* functions
[Funciones de calculo]

### RPC functions
[Todas las funciones llamables via RPC]

## Triggers

[Listar todos los triggers encontrados]

## Indices

[Indices importantes para performance]

## Historial de Migraciones

| Version | Fecha | Descripcion |
|---------|-------|-------------|
[Listar las 49 migraciones con descripcion]
```

### Formato de salida:
- Tablas en formato Markdown
- SQL exacto de las policies RLS
- Nombres exactos de columnas y tipos
- Maximo 800 lineas
