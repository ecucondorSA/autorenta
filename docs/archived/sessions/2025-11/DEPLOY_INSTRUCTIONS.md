# 🚀 Instrucciones de Deploy a Cloudflare Pages

**Fecha**: 2025-11-05  
**Proyecto**: autorenta-web

---

## 📋 Método 1: Deploy Manual (Recomendado ahora)

### Paso 1: Build de la aplicación

```bash
cd apps/web
npm run build
```

Esto generará los archivos en `dist/web/browser`

### Paso 2: Deploy a Cloudflare Pages

```bash
# Opción A: Usar el script npm (recomendado)
npm run deploy:pages

# Opción B: Usar wrangler directamente
npx wrangler pages deploy dist/web/browser \
  --project-name=autorenta-web \
  --account-id=5b448192fe4b369642b68ad8f53a7603
```

### Paso 3: Verificar deployment

```bash
# Ver deployments recientes
npx wrangler pages deployment list autorenta-web

# Ver URL de producción
npx wrangler pages project list | grep autorenta-web
```

---

## 📋 Método 2: Deploy via GitHub Actions (Automático)

Si estás en la rama `main`, puedes hacer push y el deploy será automático:

```bash
# Asegúrate de estar en main
git checkout main

# Hacer commit de los cambios
git add .
git commit -m "feat: mejoras PWA install prompt y video Volvo"
git push origin main
```

El workflow `.github/workflows/build-and-deploy.yml` se ejecutará automáticamente.

---

## 📋 Método 3: Deploy via GitHub Actions (Manual)

Si quieres triggerear el deploy sin push:

```bash
gh workflow run "🚀 Build and Deploy"
```

O desde GitHub UI:
1. Ve a Actions → 🚀 Build and Deploy
2. Click en "Run workflow"
3. Selecciona la rama (main)
4. Click en "Run workflow"

---

## ✅ Verificación Post-Deploy

### Verificar que el sitio está activo:

```bash
curl -I https://autorenta-web.pages.dev
```

Debería retornar `200 OK`

### Verificar recursos estáticos:

```bash
curl -I https://autorenta-web.pages.dev/assets/images/autorentar-logo.png
curl -I https://autorenta-web.pages.dev/assets/videos/volvo-c-recharge-splash.mp4
```

### Verificar en el navegador:

1. Abre: https://autorenta-web.pages.dev
2. Verifica que el splash screen muestra el video de Volvo
3. Verifica que el PWA install prompt funciona (solo uno)
4. Verifica que todo carga correctamente

---

## 🔧 Troubleshooting

### Error: "No authentication credentials found"

```bash
wrangler login
```

Esto abrirá el navegador para autenticarte.

### Error: "Project not found"

```bash
npx wrangler pages project create autorenta-web
```

### Error: "Build failed"

Verifica que no haya errores de TypeScript:
```bash
cd apps/web
npx tsc --noEmit
```

### Ver logs del deployment:

```bash
npx wrangler pages deployment tail autorenta-web
```

---

## 📊 Estado Actual

**Branch**: `fix/e2e-fricciones-seleccion-checkout`  
**Cambios pendientes**:
- ✅ Video de Volvo en splash screen
- ✅ Mejoras en PWA install prompt
- ✅ Banner duplicado deshabilitado

**Para deploy desde esta rama**:
1. Hacer merge a `main` primero, O
2. Hacer deploy manual desde esta rama

---

**Última actualización**: 2025-11-05

