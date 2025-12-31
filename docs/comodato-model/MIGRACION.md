# MIGRACION - Scripts de Migración de Datos

## Resumen
Este documento contiene los scripts para migrar datos existentes al nuevo modelo de comunidad.

---

# 1. ORDEN DE EJECUCIÓN

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Crear tablas nuevas (sin dependencias)                       │
│    - reward_criteria_config                                      │
│    - reward_pool                                                 │
│    - community_memberships                                       │
│    - owner_availability                                          │
│    - owner_usage_limits                                          │
│    - personal_use_verifications                                  │
│    - community_rewards                                           │
│    - comodato_agreements                                         │
├─────────────────────────────────────────────────────────────────┤
│ 2. Modificar tablas existentes                                   │
│    - cars (agregar columnas)                                     │
│    - bookings (agregar columnas)                                 │
│    - profiles (agregar columnas)                                 │
│    - user_wallets (agregar columna)                              │
│    - payment_splits (agregar columnas)                           │
├─────────────────────────────────────────────────────────────────┤
│ 3. Crear funciones nuevas                                        │
├─────────────────────────────────────────────────────────────────┤
│ 4. Modificar funciones existentes                                │
├─────────────────────────────────────────────────────────────────┤
│ 5. Crear vistas                                                  │
├─────────────────────────────────────────────────────────────────┤
│ 6. Crear triggers                                                │
├─────────────────────────────────────────────────────────────────┤
│ 7. Insertar datos iniciales                                      │
├─────────────────────────────────────────────────────────────────┤
│ 8. Migrar datos existentes                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

# 2. SCRIPTS DE MIGRACIÓN DE DATOS

## 2.1 Migrar Owners Existentes a Community Memberships

Crea membresías para todos los owners que ya tienen autos registrados.

```sql
-- Crear membresías para owners existentes con autos
INSERT INTO community_memberships (
  owner_id,
  status,
  tier,
  joined_at,
  terms_accepted_at,
  onboarding_completed
)
SELECT DISTINCT
  c.owner_id,
  'active',
  'standard',
  COALESCE(
    (SELECT MIN(created_at) FROM cars WHERE owner_id = c.owner_id),
    now()
  ),
  now(),
  true  -- Owners existentes considerados como onboarding completado
FROM cars c
WHERE c.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM community_memberships cm WHERE cm.owner_id = c.owner_id
  );
```

### Verificación:
```sql
-- Verificar migración
SELECT
  (SELECT COUNT(DISTINCT owner_id) FROM cars) as total_owners,
  (SELECT COUNT(*) FROM community_memberships) as memberships_created;
```

---

## 2.2 Actualizar Profiles con Datos de Comunidad

Sincroniza los campos de comunidad en profiles.

```sql
UPDATE profiles p SET
  community_member_since = cm.joined_at,
  community_tier = cm.tier
FROM community_memberships cm
WHERE p.id = cm.owner_id
  AND p.community_member_since IS NULL;
```

### Verificación:
```sql
-- Verificar actualización
SELECT COUNT(*) as profiles_updated
FROM profiles
WHERE community_member_since IS NOT NULL;
```

---

## 2.3 Crear Pool Inicial del Mes Actual

Inicializa el pool de rewards para el mes actual.

```sql
INSERT INTO reward_pool (
  period_year,
  period_month,
  contributions_cents,
  status
)
VALUES (
  EXTRACT(YEAR FROM now())::INT,
  EXTRACT(MONTH FROM now())::INT,
  0,
  'open'
)
ON CONFLICT (period_year, period_month) DO NOTHING;
```

---

## 2.4 Inicializar Datos de Configuración

Inserta los criterios de rewards.

```sql
-- Solo si no existen
INSERT INTO reward_criteria_config (
  criterion, display_name, description,
  points_per_unit, max_points_per_month, weight_percentage
)
SELECT * FROM (VALUES
  ('availability', 'Disponibilidad', 'Puntos por día de disponibilidad declarada', 10, 300, 30),
  ('rating', 'Rating', 'Puntos por mantener rating >= 4.5', 100, 200, 20),
  ('seniority', 'Antigüedad', 'Puntos por mes de antigüedad en comunidad', 50, 600, 15),
  ('referral', 'Referidos', 'Puntos por referido activo', 200, NULL, 15),
  ('response_time', 'Tiempo de respuesta', 'Puntos por respuesta rápida (<1h)', 5, 150, 10),
  ('participation', 'Participación', 'Puntos por actividad en comunidad', 50, 100, 10)
) AS v(criterion, display_name, description, points_per_unit, max_points_per_month, weight_percentage)
WHERE NOT EXISTS (
  SELECT 1 FROM reward_criteria_config WHERE criterion = v.criterion
);
```

---

## 2.5 Calcular Antigüedad Inicial de Owners

Calcula los meses de antigüedad basándose en la fecha de registro del primer auto.

```sql
-- Actualizar seniority para rewards del mes actual
UPDATE profiles p SET
  community_participation_score = EXTRACT(MONTH FROM age(
    now(),
    COALESCE(
      (SELECT MIN(created_at) FROM cars WHERE owner_id = p.id),
      now()
    )
  ))::INT * 50  -- 50 puntos por mes
WHERE EXISTS (SELECT 1 FROM cars WHERE owner_id = p.id);
```

---

## 2.6 Migrar Autos al Modo Comodato

Configura todos los autos existentes como comodato por defecto.

```sql
-- Actualizar autos existentes a modo comodato
UPDATE cars SET
  sharing_mode = 'comodato',
  ytd_earnings_cents = 0,
  earnings_limit_reached = false
WHERE sharing_mode IS NULL OR sharing_mode = '';

-- Estimar gastos anuales (valor por defecto razonable)
UPDATE cars SET
  annual_expense_estimate_cents = 1200000  -- $12,000 ARS/año como default
WHERE annual_expense_estimate_cents IS NULL;
```

---

## 2.7 Crear Registros de Límites para el Mes Actual

Inicializa los límites de uso para todos los autos.

```sql
INSERT INTO owner_usage_limits (
  car_id,
  year,
  month,
  annual_expense_limit_cents,
  max_days_allowed,
  max_consecutive_allowed
)
SELECT
  c.id,
  EXTRACT(YEAR FROM now())::INT,
  EXTRACT(MONTH FROM now())::INT,
  c.annual_expense_estimate_cents,
  15,  -- máximo 15 días/mes
  5    -- máximo 5 días consecutivos
FROM cars c
WHERE c.sharing_mode = 'comodato'
ON CONFLICT (car_id, year, month) DO NOTHING;
```

---

# 3. SCRIPT COMPLETO DE MIGRACIÓN

```sql
-- =====================================================
-- MIGRACIÓN COMPLETA A MODELO COMODATO + COMUNIDAD
-- Ejecutar en orden después de crear tablas/funciones
-- =====================================================

BEGIN;

-- 1. Crear membresías
INSERT INTO community_memberships (owner_id, status, tier, joined_at, terms_accepted_at, onboarding_completed)
SELECT DISTINCT c.owner_id, 'active', 'standard',
  COALESCE((SELECT MIN(created_at) FROM cars WHERE owner_id = c.owner_id), now()),
  now(), true
FROM cars c
WHERE c.owner_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM community_memberships cm WHERE cm.owner_id = c.owner_id);

-- 2. Actualizar profiles
UPDATE profiles p SET
  community_member_since = cm.joined_at,
  community_tier = cm.tier
FROM community_memberships cm
WHERE p.id = cm.owner_id AND p.community_member_since IS NULL;

-- 3. Crear pool del mes
INSERT INTO reward_pool (period_year, period_month, contributions_cents, status)
VALUES (EXTRACT(YEAR FROM now())::INT, EXTRACT(MONTH FROM now())::INT, 0, 'open')
ON CONFLICT DO NOTHING;

-- 4. Configurar autos
UPDATE cars SET
  sharing_mode = COALESCE(sharing_mode, 'comodato'),
  ytd_earnings_cents = COALESCE(ytd_earnings_cents, 0),
  annual_expense_estimate_cents = COALESCE(annual_expense_estimate_cents, 1200000)
WHERE sharing_mode IS NULL OR sharing_mode = '';

-- 5. Crear límites mensuales
INSERT INTO owner_usage_limits (car_id, year, month, annual_expense_limit_cents)
SELECT c.id, EXTRACT(YEAR FROM now())::INT, EXTRACT(MONTH FROM now())::INT, c.annual_expense_estimate_cents
FROM cars c WHERE c.sharing_mode = 'comodato'
ON CONFLICT DO NOTHING;

-- 6. Actualizar wallets
UPDATE user_wallets SET community_rewards_balance_cents = 0
WHERE community_rewards_balance_cents IS NULL;

COMMIT;

-- Verificación final
SELECT
  'community_memberships' as tabla, COUNT(*) as registros FROM community_memberships
UNION ALL SELECT 'reward_pool', COUNT(*) FROM reward_pool
UNION ALL SELECT 'owner_usage_limits', COUNT(*) FROM owner_usage_limits
UNION ALL SELECT 'cars (comodato)', COUNT(*) FROM cars WHERE sharing_mode = 'comodato';
```

---

# 4. ROLLBACK

En caso de necesitar revertir:

```sql
-- PRECAUCIÓN: Solo ejecutar si hay problemas graves

BEGIN;

-- Eliminar datos nuevos
DELETE FROM community_rewards;
DELETE FROM community_memberships;
DELETE FROM owner_usage_limits;
DELETE FROM reward_pool;
DELETE FROM reward_criteria_config;

-- Resetear columnas (no eliminarlas para evitar errores)
UPDATE cars SET sharing_mode = NULL, ytd_earnings_cents = 0;
UPDATE profiles SET community_member_since = NULL, community_tier = NULL;
UPDATE user_wallets SET community_rewards_balance_cents = 0;

COMMIT;
```

---

# 5. VERIFICACIONES POST-MIGRACIÓN

```sql
-- Verificar integridad
SELECT
  'Owners sin membresía' as check_name,
  COUNT(*) as issues
FROM cars c
WHERE NOT EXISTS (
  SELECT 1 FROM community_memberships cm WHERE cm.owner_id = c.owner_id
)

UNION ALL

SELECT
  'Membresías sin owner válido',
  COUNT(*)
FROM community_memberships cm
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = cm.owner_id
)

UNION ALL

SELECT
  'Autos sin modo definido',
  COUNT(*)
FROM cars WHERE sharing_mode IS NULL

UNION ALL

SELECT
  'Pool del mes faltante',
  CASE WHEN EXISTS (
    SELECT 1 FROM reward_pool
    WHERE period_year = EXTRACT(YEAR FROM now())::INT
    AND period_month = EXTRACT(MONTH FROM now())::INT
  ) THEN 0 ELSE 1 END;
```
