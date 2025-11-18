# Tracking Dashboard - AutoRenta Beta
**Launch Date**: 1 Diciembre 2025
**Google Sheets Link**: [Tu link acá]

## Weekly Metrics Template

Copiar esto a Google Sheets:

```
| Semana | Fecha Inicio | Usuarios Registrados | Locadores | Rentadores | Autos Publicados | Bookings Iniciados | Bookings Completados | GMV (ARS) | Comisión (USD) | CAC | LTV | NPS | Notas |
|--------|--------------|----------------------|-----------|------------|------------------|-------------------|---------------------|-----------|----------------|-----|-----|-----|-------|
| 1 | 1-Dic | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | N/A | N/A | N/A | Beta launch |
| 2 | 8-Dic | | | | | | | | | | | | |
| 3 | 15-Dic | | | | | | | | | | | | |
| 4 | 22-Dic | | | | | | | | | | | | |
| 5 | 29-Dic | | | | | | | | | | | | |
| 6 | 5-Ene | | | | | | | | | | | | |
| 7 | 12-Ene | | | | | | | | | | | | |
| 8 | 19-Ene | | | | | | | | | | | | |
| 9 | 26-Ene | | | | | | | | | | | | |
| 10 | 2-Feb | | | | | | | | | | | | |
| 11 | 9-Feb | | | | | | | | | | | | |
| 12 | 16-Feb | | | | | | | | | | | | |
```

## Queries SQL para Métricas (Copiar a Supabase)

### 1. Usuarios Registrados (Total)
```sql
SELECT 
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week
FROM auth.users;
```

### 2. Locadores vs Rentadores
```sql
SELECT 
  COUNT(DISTINCT owner_id) as total_locadores,
  COUNT(DISTINCT renter_id) as total_rentadores
FROM bookings;
```

### 3. Autos Publicados
```sql
SELECT 
  COUNT(*) as total_cars,
  COUNT(*) FILTER (WHERE status = 'active') as active_cars,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_this_week
FROM cars;
```

### 4. Bookings por Status
```sql
SELECT 
  status,
  COUNT(*) as count,
  SUM(total_price_cents) / 100.0 as total_ars
FROM bookings
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY status
ORDER BY count DESC;
```

### 5. GMV (Gross Merchandise Value) - Semanal
```sql
SELECT 
  DATE_TRUNC('week', created_at) as week,
  COUNT(*) as bookings,
  SUM(total_price_cents) / 100.0 as gmv_ars,
  SUM(platform_fee_cents) / 100.0 as commission_ars
FROM bookings
WHERE status IN ('confirmed', 'active', 'completed')
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

### 6. Comisión USD (Conversión ARS/USD)
```sql
SELECT 
  DATE_TRUNC('week', created_at) as week,
  SUM(platform_fee_cents) / 100.0 as commission_ars,
  (SUM(platform_fee_cents) / 100.0) / 1000.0 as commission_usd_approx
FROM bookings
WHERE status IN ('confirmed', 'active', 'completed')
  AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;
```

### 7. CAC (Customer Acquisition Cost) - Manual
```
CAC = Total Marketing Spend (USD) / New Users This Week

Ejemplo:
- Gastaste $50 USD en ads
- Conseguiste 25 usuarios nuevos
- CAC = $50 / 25 = $2 USD por usuario
```

### 8. LTV (Lifetime Value) - Estimado
```sql
-- LTV simple: Average booking value × Average bookings per user
WITH user_bookings AS (
  SELECT 
    renter_id,
    COUNT(*) as booking_count,
    AVG(total_price_cents) as avg_booking_value_cents
  FROM bookings
  WHERE status = 'completed'
  GROUP BY renter_id
)
SELECT 
  AVG(booking_count) as avg_bookings_per_user,
  AVG(avg_booking_value_cents) / 100.0 as avg_booking_value_ars,
  (AVG(booking_count) * AVG(avg_booking_value_cents) * 0.15) / 100.0 as ltv_commission_ars
FROM user_bookings;
```

### 9. Churn Rate - Mensual
```sql
-- Usuarios activos mes pasado que NO hicieron booking este mes
WITH last_month_active AS (
  SELECT DISTINCT renter_id
  FROM bookings
  WHERE created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days'
),
this_month_active AS (
  SELECT DISTINCT renter_id
  FROM bookings
  WHERE created_at >= NOW() - INTERVAL '30 days'
)
SELECT 
  COUNT(lm.renter_id) as users_last_month,
  COUNT(tm.renter_id) as users_this_month,
  COUNT(lm.renter_id) - COUNT(tm.renter_id) as churned_users,
  ((COUNT(lm.renter_id) - COUNT(tm.renter_id))::FLOAT / COUNT(lm.renter_id) * 100) as churn_rate_percent
FROM last_month_active lm
LEFT JOIN this_month_active tm ON lm.renter_id = tm.renter_id;
```

### 10. NPS (Net Promoter Score) - Manual
```
Después de cada booking, preguntar:
"Del 0 al 10, ¿qué probabilidad hay de que recomiendes AutoRenta a un amigo?"

NPS = % Promotores (9-10) - % Detractores (0-6)

Ejemplo:
- 7 promotores (70%)
- 2 pasivos (20%)
- 1 detractor (10%)
- NPS = 70 - 10 = 60 (Excelente)
```

## Objetivos por Fase

### Fase 1: Beta Cerrada (Semana 1-4)
- [ ] 10 usuarios registrados
- [ ] 5 autos publicados
- [ ] 5 bookings completados
- [ ] 0 bugs críticos en producción
- [ ] NPS > 40

### Fase 2: Beta Abierta (Semana 5-8)
- [ ] 30 usuarios registrados (crecimiento 20%+ semanal)
- [ ] 15 autos publicados
- [ ] 15-20 bookings completados
- [ ] CAC < $10 USD
- [ ] NPS > 50

### Fase 3: Decisión (Semana 9-12)
- [ ] 50+ usuarios registrados
- [ ] 30+ bookings/mes
- [ ] LTV > $100 USD
- [ ] CAC < $10 USD
- [ ] Churn < 30%
- [ ] NPS > 60

## KPIs Críticos - Semáforo

### 🟢 VERDE (Continuar full speed)
- Bookings/mes: >30
- Crecimiento semanal: >20%
- CAC/LTV ratio: <0.3
- NPS: >60
- Bugs críticos: 0

### 🟡 AMARILLO (Ajustar estrategia)
- Bookings/mes: 10-30
- Crecimiento semanal: 5-20%
- CAC/LTV ratio: 0.3-0.7
- NPS: 40-60
- Bugs críticos: 1-2

### 🔴 ROJO (Pivotar o vender)
- Bookings/mes: <10
- Crecimiento semanal: <5%
- CAC/LTV ratio: >0.7
- NPS: <40
- Bugs críticos: >2

## Dashboard Visual (Recomendado)

**Herramientas gratuitas**:
1. **Google Sheets** + Google Data Studio (reportes automáticos)
2. **Metabase** (open source, conecta a Supabase)
3. **Grafana** (si ya usás monitoring)

**Lo más simple**: Copia las queries SQL arriba, córrelas cada Lunes, pegá resultados en Google Sheets.

## Alertas Automáticas

### Crear estas alertas en Supabase (opcional):

**1. Alerta de Bug Crítico**
```sql
-- Si hay >3 errores 500 en 1 hora, enviar email
SELECT COUNT(*)
FROM logs
WHERE status_code = 500
  AND created_at >= NOW() - INTERVAL '1 hour';
```

**2. Alerta de Booking Stuck**
```sql
-- Si un booking está en "pending" >24 horas
SELECT *
FROM bookings
WHERE status = 'pending'
  AND created_at < NOW() - INTERVAL '24 hours';
```

**3. Alerta de Churn Alto**
```sql
-- Si 3 usuarios consecutivos cancelan después del primer booking
SELECT COUNT(DISTINCT user_id)
FROM bookings
WHERE status = 'cancelled'
  AND created_at >= NOW() - INTERVAL '7 days';
```

## Weekly Review Template

**Todos los Lunes 10am**:

1. ✅ Correr las 10 queries SQL
2. ✅ Actualizar Google Sheets
3. ✅ Revisar alertas críticas
4. ✅ Identificar 1 métrica para mejorar esta semana
5. ✅ Documentar aprendizajes en "Notas"

**Ejemplo de notas**:
- "Semana 2: 80% de usuarios llegan desde Instagram post"
- "Semana 3: Usuarios piden delivery del auto, considerar implementar"
- "Semana 4: Locadores en zona norte generan 2x bookings vs zona sur"

## Exportar Métricas para Inversores

Si llegas a fase de fundraising, exportá:
- GMV mensual (últimos 6 meses)
- Crecimiento MoM %
- CAC, LTV, Churn
- Unit economics (comisión por booking)
- Cohort analysis (retención por mes de registro)

---

**Última actualización**: 15 Nov 2025
