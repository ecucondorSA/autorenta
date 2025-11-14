# Fix: Error 404 en /auth/callback

## Problema

Al intentar autenticarse con Google OAuth, el usuario es redirigido a:
```
https://autorentar.com/auth/callback#access_token=...
```

Pero recibe un error **HTTP 404**.

## Causa

El archivo `_redirects` de Cloudflare Pages no está presente o no está configurado correctamente en el build desplegado. Este archivo es **crítico** para que Cloudflare Pages redirija todas las rutas de Angular a `index.html`, permitiendo que el Angular Router maneje las rutas.

## Solución

### Paso 1: Verificar que el script se ejecuta

El script `create-cloudflare-config.js` se ejecuta automáticamente después del build (`postbuild`). Verifica que esté en `package.json`:

```json
{
  "scripts": {
    "postbuild": "node scripts/create-cloudflare-config.js"
  }
}
```

### Paso 2: Verificar que el archivo se genera

Después de hacer build, verifica que el archivo existe:

```bash
cd apps/web
npm run build
cat dist/web/browser/_redirects
```

Deberías ver:
```
/auth/* /index.html 200
...
/*  /index.html  200
```

### Paso 3: Verificar configuración de Cloudflare Pages

En Cloudflare Pages Dashboard:

1. Ve a **Settings > Builds & deployments**
2. Verifica que el **Build output directory** sea: `dist/web/browser`
3. Verifica que el comando de build incluya `postbuild`:
   ```bash
   npm run build
   ```

### Paso 4: Hacer nuevo deploy

Si el archivo `_redirects` no está en el build actual, necesitas hacer un nuevo deploy:

```bash
# Opción 1: Deploy manual
cd apps/web
npm run build
npm run deploy:pages

# Opción 2: Push a main (si tienes CI/CD configurado)
git add .
git commit -m "fix: Ensure _redirects file is generated for Cloudflare Pages"
git push origin main
```

### Paso 5: Verificar en Cloudflare Pages

Después del deploy:

1. Ve a **Deployments** en Cloudflare Pages
2. Abre el deployment más reciente
3. Verifica que el archivo `_redirects` esté presente en los archivos desplegados
4. Prueba la URL: `https://autorentar.com/auth/callback` (debería cargar la app Angular)

## Verificación

### Test local (simulando Cloudflare Pages)

```bash
cd apps/web
npm run build

# Verificar que _redirects existe
ls -la dist/web/browser/_redirects

# Ver contenido
cat dist/web/browser/_redirects
```

### Test en producción

1. Intenta autenticarte con Google
2. Deberías ser redirigido a `/auth/callback` sin error 404
3. La página debería mostrar "Completando inicio de sesión..." y luego redirigir

## Configuración de Supabase

Asegúrate de que en **Supabase Dashboard > Authentication > URL Configuration**:

- **Site URL**: `https://autorentar.com`
- **Redirect URLs** incluye:
  ```
  https://autorentar.com/auth/callback
  http://localhost:4200/auth/callback
  ```

## Archivos relacionados

- `apps/web/public/_redirects` - Archivo base (se copia durante build)
- `apps/web/scripts/create-cloudflare-config.js` - Script que genera `_redirects` en dist
- `apps/web/package.json` - Configuración de scripts (postbuild)
- `apps/web/angular.json` - Configuración de assets (copia `public/` al build)

## Notas importantes

1. **El archivo `_redirects` DEBE estar en la raíz del build output** (`dist/web/browser/_redirects`)
2. **Cloudflare Pages lee automáticamente `_redirects`** si está en la raíz del directorio de build
3. **El formato es específico**: `/*  /index.html  200` (con espacios específicos)
4. **El script `postbuild` sobrescribe** el archivo copiado desde `public/` con la versión generada

## Troubleshooting adicional

### Si el problema persiste después del deploy:

1. **Verifica el build log** en Cloudflare Pages para ver si `postbuild` se ejecutó
2. **Verifica que el archivo esté en el deployment**:
   - Cloudflare Pages > Deployments > [Latest] > View files
   - Busca `_redirects` en la lista
3. **Limpia el cache de Cloudflare**:
   - Cloudflare Dashboard > Caching > Purge Everything
4. **Verifica la configuración de rutas en Cloudflare Pages**:
   - Settings > Functions > Routes
   - No debería haber rutas que interfieran con `_redirects`

---

**Última actualización**: 2025-01-11
**Estado**: Solución implementada - requiere nuevo deploy





