# Autenticación Claude Code con SUSCRIPCIÓN (No API Key)

## 🔑 Diferencia: Suscripción vs API Key

- **Suscripción**: Usa OAuth tokens (como el que generaste con `claude setup-token`)
- **API Key**: Usa claves API desde https://claude.ai/api-keys

## ✅ Tu Token OAuth es Correcto

El token que generaste (`sk-ant-oat01-...`) es **correcto para suscripciones**. Este token:
- ✅ Funciona con tu suscripción
- ✅ Es válido por 1 año
- ✅ No requiere API key

## 🔧 Configuración Correcta

### 1. Verificar que el token esté cargado

```bash
# Verificar variable de entorno
echo $CLAUDE_CODE_OAUTH_TOKEN

# Si está vacío, cargarlo:
source ~/.bashrc
```

### 2. Usar Claude Code con suscripción

Cuando ejecutas `claude`, debería:
- ✅ Usar tu token OAuth automáticamente
- ✅ Mostrar "API Usage Billing" (esto es normal con suscripción)
- ✅ NO pedirte API key

### 3. Si Claude Code pide API Key

Esto puede pasar si:
- El token OAuth no está cargado
- Hay un problema con la configuración

**Solución:**
```bash
# 1. Asegúrate de que el token esté en ~/.bashrc
grep CLAUDE_CODE_OAUTH_TOKEN ~/.bashrc

# 2. Carga el token
source ~/.bashrc

# 3. Verifica que esté cargado
echo $CLAUDE_CODE_OAUTH_TOKEN | head -c 20

# 4. Ejecuta Claude Code
claude
```

## 🚨 Error 429 (Resource Exhausted)

Si ves error 429, puede ser:
1. **Límite de rate limit alcanzado** - Espera unos minutos
2. **Problema temporal del servicio** - Intenta más tarde
3. **Token no reconocido** - Reautentica con `claude setup-token`

## 📝 Verificar Tipo de Cuenta

Para confirmar que tienes suscripción (no API):

1. Ve a https://claude.ai/settings
2. Verifica que tengas un plan activo (Pro, Team, etc.)
3. NO deberías necesitar crear API keys

## 🔄 Reautenticación Completa

Si nada funciona:

```bash
# 1. Limpiar token anterior (opcional)
unset CLAUDE_CODE_OAUTH_TOKEN
sed -i '/CLAUDE_CODE_OAUTH_TOKEN/d' ~/.bashrc

# 2. Reautenticar
claude setup-token

# 3. Guardar el nuevo token en ~/.bashrc
# (El comando te mostrará el token, cópialo)
export CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-..."
echo 'export CLAUDE_CODE_OAUTH_TOKEN="sk-ant-oat01-..."' >> ~/.bashrc

# 4. Cargar y probar
source ~/.bashrc
claude -p "test"
```

## ✅ Confirmación de Funcionamiento

Cuando todo funciona correctamente:

```bash
claude
```

Deberías ver:
```
Claude Code v2.1.19
Opus 4.6 · API Usage Billing  ← Esto es NORMAL con suscripción
```

**"API Usage Billing" NO significa que estés usando API key**, significa que tu uso se factura según tu plan de suscripción.

## 🆘 Si Sigue Pidiendo API Key

1. **Verifica tu suscripción en https://claude.ai/settings**
2. **Asegúrate de estar logueado con la cuenta correcta**
3. **Ejecuta `claude setup-token` de nuevo** (puede haber expirado)
4. **Contacta soporte de Anthropic** si el problema persiste
