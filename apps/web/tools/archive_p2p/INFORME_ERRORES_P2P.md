# Informe de Errores - P2P Automation System
**Fecha:** 2025-12-04
**Orden afectada:** 21228297661849760317
**Monto:** 20,891.70 ARS
**CVU destino:** 0000076500000044000923
**Destinatario:** Emiliana Milagros Sanchez

---

## Resumen Ejecutivo

La automatización P2P presentó múltiples errores durante la ejecución, requiriendo intervención manual para completar la transferencia. El sistema alcanzó a navegar correctamente por el flujo de MercadoPago pero falló al ingresar el monto correcto.

---

## Errores Encontrados

### 1. Error de Ingreso de Monto (CRÍTICO)

**Descripción:** El sistema reportó "Amount 20892 set successfully" pero el monto real que apareció en la pantalla de revisión fue **$2** en lugar de **$20,892**.

**Evidencia:**
- Screenshot `/tmp/mp_transfer_unknown.png` muestra "Monto: $2" en la página de revisión
- Log muestra: `Setting amount: 20892 (building: 20892)` seguido de `Amount 20892 set successfully`

**Causa raíz:** El método `setAmount()` que usa React internals (onChange handler) reporta éxito pero el componente controlado de React no está actualizando su estado correctamente. Las posibles causas son:

1. **Timing incorrecto:** La construcción incremental (`2` → `20` → `208` → `2089` → `20892`) puede estar siendo demasiado rápida para que React reconcilie el estado entre cada paso

2. **Borrado del 0 inicial incorrecto:** Al enviar valor vacío `""` para borrar el 0 inicial, el componente puede estar reseteando a un estado inesperado

3. **Evento onChange incompleto:** El objeto `{ target: { value } }` puede no tener todas las propiedades que el componente espera

**Código afectado:** `src/browser/mercadopago-page.ts:55-174`

---

### 2. Timeout en waitForLoadState('networkidle')

**Descripción:** Al navegar a la home de MercadoPago, el timeout de 30 segundos para `networkidle` se excedía constantemente.

**Error:**
```
page.waitForLoadState: Timeout 30000ms exceeded.
```

**Solución aplicada:** Se cambió a `waitUntil: 'domcontentloaded'` con sleep adicional para esperar hidratación de React.

**Estado:** Parcialmente resuelto - aún puede ser lento pero ya no produce timeout.

---

### 3. Botón "Continuar" no habilitado

**Descripción:** En intentos anteriores, el botón "Continuar" permanecía deshabilitado después de ingresar el monto.

**Error:**
```
page.click: Timeout 30000ms exceeded.
- waiting for locator('text=Continuar')
- element is not enabled
```

**Causa:** El monto mostrado era $0 (o incorrecto), por lo que la validación del formulario no permitía continuar.

**Evidencia:** Screenshot `/tmp/mp_transfer_error.png` muestra "$0" en el campo de monto con botón Continuar deshabilitado.

---

### 4. Profile Lock no liberado correctamente

**Descripción:** Al reiniciar el servicio, el lock del profile anterior permanecía activo.

**Error:**
```
Profile mercadopago locked by PID 2152089
Cannot acquire lock for mercadopago
```

**Causa:** El proceso anterior terminó sin liberar el lock file.

**Solución temporal:** Eliminación manual de `/tmp/p2p-*.lock`

---

### 5. Extracción incorrecta del monto desde Binance

**Descripción:** El detector extrajo inicialmente 1503 ARS como monto de la orden cuando el monto real era 20,891.7 ARS.

**Causa:** El selector CSS usado para extraer el monto capturó un elemento incorrecto de la tabla de órdenes.

**Solución:** Actualización manual en base de datos.

---

## Timeline de Intentos

| Hora | Estado | Resultado |
|------|--------|-----------|
| 02:18 | Orden detectada | Monto extraído: 1503 (INCORRECTO) |
| 02:22 | Monto corregido | 20,891.7 ARS |
| 02:25 | Transfer intento 1 | Timeout en Continuar (monto $0) |
| 02:28 | Transfer intento 2 | Timeout waitForLoadState |
| 02:31 | Transfer intento 3 | Monto $2 en review, "Unknown state" |
| 02:32 | Intervención manual | Transfer completada manualmente |

---

## Análisis Técnico del Problema de Monto

### Por qué el método de React internals falla

MercadoPago usa un componente React controlado para el input de monto:

```jsx
<AmountInput
  value={amount}
  onChange={(e) => setAmount(e.target.value)}
/>
```

El código intenta acceder al onChange handler interno:
```javascript
const reactKey = Object.keys(input).find(k => k.startsWith('__reactFiber'));
let current = input[reactKey];
// Traversar hasta encontrar onChange...
onChange({ target: { value } });
```

**Problemas identificados:**

1. **React Fiber vs ReactProps:** La estructura interna de React puede variar entre versiones
2. **Controlled components:** React espera que el valor venga del state, no del DOM
3. **Input masking:** MercadoPago puede tener máscaras de formato que interfieren
4. **Debounce:** El onChange puede estar debounceado, ignorando cambios rápidos

### Evidencia del fallo

Aunque el código reporta "ok" desde `page.evaluate()`, esto solo significa que encontró y llamó al onChange. No garantiza que:
- El state de React se actualizó
- El componente se re-renderizó
- El valor visual en el DOM cambió

---

## Recomendaciones

### Corto plazo

1. **Usar keyboard simulation:** En lugar de manipular React internals, simular escritura real:
```javascript
await page.click('#amount-field-input');
await page.keyboard.press('Control+a');  // Seleccionar todo
await page.keyboard.type('20892');       // Escribir dígito por dígito
```

2. **Agregar verificación post-set:** Después de setear el monto, leer el valor visual y comparar con el esperado.

3. **Aumentar delays:** 150ms entre dígitos puede no ser suficiente para React reconciliation.

### Mediano plazo

1. **Investigar API de MercadoPago:** Si existe una API para transferencias que no requiera scraping.

2. **Usar MCP tool de Playwright:** Para debug interactivo y entender mejor el comportamiento del componente.

3. **Implementar retry con backoff exponencial:** Para manejar fallos transitorios de red/rendering.

### Largo plazo

1. **Evaluar alternativas:**
   - Selenium con WebDriver más robusto
   - Puppeteer con stealth mode
   - Automatización via mobile app (más estable)

2. **Monitoring y alertas:** Sistema de monitoreo que detecte cuando el monto visual no coincide con el esperado.

---

## Archivos Relevantes

| Archivo | Descripción |
|---------|-------------|
| `/tmp/mp_transfer_error.png` | Screenshot monto $0 |
| `/tmp/mp_transfer_unknown.png` | Screenshot monto $2 (incorrecto) |
| `/tmp/p2p-automation.log` | Log completo de la sesión |
| `src/browser/mercadopago-page.ts` | Código de automatización MP |
| `src/services/executor.ts` | Servicio ejecutor de transferencias |

---

## Estado Final

- **Orden:** Completada manualmente
- **Sistema:** Detenido para análisis
- **Próximos pasos:** Implementar solución de keyboard simulation antes de próximo intento

---

## Apéndice: Logs Relevantes

```
2025-12-04 02:31:51 info [p2p] Amount input found with selector: #amount-field-input
2025-12-04 02:31:51 info [p2p] Setting amount: 20892 (building: 20892)
2025-12-04 02:31:53 info [p2p] Amount 20892 set successfully
2025-12-04 02:31:53 info [p2p] Waiting for Continuar button to be enabled...
2025-12-04 02:31:55 info [p2p] Review page loaded
2025-12-04 02:31:55 info [p2p] Clicked final Transferir button
2025-12-04 02:31:57 warn [p2p] Unknown transfer state
```

El log muestra que el sistema creyó haber ingresado el monto correctamente, pero la evidencia visual demuestra lo contrario.

---

## Investigación GitHub: Solución Real

### Problema Identificado: React `_valueTracker`

React internamente usa un `_valueTracker` para comparar el valor anterior con el nuevo. Si no se resetea este tracker, React ignora los cambios de valor hechos programáticamente.

**Fuentes:**
- [Stack Overflow: Set React Input Field Value](https://stackoverflow.com/questions/43438258/set-react-input-field-value-from-javascript-or-jquery)
- [Stack Overflow: React controlled component with Puppeteer](https://stackoverflow.com/questions/47136896/how-do-i-set-the-value-of-a-react-controlled-component-with-jquery-in-puppeteer)
- [GitHub Issue: Puppeteer #441](https://github.com/puppeteer/puppeteer/issues/441)

### Solución Correcta: Native Value Setter + _valueTracker Reset

```javascript
function setReactInputValue(element, value) {
  // 1. Guardar el valor anterior para el tracker
  const lastValue = element.value;

  // 2. Obtener el setter nativo del prototype (NO el override de React)
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  ).set;

  // 3. Usar el setter nativo para cambiar el valor
  nativeInputValueSetter.call(element, value);

  // 4. CRÍTICO: Resetear el _valueTracker de React con el valor ANTERIOR
  const tracker = element._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);  // ← Esto fuerza a React a ver el cambio
  }

  // 5. Disparar evento con bubbles:true para que React lo capture
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
}
```

### Por qué nuestro código falló

Nuestro código actual:
```javascript
// ❌ INCORRECTO - Solo llama onChange sin resetear _valueTracker
onChange({ target: { value } });
```

El problema es que llamar `onChange({ target: { value } })` directamente NO actualiza el DOM ni resetea el `_valueTracker`, por lo que React cree que el valor no cambió.

### Código Corregido para MercadoPago

```javascript
async setAmount(amount: number): Promise<boolean> {
  const amountInt = Math.round(amount);
  const amountStr = String(amountInt);

  // Click y focus primero
  await this.page.click('#amount-field-input');
  await this.page.focus('#amount-field-input');
  await sleep(300);

  // Usar page.type() - método más confiable para React
  await this.page.keyboard.press('Control+a');  // Seleccionar todo (borra el 0)
  await this.page.keyboard.type(amountStr, { delay: 50 });  // Tipear con delay

  await sleep(500);

  // Verificar que el valor se guardó correctamente
  const displayedValue = await this.page.$eval('#amount-field-input',
    (el: HTMLInputElement) => el.value
  );

  if (!displayedValue.includes(amountStr.replace(/\D/g, ''))) {
    logger.error(`Monto no coincide. Esperado: ${amountStr}, Mostrado: ${displayedValue}`);
    return false;
  }

  return true;
}
```

### Alternativa: Native Setter en Playwright

```javascript
await this.page.evaluate((value: string) => {
  const input = document.getElementById('amount-field-input') as HTMLInputElement;
  if (!input) return 'not found';

  const lastValue = input.value;
  const nativeSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, 'value'
  )?.set;

  if (nativeSetter) {
    nativeSetter.call(input, value);
  }

  // Reset React's internal tracker
  const tracker = (input as any)._valueTracker;
  if (tracker) {
    tracker.setValue(lastValue);
  }

  // Dispatch input event
  input.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
}, amountStr);
```

---

## Fuentes de la Investigación

1. [Stack Overflow - Set React Input Field Value](https://stackoverflow.com/questions/43438258/set-react-input-field-value-from-javascript-or-jquery) - Solución del `nativeInputValueSetter`
2. [Stack Overflow - React controlled component Puppeteer](https://stackoverflow.com/questions/47136896/how-do-i-set-the-value-of-a-react-controlled-component-with-jquery-in-puppeteer) - Explicación del `_valueTracker`
3. [GitHub Puppeteer Issue #441](https://github.com/puppeteer/puppeteer/issues/441) - Discusión sobre input values
4. [ZenRows - Puppeteer Stealth](https://www.zenrows.com/blog/puppeteer-stealth-evasions-patching) - Anti-bot bypass
5. [Puppeteer page.type() documentation](https://pptr.dev/api/puppeteer.page.type) - Método recomendado

---

## Conclusión

**MercadoLibre/MercadoPago usa React con controlled components intencionalmente.** La solución es:

1. **Método 1 (Recomendado):** Usar `page.keyboard.type()` de Playwright/Puppeteer que simula tecleo real
2. **Método 2:** Usar el `nativeInputValueSetter` + reset del `_valueTracker` de React
3. **Verificación obligatoria:** Siempre verificar visualmente que el monto se guardó antes de continuar

---

## Validaciones de Seguridad Implementadas (v2)

### 1. Validación de Nombre del Destinatario (NUEVA)

Antes se confiaba ciegamente en el CVU/Alias. Ahora:

```javascript
// Extraer nombre del destinatario mostrado por MercadoPago
const recipientInfo = await this.extractRecipientInfo();

// Comparar con nombre esperado de Binance (fuzzy match)
const nameValidation = this.validateRecipientName(expectedName, recipientInfo.name);

if (!nameValidation.valid) {
  logger.error('CRITICAL: Recipient name mismatch!');
  return { success: false, error: 'Name mismatch' };
}
```

**Algoritmo de comparación:**
- Normaliza nombres (quita acentos, mayúsculas)
- Divide en partes y ordena (para comparar "JUAN PEREZ" con "PEREZ JUAN")
- Calcula % de similitud
- Valido si >= 60% o al menos 2 partes coinciden

### 2. Verificación Triple del Monto

1. **Después de escribir:** Verifica que input tenga el valor
2. **Botón Continuar:** Espera que se habilite (indica monto válido)
3. **Página review:** Compara monto mostrado vs esperado

### 3. Aborto Automático

El sistema ABORTA la transferencia si:
- Monto no se guardó correctamente
- Botón Continuar no se habilita
- Monto en review no coincide (±$1)
- Nombre del destinatario no coincide

### Resumen de Validaciones

| Validación | Momento | Acción si falla |
|------------|---------|-----------------|
| Input de monto | Después de tipear | Intenta fallback native setter |
| Botón Continuar | Antes de click | Aborta con screenshot |
| Monto en review | Antes de transferir | Aborta con screenshot |
| Nombre destinatario | Antes de confirmar cuenta | Aborta con screenshot |

**Screenshots de error guardados en:**
- `/tmp/mp_amount_error.png` - Error al setear monto
- `/tmp/mp_continuar_disabled.png` - Botón no habilitado
- `/tmp/mp_wrong_amount_review.png` - Monto incorrecto en review
- `/tmp/mp_name_mismatch.png` - Nombre no coincide
