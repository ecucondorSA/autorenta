# Binance P2P - Workflow de Automatización

## 1. Configurar Filtros P2P Argentina (ARS)

```javascript
// 1. Navegar a Binance P2P con ARS preseleccionado
stream_navigate("https://p2p.binance.com/en/trade/all-payments/USDT?fiat=ARS")

// 2. Abrir panel de filtros
stream_click("button.bn-button__icon__line")

// 3. Activar "Guardar filtros para próximo uso"
stream_click("text=Save filter for next use")

// 4. Desactivar "Solo comerciantes verificados"
stream_click("text=Verified Merchant Ads only")

// 5. Aplicar filtros
stream_click("button:has-text('Apply')")
```

---

## 2. Crear Anuncio de COMPRA USDT

### Paso 1: Set Type & Price

```javascript
// 1. Ir a crear anuncio
stream_navigate("https://p2p.binance.com/en/postAd")

// 2. Seleccionar "I want to buy" (ya está por defecto)
// Si necesitas cambiar: stream_click("text=I want to buy")

// 3. Seleccionar Asset: USDT
stream_click(".bn-select-trigger:has-text('BNB')")  // o el asset actual
stream_click("text=USDT")

// 4. Seleccionar Fiat: ARS
stream_click(".bn-select-trigger:has-text('EUR')")  // o el fiat actual
stream_click("text=ARS")

// 5. Cambiar precio (usando setter nativo de React)
stream_evaluate(`
(() => {
  const inputs = Array.from(document.querySelectorAll('input.bn-textField-input'));
  const priceInput = inputs.find(i => parseFloat(i.value) > 1000);
  if (priceInput) {
    priceInput.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(priceInput, '1400');  // <-- TU PRECIO ACA
    priceInput.dispatchEvent(new Event('input', { bubbles: true }));
    priceInput.dispatchEvent(new Event('change', { bubbles: true }));
    priceInput.blur();
    return 'Price set';
  }
})();
`)

// 6. Siguiente paso
stream_click("text=Next")
```

### Paso 2: Set Total Amount & Payment Method

```javascript
// 1. Poner Total Amount (en USDT)
stream_evaluate(`
(() => {
  const inputs = Array.from(document.querySelectorAll('input'));
  const totalInput = inputs.find(i => i.placeholder?.includes('total amount'));
  if (totalInput) {
    totalInput.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(totalInput, '350');  // <-- CANTIDAD USDT
    totalInput.dispatchEvent(new Event('input', { bubbles: true }));
    totalInput.dispatchEvent(new Event('change', { bubbles: true }));
    totalInput.blur();
  }
})();
`)

// 2. Cambiar límite mínimo de orden (en ARS)
stream_evaluate(`
(() => {
  const inputs = Array.from(document.querySelectorAll('input.bn-textField-input'));
  const minInput = inputs.find(i => i.value === '2,500' || i.value === '2500');
  if (minInput) {
    minInput.focus();
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    nativeInputValueSetter.call(minInput, '30000');  // <-- MINIMO ARS
    minInput.dispatchEvent(new Event('input', { bubbles: true }));
    minInput.dispatchEvent(new Event('change', { bubbles: true }));
    minInput.blur();
  }
})();
`)

// 3. Agregar método de pago
stream_click("text=Add")

// 4. Buscar MercadoPago
stream_type('input[placeholder*="payment method"]', 'Mercado')

// 5. Seleccionar MercadoPago
stream_click("text=Mercadopago")

// 6. Confirmar selección
stream_click("button:has-text('Confirm'):visible")

// 7. Siguiente paso
stream_click("text=Next")
```

### Paso 3: Set Remarks & Automatic Response

```javascript
// 1. Agregar Remarks (usando setter nativo para textarea)
stream_evaluate(`
(() => {
  const textareas = document.querySelectorAll('textarea');
  for (const ta of textareas) {
    if (ta.placeholder?.includes('crypto') || ta.value === '') {
      ta.focus();
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
      nativeInputValueSetter.call(ta, 'Transferencia inmediata. Operador verificado con +100 operaciones. Respondo en menos de 5 minutos. IMPORTANTE: Requiero comprobante de transferencia bancaria.');
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return 'Remarks set';
    }
  }
})();
`)

// 2. Click en Post para ir a confirmación
stream_click("button:has-text('Post'):visible")

// 3. Confirmar publicación en modal
stream_evaluate(`
(() => {
  const buttons = document.querySelectorAll('button');
  for (const btn of buttons) {
    if (btn.textContent.includes('Confirm to post')) {
      btn.click();
      return 'Clicked Confirm to post';
    }
  }
})();
`)
```

---

## 3. Procesar Orden Entrante (Cuando alguien acepta tu anuncio)

### Flujo de Orden de COMPRA

```
┌─────────────────────────────────────────────────────────────┐
│  1. DETECTAR NUEVA ORDEN                                    │
│     - Polling cada 30s a página de órdenes                  │
│     - Verificar badge "Chat 99+"                            │
├─────────────────────────────────────────────────────────────┤
│  2. OBTENER DATOS DEL VENDEDOR                              │
│     - CVU/Alias de MercadoPago                              │
│     - Monto exacto a transferir (ARS)                       │
├─────────────────────────────────────────────────────────────┤
│  3. TRANSFERIR VIA MERCADOPAGO                              │
│     - Manual o via API MercadoPago                          │
│     - Guardar comprobante                                   │
├─────────────────────────────────────────────────────────────┤
│  4. MARCAR COMO PAGADO EN BINANCE                           │
│     - Click en "Payment Completed"                          │
│     - Subir comprobante si es requerido                     │
├─────────────────────────────────────────────────────────────┤
│  5. ESPERAR LIBERACIÓN                                      │
│     - Vendedor verifica pago                                │
│     - USDT aparece en tu Funding wallet                     │
└─────────────────────────────────────────────────────────────┘
```

### Detectar Órdenes Pendientes

```javascript
// 1. Ir a página de órdenes
stream_navigate("https://p2p.binance.com/en/myAdsOrder")

// 2. Filtrar por órdenes en proceso
stream_click("text=Processing")

// 3. Verificar si hay órdenes pendientes
stream_evaluate(`
(() => {
  const rows = document.querySelectorAll('tr, [class*="order-item"]');
  const orders = [];
  for (const row of rows) {
    if (row.textContent.includes('Pending') || row.textContent.includes('To Pay')) {
      orders.push({
        text: row.textContent.substring(0, 100),
        hasAction: row.querySelector('button') !== null
      });
    }
  }
  return orders.length > 0 ? JSON.stringify(orders) : 'No pending orders';
})();
`)
```

### Marcar Pago Completado

```javascript
// 1. Entrar a la orden
stream_click("text=View Order")  // o click en la orden específica

// 2. Después de transferir, marcar como pagado
stream_click("text=Payment Completed")

// 3. Confirmar pago
stream_click("text=Confirm")
```

---

## 4. URLs Importantes

| Página | URL |
|--------|-----|
| P2P USDT/ARS | `https://p2p.binance.com/en/trade/all-payments/USDT?fiat=ARS` |
| Crear anuncio | `https://p2p.binance.com/en/postAd` |
| Mis Anuncios | `https://p2p.binance.com/en/myAdsOrder` |
| Historial Órdenes | `https://p2p.binance.com/en/myAdsOrder` (tab Orders) |

---

## Notas Técnicas

### Selectores que funcionan

| Tipo | Selector | Uso |
|------|----------|-----|
| Texto simple | `text=USDT` | Botones, opciones, labels |
| Dropdown trigger | `.bn-select-trigger:has-text('BNB')` | Abrir dropdowns |
| Input por placeholder | `input[placeholder*="payment method"]` | Campos de búsqueda |
| Botón visible | `button:has-text('Confirm'):visible` | Evitar botones ocultos |

### Inputs de React (setter nativo)

Los inputs de Binance usan React. Para cambiar valores hay que usar el setter nativo:

```javascript
const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  window.HTMLInputElement.prototype, 'value'
).set;
nativeInputValueSetter.call(input, 'nuevo valor');
input.dispatchEvent(new Event('input', { bubbles: true }));
```

### URLs útiles

| Página | URL |
|--------|-----|
| P2P USDT/ARS | `https://p2p.binance.com/en/trade/all-payments/USDT?fiat=ARS` |
| Crear anuncio | `https://p2p.binance.com/en/postAd` |
| User Center P2P | `https://p2p.binance.com/en/myAdsOrder` |

### Sesión persistente

El MCP usa `launchPersistentContext()` con datos guardados en:
```
/home/edu/.binance-browser-profile
```

Esto mantiene la sesión de login entre reinicios.

---

## Filtros P2P disponibles

| Filtro | Descripción |
|--------|-------------|
| Save filter for next use | Guarda configuración para próximas visitas |
| Verified Merchant Ads only | Solo comerciantes verificados |
| Ads With No Verification Required | Anuncios sin verificación |
| Pro Merchant Ads only | Solo comerciantes Pro |
| Payment Time Limit | All, 15, 30, 45, 60, 120, 360 min |

## Cryptos P2P disponibles

USDT, BTC, USDC, FDUSD, BNB, ARS, ETH, DAI, DOGE, ADA, XRP, WLD, TRUMP, 1000CHEEMS, TST, SOL
