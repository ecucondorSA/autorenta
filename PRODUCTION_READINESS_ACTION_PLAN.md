# Plan de Acción: Preparación para Producción

**Estado Actual**: La app tiene el flujo funcional completo, pero no está lista para prometer/cumplir sin riesgo  
**Objetivo**: Cerrar brechas críticas antes de producción  
**Fecha**: 2025-10-27

---

## 🚨 Situación Actual

### ✅ Lo que funciona
- Páginas de publicación, listado, detalle y checkout presentes
- Mejoras de value_usd, reserva previa, pagos consolidados implementadas
- Owner improvements aplicados
- Sin errores de lint (0 errors)

### ❌ Brechas Críticas
1. **Tests Unitarios**: Build falla - no pueden ejecutarse los tests
2. **Lint Warnings**: 485+ warnings (any, unused imports, lifecycle)
3. **E2E Tests**: No ejecutados desde últimos cambios críticos
4. **Mocks Incompletos**: Supabase real requerido en varios tests

---

## 📋 Plan de Acción (3 Fases)

### **FASE 1: Arreglar Build de Tests** ⏱️ 2-3 horas
**Estado**: 🔴 BLOQUEANTE - Build falla completamente

#### Problema Principal
`apps/web/src/app/core/services/cars.service.spec.ts` tiene errores de compilación:
- Variables `builder`, `result`, `rows`, `supabase`, `service` no definidas (scope issues)
- Líneas duplicadas (74-77)
- Cierre de bloque incorrecto (124)

#### Acciones
```bash
# 1.1 Revisar y arreglar cars.service.spec.ts
- Identificar bloques de prueba rotos/incompletos
- Restaurar estructura correcta de describe/it
- Asegurar que mocks de Supabase estén en beforeEach

# 1.2 Validar que compila
cd autorenta
pnpm test:quick

# 1.3 Documentar mocks faltantes para Fase 2
```

**Resultado Esperado**: `pnpm test:quick` ejecuta (aunque fallen tests), no error de build

---

### **FASE 2: Completar Mocks y Tests en Verde** ⏱️ 1-2 días

#### Situación
- Tests requieren Supabase real o APIs del navegador
- Sin mocks → comportamiento no verificable
- 33 tests fallan (estimado pre-build-fix)

#### Acciones Prioritarias
```bash
# 2.1 Mocks Core (CRÍTICO)
□ apps/web/src/app/core/services/auth.service.spec.ts
□ apps/web/src/app/core/services/bookings.service.spec.ts  
□ apps/web/src/app/core/services/cars.service.spec.ts
□ apps/web/src/app/core/services/wallet.service.spec.ts

# 2.2 Estrategia de Mocking
- Crear mock factory para SupabaseClient en testing/
- Mockear navigator.geolocation para pruebas de ubicación
- Stub para HttpClient (pagos MP, exchange rate)
- Mock Storage API (localStorage/sessionStorage)

# 2.3 Tests de Componentes Críticos
□ apps/web/src/app/features/bookings/create/create.page.spec.ts
□ apps/web/src/app/features/cars/list/list.page.spec.ts
□ apps/web/src/app/features/cars/publish/publish.page.spec.ts
□ apps/web/src/app/features/wallet/deposit/deposit.page.spec.ts

# 2.4 Validación Continua
pnpm test:quick --watch  # mientras se arreglan
pnpm test:coverage       # al final para ver cobertura
```

**Resultado Esperado**: `pnpm test:quick` pasa con 0 failures

---

### **FASE 3: Reducir Deuda Técnica (Warnings)** ⏱️ 1-2 días

#### Situación
- 485 warnings de lint (no bloquean ejecución)
- Tipos `any` sin control
- Imports sin uso
- Lifecycle interfaces no implementadas

#### Acciones por Categoría

##### 3.1 Tipos `any` (~300 warnings)
```typescript
// Prioridad: servicios core y páginas críticas
# Archivos clave:
- apps/web/src/app/core/services/*.service.ts
- apps/web/src/app/features/bookings/**/*.ts
- apps/web/src/app/features/cars/publish/*.ts

# Estrategia:
// ❌ Antes
function process(data: any) { ... }

// ✅ Después  
interface ProcessData { id: string; value: number; }
function process(data: ProcessData) { ... }
```

##### 3.2 Imports no usados (~100 warnings)
```bash
# Automatizable
pnpm lint:fix  # ya limpia algunos
# Revisar manualmente los que quedan
```

##### 3.3 Lifecycle Interfaces (~50 warnings)
```typescript
// ❌ Antes
export class MyComponent {
  ngOnDestroy() { ... }
}

// ✅ Después
export class MyComponent implements OnDestroy {
  ngOnDestroy() { ... }
}
```

##### 3.4 Variables no usadas (~35 warnings)
```bash
# Revisar caso por caso:
- Si es dead code → eliminar
- Si se usa indirectamente → comentar @typescript-eslint/no-unused-vars
```

**Resultado Esperado**: < 100 warnings (reducción 80%), eliminando críticos

---

## 🧪 Validación E2E (Post-Fases 1-3)

### Tests a Ejecutar
```bash
# Flujo Locador (publicación → gestión)
pnpm test:e2e tests/owner/

# Flujo Locatario (búsqueda → reserva → pago)
pnpm test:e2e tests/renter/booking/

# Wallet (depósito → retiro)
pnpm test:e2e tests/wallet/

# Smoke completo
pnpm test:e2e
```

### Checklist Manual (si E2E pasa)
- [ ] Publicar auto (fotos, ubicación, precio)
- [ ] Buscar en mapa y lista
- [ ] Crear reserva (fechas, seguros)
- [ ] Pagar con tarjeta
- [ ] Pagar con wallet
- [ ] Aprobar/rechazar reserva (owner)
- [ ] Chat entre partes
- [ ] Depositar a wallet vía MercadoPago
- [ ] Retirar de wallet

---

## 📊 Criterios de Aprobación

### ✅ MÍNIMOS para Producción
- [x] `pnpm build` exitoso (YA CUMPLE)
- [ ] `pnpm test:quick` 0 failures
- [ ] `pnpm test:e2e` smoke tests pasan (mínimo renter/booking + wallet)
- [ ] < 150 lint warnings (prioridad: sin `any` en servicios críticos)
- [ ] Prueba manual de 3 flujos clave sin errores

### 🎯 IDEAL (Post-Launch)
- [ ] `pnpm test:coverage` > 60% en services/
- [ ] < 50 lint warnings
- [ ] E2E completo automatizado en CI/CD
- [ ] Monitoreo de errores en producción (Sentry/CloudFlare)

---

## 🗓️ Cronograma Sugerido

| Día | Fase | Horas | Entregable |
|-----|------|-------|-----------|
| **Día 1 AM** | Fase 1 | 3h | Tests compilan y ejecutan |
| **Día 1 PM + Día 2** | Fase 2 | 12h | Tests en verde |
| **Día 3** | Fase 3 | 6h | Warnings < 150 |
| **Día 4** | E2E | 4h | Smoke tests + manual QA |
| **Día 5** | Buffer | 3h | Ajustes finales |

**Total**: ~28 horas de trabajo efectivo (~1 semana calendario)

---

## 🚀 Siguiente Acción

```bash
# EMPEZAR AQUÍ:
cd autorenta
git checkout -b fix/production-readiness

# 1. Arreglar cars.service.spec.ts
code apps/web/src/app/core/services/cars.service.spec.ts

# 2. Validar que compila
pnpm test:quick

# 3. Continuar con FASE 2 según plan
```

---

## 📝 Notas Importantes

1. **No tocar código funcional**: Solo arreglar tests/tipos/warnings
2. **Tests primero**: Sin tests verdes, no podemos validar cambios
3. **E2E es obligatorio**: Los tests unitarios no detectan problemas de integración
4. **Warnings son señal**: Aunque no bloquean, indican fragilidad del código

## 🔗 Referencias

- `AGENTS.md` - Guías del proyecto
- `tests/` - Suites E2E existentes
- `apps/web/src/app/core/services/` - Servicios a mockear
- `package.json` - Scripts de testing disponibles
