# 🚨 TROUBLESHOOTING URGENTE - "Failed to fetch"

## Paso 1: Verificar que estás en la URL correcta

**URL CORRECTA**: https://16b5ac34.autorenta-web.pages.dev
**URL ANTERIOR** (NO USAR): https://869c10a8.autorenta-web.pages.dev

Si estás usando `https://autorenta-web.pages.dev` (la URL principal), puede estar apuntando al deployment anterior.

## Paso 2: Limpiar caché del navegador

### Chrome/Edge:
1. Presiona `Ctrl+Shift+Delete`
2. Selecciona "Imágenes y archivos en caché"
3. Rango de tiempo: "Última hora"
4. Click "Borrar datos"

### Firefox:
1. Presiona `Ctrl+Shift+Delete`
2. Marca "Caché"
3. Rango de tiempo: "Última hora"
4. Click "Limpiar ahora"

### Modo Incógnito (Alternativa rápida):
1. Presiona `Ctrl+Shift+N` (Chrome) o `Ctrl+Shift+P` (Firefox)
2. Abre: https://16b5ac34.autorenta-web.pages.dev/wallet

## Paso 3: Ejecutar este código en la consola del navegador

Abre DevTools (F12) → Console → Pega este código:

```javascript
// DIAGNÓSTICO COMPLETO DEL WALLET
console.log('🔍 DIAGNÓSTICO DE WALLET SERVICE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Verificar URL de deployment
console.log('📍 URL actual:', window.location.href);
console.log('   ✅ Correcto: https://16b5ac34.autorenta-web.pages.dev');
console.log('   ❌ Incorrecto: Cualquier otra URL');
console.log('');

// 2. Verificar configuración de entorno
if (window.__env) {
  console.log('⚙️ Configuración de entorno:');
  console.log('   Supabase URL:', window.__env.NG_APP_SUPABASE_URL);
  console.log('   Anon Key:', window.__env.NG_APP_SUPABASE_ANON_KEY ? '✅ Presente' : '❌ Ausente');
} else {
  console.error('❌ window.__env no está definido');
}
console.log('');

// 3. Verificar que el fix está aplicado
console.log('🔧 Verificando fix en código desplegado...');
fetch('/main-37IOT72Z.js')
  .then(r => r.text())
  .then(code => {
    if (code.includes('obxvffplochgeiclibng.supabase.co')) {
      console.log('   ✅ Fix presente: Supabase URL hardcodeada encontrada');
    } else {
      console.error('   ❌ Fix NO encontrado en el código');
    }
  });
console.log('');

// 4. Test Edge Function
console.log('🌐 Probando Edge Function...');
const edgeUrl = 'https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference';
fetch(edgeUrl, {
  method: 'OPTIONS',
  headers: {
    'Origin': window.location.origin,
    'Access-Control-Request-Method': 'POST'
  }
})
.then(r => {
  console.log('   Status:', r.status);
  if (r.status === 200) {
    console.log('   ✅ Edge Function responde correctamente');
  } else {
    console.error('   ❌ Edge Function no responde (status:', r.status, ')');
  }
})
.catch(e => {
  console.error('   ❌ Error al conectar con Edge Function:', e.message);
});

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Diagnóstico completado');
console.log('Si ves ❌ en algún paso, copia el log completo');
```

## Paso 4: Si el error persiste - Posibles causas

### Causa 1: Estás en URL antigua
**Síntoma**: El diagnóstico muestra URL diferente a `16b5ac34`
**Solución**: Navega directamente a https://16b5ac34.autorenta-web.pages.dev

### Causa 2: Caché del navegador
**Síntoma**: El fix no aparece en el código desplegado
**Solución**: Hard refresh con `Ctrl+F5` o borrar caché completo

### Causa 3: El RPC wallet_initiate_deposit falla
**Síntoma**: Error ocurre ANTES de llamar a Edge Function
**Solución**: Verificar en DB que el RPC existe:
```sql
SELECT proname FROM pg_proc WHERE proname = 'wallet_initiate_deposit';
```

### Causa 4: Edge Function no responde
**Síntoma**: fetch() falla al conectar
**Solución**: Verificar que Edge Function está desplegada

## Paso 5: Alternativa temporal - Usar main URL

Si `16b5ac34.autorenta-web.pages.dev` no funciona, prueba:

```
https://autorenta-web.pages.dev/?nocache=1
```

El parámetro `?nocache=1` debería forzar bypass de caché.

## Paso 6: Si NADA funciona - Rollback

Si después de todos estos pasos sigue fallando, podemos hacer rollback al deployment anterior:

```bash
wrangler pages deployment list --project-name=autorenta-web
# Encontrar deployment funcional
# Promocionar a producción desde Cloudflare Dashboard
```

## 📞 Información de contacto del deployment

- **Deployment ID**: `16b5ac34-78c2-4c26-8a32-8255b6e5ed28`
- **Branch**: `main`
- **Commit**: `c5d0857`
- **Deployed**: 11 minutos atrás
- **Dashboard**: https://dash.cloudflare.com/5b448192fe4b369642b68ad8f53a7603/pages/view/autorenta-web/16b5ac34-78c2-4c26-8a32-8255b6e5ed28

## 🔍 Logs esperados en console (cuando funciona)

Cuando el sistema funciona correctamente, al hacer clic en "Depositar", deberías ver:

```
🔍 DEBUG: Iniciando llamada a Edge Function
🔍 supabaseUrl: https://obxvffplochgeiclibng.supabase.co
🔍 accessToken: PRESENTE
🔍 transaction_id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
🔍 amount: 1000
🔍 description: Depósito a billetera
🔍 Llamando a Edge Function: https://obxvffplochgeiclibng.supabase.co/functions/v1/mercadopago-create-preference
🔍 Request body: {...}
🔍 mpResponse.status: 200
🔍 mpResponse.ok: true
✅ Redirigiendo a MercadoPago...
```

Si ves `TypeError: Failed to fetch` ANTES de estos logs, significa que:
- El RPC `wallet_initiate_deposit` falló
- O la sesión del usuario expiró

Si ves el error DESPUÉS del log "Llamando a Edge Function", significa:
- Edge Function no está respondiendo
- CORS bloqueó la request
- Network timeout

---

**ÚLTIMA ACTUALIZACIÓN**: 2025-10-20 12:35 UTC
**STATUS**: Deployment exitoso, fix aplicado, verificación pendiente en navegador
