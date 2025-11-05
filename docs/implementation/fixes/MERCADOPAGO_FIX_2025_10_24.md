# Fix MercadoPago - "Public key is not configured"

**Fecha:** 2025-10-24  
**Error:** `Mercado Pago public key is not configured in the environment.`

## 🔍 Causa Raíz

El componente `MercadopagoCardFormComponent` intentaba leer `environment.mercadopagoPublicKey`, pero había **2 problemas**:

1. ❌ **`environment.development.ts`** no tenía la clave configurada
2. ❌ **`.env.development.local`** tenía una clave **diferente/antigua**

Según `MERCADOPAGO_INIT.md`, la clave pública correcta para Argentina es:
```
APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd
```

## ✅ Solución Aplicada

### 1. Actualizar `environment.development.ts`
**Archivo:** `/home/edu/autorenta/apps/web/src/environments/environment.development.ts`

```typescript
export const environment = buildEnvironment({
  production: false,
  supabaseUrl: 'https://obxvffplochgeiclibng.supabase.co',
  supabaseAnonKey: '...',
  defaultCurrency: 'ARS',
  paymentsWebhookUrl: 'http://localhost:8787/webhooks/payments',
  mapboxAccessToken: '...',
  mercadopagoPublicKey: 'APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd', // ✅ AGREGADO
});
```

### 2. Actualizar `.env.development.local`
**Archivo:** `/home/edu/autorenta/apps/web/.env.development.local`

```bash
# Antes (clave incorrecta/antigua):
NG_APP_MERCADOPAGO_PUBLIC_KEY=APP_USR-1eff8810-b857-40c6-b290-86891ce23da5

# Después (clave correcta):
NG_APP_MERCADOPAGO_PUBLIC_KEY=APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd
```

### 3. Reiniciar el servidor de desarrollo
```bash
pkill -f "ng serve"
npm start
```

## 🧪 Verificación

### Pasos para probar:
1. ✅ Servidor Angular reiniciado (proceso PID 128630)
2. ✅ Build completado exitosamente
3. ✅ Variables de entorno actualizadas
4. ⏳ **Acción requerida:** Refrescar navegador con **Ctrl+Shift+R** (hard refresh)

### Consola del navegador debe mostrar:
```
✅ Initializing Mercado Pago CardForm...
✅ MercadoPago global found. Initializing instance...
✅ Form mounted successfully
```

❌ **No debe aparecer:**
```
Mercado Pago public key is not configured in the environment.
```

## 📝 Nota sobre el otro error

El error `Timeout waiting for selector: [data-tour-step="guided-search"]` es del **sistema de tours** (`TourService`) y **NO está relacionado** con MercadoPago. Ese componente busca un elemento que no existe en la página actual.

## 🔗 Referencias

- `MERCADOPAGO_INIT.md` - Sección 3 (Configuración esencial)
- `mercadopago-card-form.component.ts` línea 202
- `environment.base.ts` línea 62

---

**Estado:** ✅ Solucionado  
**Próximo paso:** Refresca el navegador para cargar el nuevo código
