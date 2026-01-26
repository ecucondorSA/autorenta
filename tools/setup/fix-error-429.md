# Solución: Error 429 "Resource Exhausted"

## 🔍 Diagnóstico

El error 429 **NO es un problema de autenticación**. Tu token OAuth está correcto.

El error significa:
- **Rate limiting**: Demasiadas solicitudes en poco tiempo
- **Cuota agotada**: Límite de uso diario/mensual alcanzado
- **Problema temporal**: Servicio sobrecargado

## ✅ Tu Autenticación Está Correcta

```
Token: sk-ant-oat01-... ✅ (OAuth para suscripción)
Muestra: "API Usage Billing" ✅ (Normal)
Error: 429 ❌ (Cuota/Rate limit)
```

## 🔧 Soluciones

### 1. Esperar (Solución Inmediata)

El error 429 suele resolverse automáticamente:

```bash
# Espera 5-10 minutos y vuelve a intentar
claude
```

### 2. Verificar Cuota en tu Cuenta

1. Ve a https://claude.ai/settings
2. Revisa tu plan y límites de uso
3. Verifica si has alcanzado algún límite

### 3. Reducir Frecuencia de Solicitudes

Si estás haciendo muchas solicitudes:

```bash
# Espera entre solicitudes
# No hagas múltiples solicitudes simultáneas
```

### 4. Verificar Estado del Servicio

- Revisa https://status.anthropic.com
- Puede haber problemas temporales del servicio

### 5. Cambiar de Modelo (Temporal)

Si Opus 4.5 está sobrecargado:

```bash
# En Claude Code, usa:
/model sonnet-4.5

# O espera y vuelve a intentar con Opus
```

### 6. Limpiar y Reintentar

```bash
# Cerrar Claude Code
# Esperar 10 minutos
# Reiniciar
claude
```

## 📊 Entender los Límites

Con suscripción, tienes:
- **Límite de rate**: Solicitudes por minuto/hora
- **Límite de cuota**: Uso total diario/mensual según tu plan

El error 429 aparece cuando:
- Haces demasiadas solicitudes muy rápido
- Has alcanzado tu límite de cuota
- El servicio está temporalmente sobrecargado

## ✅ Verificación

Para confirmar que no es problema de autenticación:

```bash
# Tu token es correcto
echo $CLAUDE_CODE_OAUTH_TOKEN | head -c 30
# Debe mostrar: sk-ant-oat01-...

# El prefijo confirma suscripción
# El error 429 es de cuota, no de auth
```

## 🚨 Si el Error Persiste

1. **Espera 30-60 minutos** - Los límites se resetean
2. **Verifica tu plan** en https://claude.ai/settings
3. **Contacta soporte** si el problema continúa después de esperar

## 💡 Prevención

Para evitar errores 429:
- No hagas solicitudes muy rápidas
- Espera entre solicitudes complejas
- Usa Sonnet si Opus está sobrecargado
- Monitorea tu uso en la cuenta

## 📝 Resumen

- ✅ Autenticación: CORRECTA (OAuth suscripción)
- ❌ Error 429: Cuota/Rate limit (no es problema de auth)
- 🔧 Solución: Esperar y reintentar
