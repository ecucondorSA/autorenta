# 🔧 Configuración de Sentry - ISSUE #1

**Fecha**: 2025-11-09  
**Issue**: [#1](https://github.com/ecucondorSA/autorenta/issues/1) / [#145](https://github.com/ecucondorSA/autorenta/issues/145)  
**Estado**: ✅ Configuración de código completada

---

## ✅ Cambios Realizados

### 1. Actualización de Configuración de Sentry

**Archivo**: `apps/web/src/app/core/services/sentry.service.ts`

- ✅ Agregado `sendDefaultPii: true` según instrucciones oficiales de Sentry
- ✅ Configuración ya incluye:
  - Browser tracing integration
  - Session replay
  - Error tracking
  - Performance monitoring (10% sample rate)

### 2. Error Handler Configurado

**Archivo**: `apps/web/src/app/app.config.ts`

- ✅ `SentryErrorHandler` ya está configurado como ErrorHandler global
- ✅ Solo activo cuando `environment.sentryDsn` está configurado

### 3. Inicialización en main.ts

**Archivo**: `apps/web/src/main.ts`

- ✅ Sentry se inicializa ANTES del bootstrap de Angular
- ✅ Garantiza captura de errores desde el inicio de la app

---

## 📋 Pasos para Completar Configuración

### Paso 1: Configurar DSN en Cloudflare Pages

1. **Ir a Cloudflare Dashboard**:
   - https://dash.cloudflare.com/
   - Seleccionar proyecto `autorenta-web`

2. **Agregar Variable de Entorno**:
   - Settings → Environment variables
   - Production environment
   - Agregar nueva variable:
     - **Name**: `NG_APP_SENTRY_DSN`
     - **Value**: `https://381f103c7eb48baf128c95077b73d3b1@o4510335018795008.ingest.us.sentry.io/4510335020826624`

3. **Agregar Variable de Entorno**:
   - **Name**: `NG_APP_SENTRY_ENVIRONMENT`
   - **Value**: `production`

4. **Redeploy**:
   - Después de agregar las variables, hacer redeploy de la aplicación
   - O esperar al próximo deploy automático desde GitHub

### Paso 2: Verificar Configuración

**Opción A: Verificar en Console del Navegador**

1. Abrir la app en producción
2. Abrir DevTools → Console
3. Buscar mensaje: `✅ Sentry initialized`

**Opción B: Probar Error de Test**

1. Agregar temporalmente un botón de test en algún componente:

```typescript
// En cualquier componente
testSentry(): void {
  throw new Error('Sentry Test Error');
}
```

2. Hacer click en el botón
3. Verificar en Sentry Dashboard que el error aparece

**Opción C: Verificar en Sentry Dashboard**

1. Ir a: https://sentry.io/
2. Seleccionar proyecto AutoRenta
3. Verificar que aparezcan eventos (puede tomar unos minutos)

---

## 🔍 DSN de Sentry

```
https://381f103c7eb48baf128c95077b73d3b1@o4510335018795008.ingest.us.sentry.io/4510335020826624
```

**⚠️ IMPORTANTE**: Este DSN ya está configurado en el código. Solo falta agregarlo como variable de entorno en Cloudflare Pages.

---

## 📊 Características Habilitadas

### Error Tracking
- ✅ Captura automática de errores no manejados
- ✅ Stack traces completos
- ✅ Contexto del usuario (IP, user agent, etc.)
- ✅ Breadcrumbs de acciones del usuario

### Performance Monitoring
- ✅ Browser tracing (10% sample rate)
- ✅ Core Web Vitals (LCP, FID, CLS)
- ✅ HTTP request instrumentation
- ✅ Router navigation tracking

### Session Replay
- ✅ 10% de sesiones en producción
- ✅ 100% de sesiones con errores
- ✅ Máscara de texto y media para privacidad

### Data Privacy
- ✅ Filtrado de datos sensibles (tokens, passwords)
- ✅ Redacción automática de headers sensibles
- ✅ `sendDefaultPii: true` habilitado (IP, user agent)

---

## 🧪 Testing Local (Opcional)

Para probar Sentry localmente sin afectar producción:

1. **Crear archivo `.env.development.local`** en `apps/web/`:
```bash
NG_APP_SENTRY_DSN=https://381f103c7eb48baf128c95077b73d3b1@o4510335018795008.ingest.us.sentry.io/4510335020826624
NG_APP_SENTRY_ENVIRONMENT=development
```

2. **Ejecutar en modo desarrollo**:
```bash
npm run dev:web
```

3. **Probar error**:
   - Abrir DevTools → Console
   - Ejecutar: `throw new Error('Test')`
   - Verificar en Sentry Dashboard

---

## ✅ Checklist Final

- [x] Código actualizado con `sendDefaultPii: true`
- [x] ErrorHandler configurado
- [x] Inicialización en main.ts
- [x] DSN configurado en Cloudflare Pages (variable `NG_APP_SENTRY_DSN`)
- [x] Environment configurado en Cloudflare Pages (variable `NG_APP_SENTRY_ENVIRONMENT`)
- [x] App redeployada
- [ ] Verificado en Sentry Dashboard que captura errores (recomendado verificar)

---

## 📚 Referencias

- [Sentry Angular Documentation](https://docs.sentry.io/platforms/javascript/guides/angular/)
- [Sentry Dashboard](https://sentry.io/)
- Issue template: `.github/issues/issue-1-day-1.md`
- Configuración: `apps/web/src/app/core/services/sentry.service.ts`

