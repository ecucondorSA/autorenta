# 🐛 HOTFIX: Tour No Inicia en Homepage

## Problema Identificado

El tour no inicia porque el **sistema viejo (TourService) estaba ejecutándose en paralelo** con el nuevo (GuidedTourService), causando conflictos.

### Logs del Error:
```
tour.service.ts:384 Tour: Timeout waiting for selector: [data-tour-step="welcome-nav"]
shepherd.mjs:632 The element for this Shepherd step was not found [data-tour-step="welcome-nav"]
```

**Causa**: El viejo `TourService` intentaba iniciar el tour con selectores antiguos antes que el nuevo sistema.

---

## ✅ Solución Aplicada

### 1. Desactivado viejo TourService

**Archivo**: `apps/web/src/app/core/services/tour.service.ts`

```typescript
startWelcomeTour(): void {
  // DEPRECATED: This service is being replaced by GuidedTourService
  console.warn('[OLD TourService] startWelcomeTour() called');
  return; // Disabled - use new GuidedTourService
}

startGuidedBookingTour(): void {
  // DEPRECATED
  console.warn('[OLD TourService] startGuidedBookingTour() called');
  return; // Disabled
}
```

**Resultado**: El viejo sistema ya NO interfiere con el nuevo.

---

### 2. Verificar autoStart en Welcome Tour

El Welcome tour debe tener `autoStart: true`:

```typescript
// tour-registry.service.ts
this.register({
  id: TourId.Welcome,
  name: 'Tour de Bienvenida',
  autoStart: true,  // ✅ Debe estar en true
  // ...
});
```

---

### 3. Verificar Triggers

El Welcome tour necesita un trigger o guard para determinar cuándo iniciarse:

```typescript
guards: [
  {
    name: 'isHomePage',
    check: () => {
      const path = window.location.pathname;
      return path === '/' || path === '/cars';
    },
  },
],
```

---

## 🧪 Testing

### 1. Verificar que viejo sistema está desactivado

```bash
# Reiniciar servidor
npm start
```

**En console del navegador** (no debe aparecer):
```
❌ tour.service.ts:384 Tour: Timeout waiting...
```

**Debe aparecer**:
```
✅ 🧭 Guided Tour System: Debug mode enabled
✅ [TourOrchestrator] Starting tour: welcome
```

---

### 2. Forzar inicio manual

Si el tour no inicia automáticamente:

```javascript
// En console del navegador:
guidedTour.request({ id: TourId.Welcome, force: true });
```

---

### 3. Debug: Ver estado

```javascript
// Ver estado actual
guidedTour.getState()

// Ver tours disponibles
guidedTour.getAvailableTours()

// Ver si completado
guidedTour.hasCompleted(TourId.Welcome)

// Reset si está completado
guidedTour.reset(TourId.Welcome)
```

---

## 🔍 Verificación de Elementos

Los elementos deben existir en el DOM:

```javascript
// Verificar selectores
document.querySelector('[data-tour-step="welcome-hero"]')
// Debe retornar: <a routerlink="/" data-tour-step="welcome-hero"...>

document.querySelector('[data-tour-step="welcome-nav"]')
// Debe retornar: <nav id="main-nav" data-tour-step="welcome-nav"...>

document.querySelector('[data-tour-step="welcome-help"]')
// Debe retornar: <button id="help-center" data-tour-step="welcome-help"...>
```

**Si retorna `null`**: El elemento no existe o está oculto. Verificar HTML.

---

## 📋 Checklist de Debugging

- [ ] Viejo TourService desactivado (no logs de tour.service.ts)
- [ ] Nuevo GuidedTourService cargado
- [ ] Debug mode habilitado en dev
- [ ] Elementos con data-tour-step existen en DOM
- [ ] Welcome tour tiene autoStart: true
- [ ] Tour no está marcado como completado en localStorage
- [ ] Guards del tour pasan correctamente

---

## 🚀 Reinicio Completo

Si sigue sin funcionar, reinicio completo:

```bash
# 1. Parar servidor
Ctrl+C

# 2. Limpiar cache
rm -rf .angular

# 3. Reinstalar si es necesario
npm install

# 4. Iniciar
npm start

# 5. Abrir en incógnito
http://localhost:4200

# 6. En console:
localStorage.clear()
location.reload()
```

---

## 💡 Solución Rápida (Manual Start)

Mientras debugueas, puedes iniciar manualmente desde Help Button:

1. Click en botón de ayuda (?)
2. Click en "🎯 Ver tour de bienvenida"
3. Tour debe iniciar correctamente

---

## 📞 Si Persiste el Problema

Verificar en este orden:

1. **Console errors**: ¿Hay errores de compilación?
2. **Network tab**: ¿guided-tour.service.ts se carga?
3. **Elements tab**: ¿Los data-tour-step existen?
4. **localStorage**: ¿Tour marcado como completed?

```javascript
// Debug completo
console.log('1. Service loaded?', typeof guidedTour);
console.log('2. State:', guidedTour.getState());
console.log('3. Available tours:', guidedTour.getAvailableTours());
console.log('4. Elements:', {
  hero: !!document.querySelector('[data-tour-step="welcome-hero"]'),
  nav: !!document.querySelector('[data-tour-step="welcome-nav"]'),
  help: !!document.querySelector('[data-tour-step="welcome-help"]'),
});
console.log('5. Completed?', guidedTour.hasCompleted(TourId.Welcome));
```

---

✅ **Hotfix aplicado - Reinicia servidor y prueba**

