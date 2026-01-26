# Modelo Por Defecto en Claude Code

## 📋 Información Oficial

Según la documentación oficial de Claude Code:

**Modelo por defecto: Sonnet 4.5** (`claude-sonnet-4-5-20250929`)

## 🔍 Verificación en tu Sistema

### 1. Logs de Sesiones Anteriores

En tus logs se ve:
```json
"model": "claude-sonnet-4-5-20250929"
```

Y cuando ejecutaste `/model`:
```
Set model to Default (Sonnet 4.5 · Best for everyday tasks)
```

### 2. Configuración Actual

Para verificar tu modelo por defecto:
```bash
# Ver configuración
cat ~/.claude/settings.json | jq '.model'

# O verificar variable de entorno
echo $ANTHROPIC_MODEL
```

## 🎯 Cambiar Modelo Por Defecto

### Opción 1: Variable de Entorno (Permanente)

Agregar a `~/.bashrc`:
```bash
export ANTHROPIC_MODEL="claude-opus-4-5-20251101"
```

O para Sonnet (default):
```bash
export ANTHROPIC_MODEL="claude-sonnet-4-5-20250929"
```

### Opción 2: Comando en Claude Code

Durante la sesión:
```
/model opus
/model sonnet
/model haiku
```

### Opción 3: Flag al Iniciar

```bash
claude --model claude-opus-4-5-20251101
claude --model claude-sonnet-4-5-20250929
```

## 📊 Modelos Disponibles

| Modelo | Alias | Descripción |
|--------|-------|-------------|
| **Sonnet 4.5** | `sonnet`, `default` | ✅ **Por defecto** - Mejor para tareas diarias |
| Opus 4.5 | `opus` | Más capaz para trabajo complejo |
| Haiku 4.5 | `haiku` | Más rápido para respuestas rápidas |

## ⚠️ Nota sobre Opus

- Opus 4.5 requiere **habilitación y compra de uso extra** en planes Pro
- Si no tienes acceso a Opus, Claude Code usará Sonnet automáticamente

## 🔧 Configurar Opus 4.5 como Default

Si quieres que Opus 4.5 sea tu modelo por defecto:

```bash
# Agregar a ~/.bashrc
echo 'export ANTHROPIC_MODEL="claude-opus-4-5-20251101"' >> ~/.bashrc

# Cargar
source ~/.bashrc

# Verificar
echo $ANTHROPIC_MODEL
```

## ✅ Verificación

Para ver qué modelo está usando:
```bash
# En Claude Code
/status

# O iniciar y ver el banner
claude
# Debería mostrar: "Opus 4.5" o "Sonnet 4.5"
```
