# Cómo Quitar "API Usage Billing" y Usar Suscripción

## 🔍 Problema Identificado

Si Claude Code muestra "API Usage Billing" cuando tienes suscripción, es porque está detectando una **API Key** en lugar de usar tu suscripción.

## ❌ Causa Principal

**Si `ANTHROPIC_API_KEY` está configurada**, Claude Code la usará automáticamente, incluso si tienes suscripción activa.

## ✅ Solución Completa

### Paso 1: Eliminar API Key de Configuración

```bash
# Verificar si existe
grep ANTHROPIC_API_KEY ~/.bashrc ~/.profile ~/.zshrc

# Eliminar de todos los archivos
sed -i '/ANTHROPIC_API_KEY/d' ~/.bashrc
sed -i '/ANTHROPIC_API_KEY/d' ~/.profile 2>/dev/null || true
sed -i '/ANTHROPIC_API_KEY/d' ~/.zshrc 2>/dev/null || true
```

### Paso 2: Limpiar Sesión Actual

```bash
# Eliminar de sesión actual
unset ANTHROPIC_API_KEY
unset CLAUDE_CODE_USE_VERTEX  # También eliminar si existe
```

### Paso 3: Logout en Claude Code

En Claude Code actual, ejecuta:
```
/logout
```

Luego cierra Claude Code (Ctrl+C).

### Paso 4: Actualizar Claude Code

```bash
claude update
```

### Paso 5: Reiniciar Terminal

```bash
# Cerrar y abrir nueva terminal, o:
source ~/.bashrc
```

### Paso 6: Reautenticarse con Suscripción

```bash
claude setup-token
```

**IMPORTANTE:** Asegúrate de estar logueado con tu cuenta de **SUSCRIPCIÓN** (no con una cuenta que solo tenga API keys).

### Paso 7: Verificar

```bash
claude
```

Deberías ver:
```
Claude Code v2.1.19
Sonnet 4.5 · [SIN "API Usage Billing"]
```

O simplemente el modelo sin mencionar billing.

## 🔍 Verificación

Para verificar qué método está usando:

```bash
# En Claude Code
/status

# O en terminal
echo $ANTHROPIC_API_KEY
# Debe estar vacío (no mostrar nada)
```

## 📝 Notas Importantes

1. **Si necesitas API Key para otros scripts:**
   - Crea un archivo separado: `~/.api_profile`
   - Solo sourcealo cuando necesites: `source ~/.api_profile`
   - NO lo pongas en `~/.bashrc`

2. **Token OAuth vs API Key:**
   - ✅ `CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-...` → Suscripción
   - ❌ `ANTHROPIC_API_KEY=sk-ant-api03-...` → API Billing

3. **Orden de Precedencia:**
   Claude Code usa en este orden:
   1. `ANTHROPIC_API_KEY` (si existe) → API Billing
   2. `CLAUDE_CODE_OAUTH_TOKEN` → Suscripción
   3. Autenticación interactiva

## 🚨 Si el Problema Persiste

1. Verifica que NO tengas `ANTHROPIC_API_KEY` en ningún lado:
   ```bash
   env | grep ANTHROPIC
   grep -r ANTHROPIC_API_KEY ~/.bashrc ~/.profile ~/.zshrc
   ```

2. Verifica que tu token OAuth esté cargado:
   ```bash
   echo $CLAUDE_CODE_OAUTH_TOKEN
   # Debe mostrar: sk-ant-oat01-...
   ```

3. Verifica tu cuenta en https://claude.ai/settings
   - Debe mostrar tu plan activo (Pro, Max, etc.)
   - NO debe mostrar solo API keys

4. Contacta soporte si el problema continúa después de seguir todos los pasos.
