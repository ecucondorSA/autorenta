# Driver Profile - Bugs Encontrados en Testing

## Fecha: 2025-12-03

### Bugs Corregidos (en BD)

#### 1. Función `purchase_bonus_protector` rota
**Archivo:** `supabase/migrations/20251203_fix_bonus_protector_function.sql`

**Problemas encontrados:**
- Usaba columna `status` pero la tabla usa `is_active` (boolean)
- Usaba `purchased_at` pero la tabla usa `purchase_date`
- Usaba `BONUS_PROTECTOR` pero el constraint exige minúsculas `bonus_protector`
- Usaba `transaction_type` pero wallet_transactions usa `type`
- Usaba `amount_cents` pero la tabla usa `amount` (en dólares)
- Usaba `notes` pero la tabla usa `description`
- Usaba tipo `debit` pero el constraint exige `charge` con monto negativo
- Usaba `addon_purchase` como reference_type pero no es válido

**Estado:** CORREGIDO

#### 2. Función `update_driver_class_on_event` no actualizaba score
**Archivo:** `supabase/migrations/20251203_fix_driver_score_on_claims.sql`

**Problema:** Al registrar un siniestro, solo se actualizaba la clase pero no el `driver_score`.

**Estado:** CORREGIDO

#### 5. Función `improve_driver_class_annual` tenía referencia ambigua
**Archivo:** `supabase/migrations/20251203_fix_annual_improvement_function.sql`

**Problema:** Error `column reference "good_years" is ambiguous` al ejecutar la función.

**Causa:** Los nombres de campos en el RECORD (`rec.good_years`) conflictuaban con los nombres de columnas de la tabla `driver_risk_profile`.

**Solución aplicada:** Renombrar los campos del RECORD con aliases únicos:
```sql
SELECT
  drp.user_id as uid,
  drp.class as current_class,
  drp.good_years as years_good,  -- renamed
  ...
FROM driver_risk_profile drp
```

**Estado:** CORREGIDO

---

### Bugs Corregidos (en UI)

#### 3. Página `/protections` - ion-content con height: 0px
**Archivo:** `apps/web/src/app/features/protections/protections.page.ts`

**Problema:** El contenido de la página existe en el DOM pero no es visible. El `ion-content` tiene altura 0px.

**Causa:** En standalone components de Angular con Ionic, el host element no tenía dimensiones establecidas, causando que `ion-content` (que usa `contain: size`) colapsara a 0px.

**Solución aplicada:** Agregar CSS al `:host` con `position: absolute` y bounds explícitos:
```css
:host {
  display: block;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  contain: layout size style;
}
```

**Estado:** CORREGIDO

#### 4. Botón PROTEGER no aparece para clase >= 8
**Archivo:** `apps/web/src/app/features/driver-profile/driver-profile.page.ts:1579`

**Problema:** Conductores con clase 8, 9 o 10 no podían ver el botón de compra de protección.

**Solución aplicada:** Eliminada la restricción de clase, ahora cualquier conductor sin protección activa puede ver el botón:
```typescript
needsProtection(): boolean {
  if (this.bonusProtectorService.error()) {
    return false;
  }
  return !this.hasActiveProtector();
}
```

**Estado:** CORREGIDO

---

### Resumen de Testing

| Funcionalidad | Estado |
|--------------|--------|
| Driver Profile carga correctamente | OK |
| Clase y Score se muestran | OK |
| Siniestros actualizan clase | OK |
| Siniestros actualizan score | OK (después de fix) |
| Compra de Protector Bonus (BD) | OK (después de fix) |
| Compra de Protector Bonus (UI) | OK (después de fix CSS) |
| Botón PROTEGER visible clase <= 7 | OK |
| Botón PROTEGER visible clase >= 8 | OK (después de fix) |
| Mejora anual de clase | OK (después de fix) |
| Historial de siniestros en UI | OK |
