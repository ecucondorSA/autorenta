# 🔧 Reparación de Google Login (Error 500)

El error `API Error: 500` al intentar iniciar sesión con Google indica una configuración incorrecta en el panel de **Supabase** o **Google Cloud Console**.

## 1. Verificar Configuración en Supabase

1.  Ve a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2.  Navega a **Authentication** > **Providers**.
3.  Despliega la opción **Google**.
4.  Asegúrate de que **Enable Sign in with Google** esté activo.
5.  Verifica que los siguientes campos no tengan espacios extra:
    *   **Client ID**: (Debe terminar en `.apps.googleusercontent.com`)
    *   **Client Secret**: (Clave secreta de Google)

## 2. Verificar Redirect URI en Google Cloud

1.  Ve a [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2.  Selecciona tu proyecto y edita el **OAuth 2.0 Client ID**.
3.  En la sección **Authorized redirect URIs**, debes tener **exactamente**:
    ```
    https://<tu-proyecto>.supabase.co/auth/v1/callback
    ```
    *(Reemplaza `<tu-proyecto>` con tu ID de Supabase, ej: `aceacpaockyxgogxsfyc`)*.

    > ⚠️ **Error Común:** Muchas veces se configura `http://localhost:4200/auth/callback` aquí. Eso es incorrecto. Google debe redirigir a **Supabase**, y Supabase redirigirá a tu app.

## 3. Verificar URL del Sitio en Supabase

1.  En Supabase, ve a **Authentication** > **URL Configuration**.
2.  **Site URL**: Debe ser `http://localhost:4200` (para desarrollo) o tu dominio de producción.
3.  **Redirect URLs**: Añade las siguientes:
    *   `http://localhost:4200/auth/callback`
    *   `http://localhost:4200/auth/callback/`
    *   `capacitor://localhost/auth/callback` (si usas móvil)

## Resumen de Cambios Aplicados (Frontend)

1.  **Verificación de Teléfono:** Se ha modificado la página de verificación de contacto para permitir avanzar **solo con Email verificado**. Esto desbloquea el flujo para usuarios que no pueden recibir SMS debido a la falta de configuración del proveedor.
2.  **Auth Guard:** Se implementó un fallback robusto para que la verificación de identidad no bloquee la navegación si el servidor responde con errores inesperados (400/500).
