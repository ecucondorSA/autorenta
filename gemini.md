# Integración de Gemini CLI en el Flujo de Trabajo de AutoRenta

Este documento describe cómo se utiliza el asistente **Gemini CLI** para potenciar el desarrollo en el proyecto AutoRenta. Gemini actúa como un copiloto de ingeniería, automatizando tareas, auditando el codebase y generando código de alta calidad.

---

## 1. Configuración de Entorno (gemini-cli)

### 1.1 Instalación y Acceso
*   Asegúrate de tener el Gemini CLI instalado y configurado con tu cuenta Google.
*   Inicia una sesión de chat interactiva con `gemini chat`.

### 1.2 Servidores MCP (Model Context Protocol)
Los MCPs extienden las capacidades de Gemini, permitiéndole ejecutar lógica personalizada sobre tu codebase.

*   **Registro de MCPs:** Los servidores MCP se registran una sola vez por proyecto usando el comando `gemini mcp add`.
    *   **Comandos Ejecutados:**
        ```bash
        # Prompt Refiner (Python, Gemini-Powered)
        gemini mcp add prompt-refiner /home/edu/autorenta/mcp/prompt-refiner/venv/bin/python /home/edu/autorenta/mcp/prompt-refiner/server.py --description "Gemini-powered Prompt Refiner for Logic, UI, and Production optimization"

        # AutoRenta Platform (Node.js/TypeScript)
        gemini mcp add autorenta-platform node "/home/edu/autorenta/mcp-server/dist/index.js" -e NODE_ENV=production --description "AutoRenta Platform MCP - Real-time access to cars, bookings, users, platform operations"

        # Cloudflare Builds (Remoto - SSE)
        gemini mcp add --transport sse cloudflare-builds https://builds.mcp.cloudflare.com/mcp --description "Deploy and manage Cloudflare Pages and Workers builds"

        # Cloudflare Docs (Remoto - SSE)
        gemini mcp add --transport sse cloudflare-docs https://docs.mcp.cloudflare.com/mcp --description "Quick reference for Cloudflare documentation"

        # Cloudflare Bindings (Remoto - SSE)
        gemini mcp add --transport sse cloudflare-bindings https://bindings.mcp.cloudflare.com/mcp --description "Manage Workers bindings (R2, KV, D1, AI, etc.)"

        # MercadoPago (Remoto - SSE con Auth)
        gemini mcp add --transport sse --header "Authorization: Bearer APP_USR-4340262352975191-101722-3fc884850841f34c6f83bd4e29b3134c-2302679571" mercadopago-mcp-server-prod https://mcp.mercadopago.com/mcp --description "MercadoPago MCP Server - Integraciones con IA y pagos"

        # Supabase (Remoto - SSE)
        gemini mcp add --transport sse supabase "https://mcp.supabase.com/mcp?project_ref=pisqjmoklivzpwufhscx" --description "Supabase MCP Server - Database queries and schema management"
        ```
*   **Verificación:** Dentro de la sesión `gemini chat`, usa `/mcp list` para ver los servidores activos.
*   **Uso del Prompt Refiner:** El MCP `prompt-refiner` es fundamental para iniciar cualquier tarea compleja. En lugar de dar instrucciones vagas, pídele a Gemini que use el `refine_user_prompt`.
    ```
    "Usa la herramienta refine_user_prompt para analizar este requerimiento: [tu prompt aquí] Contexto: [contexto del proyecto]"
    ```
    El refiner te hará preguntas de clarificación, asegurando que el plan de acción sea preciso.

### 2. Flujos de Trabajo Comunes con Gemini CLI

#### 2.1 Auditorías de Código y Base de Datos
*   **Comando Clave:** `codebase_investigator` (herramienta interna de Gemini).
*   **Uso:** Para análisis profundos de desalineaciones entre BD y UI, identificación de deuda técnica, o mapeo de funcionalidades.
*   **Ejemplo de Prompt:**
    ```
    "Necesito una auditoría completa de mi base de datos vs. la UI. ¿Qué funcionalidades backend no tienen frontend? ¿Qué tablas no se usan visualmente? Prioriza los módulos críticos."
    ```

#### 2.2 Desarrollo de Features (Scaffolding y Refactor)
*   Gemini puede generar la estructura de archivos (`mkdir`, `write_file`), crear servicios, componentes y rutas.
*   Es ideal para tareas repetitivas o para iniciar un nuevo módulo siguiendo las convenciones del proyecto.
*   **Ejemplo de Prompt:**
    ```
    "Genera el componente 'ProductCard' en apps/web/src/app/shared/components/products/ y asegúrate de que use 'Product' de types/product.d.ts. Incluye un placeholder de imagen y un botón 'Añadir al Carrito'."
    ```

#### 2.3 Debugging y Resolución de Errores
*   Puedes pegarle logs de errores, stack traces o descripciones de bugs.
*   Gemini puede analizar el contexto del código (`read_file`, `search_file_content`) y sugerir soluciones.
*   **Ejemplo de Prompt:**
    ```
    "Estoy recibiendo este error en mi consola: [pega error]. Revisa 'apps/web/src/app/core/services/payment.service.ts' y 'supabase/functions/payments.js' para encontrar la causa."
    ```

#### 2.4 Generación de Pruebas
*   Después de implementar una feature o corregir un bug, pídele a Gemini que genere pruebas unitarias o E2E.
*   **Ejemplo de Prompt:**
    ```
    "Crea una prueba unitaria para la función 'calculateTotalPrice' en 'utils/pricing.ts' que cubra casos borde como descuentos cero y precios negativos."
    ```

### 3. Mejores Prácticas para Interactuar con Gemini

*   **Sé Explícito:** Cuanto más claro seas en tu solicitud, mejor será la respuesta.
*   **Provee Contexto:** Siempre que sea posible, dale a Gemini el contexto relevante (rutas de archivo, snippets de código, descripciones de arquitectura).
*   **Usa el Prompt Refiner:** Para tareas complejas, empieza siempre pidiéndole al `prompt-refiner` que aclare la tarea.
*   **Valida y Prueba:** Aunque Gemini es potente, siempre revisa el código generado y realiza tus propias pruebas.
*   **Itera:** El desarrollo es un proceso iterativo. Si la primera respuesta no es perfecta, refina tu prompt y vuelve a intentarlo.

---

Este documento será una guía para ti y tu equipo al usar Gemini CLI.
