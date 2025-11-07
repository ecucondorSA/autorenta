# Sistema Bonus-Malus para AutoRenta

## 📋 Resumen Ejecutivo

El sistema Bonus-Malus ajusta automáticamente los precios de alquiler basándose en la reputación y comportamiento de los usuarios. Los usuarios con buen historial reciben **descuentos (BONUS)**, mientras que usuarios con mal historial reciben **recargos (MALUS)**.

### Beneficios Clave

- ✅ **Incentiva buen comportamiento**: Descuentos de hasta 15% para usuarios ejemplares
- ⚠️ **Mitiga riesgos**: Recargos de hasta 20% para usuarios con historial problemático
- 📊 **Transparente**: Los usuarios ven su factor y cómo mejorarlo
- 🔄 **Automático**: Se recalcula automáticamente al actualizar estadísticas
- 💰 **Aumenta ingresos**: Optimiza pricing según riesgo del usuario

---

## 🎯 Factores de Cálculo

El sistema evalúa 4 dimensiones principales:

### 1. Rating del Usuario (peso: 40%)

| Rating Promedio | Factor | Impacto |
|----------------|--------|---------|
| ≥ 4.8 | -0.05 | **BONUS 5%** 🌟 |
| ≥ 4.5 | -0.03 | **BONUS 3%** ⭐ |
| ≥ 4.0 | -0.01 | **BONUS 1%** ✨ |
| ≥ 3.5 | 0.00 | Neutral ➖ |
| ≥ 3.0 | +0.05 | **MALUS 5%** ⚠️ |
| < 3.0 | +0.15 | **MALUS 15%** 🚫 |
| Sin reviews | 0.00 | Neutral (nuevo) |

**Cálculo**: Promedio ponderado 70% renter_rating + 30% owner_rating

### 2. Tasa de Cancelación (peso: 30%)

| Tasa Cancelación | Factor | Impacto |
|------------------|--------|---------|
| 0% (10+ reservas) | -0.02 | **BONUS 2%** ✅ |
| ≤ 5% | -0.01 | **BONUS 1%** |
| ≤ 10% | 0.00 | Neutral |
| 10-20% | +0.05 | **MALUS 5%** ⚠️ |
| > 20% | +0.10 | **MALUS 10%** 🚫 |

**Nota**: Solo aplica con 10+ reservas totales.

### 3. Experiencia (peso: 20%)

| Reservas Completadas | Factor | Impacto |
|---------------------|--------|---------|
| ≥ 50 | -0.03 | **BONUS 3%** 🏆 |
| ≥ 20 | -0.02 | **BONUS 2%** |
| ≥ 10 | -0.01 | **BONUS 1%** |
| ≥ 5 | 0.00 | Neutral |
| < 5 | +0.02 | **MALUS 2%** (nuevo) |

### 4. Verificación de Identidad (peso: 10%)

| Estado | Reservas | Factor | Impacto |
|--------|----------|--------|---------|
| Verificado | ≥ 20 | -0.03 | **BONUS 3%** ✅ |
| Verificado | < 20 | -0.01 | **BONUS 1%** |
| No verificado | 0 | +0.05 | **MALUS 5%** ⚠️ |
| No verificado | > 0 | 0.00 | Neutral |

---

## 📊 Ejemplos de Casos

### Caso 1: Usuario Excelente 🌟

```
Rating promedio: 4.9/5.0
Cancelaciones: 0% (30 reservas)
Reservas completadas: 30
Verificado: Sí

Cálculo:
- Rating factor: -0.05 (rating ≥ 4.8)
- Cancelación factor: -0.02 (0% en 30 reservas)
- Experiencia factor: -0.02 (≥ 20 reservas)
- Verificación factor: -0.03 (verificado + experimentado)
───────────────────────────
TOTAL: -0.12 (12% DESCUENTO) 🎉
```

**Impacto monetario**: Si el precio base es $1000/día → **$880/día** (ahorro de $120)

### Caso 2: Usuario Promedio ➖

```
Rating promedio: 3.8/5.0
Cancelaciones: 12.5% (8 reservas)
Reservas completadas: 7
Verificado: No

Cálculo:
- Rating factor: 0.00 (rating 3.5-4.0)
- Cancelación factor: 0.00 (< 10 reservas, no aplica)
- Experiencia factor: 0.00 (5-10 reservas)
- Verificación factor: 0.00 (no verificado con historial)
───────────────────────────
TOTAL: 0.00 (NEUTRAL)
```

**Impacto monetario**: Precio estándar sin ajustes.

### Caso 3: Usuario Problemático 🚫

```
Rating promedio: 2.7/5.0
Cancelaciones: 30% (10 reservas)
Reservas completadas: 3
Verificado: No

Cálculo:
- Rating factor: +0.15 (rating < 3.0)
- Cancelación factor: +0.10 (> 20% en 10 reservas)
- Experiencia factor: +0.02 (< 5 reservas)
- Verificación factor: +0.05 (nuevo no verificado)
───────────────────────────
TOTAL: +0.20 (20% RECARGO, límite máximo) ⛔
```

**Impacto monetario**: Si el precio base es $1000/día → **$1200/día** (recargo de $200)

### Caso 4: Usuario Nuevo 🆕

```
Rating promedio: N/A (sin reviews)
Cancelaciones: N/A
Reservas completadas: 0
Verificado: No

Cálculo:
- Rating factor: 0.00 (sin reviews)
- Cancelación factor: 0.00 (sin historial)
- Experiencia factor: +0.02 (nuevo)
- Verificación factor: +0.05 (nuevo no verificado)
───────────────────────────
TOTAL: +0.07 (7% RECARGO) ⚠️
```

**Impacto monetario**: Si el precio base es $1000/día → **$1070/día** (recargo de $70)

**Recomendación para mejorarlo**:
1. ✅ Verificar identidad → elimina +0.05 = queda en +0.02 (2%)
2. Completar 5 reservas exitosas → elimina +0.02 = queda neutral

---

## 🗄️ Arquitectura de Base de Datos

### Tabla: `user_bonus_malus`

```sql
CREATE TABLE user_bonus_malus (
  user_id UUID PRIMARY KEY,
  total_factor DECIMAL(5,3) CHECK (total_factor BETWEEN -0.15 AND 0.20),
  rating_factor DECIMAL(5,3),
  cancellation_factor DECIMAL(5,3),
  completion_factor DECIMAL(5,3),
  verification_factor DECIMAL(5,3),
  metrics JSONB,
  last_calculated_at TIMESTAMPTZ,
  next_recalculation_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Funciones RPC

#### 1. `calculate_user_bonus_malus(p_user_id UUID)`

Calcula el factor bonus-malus completo para un usuario.

**Retorna**:
```json
{
  "user_id": "uuid",
  "total_factor": -0.08,
  "discount_or_surcharge": "BONUS (Descuento)",
  "percentage": "8%",
  "breakdown": {
    "rating_factor": -0.05,
    "cancellation_factor": -0.02,
    "completion_factor": -0.01,
    "verification_factor": 0.00
  },
  "metrics": { ... }
}
```

#### 2. `get_user_bonus_malus(p_user_id UUID)`

Obtiene el factor del usuario. Si no existe o está desactualizado, lo recalcula automáticamente.

**Retorna**: `DECIMAL(5,3)` (el factor total)

#### 3. `calculate_dynamic_price(p_region_id, p_user_id, p_rental_start, p_rental_hours)`

Calcula precio dinámico **incluyendo** el factor bonus-malus.

**Modificación**: Ahora incluye `bonus_malus_factor` en el breakdown:

```json
{
  "price_per_hour": 920.00,
  "total_price": 22080.00,
  "breakdown": {
    "base_price": 1000.00,
    "day_factor": 0.00,
    "hour_factor": 0.00,
    "user_factor": 0.00,
    "bonus_malus_factor": -0.08,  // NUEVO
    "demand_factor": 0.00,
    "event_factor": 0.00
  }
}
```

#### 4. `recalculate_all_bonus_malus()`

Recalcula factores para usuarios que necesitan actualización (ejecutar vía cron).

**Retorna**: `INT` (número de usuarios procesados, máximo 100 por ejecución)

### Trigger: Recalculación Automática

```sql
CREATE TRIGGER on_user_stats_update
  AFTER INSERT OR UPDATE ON user_stats
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_bonus_malus();
```

Cada vez que se actualizan las estadísticas del usuario (nuevo review, booking completado, etc.), el trigger recalcula automáticamente su factor bonus-malus.

---

## 💻 Integración en Angular

### Servicio: `BonusMalusService`

```typescript
import { BonusMalusService } from '@core/services/bonus-malus.service';

constructor(private bonusMalusService: BonusMalusService) {}

// Obtener factor del usuario autenticado
async getUserFactor() {
  const bonusMalus = await this.bonusMalusService.getUserBonusMalus();
  console.log('Factor:', bonusMalus?.total_factor);
}

// Mostrar en UI
async showBonusMalusInUI() {
  const factor = await this.bonusMalusService.getBonusMalusFactor();
  const display = this.bonusMalusService.getBonusMalusDisplay(factor);

  console.log(display.message);  // "¡Tienes un 8% de descuento!"
  console.log(display.icon);     // "🎉"
  console.log(display.color);    // "text-green-600"
  console.log(display.tips);     // ["Mantén tu excelente reputación..."]
}

// Obtener recomendaciones personalizadas
async showImprovementTips() {
  const tips = await this.bonusMalusService.getImprovementTips();
  tips.forEach(tip => console.log(tip));
  // "📊 Mejora tu rating: Actualmente tienes 3.8/5.0..."
  // "✅ Verifica tu identidad: Los usuarios verificados reciben hasta 3% de descuento..."
}

// Calcular impacto monetario
calculateImpact() {
  const basePrice = 1000;
  const factor = -0.08;

  const impact = this.bonusMalusService.calculateMonetaryImpact(basePrice, factor);

  console.log('Precio ajustado:', impact.adjustedPrice);  // 920
  console.log('Ahorro:', impact.difference);              // -80
  console.log('Porcentaje:', impact.percentageChange);    // -8
}
```

### Tipos TypeScript

```typescript
// apps/web/src/app/core/models/index.ts

export interface UserBonusMalus {
  user_id: string;
  total_factor: number;
  rating_factor: number;
  cancellation_factor: number;
  completion_factor: number;
  verification_factor: number;
  metrics: BonusMalusMetrics;
  last_calculated_at: string;
  next_recalculation_at: string;
  created_at: string;
  updated_at: string;
}

export interface BonusMalusDisplay {
  type: 'BONUS' | 'MALUS' | 'NEUTRAL';
  percentage: number;
  message: string;
  icon: string;
  color: string;
  tips?: string[];
}
```

---

## 🧪 Testing

### Tests Unitarios (Jasmine/Karma)

```bash
cd apps/web
npm install
npm test -- --include='**/bonus-malus.service.spec.ts'
```

**Cobertura de tests**:
- ✅ 15 test suites
- ✅ getUserBonusMalus: casos exitosos y errores
- ✅ calculateBonusMalus: cálculo correcto
- ✅ getBonusMalusDisplay: formateo de UI para BONUS/MALUS/NEUTRAL
- ✅ getImprovementTips: recomendaciones personalizadas
- ✅ calculateMonetaryImpact: cálculos de precio
- ✅ getBonusMalusStats: estadísticas agregadas

### Tests SQL (pgTAP o manual)

```bash
# Opción 1: Ejecutar directamente en Supabase
psql $DATABASE_URL -f apps/web/database/test-bonus-malus-system.sql

# Opción 2: Usando supabase CLI (local)
supabase db reset
supabase db push
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -f apps/web/database/test-bonus-malus-system.sql
```

**Test suites SQL**:
1. ✅ `calculate_user_bonus_malus`: 10 tests (usuarios excelente, bueno, promedio, pobre, nuevo)
2. ✅ `get_user_bonus_malus`: 4 tests (obtención y recalculación automática)
3. ✅ `calculate_dynamic_price`: 4 tests (integración con pricing dinámico)
4. ✅ `trigger_recalculate_bonus_malus`: 3 tests (recalculación automática)
5. ✅ Casos edge: 2 tests (límites -0.15 y +0.20)
6. ✅ `recalculate_all_bonus_malus`: 2 tests (recalculación masiva)

**Total**: 25 test cases SQL

---

## 🚀 Deployment

### Paso 1: Instalar Schema en Base de Datos

```bash
# Producción (Supabase)
psql $SUPABASE_DB_URL -f apps/web/database/setup-bonus-malus-system.sql

# O usando Supabase Dashboard:
# 1. Ir a SQL Editor
# 2. Copiar contenido de setup-bonus-malus-system.sql
# 3. Ejecutar
```

### Paso 2: Verificar Instalación

```sql
-- Verificar tabla creada
SELECT * FROM user_bonus_malus LIMIT 1;

-- Verificar funciones
SELECT calculate_user_bonus_malus('user-uuid-here');

-- Verificar trigger
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'user_stats'::regclass;
```

### Paso 3: Ejecutar Tests

```bash
psql $SUPABASE_DB_URL -f apps/web/database/test-bonus-malus-system.sql
```

### Paso 4: Configurar Cron Job (Opcional)

En Supabase Dashboard → Database → Cron Jobs:

```sql
-- Recalcular bonus-malus diariamente a las 3 AM
SELECT cron.schedule(
  'recalculate-bonus-malus-daily',
  '0 3 * * *',
  $$SELECT recalculate_all_bonus_malus()$$
);
```

### Paso 5: Desplegar Frontend

```bash
cd apps/web
npm run build
npm run deploy:pages
```

El servicio `BonusMalusService` estará disponible automáticamente vía dependency injection.

---

## 📊 Monitoreo y Analytics

### Queries Útiles

#### 1. Distribución de Factores

```sql
SELECT
  CASE
    WHEN total_factor < -0.05 THEN 'BONUS Significativo'
    WHEN total_factor < 0 THEN 'BONUS Pequeño'
    WHEN total_factor = 0 THEN 'NEUTRAL'
    WHEN total_factor <= 0.05 THEN 'MALUS Pequeño'
    ELSE 'MALUS Significativo'
  END as categoria,
  COUNT(*) as usuarios,
  AVG(total_factor) as factor_promedio,
  MIN(total_factor) as factor_minimo,
  MAX(total_factor) as factor_maximo
FROM user_bonus_malus
GROUP BY categoria
ORDER BY factor_promedio ASC;
```

#### 2. Usuarios con Mayor BONUS

```sql
SELECT
  p.full_name,
  bm.total_factor,
  (bm.metrics->>'average_rating')::NUMERIC as rating,
  (bm.metrics->>'completed_rentals')::INT as reservas,
  (bm.metrics->>'is_verified')::BOOLEAN as verificado
FROM user_bonus_malus bm
JOIN profiles p ON p.id = bm.user_id
WHERE bm.total_factor < 0
ORDER BY bm.total_factor ASC
LIMIT 10;
```

#### 3. Usuarios con Mayor MALUS

```sql
SELECT
  p.full_name,
  bm.total_factor,
  (bm.metrics->>'average_rating')::NUMERIC as rating,
  (bm.metrics->>'cancellation_rate')::NUMERIC as cancelaciones,
  (bm.metrics->>'completed_rentals')::INT as reservas
FROM user_bonus_malus bm
JOIN profiles p ON p.id = bm.user_id
WHERE bm.total_factor > 0
ORDER BY bm.total_factor DESC
LIMIT 10;
```

#### 4. Impacto Monetario Estimado

```sql
SELECT
  COUNT(*) as total_usuarios,
  SUM(CASE WHEN total_factor < 0 THEN 1 ELSE 0 END) as con_bonus,
  SUM(CASE WHEN total_factor > 0 THEN 1 ELSE 0 END) as con_malus,
  AVG(total_factor) * 100 as factor_promedio_pct,
  -- Si el alquiler promedio es $1000/día
  AVG(total_factor * 1000) as ajuste_promedio_por_dia
FROM user_bonus_malus;
```

---

## 🎨 UI Components (Recomendados)

### 1. Badge de Bonus-Malus en Checkout

```html
<div class="bonus-malus-badge" [ngClass]="display.color">
  <span class="icon">{{ display.icon }}</span>
  <span class="message">{{ display.message }}</span>
</div>

<!-- Ejemplo visual -->
🎉 ¡Tienes un 8% de descuento!  <!-- verde -->
⚠️ Tienes un 5% de recargo      <!-- naranja -->
```

### 2. Desglose en Cotización

```html
<div class="price-breakdown">
  <div class="line-item">
    <span>Precio base</span>
    <span>$1,000/día</span>
  </div>

  <div class="line-item bonus" *ngIf="bonusMalusFactor < 0">
    <span>Tu descuento 🎉</span>
    <span class="text-green-600">-$80/día</span>
  </div>

  <div class="line-item malus" *ngIf="bonusMalusFactor > 0">
    <span>Ajuste de riesgo ⚠️</span>
    <span class="text-orange-600">+$50/día</span>
  </div>

  <div class="line-item total">
    <span>Total</span>
    <span>$920/día</span>
  </div>
</div>
```

### 3. Página de Perfil: "Tu Reputación"

```html
<div class="reputation-card">
  <h3>Tu Factor Bonus-Malus</h3>

  <div class="factor-display">
    <span class="icon">{{ display.icon }}</span>
    <span class="percentage">{{ display.percentage }}%</span>
    <span class="type">{{ display.type }}</span>
  </div>

  <div class="metrics">
    <div class="metric">
      <span class="label">Rating</span>
      <span class="value">{{ metrics.average_rating | number:'1.1-1' }}/5.0</span>
    </div>
    <div class="metric">
      <span class="label">Reservas completadas</span>
      <span class="value">{{ metrics.completed_rentals }}</span>
    </div>
    <div class="metric">
      <span class="label">Tasa de cancelación</span>
      <span class="value">{{ metrics.cancellation_rate * 100 | number:'1.0-0' }}%</span>
    </div>
  </div>

  <div class="improvement-tips" *ngIf="tips.length > 0">
    <h4>Cómo mejorar tu descuento:</h4>
    <ul>
      <li *ngFor="let tip of tips">{{ tip }}</li>
    </ul>
  </div>
</div>
```

---

## 🔒 Seguridad y Privacidad

### Row Level Security (RLS)

```sql
-- Los usuarios pueden ver su propio factor
CREATE POLICY "Users can view own bonus-malus"
ON user_bonus_malus FOR SELECT
USING (auth.uid() = user_id);

-- Usuarios autenticados pueden ver factores de otros (transparencia)
CREATE POLICY "Authenticated users can view all bonus-malus"
ON user_bonus_malus FOR SELECT
USING (auth.role() = 'authenticated');
```

### Permisos de Funciones

- `calculate_user_bonus_malus`: `GRANT EXECUTE TO authenticated` ✅
- `get_user_bonus_malus`: `GRANT EXECUTE TO anon, authenticated` ✅
- `recalculate_all_bonus_malus`: `GRANT EXECUTE TO service_role` 🔒 (solo admin/cron)

### Auditoría

Cada cálculo registra:
- Timestamp del cálculo
- Próxima fecha de recalculación
- Métricas completas usadas (en campo `metrics` JSONB)

---

## 📈 Roadmap Futuro

### Fase 2 (Q2 2025)

- [ ] **Machine Learning**: Modelo predictivo para estimar factor antes de primera reserva
- [ ] **Segmentación**: Factores diferentes para autos premium vs económicos
- [ ] **Gamificación**: Logros y niveles (Bronce, Plata, Oro, Platino)
- [ ] **Personalización**: Configurar pesos de factores por región

### Fase 3 (Q3 2025)

- [ ] **A/B Testing**: Optimizar factores basándose en conversión
- [ ] **Predicción de churn**: Alertar cuando usuario va camino a MALUS
- [ ] **Notificaciones**: Email cuando factor mejora/empeora
- [ ] **Dashboard Admin**: Panel para ajustar factores manualmente

---

## 🤝 Soporte

### Preguntas Frecuentes

**Q: ¿Los usuarios pueden ver su factor antes de reservar?**
A: Sí, deberían ver su factor en su perfil y en la página de checkout.

**Q: ¿Con qué frecuencia se recalcula?**
A: Automáticamente cuando se actualiza `user_stats` (nuevo review, booking completado). Además, cada 7 días por cron.

**Q: ¿Puede un usuario pasar de MALUS a BONUS?**
A: Sí, completando reservas exitosas, mejorando su rating y evitando cancelaciones.

**Q: ¿Los propietarios de autos también tienen bonus-malus?**
A: Sí, el sistema considera tanto su rol de owner como de renter.

**Q: ¿Qué pasa si un usuario nuevo tiene mal factor?**
A: Usuarios nuevos no verificados tienen un ligero MALUS (+7%) que pueden eliminar verificando su identidad y completando sus primeras 5 reservas.

### Contacto

- **Repositorio**: [ecucondorSA/autorenta](https://github.com/ecucondorSA/autorenta)
- **Documentación técnica**: `/apps/web/database/setup-bonus-malus-system.sql`
- **Tests**: `/apps/web/database/test-bonus-malus-system.sql`

---

## 📝 Changelog

### v1.0.0 (2025-11-05)

- ✅ Implementación inicial del sistema bonus-malus
- ✅ 4 factores de evaluación (rating, cancelaciones, experiencia, verificación)
- ✅ Integración con `calculate_dynamic_price`
- ✅ Trigger de recalculación automática
- ✅ Servicio Angular `BonusMalusService`
- ✅ 15 tests unitarios Jasmine
- ✅ 25 tests SQL automatizados
- ✅ Documentación completa

---

**Implementado por**: Claude (Anthropic)
**Fecha**: 2025-11-05
**Versión**: 1.0.0
