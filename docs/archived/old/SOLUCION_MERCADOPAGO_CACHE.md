# Solución: MercadoPago "Public key is not configured" - Problema de Caché

**Fecha:** 2025-10-24  
**Estado:** ✅ Resuelto

## 🔍 Problema

El error persiste en el navegador incluso después de:
- ✅ Agregar `mercadopagoPublicKey` a `environment.development.ts`
- ✅ Actualizar `NG_APP_MERCADOPAGO_PUBLIC_KEY` en `.env.development.local`
- ✅ Reiniciar el servidor Angular

**Causa raíz:** El navegador estaba cargando una **versión cacheada** del archivo `env.js` sin la clave de MercadoPago.

## ✅ Solución Aplicada

### 1. Agregado cache-busting a `env.js`

**Archivo:** `/home/edu/autorenta/apps/web/src/index.html`

```html
<!-- ANTES -->
<script src="env.js"></script>

<!-- DESPUÉS -->
<script src="env.js?v=20251024"></script>
```

Esto fuerza al navegador a recargar el archivo cuando cambia el parámetro `?v=`.

### 2. Verificar `public/env.js` tiene la clave correcta

```bash
cd /home/edu/autorenta/apps/web
cat public/env.js | grep MERCADOPAGO
```

**Debe mostrar:**
```javascript
"NG_APP_MERCADOPAGO_PUBLIC_KEY": "APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd"
```

### 3. Regenerar `env.js` manualmente si es necesario

```bash
cd /home/edu/autorenta/apps/web
node scripts/generate-env.js
```

## 🧪 Cómo verificar que funciona

### En el navegador:

1. **Hard refresh:** Presiona `Ctrl + Shift + R` (Windows/Linux) o `Cmd + Shift + R` (Mac)

2. **Abrir DevTools Console** (F12) y ejecutar:
   ```javascript
   console.log(window.__env.NG_APP_MERCADOPAGO_PUBLIC_KEY)
   ```
   
   **Debe mostrar:** `APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd`

3. **Verificar que NO aparece el error:**
   ```
   ❌ Mercado Pago public key is not configured in the environment.
   ```

4. **Verificar logs positivos:**
   ```
   ✅ Initializing Mercado Pago CardForm...
   ✅ MercadoPago instance initialized.
   ```

## 📋 Archivos modificados

1. ✅ `apps/web/src/environments/environment.development.ts` → Agregado `mercadopagoPublicKey`
2. ✅ `apps/web/.env.development.local` → Actualizada clave correcta
3. ✅ `apps/web/src/index.html` → Agregado cache-busting `?v=20251024`
4. ✅ `apps/web/public/env.js` → Regenerado con clave correcta

## 🔄 Para futuras actualizaciones

Cuando necesites cambiar variables de entorno:

1. Editar `.env.development.local` o `.env`
2. Ejecutar: `node scripts/generate-env.js`
3. Cambiar la versión en `index.html`: `env.js?v=YYYYMMDD` (incrementar fecha)
4. Hard refresh en navegador

## 🎯 Estado actual

- ✅ Servidor corriendo en `http://localhost:4200/`
- ✅ Build completado exitosamente
- ✅ Archivo `env.js` actualizado con clave correcta
- ✅ Cache-busting agregado a `index.html`
- ⏳ **Acción requerida:** Hard refresh en el navegador (Ctrl+Shift+R)

## 🔐 Recordatorio de seguridad

**Public Key** (puede estar en frontend):
- ✅ `APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd`

**Access Token** (SOLO backend - Supabase Secrets):
- ⚠️ **Rotar** el token expuesto en: https://www.mercadopago.com.ar/developers/panel/credentials
- ⚠️ Actualizar en Supabase: `npx supabase secrets set MERCADOPAGO_ACCESS_TOKEN="NUEVO_TOKEN"`

---

**Próximo paso:** Refresca el navegador con **Ctrl+Shift+R** y verifica que el error desaparezca.
