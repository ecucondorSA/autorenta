# 🔍 Investigación: Token de MercadoPago TEST vs Producción

**Fecha:** 2025-10-28  
**Estado:** 🔴 PENDIENTE INVESTIGACIÓN

---

## 🚨 Problema Identificado

Durante la configuración de la fase de testing, se identificó que:

1. **Token disponible:** Token de PRODUCCIÓN
   - Formato: Sin prefijo `TEST-`
   - Valor: `07405c436053c6cb14aa95ae23cbdfdf3def44e55b36034a6e3d932c0c1db4a`

2. **Token esperado:** Token de TEST para sandbox
   - Formato esperado: `TEST-xxxx-xxxxxxxxxxxx`
   - Estado: ❌ NO ENCONTRADO

---

## 📋 Configuración Actual

### GitHub Secrets Configurados
```
✅ SUPABASE_URL
✅ SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
✅ MERCADOPAGO_ACCESS_TOKEN (producción)
✅ MERCADOPAGO_TEST_ACCESS_TOKEN (placeholder temporal)
```

### Ubicaciones Verificadas
- ❌ `.env` - No encontrado
- ❌ `supabase/.env` - No existe
- ❌ `supabase/config.toml` - No encontrado
- ✅ Documentación - Menciona `TEST-` pero sin valor real

---

## 🔍 Acciones de Investigación Necesarias

### 1. Verificar Dashboard de MercadoPago
**URL:** https://www.mercadopago.com.ar/developers/panel/app

**Pasos:**
1. Iniciar sesión en MercadoPago
2. Ir a "Tus integraciones" / "Your integrations"
3. Seleccionar la aplicación
4. Buscar en "Credenciales de prueba" / "Test credentials"
5. Copiar el "Access Token" que comience con `TEST-`

### 2. Verificar Modo de la Cuenta
- ¿La cuenta tiene habilitado el modo test/sandbox?
- ¿Se creó una aplicación en modo test?
- ¿Los tokens de test están generados?

### 3. Verificar Configuración de Supabase
- Revisar "Edge Functions" → "Secrets" en dashboard
- Buscar variables que comiencen con `MERCADOPAGO_`
- Verificar si hay diferentes tokens para test vs producción

---

## ⚠️ Solución Temporal

**Para permitir que CI/CD funcione ahora:**

Se configuró el token de PRODUCCIÓN como:
- `MERCADOPAGO_ACCESS_TOKEN` (producción real)
- `MERCADOPAGO_TEST_ACCESS_TOKEN` (mismo token, temporal)

**Riesgo:** 
- Los tests E2E ejecutarán transacciones REALES
- Pueden generar cargos o movimientos reales
- NO es ideal para testing automatizado

---

## ✅ Solución Definitiva (TO-DO)

### Paso 1: Obtener Token de TEST
1. Ir al dashboard de MercadoPago
2. Crear/verificar aplicación en modo test
3. Generar credenciales de test
4. Copiar Access Token que empiece con `TEST-`

### Paso 2: Actualizar Secretos
```bash
# Actualizar con el token real de TEST
gh secret set MERCADOPAGO_TEST_ACCESS_TOKEN --body "TEST-xxxx-real-test-token"
```

### Paso 3: Documentar
- Agregar las credenciales de test a `.env.test.example`
- Documentar cómo obtener tokens de test
- Crear guía para otros desarrolladores

---

## 📝 Configuración del E2E Workflow

### Archivo: `.github/workflows/e2e-tests.yml`

**Actual:**
```yaml
env:
  MERCADOPAGO_TEST_ACCESS_TOKEN: ${{ secrets.MERCADOPAGO_TEST_ACCESS_TOKEN }}
```

**Recomendado (cuando tengamos token test):**
```yaml
env:
  MERCADOPAGO_ACCESS_TOKEN: ${{ secrets.MERCADOPAGO_TEST_ACCESS_TOKEN }}
```

---

## 🔗 Referencias

### MercadoPago Docs
- [Credenciales de Prueba](https://www.mercadopago.com.ar/developers/es/docs/credentials)
- [Testing con Tarjetas de Prueba](https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards)
- [Sandbox vs Producción](https://www.mercadopago.com.ar/developers/es/docs/your-integrations/test-integration)

### Notas
- Los tokens de TEST permiten simular transacciones sin costo
- Los tokens de TEST funcionan con tarjetas específicas de prueba
- Las transacciones de TEST no afectan el saldo real

---

## 📊 Estado de la Investigación

| Item | Estado | Acción Requerida |
|------|--------|------------------|
| Token TEST encontrado | ❌ NO | Buscar en dashboard MP |
| Dashboard MP verificado | ⏳ PENDIENTE | Verificar credenciales test |
| Secrets actualizados | ⚠️ TEMPORAL | Reemplazar con token TEST |
| Tests funcionando | ⏳ PENDIENTE | Verificar después de actualizar |

---

## 🎯 Próximos Pasos

1. **Inmediato:** Acceder al dashboard de MercadoPago
2. **Verificar:** Credenciales de test están disponibles
3. **Copiar:** Token que comience con `TEST-`
4. **Actualizar:** GitHub secret con token real de test
5. **Probar:** Ejecutar workflow E2E para verificar
6. **Documentar:** Guardar credenciales en lugar seguro

---

## ⚠️ IMPORTANTE

**Mientras tanto, los tests E2E están configurados pero:**
- ⚠️ Usan token de PRODUCCIÓN
- ⚠️ Pueden generar transacciones reales
- ⚠️ Deben ejecutarse con precaución
- ✅ La infraestructura está lista para usar token TEST cuando esté disponible

**Acción recomendada:**
Resolver esto ANTES de ejecutar tests de pago masivos o automatizados.

---

**Última actualización:** 2025-10-28  
**Responsable:** Equipo de desarrollo  
**Prioridad:** 🟡 MEDIA (funciona temporalmente, pero debe corregirse)
