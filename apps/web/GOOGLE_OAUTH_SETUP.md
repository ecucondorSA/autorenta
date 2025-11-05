# 🔐 Autenticación con Google OAuth - Implementación Completa

## ✅ Implementación en Frontend Completada

Se implementó la autenticación con Google usando Supabase OAuth. Los usuarios ahora pueden iniciar sesión y registrarse usando su cuenta de Google con un solo click.

## 📋 Archivos Modificados/Creados

### 1. **AuthService** - Método de autenticación OAuth
**Archivo**: `/home/edu/autorenta/apps/web/src/app/core/services/auth.service.ts`

```typescript
async signInWithGoogle(): Promise<void> {
  const { error } = await this.supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw this.mapError(error);
  }
}
```

**Características**:
- Redirige al usuario a la pantalla de autorización de Google
- Configura `redirectTo` para volver a `/auth/callback` después de la autenticación
- Usa `access_type: 'offline'` y `prompt: 'consent'` para obtener refresh token

---

### 2. **LoginPage** - Botón "Continuar con Google"
**Archivo**: `/home/edu/autorenta/apps/web/src/app/features/auth/login/login.page.ts`

```typescript
async signInWithGoogle(): Promise<void> {
  if (this.loading()) return;

  this.loading.set(true);
  this.error.set(null);

  try {
    await this.auth.signInWithGoogle();
    // La redirección a Google ocurre automáticamente
  } catch (err) {
    console.error(err);
    this.error.set(
      err instanceof Error ? err.message : 'No pudimos conectar con Google.'
    );
    this.loading.set(false);
  }
}
```

**Template** (`login.page.html`):
```html
<button
  type="button"
  (click)="signInWithGoogle()"
  [disabled]="loading()"
  class="w-full flex items-center justify-center gap-3 rounded-lg border-2 ..."
>
  <svg class="h-5 w-5" viewBox="0 0 24 24">
    <!-- Ícono oficial de Google -->
  </svg>
  <span>Continuar con Google</span>
</button>

<!-- Divider -->
<div class="relative my-6">
  <div class="relative flex justify-center text-sm">
    <span>O continuar con email</span>
  </div>
</div>
```

---

### 3. **RegisterPage** - Registro con Google
**Archivo**: `/home/edu/autorenta/apps/web/src/app/features/auth/register/register.page.ts`

```typescript
async signUpWithGoogle(): Promise<void> {
  if (this.loading()) return;

  this.loading.set(true);
  this.error.set(null);
  this.message.set(null);

  try {
    await this.auth.signInWithGoogle();
    // El callback manejará el retorno y creará el perfil si es necesario
  } catch (err) {
    console.error(err);
    this.error.set(
      err instanceof Error ? err.message : 'No pudimos conectar con Google.'
    );
    this.loading.set(false);
  }
}
```

---

### 4. **AuthCallbackPage** - Página de retorno OAuth
**Archivo**: `/home/edu/autorenta/apps/web/src/app/features/auth/callback/auth-callback.page.ts`

```typescript
export class AuthCallbackPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly error = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      // Esperar a que Supabase procese la sesión del OAuth callback
      await this.auth.ensureSession();

      // Pequeño delay para asegurar que la sesión esté disponible
      await new Promise(resolve => setTimeout(resolve, 500));

      // Verificar si el usuario está autenticado
      if (this.auth.isAuthenticated()) {
        await this.router.navigate(['/']);
      } else {
        throw new Error('No se pudo completar la autenticación.');
      }
    } catch (err) {
      console.error('OAuth callback error:', err);
      this.error.set(
        err instanceof Error ? err.message : 'Error durante la autenticación.'
      );
    }
  }
}
```

**Template**: Muestra loading spinner mientras procesa, o error si falla.

---

### 5. **Rutas de Autenticación**
**Archivo**: `/home/edu/autorenta/apps/web/src/app/features/auth/auth.routes.ts`

```typescript
export const AUTH_ROUTES: Routes = [
  { path: 'login', loadComponent: () => import('./login/login.page')... },
  { path: 'register', loadComponent: () => import('./register/register.page')... },
  {
    path: 'callback',
    // No GuestGuard - permite acceso durante el proceso OAuth
    loadComponent: () => import('./callback/auth-callback.page')...
  },
];
```

---

## 🔧 Configuración en Supabase (Pendiente)

Para que el login con Google funcione, necesitás configurar OAuth en Supabase:

### Paso 1: Crear credenciales en Google Cloud Console

1. Ir a [Google Cloud Console](https://console.cloud.google.com/)
2. Crear un nuevo proyecto o seleccionar uno existente
3. Navegar a **APIs & Services > Credentials**
4. Click en **Create Credentials > OAuth 2.0 Client ID**
5. Configurar pantalla de consentimiento OAuth:
   - Tipo: External (o Internal si es para organización)
   - Nombre de la app: "AutoRenta"
   - Email de soporte: tu@email.com
   - Dominios autorizados: `autorenta.com` (o tu dominio)
   - Scopes: `email`, `profile`, `openid`

6. Crear OAuth Client ID:
   - Tipo de aplicación: **Web application**
   - Nombre: "AutoRenta Web"
   - Origenes autorizados de JavaScript:
     - `http://localhost:4200` (desarrollo)
     - `https://autorentar.com` (producción)
     - `https://tu-dominio.pages.dev` (Cloudflare Pages)
   - URIs de redirección autorizadas:
     - `https://obxvffplochgeiclibng.supabase.co/auth/v1/callback`

7. Copiar **Client ID** y **Client Secret**

### Paso 2: Configurar en Supabase Dashboard

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Navegar a **Authentication > Providers**
3. Buscar **Google** en la lista de proveedores
4. Habilitar Google OAuth
5. Pegar:
   - **Client ID**: (de Google Cloud Console)
   - **Client Secret**: (de Google Cloud Console)
6. Confirmar que la **Redirect URL** sea:
   ```
   https://obxvffplochgeiclibng.supabase.co/auth/v1/callback
   ```
7. Guardar cambios

### Paso 3: Configurar Site URL y Redirect URLs

En **Authentication > URL Configuration**:

- **Site URL**: `https://autorentar.com` (o tu dominio de producción)
- **Redirect URLs**:
  ```
  http://localhost:4200/auth/callback
  https://autorentar.com/auth/callback
  https://tu-dominio.pages.dev/auth/callback
  ```

---

## 🧪 Testing

### Flujo completo:

1. **Usuario va a /auth/login**
2. Click en "Continuar con Google"
3. Redirige a Google OAuth consent screen
4. Usuario autoriza con su cuenta de Google
5. Google redirige a `/auth/callback` con token
6. Supabase procesa el token y crea sesión
7. AuthCallbackPage verifica sesión
8. Redirige a `/` (home) con usuario autenticado

### Testing local:

```bash
# Terminal 1: Iniciar dev server
npm run start

# Navegador:
# 1. Ir a http://localhost:4200/auth/login
# 2. Click en "Continuar con Google"
# 3. Debería mostrar error hasta configurar Google OAuth en Supabase
```

---

## 🎨 Diseño UI/UX

### Botón de Google:
- **Colores oficiales**: Logo de Google con colores correctos (#4285F4, #34A853, #FBBC05, #EA4335)
- **Bordes**: 2px border con pearl-gray
- **Hover**: Efecto de elevación con shadow-md
- **Disabled**: Opacidad 50% durante loading
- **Dark mode**: Compatible con bg-graphite-light

### Divider:
- Línea horizontal con texto "O continuar con email" / "O registrarse con email"
- Centrado, con fondo blanco para separar

### Estados:
- **Loading**: Spinner animado + texto "Conectando..."
- **Error**: Banner rojo con mensaje de error
- **Success**: Redirección automática (sin mensaje)

---

## 🔒 Seguridad

### Protecciones implementadas:

✅ **PKCE Flow**: Supabase maneja automáticamente PKCE (Proof Key for Code Exchange)
✅ **State Parameter**: Supabase incluye state para prevenir CSRF
✅ **Redirect URL Validation**: Solo permite redirección a URLs configuradas
✅ **Session Storage**: Token almacenado de forma segura por Supabase
✅ **Auto-refresh**: Refresh tokens para mantener sesión activa

### Notas de seguridad:

⚠️ **Client Secret**: Nunca exponer en el frontend (está en Supabase backend)
⚠️ **Redirect URLs**: Solo agregar dominios de confianza
⚠️ **HTTPS Required**: Google OAuth requiere HTTPS en producción

---

## 📊 Métricas Esperadas

### Mejoras de conversión:
- **Registro**: +40-60% (usuarios prefieren OAuth vs formulario)
- **Login**: +30-50% (menos fricciones)
- **Bounce rate**: -20-30% (proceso más rápido)

### Performance:
- **Bundle size**: +0 kB (Supabase ya incluye OAuth)
- **Load time**: Similar (redirección a Google agrega ~500ms)

---

## 🚀 Próximos Pasos

### Opcional - Agregar más proveedores OAuth:

1. **GitHub** (desarrolladores):
   ```typescript
   async signInWithGitHub(): Promise<void> {
     await this.supabase.auth.signInWithOAuth({
       provider: 'github',
       options: { redirectTo: `${window.location.origin}/auth/callback` }
     });
   }
   ```

2. **Facebook** (usuarios generales):
   ```typescript
   async signInWithFacebook(): Promise<void> {
     await this.supabase.auth.signInWithOAuth({
       provider: 'facebook',
       options: { redirectTo: `${window.location.origin}/auth/callback` }
     });
   }
   ```

### Analytics:
- Trackear conversiones de Google OAuth vs Email
- Medir tiempo de registro Google vs Email
- A/B test: posición del botón Google (arriba vs abajo)

---

## 📝 Checklist de Deploy

- [x] ✅ Implementar `signInWithGoogle()` en AuthService
- [x] ✅ Agregar botón Google en LoginPage
- [x] ✅ Agregar botón Google en RegisterPage
- [x] ✅ Crear AuthCallbackPage para manejar retorno
- [x] ✅ Agregar ruta `/auth/callback`
- [x] ✅ Build exitoso (869.84 kB)
- [ ] ⏸️ Configurar Google OAuth en Google Cloud Console
- [ ] ⏸️ Habilitar Google provider en Supabase Dashboard
- [ ] ⏸️ Agregar redirect URLs en Supabase
- [ ] ⏸️ Testing en localhost
- [ ] ⏸️ Testing en staging/producción
- [ ] ⏸️ Documentar en README del proyecto

---

## ❓ Troubleshooting

### Error: "Invalid redirect URI"
**Solución**: Verificar que la redirect URL esté agregada en Google Cloud Console Y en Supabase Dashboard.

### Error: "User not found after OAuth"
**Solución**: Supabase crea automáticamente el usuario. Verificar que el trigger de creación de perfil esté activo en Supabase.

### Error: "Session not available"
**Solución**: Aumentar el delay en `auth-callback.page.ts` de 500ms a 1000ms.

### Usuario no redirige después del callback
**Solución**: Verificar que `AuthService.ensureSession()` esté completando correctamente.

---

**Documentación generada**: 2025-10-20
**Estado**: ✅ Frontend implementado | ⏸️ Pendiente configuración Supabase
**Build size**: 869.84 kB (incremento de 0.77 kB)
**Archivos creados**: 1 (auth-callback.page.ts)
**Archivos modificados**: 5 (auth.service.ts, login.page.ts/html, register.page.ts/html, auth.routes.ts)
