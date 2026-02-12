# 🚀 Launch Stabilization: Next Steps Prompts

Este documento contiene una lista curada de **prompts listos para usar**. Copia y pega estos prompts para guiar al Agente a través de las tareas pendientes de estabilización y lanzamiento.

---

## 🔴 Prioridad Crítica (Estabilidad & Auth)

### 1. Implementar Refresh Token Interceptor (#619)
> **Contexto**: Los usuarios reportan cierres de sesión "inesperados" cuando el token expira mientras usan la app. Necesitamos manejar el error 401 y refrescar silenciosamente.

**📋 Prompt:**
```text
Implementa el `AuthRefreshInterceptor` para Angular.
El interceptor debe:
1. Interceptar errores HTTP 401 de Supabase.
2. Intentar refrescar la sesión usando `SupabaseService.refreshSession()`.
3. Si el refresh es exitoso, reintentar la petición original con el nuevo token.
4. Si falla, redirigir al login.
Asegúrate de evitar ciclos infinitos si el refresh también da 401.
```

### 2. Definir Estrategia de Facebook Login (#623+)
> **Contexto**: El login con Facebook está generando múltiples errores en Sentry (`FB is not defined`, etc.).

**📋 Prompt (Opción A - Arreglar):**
```text
Investiga y corrige la integración de Facebook Login en Capacitor. Verifica:
1. Que las claves de hash (SHA) en la consola de desarrolladores de Facebook coincidan con nuestra keystore de release.
2. Que el plugin `capacitor-facebook-login` esté actualizado.
3. Que el inicializador del SDK no esté bloqueando la carga de la app.
```

**📋 Prompt (Opción B - Deprecar/Eliminar):**
```text
Elimina la opción de "Iniciar sesión con Facebook" de la UI (Login y Registro) y del servicio de autenticación.
Vamos a priorizar Google y Email/Password para el lanzamiento para reducir la superficie de errores.
Asegúrate de limpiar el código muerto relacionado en `AuthService`.
```

---

## 🟡 Prioridad Alta (Performance & UX)

### 3. Compresión de Video (Uploads)
> **Contexto**: Ya optimizamos imágenes con `FileUploadService`, pero los videos de inspección siguen siendo pesados (Issue Sentry #610 relacionado).

**📋 Prompt:**
```text
Investiga e implementa una solución de compresión de video en el cliente (Frontend).
Objetivo: Reducir videos de inspección de 30-50MB a <10MB antes de subir a Supabase.
Evalúa usar FFmpeg.wasm o una estrategia de reducción de bitrate/resolución mediante Canvas si es viable para videos cortos.
Actualiza `FileUploadService` para soportar videos.
```

### 4. Auditoría SSR & Hydration Final
> **Contexto**: Aunque arreglamos NG0750 (#624), necesitamos asegurar que no introdujimos nuevos errores con los cambios recientes.

**📋 Prompt:**
```text
Realiza una auditoría rápida de los componentes `features/bookings` y `features/car-details`.
Verifica que no estemos accediendo a `window` o `localStorage` directamente en el constructor o `ngOnInit` sin usar `PlatformUtils.isBrowser()`.
Si encuentras violaciones, refactoriza usando `afterNextRender` o los utilitarios de plataforma.
```

---

## 🟢 Preparación para Store (Release)

### 5. Verificación de Build Android
> **Contexto**: Asegurar cumplimiento con requisitos 2026 de Google Play (Target SDK 35, etc.).

**📋 Prompt:**
```text
Ejecuta el script `./tools/mobile/verify-build.sh`.
Si no existe, créalo basándote en la documentación de `docs/PLAYSTORE_PUBLISH.md`.
El script debe verificar:
- Target SDK >= 35.
- Keystore de release presente.
- VersionCode incrementado respecto a producción.
Dame un reporte del estado actual del build.
```

### 6. Smoke Test Plan
> **Contexto**: Necesitamos una lista de chequeo manual antes de dar luz verde al deploy.

**📋 Prompt:**
```text
Genera un archivo `docs/RELEASE_SMOKE_TEST.md`.
Debe ser una checklist paso a paso para QA manual que cubra:
1. Flujo completo de Registro -> Validación de Identidad.
2. Flujo de Reserva (Búsqueda -> Pago -> Confirmación).
3. Flujo de Publicación de Auto (con subida de fotos).
4. Pruebas de "Modo Avión" (Manejo de errores de red).
5. Verificación de Notificaciones Push.
```

---

## 💡 Prompt "Comodín" (Strategic Analysis)

### 7. Análisis de Riesgo de Lanzamiento
> **Contexto**: Como Senior, ¿qué nos estamos olvidando?

**📋 Prompt:**
```text
Actúa como un Tech Lead Senior. Revisa `SENTRY_HARDENING_COMPLETE.md` y el estado actual del proyecto.
Identifica 3 riesgos técnicos latentes que podrían tumbar el lanzamiento y que no hayamos discutido todavía (ej. límites de Edge Functions, concurrencia en base de datos, costos de storage).
Propón mitigaciones rápidas para cada uno.
```
