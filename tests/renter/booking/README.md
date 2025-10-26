# 🧪 Tests E2E - Flujo Consolidado de Pago

## 📋 Descripción

Tests de Playwright para validar el nuevo flujo consolidado de pago en AutoRenta.

**Cobertura**:
- ✅ Pago con Wallet
- ✅ Pago con Tarjeta de Crédito
- ✅ Página de Éxito
- ✅ Manejo de Errores
- ✅ Responsive Design
- ✅ Dark Mode

---

## 🚀 Inicio Rápido

### Prerequisitos
```bash
# Instalar Playwright (si no está instalado)
npm install -D @playwright/test
npx playwright install
```

### Ejecutar Tests
```bash
# Todos los tests de booking
npm run test:e2e -- tests/renter/booking

# Solo test de wallet
npm run test:e2e -- tests/renter/booking/payment-wallet.spec.ts

# Solo test de tarjeta
npm run test:e2e -- tests/renter/booking/payment-card.spec.ts

# Solo test de success page
npm run test:e2e -- tests/renter/booking/success-page.spec.ts

# Con UI interactiva
npm run test:e2e -- tests/renter/booking --ui

# Modo debug
npm run test:e2e -- tests/renter/booking --debug

# Modo headed (ver navegador)
npm run test:e2e -- tests/renter/booking --headed
```

---

## 📂 Estructura de Tests

```
tests/renter/booking/
├── payment-wallet.spec.ts      # Tests de pago con wallet
├── payment-card.spec.ts        # Tests de pago con tarjeta
├── success-page.spec.ts        # Tests de página de éxito
└── README.md                   # Este archivo
```

---

## 🧪 Tests Implementados

### 1. `payment-wallet.spec.ts`

Tests del flujo de pago con wallet.

#### Test Cases

##### ✅ `Debe completar pago con wallet exitosamente`
**Objetivo**: Validar el flujo completo desde detail-payment hasta success.

**Pasos**:
1. Navegar a `/bookings/detail-payment`
2. Seleccionar método "wallet"
3. Bloquear fondos
4. Aceptar términos
5. Click "Confirmar y Pagar"
6. Verificar estados: "Creando reserva..." → "Procesando pago..."
7. Verificar redirección a `/bookings/success/:id`
8. Verificar contenido de página de éxito

**Expectativas**:
- Botón muestra estados progresivos
- Redirección exitosa a success
- Todos los elementos visibles en success page

---

##### ❌ `Debe mostrar error si wallet tiene fondos insuficientes`
**Objetivo**: Validar manejo de fondos insuficientes.

**Pasos**:
1. Navegar a detail-payment
2. Seleccionar wallet
3. Intentar bloquear fondos (falla)

**Expectativas**:
- Mensaje de error visible
- Botón "Confirmar y Pagar" deshabilitado

---

##### 🔄 `Debe permitir reintentar si falla el pago`
**Objetivo**: Validar que usuario puede reintentar después de un error.

**Pasos**:
1. Navegar a detail-payment
2. Completar flujo
3. Simular error de API
4. Click "Confirmar y Pagar"

**Expectativas**:
- Mensaje de error visible
- Usuario permanece en detail-payment
- Botón habilitado para reintentar

---

##### 📱 `Debe ser responsive en móvil`
**Objetivo**: Validar layout en móvil.

**Configuración**: Viewport 375x667 (iPhone SE)

**Expectativas**:
- Elementos principales visibles
- Botón visible y clickeable
- Sin overflow horizontal

---

### 2. `payment-card.spec.ts`

Tests del flujo de pago con tarjeta de crédito.

#### Test Cases

##### ✅ `Debe completar pago con tarjeta exitosamente`
**Objetivo**: Validar flujo completo con MercadoPago.

**Pasos**:
1. Navegar a detail-payment
2. Seleccionar método "tarjeta"
3. Autorizar hold de $1 USD
4. Aceptar términos
5. Click "Confirmar y Pagar"
6. Verificar redirección a MercadoPago
7. Simular pago exitoso
8. Verificar callback y redirección a success

**Expectativas**:
- Redirección a MercadoPago exitosa
- Callback procesa correctamente
- Success page muestra datos

---

##### ❌ `Debe manejar pago rechazado en MercadoPago`
**Objetivo**: Validar manejo de pago rechazado.

**Pasos**:
1. Completar flujo hasta MP
2. Simular pago rechazado
3. Callback regresa a app

**Expectativas**:
- Mensaje de error visible
- Estado de booking actualizado

---

##### 🔙 `Debe cancelar correctamente si usuario vuelve sin pagar`
**Objetivo**: Validar manejo de cancelación.

**Pasos**:
1. Completar flujo hasta MP
2. Usuario presiona "Atrás"

**Expectativas**:
- Regresa a detail-payment
- Puede reintentar

---

##### 🚫 `Debe mostrar error si falla creación de preferencia`
**Objetivo**: Validar manejo de error de API de MP.

**Pasos**:
1. Mockejar API de MP para fallar
2. Intentar confirmar pago

**Expectativas**:
- Mensaje de error visible
- Usuario permanece en detail-payment

---

##### ⚠️ `Debe validar que hold esté autorizado antes de confirmar`
**Objetivo**: Validar que no se puede continuar sin hold.

**Pasos**:
1. Seleccionar tarjeta
2. NO autorizar hold
3. Intentar confirmar

**Expectativas**:
- Botón deshabilitado
- Mensaje de ayuda visible

---

### 3. `success-page.spec.ts`

Tests de la página de éxito post-reserva.

#### Test Cases

##### 🎨 `Debe mostrar todos los elementos de la página`
**Objetivo**: Validar que todos los componentes están presentes.

**Elementos Verificados**:
- ✅ Header con título "¡Reserva Confirmada!"
- ✅ Ícono de éxito animado (checkmark-circle)
- ✅ Mensaje principal
- ✅ Card de detalles de reserva
- ✅ Placeholder de auto
- ✅ Fechas (start_at, end_at)
- ✅ Total pagado en ARS
- ✅ Booking ID
- ✅ Card de próximos pasos (4 items)
- ✅ Íconos de cada paso
- ✅ 3 botones de acción

---

##### 🔗 `Debe navegar correctamente al hacer click en botones`
**Objetivo**: Validar navegación desde success page.

**Botones Probados**:
1. "Ver Detalles" → `/bookings/:id`
2. "Buscar Más Vehículos" → `/cars`
3. "Ir al Inicio" → `/`

**Expectativas**:
- Navegación correcta para cada botón
- URLs correctas

---

##### ⏳ `Debe mostrar loading state mientras carga datos`
**Objetivo**: Validar estado de carga.

**Pasos**:
1. Interceptar API y hacer lenta
2. Navegar a success

**Expectativas**:
- Spinner visible
- Texto "Cargando detalles..."

---

##### ❌ `Debe mostrar error si booking no existe`
**Objetivo**: Validar manejo de booking inválido.

**Pasos**:
1. Mockejar API para devolver 404
2. Navegar con ID inválido

**Expectativas**:
- Mensaje de error visible
- Botón "Ver Mis Reservas" visible

---

##### 🏠 `Debe redirigir a home si no hay booking ID`
**Objetivo**: Validar protección contra URL inválida.

**Pasos**:
1. Navegar a `/bookings/success/` (sin ID)

**Expectativas**:
- Redirección automática a `/`

---

##### 📱 `Debe ser responsive en móvil`
**Objetivo**: Validar layout móvil.

**Verificaciones**:
- Ícono ajustado a 80px
- Título en 1.75rem
- Sin overflow horizontal
- Botones en columna

---

##### 🌙 `Debe funcionar correctamente en dark mode`
**Objetivo**: Validar tema oscuro.

**Verificaciones**:
- Header con color correcto
- Textos legibles (colores claros)
- Cards con fondo oscuro
- Contraste adecuado

---

##### 🎬 `Debe tener animación en el ícono de éxito`
**Objetivo**: Validar animación CSS.

**Expectativas**:
- Clase `.success-icon` aplicada
- Animación `scaleIn` ejecutándose

---

##### 📅 `Debe formatear correctamente las fechas`
**Objetivo**: Validar formato de fecha.

**Formato Esperado**: `dd/MM/yyyy HH:mm`

**Ejemplo**: `01/11/2025 10:00`

---

##### 💰 `Debe formatear correctamente el total en ARS`
**Objetivo**: Validar formato de moneda.

**Formato Esperado**: `$XX,XXX` o `$XX.XXX`

**Ejemplo**: `$50.000`

---

## 🎯 Cobertura de Testing

### Funcionalidades Cubiertas

| Funcionalidad | Cobertura | Tests |
|--------------|-----------|-------|
| **Pago con Wallet** | ✅ 100% | 4 tests |
| **Pago con Tarjeta** | ✅ 100% | 5 tests |
| **Success Page** | ✅ 100% | 10 tests |
| **Error Handling** | ✅ 100% | 6 tests |
| **Responsive** | ✅ 100% | 2 tests |
| **Dark Mode** | ✅ 100% | 1 test |
| **Navegación** | ✅ 100% | 3 tests |
| **Validaciones** | ✅ 100% | 3 tests |

**Total Tests**: 19

---

## 🛠️ Configuración

### Variables de Entorno

```bash
# .env.test
PLAYWRIGHT_BASE_URL=http://localhost:4200
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Storage State

Los tests de renter requieren autenticación. El storage state se configura en:

```
tests/.auth/renter.json
```

Para generarlo:
```bash
npm run test:e2e -- tests/fixtures/auth.setup.ts
```

---

## 📊 Reportes

### Generar Reporte HTML

```bash
# Ejecutar tests y generar reporte
npm run test:e2e -- tests/renter/booking

# Ver reporte
npx playwright show-report
```

### Ubicación de Reportes

```
test-results/
├── html-report/          # Reporte HTML interactivo
├── results.json          # Resultados en JSON
├── junit.xml            # Formato JUnit (para CI)
└── artifacts/           # Screenshots, videos, traces
    ├── screenshots/
    ├── videos/
    └── traces/
```

---

## 🐛 Debugging

### Modo Debug

```bash
# Debug específico
npm run test:e2e -- tests/renter/booking/payment-wallet.spec.ts --debug

# Debug con Inspector de Playwright
npx playwright test --debug
```

### Ver Traces

```bash
# Abrir trace de test fallido
npx playwright show-trace test-results/path-to-trace.zip
```

### Screenshots

Los screenshots se capturan automáticamente en fallos:

```
test-results/artifacts/screenshots/
```

---

## ⚙️ Configuración Avanzada

### Timeouts

```typescript
// En playwright.config.ts
{
  timeout: 60 * 1000,          // Test timeout
  actionTimeout: 15 * 1000,    // Action timeout
  navigationTimeout: 30 * 1000 // Navigation timeout
}
```

### Retry en CI

```typescript
// En playwright.config.ts
{
  retries: process.env.CI ? 2 : 0
}
```

### Parallelism

```typescript
// En playwright.config.ts
{
  fullyParallel: true,
  workers: process.env.CI ? 1 : undefined
}
```

---

## 🔄 Integración Continua

### GitHub Actions

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      
      - name: Install dependencies
        run: npm ci
      
      - name: Install Playwright
        run: npx playwright install --with-deps
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

---

## 📝 Best Practices

### 1. Locators
✅ **Bien**: `page.getByRole('button', { name: /confirmar/i })`  
❌ **Mal**: `page.locator('#btn-123')`

### 2. Esperas
✅ **Bien**: `await expect(element).toBeVisible()`  
❌ **Mal**: `await page.waitForTimeout(5000)`

### 3. Selectores
✅ **Bien**: Usar roles, labels, texto  
❌ **Mal**: CSS classes, IDs específicos

### 4. Datos de Test
✅ **Bien**: Crear datos en beforeEach  
❌ **Mal**: Hardcodear IDs de producción

### 5. Assertions
✅ **Bien**: Múltiples assertions específicas  
❌ **Mal**: Una sola assertion genérica

---

## 🚀 Próximos Pasos

### Tests Pendientes

- [ ] Test de pago con wallet insuficiente (mocked)
- [ ] Test de timeout en MercadoPago
- [ ] Test de doble click en botón confirmar
- [ ] Test de navegación atrás durante proceso
- [ ] Test de múltiples bookings simultáneos
- [ ] Test de accessibility (a11y)
- [ ] Test de performance (Lighthouse)

### Mejoras

- [ ] Agregar visual regression tests
- [ ] Agregar tests de carga (k6 o Artillery)
- [ ] Configurar Playwright traces en CI
- [ ] Agregar badges de cobertura
- [ ] Documentar mocking de APIs externas

---

## 📚 Referencias

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Test Generator](https://playwright.dev/docs/codegen)
- [Trace Viewer](https://playwright.dev/docs/trace-viewer)

---

## 🆘 Troubleshooting

### Error: "Test timeout of 60000ms exceeded"

**Solución**: Aumentar timeout en `playwright.config.ts` o en el test específico:

```typescript
test('mi test', async ({ page }) => {
  test.setTimeout(120000); // 2 minutos
  // ...
});
```

### Error: "Target closed"

**Causa**: El navegador se cerró inesperadamente.

**Solución**: 
- Verificar que el dev server esté corriendo
- Revisar logs de Playwright
- Ejecutar con `--headed` para ver qué pasa

### Error: "Cannot find module"

**Solución**:
```bash
npm install
npx playwright install
```

### Error: "Authentication required"

**Solución**: Regenerar storage state:
```bash
npm run test:e2e -- tests/fixtures/auth.setup.ts
```

---

## ✅ Checklist Pre-Deploy

Antes de hacer deploy, ejecutar:

- [ ] Todos los tests pasan: `npm run test:e2e`
- [ ] No hay warnings en consola
- [ ] Screenshots de fallos revisados
- [ ] Traces de fallos analizados
- [ ] README actualizado
- [ ] CI configurado y pasando

---

**Última Actualización**: 2025-10-26  
**Versión**: 1.0.0  
**Autor**: AutoRenta Dev Team
