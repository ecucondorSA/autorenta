# 🔍 Debug MercadoPago SDK - Guía de Uso

Script automatizado para diagnosticar problemas con el SDK de MercadoPago en AutoRenta.

## 🚀 Uso Rápido

### Opción 1: Con npm (Recomendado)

```bash
# 1. Asegúrate de que el servidor esté corriendo
npm run dev

# 2. En otra terminal, ejecuta el script
npm run debug:mercadopago
# o el alias corto:
npm run debug:mp
```

### Opción 2: Directo con Node

```bash
# Con servidor local en puerto 4200 (default)
node scripts/debug-mercadopago-sdk.mjs

# Con URL personalizada
BASE_URL=http://localhost:3000 node scripts/debug-mercadopago-sdk.mjs

# Conectando a Chrome existente (con CDP)
CHROME_CDP_WS_ENDPOINT=ws://localhost:9222 node scripts/debug-mercadopago-sdk.mjs
```

### Opción 3: Con Chrome DevTools Protocol (Avanzado)

```bash
# 1. Iniciar Chrome en modo debug
npm run debug:chrome

# 2. En otra terminal, ejecutar el script
CDP_WS=ws://localhost:9222 npm run debug:mp
```

---

## 📋 ¿Qué Hace el Script?

El script realiza **10 pasos de verificación exhaustiva**:

### 1️⃣ **Navegación**
- Carga la página principal
- Busca enlaces a páginas de payment
- Navega automáticamente a la URL correcta

### 2️⃣ **Componente Principal**
- Verifica que `app-booking-detail-payment` exista
- Comprueba que esté renderizado en el DOM

### 3️⃣ **Estados de Angular (Signals)**
```javascript
{
  bookingCreated: false,  // ¿Ya se creó el booking?
  loading: false,         // ¿Está cargando?
  error: null,           // ¿Hay errores?
  car: true,             // ¿Hay datos del auto?
  shouldShowCardForm: true  // ¿Debería mostrar el form?
}
```

### 4️⃣ **CardForm en DOM**
- Busca `<app-mercadopago-card-form>`
- Verifica cuántas instancias existen

### 5️⃣ **SDK Cargado**
- Verifica `window.MercadoPago`
- Busca el script del SDK en DOM

### 6️⃣ **Iframes del SDK**
- Lista todos los iframes
- Identifica cuáles son de MercadoPago
- Muestra las URLs de los iframes

### 7️⃣ **Errores de Console**
- Captura todos los errores de JavaScript
- Identifica errores de CSP
- Filtra errores específicos de MercadoPago

### 8️⃣ **Campos del Formulario**
- Verifica `#form-checkout`
- Lista todos los campos:
  - `cardNumber`
  - `expirationDate`
  - `securityCode`
  - `cardholderName`
  - `identificationType`
  - `identificationNumber`

### 9️⃣ **Screenshot**
- Captura pantalla completa
- Guarda en `/tmp/mercadopago-debug-screenshot.png`

### 🔟 **Diagnóstico Automático**
- Analiza todos los checks
- Identifica el problema raíz
- Sugiere soluciones específicas

---

## 📊 Output del Script

### Ejemplo de Output Exitoso

```
============================================================
  🔍 DEBUGGING MERCADOPAGO SDK
============================================================

🚀 Conectando a: http://localhost:4200

============================================================
  📄 PASO 1: NAVEGACIÓN
============================================================

⏳ Navegando a la página principal...
✅ Cargado: http://localhost:4200/

============================================================
  🔎 PASO 2: BUSCAR PÁGINA DE PAYMENT
============================================================

💡 Encontrados 3 enlaces a bookings
✅ Encontrada página de payment: /bookings/abc123/payment
⏳ Navegando a: http://localhost:4200/bookings/abc123/payment

============================================================
  🎯 PASO 3: VERIFICAR COMPONENTE PRINCIPAL
============================================================

✅ Componente app-booking-detail-payment encontrado

============================================================
  🔧 PASO 4: ESTADOS DE ANGULAR SIGNALS
============================================================

📊 Estados del componente:
{
  "bookingCreated": false,
  "loading": false,
  "error": null,
  "car": true,
  "fxSnapshot": true,
  "totalArs": 450000,
  "shouldShowCardForm": true
}

✅ shouldShowCardForm = true → CardForm DEBERÍA mostrarse

============================================================
  💳 PASO 5: VERIFICAR MERCADOPAGO CARDFORM
============================================================

✅ CardForm encontrado (1 instancia(s))

============================================================
  📦 PASO 6: VERIFICAR SDK DE MERCADOPAGO
============================================================

✅ SDK de MercadoPago cargado globalmente
✅ Script del SDK encontrado en DOM

============================================================
  🖼️ PASO 7: VERIFICAR IFRAMES DEL SDK
============================================================

✅ Encontrados 3 iframes de MercadoPago
  🔗 iframe 1: https://sdk.mercadopago.com/v2/iframe/card-number...
  🔗 iframe 2: https://sdk.mercadopago.com/v2/iframe/expiration-date...
  🔗 iframe 3: https://sdk.mercadopago.com/v2/iframe/security-code...

============================================================
  🐛 PASO 8: ERRORES DE CONSOLE
============================================================

✅ No hay errores en console

============================================================
  📝 PASO 9: VERIFICAR CAMPOS DEL FORMULARIO
============================================================

✅ Formulario #form-checkout encontrado
📋 Campos encontrados: 6/6
  ✓ cardNumber
  ✓ expirationDate
  ✓ securityCode
  ✓ cardholderName
  ✓ identificationType
  ✓ identificationNumber

============================================================
  📸 PASO 10: CAPTURA DE PANTALLA
============================================================

✅ Screenshot guardado: /tmp/mercadopago-debug-screenshot.png

============================================================
  📊 REPORTE FINAL
============================================================

📈 Checks completados: 9/9
❌ Errores: 0
⚠️ Warnings: 0
💡 Recomendaciones: 0

============================================================
  🎯 DIAGNÓSTICO AUTOMÁTICO
============================================================

🟢 TODO PARECE CORRECTO
💡 Si aún no funciona, revisar errores de console específicos

✅ Reporte JSON guardado: /tmp/mercadopago-debug-report.json

============================================================
  ⏸️ PAUSADO PARA INSPECCIÓN
============================================================

👀 Navegador abierto para inspección manual
💡 Presiona Enter para cerrar y terminar...
```

### Ejemplo de Output con Problema

```
============================================================
  🎯 PASO 3: VERIFICAR COMPONENTE PRINCIPAL
============================================================

✅ Componente app-booking-detail-payment encontrado

============================================================
  🔧 PASO 4: ESTADOS DE ANGULAR SIGNALS
============================================================

📊 Estados del componente:
{
  "bookingCreated": true,  ← ⚠️ PROBLEMA
  "loading": false,
  "error": null,
  "shouldShowCardForm": false  ← ⚠️ NO SE MOSTRARÁ
}

⚠️ bookingCreated = true → El booking ya fue creado
❌ shouldShowCardForm = false → CardForm NO se mostrará

============================================================
  💳 PASO 5: VERIFICAR MERCADOPAGO CARDFORM
============================================================

❌ CardForm NO encontrado en el DOM

============================================================
  🎯 DIAGNÓSTICO AUTOMÁTICO
============================================================

🟡 PROBLEMA: bookingCreated = true
💡 Solución: Cambiar lógica en booking-detail-payment.page.html:341
💡 De: @if (!bookingCreated() && !loading() && !error())
💡 A:  @if (!loading() && !error() && car())
```

---

## 📁 Archivos Generados

El script genera dos archivos en `/tmp/`:

### 1. Screenshot
```
/tmp/mercadopago-debug-screenshot.png
```
- Captura completa de la página
- Útil para ver el estado visual

### 2. Reporte JSON
```
/tmp/mercadopago-debug-report.json
```
- Reporte completo en formato JSON
- Incluye todos los checks, errores y recomendaciones
- Útil para análisis programático

```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "baseUrl": "http://localhost:4200",
  "checks": {
    "mainComponentExists": true,
    "cardFormExists": false,
    "componentStates": {
      "bookingCreated": true,
      "loading": false,
      "error": null
    },
    "sdkLoaded": {
      "MercadoPago": true,
      "sdkScript": true
    }
  },
  "errors": [
    "app-mercadopago-card-form no existe en el DOM",
    "Condiciones no cumplen para mostrar CardForm"
  ],
  "warnings": [
    "Booking ya creado - CardForm no se mostrará"
  ],
  "recommendations": [
    "Cambiar lógica en booking-detail-payment.page.html:341"
  ]
}
```

---

## 🔧 Soluciones Comunes

### Problema 1: `bookingCreated = true`

**Síntoma**: CardForm no aparece porque el booking ya fue creado

**Solución**: Editar `booking-detail-payment.page.html:341`

```html
<!-- ANTES -->
@if (!bookingCreated() && !loading() && !error()) {
  <app-mercadopago-card-form ... />
}

<!-- DESPUÉS -->
@if (!loading() && !error() && car()) {
  <app-mercadopago-card-form ... />
}
```

### Problema 2: `loading = true`

**Síntoma**: Componente se queda cargando indefinidamente

**Solución**: Revisar métodos de carga en el componente:
- `loadCarInfo()` - booking-detail-payment.page.ts:217
- `loadFxSnapshot()` - booking-detail-payment.page.ts:236

### Problema 3: `error !== null`

**Síntoma**: Hay un error que bloquea el renderizado

**Solución**: Ver el mensaje de error específico y resolverlo

### Problema 4: SDK no cargado

**Síntoma**: `window.MercadoPago` no existe

**Solución**:
1. Verificar public key en `environment.ts`
2. Verificar `MercadoPagoScriptService`
3. Revisar CSP en `_headers` o `index.html`

---

## 🎯 Interpretando el Diagnóstico

### 🟢 Verde - Todo OK
```
🟢 TODO PARECE CORRECTO
```
Si ves esto pero aún no funciona:
1. Revisa errores específicos en DevTools Console
2. Verifica la configuración de MercadoPago (public key)
3. Prueba con tarjetas de test válidas

### 🟡 Amarillo - Warning
```
🟡 PROBLEMA: bookingCreated = true
```
Hay un problema pero no es crítico. Sigue las recomendaciones.

### 🔴 Rojo - Error Crítico
```
🔴 PROBLEMA CRÍTICO: Componente principal no existe
```
Hay un error que impide el funcionamiento. Requiere corrección inmediata.

---

## 🧪 Testing con Chrome DevTools Protocol

Para debugging avanzado con un navegador controlado:

```bash
# Terminal 1: Iniciar Chrome en modo debug
npm run debug:chrome

# Terminal 2: Iniciar servidor
npm run dev

# Terminal 3: Ejecutar script conectado a Chrome
CHROME_CDP_WS_ENDPOINT=ws://localhost:9222 npm run debug:mp
```

**Ventajas**:
- Puedes ver el navegador en tiempo real
- Puedes interactuar manualmente
- Los cambios persisten entre ejecuciones

---

## 📝 Notas Adicionales

### Variables de Entorno

```bash
# URL base del servidor
BASE_URL=http://localhost:4200

# WebSocket de Chrome DevTools Protocol
CHROME_CDP_WS_ENDPOINT=ws://localhost:9222
# o
CDP_WS=ws://localhost:9222
```

### Requisitos

- Node.js 18+
- Playwright instalado (`npm install`)
- Servidor de desarrollo corriendo (`npm run dev`)

### Troubleshooting

**Error: "Cannot find module 'playwright'"**
```bash
npm install
```

**Error: "net::ERR_CONNECTION_REFUSED"**
```bash
# Asegúrate de que el servidor esté corriendo
npm run dev
```

**El navegador no se abre**
```bash
# Verifica que Playwright esté instalado correctamente
npx playwright install chromium
```

---

## 🔗 Referencias

- **Componente Principal**: `apps/web/src/app/features/bookings/booking-detail-payment/`
- **CardForm Component**: `apps/web/src/app/shared/components/mercadopago-card-form/`
- **SDK Service**: `apps/web/src/app/core/services/mercado-pago-script.service.ts`
- **Documentación**: `MERCADOPAGO_SDK_ISSUE_ANALYSIS.md`

---

**Última actualización**: 2025-01-15
**Mantenedor**: Claude Code
