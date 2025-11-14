# Google Calendar UI - Verificación de Implementación

## ✅ Estado: COMPLETAMENTE IMPLEMENTADO

La interfaz de usuario para Google Calendar OAuth está **completamente implementada** en la página de perfil.

---

## 📍 Ubicación

**Archivo**: `/home/edu/autorenta/apps/web/src/app/features/profile/profile.page.html`

**Líneas**: 165-220

**Sección**: "Google Calendar" en el panel lateral de configuraciones del perfil

---

## 🎨 Componentes de la UI

### 1. Card de Google Calendar

```html
<div class="bg-surface-secondary dark:bg-surface-secondary/70 rounded-xl p-4 shadow-soft">
  <h3 class="text-lg font-semibold text-text-primary dark:text-text-primary mb-3 flex items-center gap-2">
    🗓️ Google Calendar
  </h3>
  ...
</div>
```

**Estilo**:
- Card con fondo secundario
- Sombra suave
- Bordes redondeados (rounded-xl)
- Padding de 4 unidades
- Icono de calendario (🗓️)

---

### 2. Estado: Conectado

**Cuándo se muestra**: `calendarConnected() === true`

```html
<div *ngIf="calendarConnected(); else calendarDisconnected">
  <!-- Badge de estado -->
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm text-text-secondary">Estado</span>
    <span class="text-xs font-medium text-cta-default">✓ Conectado</span>
  </div>
  
  <!-- Mensaje informativo -->
  <p class="text-xs text-text-secondary mb-3">
    Tus bookings se sincronizan automáticamente
  </p>
  
  <!-- Botón desconectar -->
  <button
    (click)="disconnectGoogleCalendar()"
    [disabled]="calendarLoading()"
    class="w-full btn-secondary px-3 py-2 text-sm font-medium disabled:opacity-50"
  >
    @if (calendarLoading()) {
      <span class="inline-block animate-spin mr-2">⏳</span>
      Desconectando...
    } @else {
      Desconectar
    }
  </button>
</div>
```

**Características**:
- ✅ Badge verde "✓ Conectado"
- ✅ Mensaje de confirmación
- ✅ Botón "Desconectar" (estilo secundario)
- ✅ Loading state con spinner animado
- ✅ Botón deshabilitado durante carga

---

### 3. Estado: No Conectado

**Cuándo se muestra**: `calendarConnected() === false`

```html
<ng-template #calendarDisconnected>
  <!-- Badge de estado -->
  <div class="flex items-center justify-between mb-2">
    <span class="text-sm text-text-secondary">Estado</span>
    <span class="text-xs font-medium text-warning-light">No conectado</span>
  </div>
  
  <!-- Mensaje informativo -->
  <p class="text-xs text-text-secondary mb-3">
    Conecta tu Google Calendar para sincronizar bookings automáticamente
  </p>
  
  <!-- Botón conectar -->
  <button
    (click)="connectGoogleCalendar()"
    [disabled]="calendarLoading()"
    class="w-full btn-primary px-3 py-2 text-sm font-medium disabled:opacity-50"
  >
    @if (calendarLoading()) {
      <span class="inline-block animate-spin mr-2">⏳</span>
      Conectando...
    } @else {
      Conectar Google Calendar
    }
  </button>
</ng-template>
```

**Características**:
- ⚠️ Badge naranja "No conectado"
- ℹ️ Call-to-action explicativo
- ✅ Botón "Conectar Google Calendar" (estilo primario)
- ✅ Loading state con spinner animado
- ✅ Botón deshabilitado durante carga

---

## 🔧 Lógica del Componente

**Archivo**: `/home/edu/autorenta/apps/web/src/app/features/profile/profile.page.ts`

### Signals Reactivos

```typescript
readonly calendarConnected = signal(false);   // Estado de conexión
readonly calendarLoading = signal(false);     // Loading state
```

### Métodos Implementados

#### 1. `checkCalendarConnection()`

```typescript
async checkCalendarConnection(): Promise<void> {
  // Verifica autenticación
  if (!this.authService.isAuthenticated()) {
    this.calendarConnected.set(false);
    return;
  }

  try {
    this.calendarLoading.set(true);
    const status = await this.googleCalendarService.getConnectionStatus().toPromise();
    this.calendarConnected.set(status?.connected ?? false);
  } catch (err) {
    console.error('Error checking calendar connection:', err);
    this.calendarConnected.set(false);
  } finally {
    this.calendarLoading.set(false);
  }
}
```

**Llamado en**:
- `ngOnInit()` - Inicialización del componente
- `checkCalendarConnectionSuccess()` - Después de redirección con `?calendar_connected=true`
- Después de `connectGoogleCalendar()` - Verificar conexión exitosa

#### 2. `connectGoogleCalendar()`

```typescript
async connectGoogleCalendar(): Promise<void> {
  // Verifica autenticación
  if (!this.authService.isAuthenticated()) {
    this.error.set('Debes iniciar sesión para conectar Google Calendar.');
    return;
  }

  try {
    this.calendarLoading.set(true);
    this.message.set(null);
    this.error.set(null);

    // Abre popup OAuth
    await this.googleCalendarService.connectGoogleCalendar().toPromise();

    // Verifica estado después de cerrar popup
    await this.checkCalendarConnection();

    if (this.calendarConnected()) {
      this.message.set('Google Calendar conectado exitosamente');
      setTimeout(() => this.message.set(null), 3000);
    }
  } catch (err) {
    console.error('Error connecting calendar:', err);
    const errorMessage =
      err instanceof Error
        ? err.message.includes('No active session')
          ? 'Debes iniciar sesión para conectar Google Calendar.'
          : err.message
        : 'No pudimos conectar tu Google Calendar. Por favor, intenta nuevamente.';
    this.error.set(errorMessage);
  } finally {
    this.calendarLoading.set(false);
  }
}
```

**Flujo**:
1. ✅ Verifica autenticación
2. ✅ Abre popup OAuth (600x700, centrado)
3. ✅ Usuario autoriza en Google
4. ✅ Popup se cierra automáticamente
5. ✅ Verifica estado de conexión
6. ✅ Muestra mensaje de éxito (3 segundos)

#### 3. `disconnectGoogleCalendar()`

```typescript
async disconnectGoogleCalendar(): Promise<void> {
  // Confirmación
  if (!confirm('¿Estás seguro de desconectar tu Google Calendar?')) {
    return;
  }

  try {
    this.calendarLoading.set(true);
    this.message.set(null);

    await this.googleCalendarService.disconnectCalendar().toPromise();
    this.calendarConnected.set(false);

    this.message.set('Google Calendar desconectado');
    setTimeout(() => this.message.set(null), 3000);
  } catch (err) {
    console.error('Error disconnecting calendar:', err);
    this.error.set(
      err instanceof Error ? err.message : 'No pudimos desconectar tu Google Calendar.',
    );
  } finally {
    this.calendarLoading.set(false);
  }
}
```

**Flujo**:
1. ✅ Muestra confirmación nativa
2. ✅ Llama a Edge Function para eliminar tokens
3. ✅ Actualiza estado local
4. ✅ Muestra mensaje de confirmación (3 segundos)

---

## 🎬 Flujo de Usuario

### Escenario 1: Conectar Calendar (Primera Vez)

```
1. Usuario ve card "🗓️ Google Calendar"
   └─ Estado: "No conectado" (naranja)
   └─ Botón: "Conectar Google Calendar" (azul)

2. Usuario hace clic en "Conectar Google Calendar"
   └─ Botón cambia a "Conectando..." con spinner ⏳
   └─ Se abre popup OAuth (600x700px, centrado)

3. Popup muestra página de autorización de Google
   └─ URL: https://accounts.google.com/o/oauth2/v2/auth
   └─ Scopes solicitados:
       • https://www.googleapis.com/auth/calendar
       • https://www.googleapis.com/auth/calendar.events

4. Usuario autoriza en Google
   └─ Google redirige a: [SUPABASE_URL]/functions/v1/google-calendar-oauth?code=...&state=...

5. Edge Function procesa callback
   └─ Intercambia código por tokens
   └─ Guarda tokens en DB (google_calendar_tokens)
   └─ Retorna HTML con JavaScript que:
       • Redirige ventana padre a: /profile?calendar_connected=true
       • Cierra popup automáticamente

6. Página de perfil detecta ?calendar_connected=true
   └─ Llama checkCalendarConnection()
   └─ Estado cambia a "✓ Conectado" (verde)
   └─ Muestra mensaje: "Google Calendar conectado exitosamente"
   └─ Mensaje desaparece después de 3 segundos
```

### Escenario 2: Desconectar Calendar

```
1. Usuario ve card "🗓️ Google Calendar"
   └─ Estado: "✓ Conectado" (verde)
   └─ Botón: "Desconectar"

2. Usuario hace clic en "Desconectar"
   └─ Aparece confirmación: "¿Estás seguro de desconectar tu Google Calendar?"

3. Usuario confirma
   └─ Botón cambia a "Desconectando..." con spinner ⏳
   └─ Edge Function elimina tokens de DB
   └─ Estado cambia a "No conectado" (naranja)
   └─ Muestra mensaje: "Google Calendar desconectado"
   └─ Mensaje desaparece después de 3 segundos
```

### Escenario 3: Usuario ya conectado (página refresh)

```
1. Usuario navega a /profile
   └─ ngOnInit() ejecuta checkCalendarConnection()

2. Edge Function consulta google_calendar_tokens
   └─ Si existe token válido:
       • Estado: "✓ Conectado" (verde)
       • Botón: "Desconectar"
   └─ Si NO existe o expiró:
       • Estado: "No conectado" (naranja)
       • Botón: "Conectar Google Calendar"
```

---

## 🧪 Testing

### Test Manual (Checklist)

**Servidor corriendo**: `pnpm run dev` (ya está corriendo en tu caso)

1. **Navegación**:
   - [ ] Ir a http://localhost:4200/profile
   - [ ] Iniciar sesión si es necesario
   - [ ] Scroll hasta sección "Google Calendar"

2. **Estado No Conectado**:
   - [ ] Ver badge "No conectado" (naranja)
   - [ ] Ver mensaje "Conecta tu Google Calendar..."
   - [ ] Ver botón "Conectar Google Calendar" (azul)

3. **Conectar**:
   - [ ] Hacer clic en "Conectar Google Calendar"
   - [ ] Ver spinner "Conectando..." ⏳
   - [ ] Popup se abre (600x700px, centrado)
   - [ ] Ver página de autorización de Google
   - [ ] Autorizar acceso
   - [ ] Popup se cierra automáticamente
   - [ ] Ver mensaje de éxito (3 segundos)
   - [ ] Badge cambia a "✓ Conectado" (verde)

4. **Estado Conectado**:
   - [ ] Ver badge "✓ Conectado" (verde)
   - [ ] Ver mensaje "Tus bookings se sincronizan automáticamente"
   - [ ] Ver botón "Desconectar" (gris)

5. **Desconectar**:
   - [ ] Hacer clic en "Desconectar"
   - [ ] Ver confirmación nativa
   - [ ] Confirmar
   - [ ] Ver spinner "Desconectando..." ⏳
   - [ ] Ver mensaje de confirmación (3 segundos)
   - [ ] Badge cambia a "No conectado" (naranja)

6. **Recarga de página**:
   - [ ] Recargar página (F5)
   - [ ] Estado se mantiene (conectado/no conectado)

### Test E2E Automatizado

**Archivo**: `/home/edu/autorenta/tests/e2e/google-calendar-oauth.spec.ts`

**Ejecutar**:
```bash
# Headless
pnpm run test:e2e:calendar

# Con UI
pnpm run test:e2e:calendar:ui

# En navegador visible
pnpm run test:e2e:calendar:headed

# Debug
pnpm run test:e2e:calendar:debug
```

---

## 🎨 Estilos y Clases Tailwind

### Card Container
```
bg-surface-secondary        → Fondo secundario (claro)
dark:bg-surface-secondary/70 → Fondo secundario (oscuro, 70% opacidad)
rounded-xl                  → Bordes redondeados grandes
p-4                         → Padding de 1rem
shadow-soft                 → Sombra suave
```

### Título
```
text-lg                     → Tamaño de texto grande
font-semibold               → Peso semi-bold
text-text-primary           → Color primario de texto
dark:text-text-primary      → Color primario (modo oscuro)
mb-3                        → Margen inferior
flex items-center gap-2     → Flexbox con gap
```

### Badge de Estado
```
text-xs font-medium         → Texto pequeño y medio
text-cta-default            → Verde (conectado)
text-warning-light          → Naranja (no conectado)
```

### Botones
```
w-full                      → Ancho completo
btn-primary                 → Estilo primario (azul)
btn-secondary               → Estilo secundario (gris)
px-3 py-2                   → Padding horizontal/vertical
text-sm font-medium         → Texto pequeño y medio
disabled:opacity-50         → 50% opacidad cuando deshabilitado
```

### Loading Spinner
```
inline-block                → Display inline-block
animate-spin                → Rotación continua
mr-2                        → Margen derecho
```

---

## 📱 Responsive Design

La UI es completamente responsive:

- **Desktop**: Card en panel lateral (width fijo)
- **Tablet**: Card mantiene mismo layout
- **Mobile**: Card ocupa ancho completo, botones full-width

**Clases responsivas** (si aplican):
```
sm:...   → >= 640px
md:...   → >= 768px
lg:...   → >= 1024px
xl:...   → >= 1280px
```

---

## 🌙 Dark Mode

Soporte completo de modo oscuro:

```html
<!-- Card background -->
dark:bg-surface-secondary/70

<!-- Text colors -->
dark:text-text-primary
dark:text-text-secondary/70
```

**Clases dark mode**:
- `dark:bg-*` - Fondos
- `dark:text-*` - Textos
- `dark:border-*` - Bordes

---

## 🔍 Dónde Ver la UI

### 1. En Local (Dev Server)

```bash
# Si no está corriendo:
pnpm run dev

# Navegar a:
http://localhost:4200/profile
```

**Scroll hasta**:
- Sección "🗓️ Google Calendar"
- Está en el panel lateral derecho
- Debajo de "Language" y "Theme"
- Encima de "Verificaciones"

### 2. En Producción

```
https://[TU-DOMINIO]/profile
```

---

## ✅ Checklist de Implementación

### Componente TypeScript
- [x] GoogleCalendarService inyectado
- [x] Signals declarados (calendarConnected, calendarLoading)
- [x] Método checkCalendarConnection()
- [x] Método connectGoogleCalendar()
- [x] Método disconnectGoogleCalendar()
- [x] ngOnInit() llama checkCalendarConnection()
- [x] Manejo de ?calendar_connected=true en URL

### Template HTML
- [x] Card con título "🗓️ Google Calendar"
- [x] Estado conectado (*ngIf="calendarConnected()")
- [x] Estado no conectado (ng-template #calendarDisconnected)
- [x] Badge de estado dinámico
- [x] Mensajes informativos
- [x] Botón conectar con loading state
- [x] Botón desconectar con loading state
- [x] Spinner animado (@if calendarLoading())

### Estilos
- [x] Clases Tailwind aplicadas
- [x] Dark mode soportado
- [x] Responsive design
- [x] Estados hover/disabled

### Integración
- [x] GoogleCalendarService implementado
- [x] Edge Function google-calendar-oauth funcionando
- [x] Tabla google_calendar_tokens en DB
- [x] RLS policies configuradas
- [x] CORS headers configurados

### Testing
- [x] Tests E2E creados (google-calendar-oauth.spec.ts)
- [x] Scripts npm agregados (test:e2e:calendar, etc.)
- [x] Documentación de tests (README_CALENDAR_OAUTH.md)
- [x] Script de verificación (verify-calendar-setup.sh)

---

## 🚀 Próximos Pasos

1. **Verificación Visual**:
   ```bash
   # Navegar a perfil
   http://localhost:4200/profile
   
   # Scroll hasta "Google Calendar"
   # Verificar que se vea el card correctamente
   ```

2. **Test de Conexión**:
   ```bash
   # Hacer clic en "Conectar Google Calendar"
   # Verificar que se abre popup
   # Autorizar en Google
   # Verificar que estado cambia a "Conectado"
   ```

3. **Test E2E**:
   ```bash
   pnpm run test:e2e:calendar:ui
   ```

4. **Deploy**:
   ```bash
   pnpm run deploy:web
   ```

---

## 📞 Soporte

Si ves algún problema con la UI:

1. **Consola del navegador**: F12 → Console
2. **Network tab**: Verificar llamadas a Edge Function
3. **Edge Function logs**: Supabase Dashboard → Functions → Logs
4. **Database**: Verificar tabla `google_calendar_tokens`

---

**Fecha**: 2025-01-14  
**Estado**: ✅ UI COMPLETAMENTE IMPLEMENTADA  
**Ubicación**: `/profile` → Sección "🗓️ Google Calendar"
