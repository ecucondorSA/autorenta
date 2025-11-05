# Comandos de Testing - AutoRenta

## 📊 Coverage Report

### Generar Coverage
```bash
npm run test:coverage
```
Genera el reporte de coverage en `apps/web/coverage/index.html`

### Generar y Abrir Reporte
```bash
npm run test:coverage:report
```
Genera el coverage report y lo abre automáticamente en el navegador.

**Ubicación del reporte**: `apps/web/coverage/index.html`

---

## 🧪 Tests E2E (Playwright)

### Ejecutar Todos los Tests E2E
```bash
npm run test:e2e
```

### Tests Específicos

#### Flujo Completo de Pagos
```bash
npm run test:e2e -- tests/payments/complete-payment-flow-e2e.spec.ts
```

**Tests incluidos**:
- ✅ Pago completo con wallet
- ✅ Pago completo con tarjeta (MercadoPago)
- ✅ Manejo de errores (fondos insuficientes)
- ✅ Webhook de MercadoPago

#### Refunds y Cancellations
```bash
npm run test:e2e -- tests/renter/booking/06-cancel-and-refund.spec.ts
```

**Tests incluidos**:
- ✅ Cancelación dentro de ventana free (>24h) → refund completo
- ✅ Cancelación fuera de ventana (<24h) → sin refund
- ✅ Intento de cancelar booking ya iniciado → error

#### Marketplace Onboarding
```bash
npm run test:e2e -- tests/critical/01-publish-car-with-onboarding.spec.ts
```

**Tests incluidos**:
- ✅ Modal de onboarding aparece
- ✅ Alert de advertencia si cancela onboarding
- ✅ Permite publicar sin onboarding después de advertencia
- ✅ Permite publicar después de completar onboarding

### Opciones de Ejecución

#### UI Mode (Interactivo)
```bash
npm run test:e2e:ui
```

#### Debug Mode
```bash
npm run test:e2e:debug
```

#### Headed Mode (Ver navegador)
```bash
npm run test:e2e:headed
```

#### Ver Reporte HTML
```bash
npm run test:e2e:report
```

---

## 📝 Tests Unitarios (Karma/Jasmine)

### Ejecutar Tests
```bash
npm run test
```

### Tests Rápidos (sin coverage)
```bash
npm run test:quick
```

### Tests con Coverage
```bash
npm run test:coverage
```

---

## ⚠️ Notas Importantes

### Errores de Compilación TypeScript

Actualmente hay errores de TypeScript en algunos archivos de test que impiden la compilación completa:

- `apps/web/src/app/core/database/rpc-functions.spec.ts` - ✅ Corregido
- Otros archivos con problemas de tipos de Supabase mocks

**Para resolver**:
1. Revisar y corregir tipos en los mocks de Supabase
2. Asegurar que todos los mocks usen `as any` o tipos correctos
3. Ejecutar `npm run lint:fix` para verificar

### Prerrequisitos para E2E Tests

1. **Variables de entorno** (`.env.test`):
```bash
NG_APP_SUPABASE_URL=your_supabase_url
NG_APP_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
PLAYWRIGHT_BASE_URL=http://localhost:4200
```

2. **Servidor de desarrollo corriendo**:
```bash
npm run dev:web
```

3. **Browsers de Playwright instalados**:
```bash
npx playwright install
```

---

## 📈 Resumen de Cobertura

### Archivos Implementados

✅ **Coverage Report**:
- Configurado en `angular.json`
- Script de generación: `apps/web/scripts/generate-coverage-report.sh`
- Comando: `npm run test:coverage:report`

✅ **Tests E2E de Pagos**:
- `tests/payments/complete-payment-flow-e2e.spec.ts` (4 tests)

✅ **Tests de Refunds/Cancellations**:
- `tests/renter/booking/06-cancel-and-refund.spec.ts` (3 tests implementados)

✅ **Tests de Marketplace Onboarding**:
- `tests/critical/01-publish-car-with-onboarding.spec.ts` (mejorado)

---

## 🚀 Próximos Pasos

1. **Corregir errores de TypeScript** en tests unitarios
2. **Configurar threshold de coverage** en CI/CD (ej: 70%)
3. **Agregar coverage badge** al README
4. **Integrar coverage report** en GitHub Actions

---

**Última actualización**: 2025-11-04





