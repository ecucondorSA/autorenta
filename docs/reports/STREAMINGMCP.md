# STREAMINGMCP: Guía de Eficiencia para Interacciones con Playwright Streaming

Este documento resume las mejores prácticas para interactuar de forma eficiente con la herramienta `playwright-streaming` de tu entorno MCP, específicamente en lo que respecta al llenado de formularios y la optimización de las interacciones con el navegador.

---

### Análisis de la Herramienta `stream_type`

Hemos confirmado que la implementación interna de tu herramienta `stream_type` (ubicada en `tools/playwright-streaming-mcp/server.js`) ya utiliza el método `page.fill()` de Playwright.

**Código Relevante:**
```javascript
// Extracto de tools/playwright-streaming-mcp/server.js
case 'stream_type': {
  const { page } = await this.ensureBrowser();
  // ...
  await page.fill(args.selector, args.text); // <--- Aquí se usa page.fill()
  // ...
}
```

### ¿Qué significa `page.fill()`?

El método `page.fill()` de Playwright está optimizado para rellenar campos de texto directamente. A diferencia de simular la pulsación de cada tecla (`page.type()`), `page.fill()` establece el valor del input de una sola vez, lo que lo hace significativamente más rápido y robusto. Además, `page.fill()` no requiere que el campo esté previamente enfocado o "cliqueado".

### Optimización en la Práctica: Eliminación de `stream_click` Redundantes

Dado que `stream_type` ya utiliza `page.fill()` internamente, cualquier `stream_click` realizado sobre un campo de texto *antes* de un `stream_type` es completamente **redundante y añade un retraso innecesario** a la secuencia.

**❌ Práctica Ineficiente (a evitar):**

1.  Hacer clic en el campo de email:
    `stream_click (selector: "input[placeholder*=\"email\"]")`
2.  Escribir el email:
    `stream_type (selector: "input[placeholder*=\"email\"]", text: "test@example.com")`
    *(Esta secuencia realiza un clic innecesario)*

**✅ Práctica Eficiente (recomendada):**

Simplemente usa `stream_type` directamente sobre el campo de texto. El método `page.fill()` que utiliza internamente se encargará de rellenarlo sin necesidad de un clic previo.

1.  Escribir el email (directo):
    `stream_type (selector: "input[placeholder*=\"email\"]", text: "test@example.com")`

### Excepciones: Cuándo SÍ usar `stream_click`

Aunque `stream_type` es suficiente para inputs estándar, hay casos de UI donde un `stream_click` posterior es **obligatorio**:

**Caso: Autocomplete / Dropdowns Dinámicos**
Cuando escribes en un campo y aparece una lista de sugerencias flotante que debes seleccionar.

*Ejemplo: Seleccionar una marca de auto.*

1.  **Escribir filtro:**
    `stream_type (selector: "input#marca", text: "Fia")`
2.  **Esperar sugerencia (Crucial):**
    `stream_wait_for (selector: "li:has-text('FIAT')")`
    *(El sistema tarda unos milisegundos en mostrar la lista)*
3.  **Clic en la opción:**
    `stream_click (selector: "li:has-text('FIAT')")`

En este escenario, el `stream_click` es necesario para **confirmar la selección** de la lista desplegada, ya que el `stream_type` solo rellena el texto de búsqueda pero no selecciona el ítem de la base de datos.

### Recomendaciones Generales para la Eficiencia

1.  **Prioriza `stream_type` para campos de texto:** Siempre que necesites introducir texto en un input, utiliza `stream_type` directamente sobre el selector del campo.
2.  **Evita `stream_click` en inputs de texto:** No uses `stream_click` en campos `input`, `textarea`, o selectores similares justo antes de un `stream_type`.
3.  **Agrupa acciones lógicas:** Encadena las operaciones para completar flujos sin interrupciones.

### 4. La Regla de Oro en Streaming: Espera tras Navegar

En un entorno de Agente/Streaming, esto es crítico. Si el agente hace clic y "lee" la pantalla antes de que la navegación termine, verá datos viejos y fallará.

**Patrón Obligatorio para Navegación:**

1.  **Acción:** `stream_click` (Botón "Ingresar")
2.  **Espera Activa:** `stream_wait_for` (Selector clave de la nueva página, ej: `#user-dashboard`)
    *   *Nota:* No confíes solo en el tiempo. Espera a que el elemento visual aparezca.

Al forzar esta espera, aseguras que el siguiente `snapshot` que reciba el agente contenga la información correcta de la nueva página, evitando bucles de error y alucinaciones.

---
*Documento actualizado por Gemini CLI - 03/12/2025*
