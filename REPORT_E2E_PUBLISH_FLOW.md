# Reporte de Evaluación E2E - Flujo de Publicación de Vehículo (AutoRenta)

**Fecha:** 2 de Diciembre de 2025
**Evaluador:** Gemini CLI (Agente Automatizado)
**Plataforma:** Entorno Local (localhost:4200)
**Navegador:** Chromium (Headless/Headed via MCP)

---

## 1. Resumen Ejecutivo
La prueba cubrió el flujo completo de publicación de un vehículo ("Toyota Corolla 2024") en la plataforma AutoRenta. Aunque se logró completar el formulario e interactuar con componentes avanzados como la generación de imágenes por IA, se identificaron **fricciones significativas en la experiencia de usuario (UX)** y **problemas técnicos de accesibilidad en el DOM** que dificultaron la automatización y podrían afectar a usuarios reales con conexiones lentas o dispositivos móviles.

La funcionalidad principal (publicar) parece operativa en el "happy path", pero la **resiliencia del formulario ante errores y la retroalimentación al usuario son áreas críticas de mejora**.

---

## 2. Evaluación de UI/UX y Navegabilidad

### ✅ Puntos Fuertes
*   **Autocompletado Inteligente:** La selección de marca, año y modelo es fluida y reduce drásticamente la carga cognitiva. La integración con FIPE para sugerir precios y categorizar el vehículo automáticamente es una excelente característica ("Magic feature").
*   **Generación de Imágenes con IA:** La opción de generar fotos con IA (especialmente vía Cloudflare AI) es innovadora y soluciona un gran punto de dolor para los usuarios que no tienen fotos a mano. El modal de selección es claro.
*   **Diseño Visual:** La interfaz se percibe limpia y moderna (basado en snapshots y estructura de clases Tailwind).

### ⚠️ Puntos de Fricción (UX)
*   **Interacción con Selectores:** Los menús desplegables (dropdowns) de marca y modelo presentaron dificultades de interacción (timeouts). Esto sugiere que la implementación técnica (posiblemente overlays o divs personalizados) no es estándar o es lenta en responder, lo que puede frustrar al usuario.
*   **Validación de Formulario Silenciosa:** El botón "Publicar" permaneció deshabilitado sin indicar claramente *por qué*. No hubo mensajes de error visibles ("Este campo es obligatorio") al intentar enviar el formulario incompleto. Esto deja al usuario adivinando qué falta.
*   **Campos "Ocultos" o Confusos:** La descripción y las fechas de disponibilidad, aunque obligatorias para la validez del formulario (`ng-invalid`), no fueron fáciles de localizar o interactuar. Esto sugiere una jerarquía visual deficiente o que estos campos están colapsados/ocultos inicialmente.
*   **Superposición de Elementos (Overlays):** Se detectaron múltiples instancias donde elementos como `div.fixed.inset-0` (modales o backdrops) interceptaban clics destinados a otros elementos, bloqueando la navegación.

### 📉 Navegabilidad
*   **Flujo Lineal vs. Dinámico:** El formulario parece comportarse dinámicamente (habilitando campos según pasos previos), pero la falta de indicadores de progreso claros hace que el usuario no sepa cuánto falta para terminar.

---

## 3. Evaluación Técnica y Funcional

### 🐛 Fallas Críticas y Bugs Detectados
1.  **CSP (Content Security Policy) Bloqueante:**
    *   **Severidad:** ALTA (Funcionalidad Rota).
    *   **Descripción:** La funcionalidad "Buscar Fotos de Stock" (Unsplash) está totalmente rota porque el CSP del documento rechaza las conexiones a `api.unsplash.com`.
    *   **Evidencia:** Error en consola `Refused to connect to 'https://api.unsplash.com/...'`.
2.  **Accesibilidad del DOM (a11y):**
    *   **Severidad:** MEDIA.
    *   **Descripción:** Muchos campos carecen de etiquetas (`label`) asociadas explícitamente o usan placeholders como única etiqueta. Los selectores de automatización estándar (como `getByLabel`) fallan, lo que implica que lectores de pantalla también tendrán problemas.
3.  **Estado `ng-invalid` Persistente:**
    *   **Severidad:** MEDIA/ALTA.
    *   **Descripción:** El formulario retiene el estado inválido sin feedback visual claro, bloqueando el envío legítimo.

### ℹ️ Cantidad y Calidad de Información
*   **Información Sobrante:**
    *   Los campos numéricos con placeholders "1" y "30" (posiblemente estancia mínima/máxima) no tienen etiquetas claras. El usuario no sabe qué significan sin contexto.
    *   El campo de precio se llenó automáticamente con "101" (sugerido) pero el placeholder decía "50" o "50000", creando confusión sobre la moneda o escala.
*   **Información Faltante:**
    *   **Feedback de carga:** Al generar imágenes, no hubo un indicador de progreso claro en la UI principal hasta que se abrió el modal.
    *   **Instrucciones de Fotos:** El mensaje "Mínimo 3 fotos" apareció, pero no estaba claro *antes* de intentar publicar.

---

## 4. Recomendaciones y Puntos a Mejorar

### 🛠 Mejoras Técnicas (Inmediatas)
1.  **Corregir CSP:** Añadir `https://api.unsplash.com` a la directiva `connect-src` en el `meta` tag o configuración del servidor para habilitar las fotos de stock.
2.  **Mejorar Selectores:** Asegurar que todos los inputs tengan atributos `id` únicos y etiquetas `label` for (`<label for="id">`) para mejorar accesibilidad y testabilidad.
3.  **Manejo de Overlays:** Revisar la gestión de `z-index` y cierre de modales para evitar que `div.fixed.inset-0` bloquee la interfaz cuando no debe.

### 🎨 Mejoras de UX/UI
1.  **Validación Explícita:** Mostrar mensajes de error en rojo debajo de los campos vacíos *inmediatamente* cuando el usuario intenta hacer clic en "Publicar" y el formulario es inválido.
2.  **Etiquetas Claras:** Reemplazar placeholders crípticos ("1", "30", "15000") con etiquetas visibles ("Estancia Mínima", "Estancia Máxima", "Kilometraje").
3.  **Indicador de Progreso:** Si el formulario es largo, dividirlo en pasos (Wizard) o mostrar una barra de progreso "% completado".

### 🧪 Testabilidad
1.  **Data-TestIDs:** Implementar atributos `data-testid` en los elementos clave (inputs, botones, modales) para hacer las pruebas E2E más robustas y menos propensas a fallar por cambios de texto o estilo.

---

**Conclusión:** La plataforma tiene una base funcional sólida y características "wow" (IA), pero necesita un pulido significativo en la robustez del formulario y la gestión de errores para ofrecer una experiencia de usuario confiable y profesional.
