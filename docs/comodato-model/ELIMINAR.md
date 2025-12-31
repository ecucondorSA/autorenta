# ELIMINAR - Elementos a Remover

## Resumen
El modelo comodato **coexiste** con el modelo rental. No se elimina funcionalidad existente, solo se agrega nueva.

---

# 1. NADA QUE ELIMINAR EN FASE 1

El modelo de comodato se implementa como una **extensión** del sistema existente, no como un reemplazo.

### Razones:
1. **Backward Compatibility**: Bookings existentes tipo "rental" deben seguir funcionando
2. **Migración Gradual**: Owners pueden elegir su modo de compartición
3. **Rollback Seguro**: Si hay problemas, se puede volver a rental
4. **Testing**: Permite A/B testing entre modelos

---

# 2. DEPRECACIONES FUTURAS (FASE 2)

Cuando se migre 100% a comodato (decisión de negocio), considerar deprecar:

## 2.1 Columnas Candidatas a Deprecar

```sql
-- En bookings (cuando ya no haya bookings tipo 'rental')
-- NOTA: NO EJECUTAR AHORA, solo referencia futura

-- ALTER TABLE bookings DROP COLUMN owner_payment_amount;
-- (Reemplazado por rewards mensuales)

-- ALTER TABLE bookings DROP COLUMN platform_fee;
-- (Reemplazado por distribución fija 50/30/20)
```

## 2.2 Funciones Candidatas a Deprecar

```sql
-- Funciones que solo aplican a rental puro:
-- - calculate_owner_payout (si existe)
-- - process_owner_payment (si existe)
```

---

# 3. LIMPIEZA POST-MIGRACIÓN

## 3.1 Datos a Limpiar (Solo cuando 100% comodato)

```sql
-- Verificar que no quedan bookings rental activos
SELECT COUNT(*) FROM bookings
WHERE agreement_type = 'rental'
AND status NOT IN ('completed', 'cancelled');

-- Si COUNT = 0, es seguro proceder con deprecaciones
```

## 3.2 Índices Obsoletos (Futuro)

```sql
-- Índices que podrían ser innecesarios si no hay más rental:
-- DROP INDEX IF EXISTS idx_bookings_owner_payment;
```

---

# 4. RECOMENDACIÓN

## Timeline Sugerido:
1. **Mes 1-3**: Coexistencia (rental + comodato)
2. **Mes 4-6**: Migración gradual de owners a comodato
3. **Mes 7+**: Evaluar deprecación de rental

## Criterios para Deprecar Rental:
- [ ] 0% de bookings nuevos son tipo rental
- [ ] Todos los owners existentes migrados a comodato
- [ ] Sin issues legales pendientes
- [ ] Backup completo de datos históricos

---

# 5. ARCHIVOS DE CÓDIGO A ELIMINAR (FUTURO)

Cuando se deprece rental, evaluar:

```
apps/web/src/
├── app/features/
│   └── owner/
│       └── earnings/ (si se reemplaza completamente por rewards/)
│
└── core/services/
    └── owner-payout.service.ts (si existe, reemplazar por rewards.service.ts)
```

---

# 6. NOTAS IMPORTANTES

### NO ELIMINAR NUNCA:
1. **Datos históricos de bookings**: Necesarios para auditoría y legal
2. **Registros de pagos a owners**: Evidencia de transacciones pasadas
3. **Contratos aceptados**: Documentación legal

### ARCHIVAR EN VEZ DE ELIMINAR:
```sql
-- Crear tabla de archivo para datos legacy
CREATE TABLE IF NOT EXISTS archived_owner_payments (
  -- Copia de estructura original
  LIKE payment_splits INCLUDING ALL
);

-- Mover datos legacy antes de limpiar
INSERT INTO archived_owner_payments
SELECT * FROM payment_splits WHERE agreement_type = 'rental';
```
