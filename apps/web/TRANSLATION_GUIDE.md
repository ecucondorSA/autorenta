# Guía de Aplicación de Traducciones

## Estado Actual

✅ **Infraestructura completa**:
- ngx-translate v17 configurado
- 507 claves de traducción en `es.json` y `pt.json`
- TranslateModule agregado a 50 componentes
- Navegación principal traducida

## Cómo Aplicar Traducciones

### 1. Textos Simples en HTML

**Antes:**
```html
<h1>Mi Perfil</h1>
<button>Guardar</button>
<p>Cargando datos...</p>
```

**Después:**
```html
<h1>{{ 'common.mi_perfil' | translate }}</h1>
<button>{{ 'common.save' | translate }}</button>
<p>{{ 'common.cargando_datos' | translate }}</p>
```

### 2. Atributos HTML

**Antes:**
```html
<button aria-label="Cerrar modal">X</button>
<input placeholder="Escrib\u00ed tu mensaje...">
<img alt="Sin foto">
```

**Después:**
```html
<button [attr.aria-label]="'common.cerrar_modal' | translate">X</button>
<input [placeholder]="'common.escribi_tu_mensaje' | translate">
<img [alt]="'common.sin_foto' | translate">
```

### 3. Textos con Interpolación

**Antes:**
```html
<p>Miembro desde: {{ profile.created_at | date }}</p>
```

**Después:**
```html
<p>{{ 'common.miembro_desde' | translate }}: {{ profile.created_at | date }}</p>
```

### 4. Claves Disponibles

Todas las claves están en `src/assets/i18n/es.json` y `pt.json`:

```json
{
  "common": {
    "loading": "Cargando...",
    "save": "Guardar",
    "cancel": "Cancelar",
    "edit": "Editar"
    // ... 400+ claves más
  },
  "nav": {
    "home": "Inicio",
    "cars": "Buscar autos",
    "wallet": "Wallet"
    // ...
  }
}
```

## Scripts Disponibles

### Escanear textos traducibles
```bash
python scripts/auto-translate.py --scan
```

### Actualizar archivos JSON con nuevos textos
```bash
python scripts/auto-translate.py --update-json
```

### Ver qué textos se pueden traducir automáticamente
```bash
python scripts/apply-translations.py --dry-run
```

## Progreso por Módulo

### ✅ Completado
- [x] Navegación principal (app.component.html)
- [x] Infraestructura de i18n
- [x] Archivos JSON con 507 claves
- [x] TranslateModule en 50 componentes

### 🔄 Pendiente
- [ ] Auth (login, register, reset-password)
- [ ] Cars (list, detail, publish, my-cars)
- [ ] Bookings (list, detail, checkout)
- [ ] Wallet
- [ ] Profile
- [ ] Admin
- [ ] Componentes compartidos

## Orden Recomendado de Implementación

1. **Auth** (alta prioridad - usuarios lo ven primero)
   - `src/app/features/auth/login/login.page.html`
   - `src/app/features/auth/register/register.page.html`

2. **Cars List & Detail** (flujo principal)
   - `src/app/features/cars/list/cars-list.page.html`
   - `src/app/features/cars/detail/car-detail.page.html`

3. **Bookings**
   - `src/app/features/bookings/my-bookings/my-bookings.page.html`

4. **Resto de módulos**

## Verificación

Después de aplicar traducciones:

```bash
# 1. Build para verificar errores
npm run build

# 2. Iniciar dev server
npm run start

# 3. Probar cambio de idioma en el selector
```

## Ejemplo Completo: Login Page

**Archivo:** `src/app/features/auth/login/login.page.html`

**Antes:**
```html
<div class="container">
  <h1>Bienvenido de vuelta</h1>
  <p>Ingresá a tu cuenta de Autorentar</p>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <input
      type="email"
      formControlName="email"
      placeholder="Correo electrónico"
    />

    <input
      type="password"
      formControlName="password"
      placeholder="Contraseña"
    />

    <button type="submit">Ingresar</button>
  </form>
</div>
```

**Después:**
```html
<div class="container">
  <h1>{{ 'common.bienvenido_de_vuelta' | translate }}</h1>
  <p>{{ 'common.ingresa_a_tu_cuenta_de_autorentar' | translate }}</p>

  <form [formGroup]="form" (ngSubmit)="submit()">
    <input
      type="email"
      formControlName="email"
      [placeholder]="'auth.login.email' | translate"
    />

    <input
      type="password"
      formControlName="password"
      [placeholder]="'auth.login.password' | translate"
    />

    <button type="submit">{{ 'auth.login.button' | translate }}</button>
  </form>
</div>
```

## Notas Importantes

1. **No traducir**:
   - Variables dinámicas
   - Números
   - URLs
   - Código TypeScript

2. **Usar el namespace correcto**:
   - `common.*` - Textos genéricos reutilizables
   - `nav.*` - Navegación
   - `auth.*` - Autenticación
   - `cars.*` - Autos
   - `bookings.*` - Reservas
   - `wallet.*` - Wallet
   - `profile.*` - Perfil

3. **TranslateModule ya está importado** en todos los componentes, solo necesitas usar el pipe `| translate`

## Mejoras Futuras

- Traducir mensajes de error dinámicos en TypeScript usando `TranslateService`
- Agregar más idiomas (inglés)
- Traducir validaciones de formularios
- Traducir notificaciones/toasts
