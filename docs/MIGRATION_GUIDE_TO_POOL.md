# GUÍA DE MIGRACIÓN: DE MARKETPLACE A POOL (1B)

> **Objetivo:** Transformar Autorentar de un modelo de pago directo a una cooperativa de puntos.
> **Estado:** Fase de Diseño Técnico.

---

## 1. CAMBIOS EN BASE DE DATOS (Supabase)

Necesitamos nuevas tablas para rastrear la acumulación de puntos y la distribución del pool.

### Tabla: `reward_points_ledger`
Registra los puntos ganados diariamente por cada auto.

```sql
create table reward_points_ledger (
  id uuid primary key default uuid_generate_v4(),
  car_id uuid references cars(id),
  owner_id uuid references auth.users(id),
  date date not null,
  
  -- Métricas Base
  market_value_usd numeric,
  hours_available numeric,
  quality_score numeric,
  
  -- Puntos Calculados
  points_earned numeric not null,
  
  created_at timestamptz default now()
);
```

### Tabla: `monthly_pool_snapshots`
Registra el cierre de cada mes.

```sql
create table monthly_pool_snapshots (
  id uuid primary key default uuid_generate_v4(),
  month date not null, -- Ej: 2026-01-01
  
  total_revenue_usd numeric, -- Ingreso bruto total (Treasury)
  fgo_contribution_usd numeric, -- Fondo de Garantía
  platform_fee_usd numeric, -- Fee variable de plataforma
  pool_distributable_usd numeric, -- Reward Pool para socios
  
  total_points_minted numeric, -- Suma de todos los puntos del mes
  point_value_usd numeric, -- (pool_distributable / total_points)
  
  status text default 'draft' -- draft, locked, distributed
);
```

---

## 2. REFACTORIZACIÓN DEL CHECKOUT (Frontend)

### Lo que debemos ELIMINAR:
*   `SplitPaymentService.processSplitPayment()`: Ya no dividimos el pago en el momento de la compra.
*   Lógica que muestra al usuario "¿Cuánto gana el dueño?". Ahora mostramos "¿Cuántos puntos genera este viaje?".

### Lo que debemos IMPLEMENTAR:
*   **Treasury Deposit:** El cobro en MercadoPago debe ir 100% a la cuenta recaudadora de Autorentar.
*   **Booking Webhook:** Al confirmarse una reserva, NO se dispara un pago al dueño. Se dispara un evento `availability_locked` que cuenta para el score de disponibilidad.

---

## 3. PROCESO DE LIQUIDACIÓN (Backend Job)

Este script debe correr el día 1 de cada mes:

1.  **Cerrar Mes:** Calcular `total_revenue_usd` acumulado en Treasury.
2.  **Calcular Pools:** Separar el FGO, el Fee de Plataforma (Variable) y el Reward Pool.
3.  **Valor del Punto:** Dividir el Reward Pool por el total de puntos generados en el mes.
4.  **Generar Payouts:** Crear registros de pago masivo para cada Owner: `(MisPuntos * ValorPunto)`.

---

## 4. IMPACTO EN UI (Dueño)

El Dashboard del Dueño cambia radicalmente:

*   **ANTES:** "Ganaste $150 USD esta semana".
*   **AHORA:** "Generaste 450 Puntos. Valor estimado del punto: $0.33 USD".
*   **KPIs Clave:** Disponibilidad (%), Score de Calidad, Nivel del Auto.
