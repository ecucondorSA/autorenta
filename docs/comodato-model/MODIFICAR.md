# MODIFICAR - Cambios a Elementos Existentes

## Resumen
Este documento contiene todas las modificaciones a tablas y funciones **existentes** para soportar el modelo "Comodato + Comunidad".

---

# 1. TABLAS A MODIFICAR

## 1.1 `cars`
Agregar campos para modo de compartición y límites.

```sql
-- Nuevas columnas
ALTER TABLE cars ADD COLUMN IF NOT EXISTS sharing_mode TEXT DEFAULT 'comodato'
  CHECK (sharing_mode IN ('rental', 'comodato', 'disabled'));

ALTER TABLE cars ADD COLUMN IF NOT EXISTS estimated_daily_cost_cents BIGINT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS annual_expense_estimate_cents BIGINT;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS ytd_earnings_cents BIGINT DEFAULT 0;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS earnings_limit_reached BOOLEAN DEFAULT false;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS last_personal_use_verified_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS sharing_suspended_at TIMESTAMPTZ;
ALTER TABLE cars ADD COLUMN IF NOT EXISTS sharing_suspension_reason TEXT;

-- Comentarios
COMMENT ON COLUMN cars.sharing_mode IS 'rental=alquiler tradicional, comodato=préstamo con rewards, disabled=no disponible';
COMMENT ON COLUMN cars.annual_expense_estimate_cents IS 'Gastos anuales estimados del vehículo (límite de ganancias para no-lucro)';
COMMENT ON COLUMN cars.ytd_earnings_cents IS 'Ganancias acumuladas del año calendario actual';
```

### Descripción de columnas:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `sharing_mode` | TEXT | Modo de compartición: rental, comodato, disabled |
| `estimated_daily_cost_cents` | BIGINT | Costo diario estimado (para cálculo de reembolso máximo) |
| `annual_expense_estimate_cents` | BIGINT | Gastos anuales estimados (límite para no ser comercial) |
| `ytd_earnings_cents` | BIGINT | Ganancias acumuladas año actual |
| `earnings_limit_reached` | BOOLEAN | Si ya alcanzó el límite anual |
| `last_personal_use_verified_at` | TIMESTAMPTZ | Última verificación de uso personal |
| `sharing_suspended_at` | TIMESTAMPTZ | Cuándo se suspendió la compartición |
| `sharing_suspension_reason` | TEXT | Razón de suspensión |

---

## 1.2 `bookings`
Agregar campos para tipo de acuerdo y contribuciones.

```sql
-- Nuevas columnas
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS agreement_type TEXT DEFAULT 'comodato'
  CHECK (agreement_type IN ('rental', 'comodato'));

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS comodato_agreement_id UUID REFERENCES comodato_agreements(id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reward_pool_contribution_cents BIGINT DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS fgo_contribution_cents BIGINT DEFAULT 0;

-- CONSTRAINT CRÍTICO: Para comodato, owner_payment_amount siempre es 0
ALTER TABLE bookings ADD CONSTRAINT chk_comodato_no_owner_payment
  CHECK (agreement_type != 'comodato' OR owner_payment_amount = 0 OR owner_payment_amount IS NULL);

-- Comentarios
COMMENT ON COLUMN bookings.agreement_type IS 'rental=alquiler tradicional, comodato=préstamo gratuito';
COMMENT ON COLUMN bookings.reward_pool_contribution_cents IS 'Monto que va al pool de rewards mensuales';
```

### Descripción de columnas:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `agreement_type` | TEXT | Tipo de acuerdo: rental o comodato |
| `comodato_agreement_id` | UUID | FK al contrato de comodato |
| `reward_pool_contribution_cents` | BIGINT | Contribución al pool de rewards |
| `fgo_contribution_cents` | BIGINT | Contribución al FGO |

### NOTA IMPORTANTE:
El constraint `chk_comodato_no_owner_payment` es **CRÍTICO** para la validez legal del modelo. Garantiza que en bookings tipo comodato, el owner NUNCA recibe pago directo.

---

## 1.3 `profiles`
Agregar campos para membresía de comunidad.

```sql
-- Nuevas columnas
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS community_member_since TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS community_tier TEXT DEFAULT 'standard';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_availability_days INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avg_response_time_minutes INT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS community_participation_score INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_community_activity_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN profiles.community_member_since IS 'Fecha de ingreso a la comunidad de owners';
COMMENT ON COLUMN profiles.community_tier IS 'Nivel en la comunidad: standard, silver, gold, platinum';
```

### Descripción de columnas:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `community_member_since` | TIMESTAMPTZ | Fecha de ingreso a la comunidad |
| `community_tier` | TEXT | Nivel: standard, silver, gold, platinum |
| `total_availability_days` | INT | Total de días de disponibilidad declarados |
| `avg_response_time_minutes` | INT | Tiempo promedio de respuesta |
| `community_participation_score` | INT | Score de participación |
| `last_community_activity_at` | TIMESTAMPTZ | Última actividad en comunidad |

---

## 1.4 `user_wallets`
Agregar balance específico para rewards de comunidad.

```sql
-- Nueva columna
ALTER TABLE user_wallets ADD COLUMN IF NOT EXISTS community_rewards_balance_cents BIGINT DEFAULT 0;

-- Comentario
COMMENT ON COLUMN user_wallets.community_rewards_balance_cents IS 'Balance de rewards de comunidad (retirable)';
```

### Descripción:
Este balance es separado para tracking. Los rewards de comunidad son **retirab les** igual que el balance normal, pero se contabilizan aparte para transparencia.

---

## 1.5 `payment_splits`
Agregar campos para distribución de comodato.

```sql
-- Nuevas columnas
ALTER TABLE payment_splits ADD COLUMN IF NOT EXISTS agreement_type TEXT DEFAULT 'rental';
ALTER TABLE payment_splits ADD COLUMN IF NOT EXISTS reward_pool_cents INT DEFAULT 0;
ALTER TABLE payment_splits ADD COLUMN IF NOT EXISTS fgo_cents INT DEFAULT 0;

-- Para comodato, owner_amount siempre es 0
ALTER TABLE payment_splits ADD CONSTRAINT chk_comodato_split
  CHECK (agreement_type != 'comodato' OR owner_amount_cents = 0);
```

### Distribución Comodato:
```
Total del Usuario (100%)
├── Platform Fee (50%)
├── Reward Pool (30%) → Distribuido mensualmente a owners por puntos
└── FGO (20%) → Fondo de Garantía Operativo
```

---

## 1.6 `platform_fee_config`
Agregar configuración para modelo comodato.

```sql
-- Insertar configuración para comodato
INSERT INTO platform_fee_config (name, fee_type, fee_value, applies_to, active, valid_from) VALUES
  ('Comodato - Platform Fee', 'percentage', 0.50, 'comodato_booking', true, now()),
  ('Comodato - Reward Pool', 'percentage', 0.30, 'comodato_reward_pool', true, now()),
  ('Comodato - FGO Contribution', 'percentage', 0.20, 'comodato_fgo', true, now());
```

---

# 2. FUNCIONES A MODIFICAR

## 2.1 `calculate_payment_split`
Agregar lógica para comodato (owner = 0).

```sql
-- Modificar para soportar agreement_type
CREATE OR REPLACE FUNCTION calculate_payment_split(
  p_total_amount NUMERIC,
  p_platform_fee_percent NUMERIC DEFAULT 0.05,
  p_agreement_type TEXT DEFAULT 'rental'
) RETURNS TABLE(
  total_amount NUMERIC,
  owner_amount NUMERIC,
  platform_fee NUMERIC,
  reward_pool_amount NUMERIC,
  fgo_amount NUMERIC,
  platform_fee_percent NUMERIC
) AS $$
BEGIN
  IF p_agreement_type = 'comodato' THEN
    -- Comodato: 50% platform, 30% rewards, 20% FGO, 0% owner
    RETURN QUERY SELECT
      p_total_amount,
      0::NUMERIC, -- owner no recibe nada
      FLOOR(p_total_amount * 0.50),
      FLOOR(p_total_amount * 0.30),
      p_total_amount - FLOOR(p_total_amount * 0.50) - FLOOR(p_total_amount * 0.30),
      0.50::NUMERIC;
  ELSE
    -- Rental tradicional: owner recibe mayoría
    RETURN QUERY SELECT
      p_total_amount,
      FLOOR(p_total_amount * (1 - p_platform_fee_percent)),
      FLOOR(p_total_amount * p_platform_fee_percent),
      0::NUMERIC,
      0::NUMERIC,
      p_platform_fee_percent;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Cambios:
1. Nuevo parámetro `p_agreement_type`
2. Nuevas columnas de retorno: `reward_pool_amount`, `fgo_amount`
3. Lógica diferenciada para comodato vs rental

---

## 2.2 `wallet_transfer_to_owner`
Agregar verificación de agreement_type (bloquear transferencia en comodato).

```sql
CREATE OR REPLACE FUNCTION wallet_transfer_to_owner(
  p_booking_id UUID,
  p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  v_owner_id UUID;
  v_agreement_type TEXT;
BEGIN
  SELECT b.agreement_type, c.owner_id
  INTO v_agreement_type, v_owner_id
  FROM bookings b
  JOIN cars c ON b.car_id = c.id
  WHERE b.id = p_booking_id;

  -- Para comodato, NO transferir al owner
  IF v_agreement_type = 'comodato' THEN
    RAISE NOTICE 'Booking es comodato, no se transfiere al owner';
    RETURN TRUE; -- Retorna true pero no transfiere
  END IF;

  -- Rental tradicional: transferir al owner
  UPDATE user_wallets SET
    balance_cents = balance_cents + (p_amount * 100)::BIGINT,
    available_balance_cents = available_balance_cents + (p_amount * 100)::BIGINT
  WHERE user_id = v_owner_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Cambios:
1. Nueva verificación de `agreement_type`
2. Si es comodato, retorna TRUE pero **NO transfiere dinero**
3. Esto es un **safety guard** adicional para evitar pagos accidentales

---

# 3. RESUMEN DE IMPACTO

## Tablas modificadas:
| Tabla | Columnas Agregadas | Constraints |
|-------|-------------------|-------------|
| `cars` | 7 columnas | - |
| `bookings` | 4 columnas | `chk_comodato_no_owner_payment` |
| `profiles` | 6 columnas | - |
| `user_wallets` | 1 columna | - |
| `payment_splits` | 3 columnas | `chk_comodato_split` |
| `platform_fee_config` | 3 registros INSERT | - |

## Funciones modificadas:
| Función | Cambio |
|---------|--------|
| `calculate_payment_split` | Nuevo parámetro, lógica comodato |
| `wallet_transfer_to_owner` | Bloqueo transferencia en comodato |

## Backward Compatibility:
- Todas las columnas nuevas tienen DEFAULT values
- `agreement_type` default = 'comodato' (nuevo comportamiento)
- Cambiar a 'rental' para mantener comportamiento legacy
- Funciones modificadas son backward compatible (parámetros opcionales)
