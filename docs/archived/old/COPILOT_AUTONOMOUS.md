# 🤖 GitHub Copilot CLI - Configuración Autónoma Extrema

## ✅ Configuración Completada

Se ha configurado GitHub Copilot CLI para trabajar en **modo totalmente autónomo** sin preguntar confirmaciones.

## 🚀 Inicio Rápido

### 1. Cargar Aliases (Una vez)

```bash
# Agregar al final de ~/.bashrc o ~/.zshrc
echo 'source /home/edu/autorenta/.copilot-aliases.sh' >> ~/.bashrc
source ~/.bashrc
```

### 2. Uso Inmediato

```bash
# Modo interactivo autónomo
cop

# Prompt directo
cq "Crea un componente de login standalone"

# Continuar sesión anterior
copc

# Quick commands
cop-create "un servicio de autenticación"
cop-fix "el bug en el formulario de registro"
cop-test "el componente de booking"
```

## 📋 Comandos Disponibles

### Aliases Principales

| Comando | Descripción |
|---------|-------------|
| `cop` | Modo interactivo autónomo completo |
| `copp "<prompt>"` | Ejecutar con prompt directo |
| `copc` | Continuar última sesión |
| `copr` | Resumir sesión anterior |
| `cq "<prompt>"` | Quick prompt (más rápido) |

### Funciones Especializadas

| Comando | Uso |
|---------|-----|
| `cop-dev "<task>"` | Desarrollo general |
| `cop-fix "<issue>"` | Arreglar problemas |
| `cop-create "<what>"` | Crear componentes/servicios |
| `cop-refactor "<code>"` | Refactorizar código |
| `cop-test "<what>"` | Crear tests |
| `cop-debug "<issue>"` | Debug problemas |

### Modelos Específicos

| Comando | Modelo | Uso Recomendado |
|---------|--------|-----------------|
| `cop-sonnet` | Claude Sonnet 4.5 | Default, balance perfecto |
| `cop-haiku` | Claude Haiku 4.5 | Tareas rápidas y simples |
| `cop-gpt` | GPT-5 | Tareas muy complejas |

### Script Personalizado

```bash
# Usar el script directo
copa run                                    # Interactivo
copa run "Crea un componente de login"      # Con prompt
copa continue                               # Continuar sesión
copa resume                                 # Resumir sesión
copa help                                   # Ver ayuda
```

## 🎯 Ejemplos de Uso Real

### Crear Componentes

```bash
cop-create "un componente standalone de lista de autos con lazy loading"
cq "Genera el componente booking-form con validación y signals"
```

### Arreglar Bugs

```bash
cop-fix "el error 500 en el endpoint de pagos"
cop-debug "por qué el formulario no se valida correctamente"
```

### Refactorizar

```bash
cop-refactor "el servicio de auth para usar inject() en lugar de constructor"
cq "Convierte todos los componentes de la carpeta cars a standalone"
```

### Crear Tests

```bash
cop-test "el servicio de bookings con todos los edge cases"
cq "Añade tests E2E para el flujo completo de reserva"
```

### Desarrollo General

```bash
cop-dev "implementar autenticación con Supabase"
cop-dev "añadir paginación a la lista de autos"
```

## ⚙️ Características Habilitadas

### Flags Activos

```bash
--allow-all-tools                # ✅ Todas las herramientas sin confirmación
--allow-all-paths                # ✅ Acceso a cualquier ruta
--enable-all-github-mcp-tools    # ✅ Todas las herramientas GitHub MCP
--stream on                      # ✅ Respuestas en streaming
--model claude-sonnet-4.5        # ✅ Modelo más capaz
```

### Ejecución Paralela

✅ **Habilitada por defecto** - Copilot puede ejecutar múltiples herramientas simultáneamente

### Directorios Permitidos

- `/home/edu/autorenta` (proyecto)
- `/home/edu` (home)
- `/tmp` (temporal)
- `/var/tmp` (temporal)

### Herramientas Permitidas

- `write` - Escribir archivos
- `read` - Leer archivos
- `shell(git:*)` - Todos los comandos git
- `shell(pnpm:*)` - Todos los comandos pnpm
- `shell(npm:*)` - Todos los comandos npm
- `shell(node:*)` - Ejecutar Node.js
- `shell(ng:*)` - Angular CLI
- `shell(supabase:*)` - Supabase CLI
- `github(*)` - Todas las operaciones GitHub

### Herramientas Denegadas (Seguridad)

- `shell(rm -rf *)` - Borrado masivo
- `shell(git push --force)` - Push forzado
- `shell(chmod 777 *)` - Permisos inseguros

## 🎨 Flujos de Trabajo

### Flujo Típico de Desarrollo

```bash
# 1. Iniciar sesión
cop

# Dentro de Copilot:
> Crea un componente standalone de login con formulario reactivo

# 2. Continuar trabajando
> Añade validación de email y password

# 3. Tests
> Crea tests unitarios para el componente

# 4. Verificar
> Ejecuta pnpm run lint y pnpm run test:quick
```

### Flujo Rápido (Non-Interactive)

```bash
# Crear feature completa
cq "Crea un módulo completo de gestión de usuarios con CRUD, formularios y tests"

# Arreglar y verificar
cop-fix "el error en el servicio de auth" && copa run "ejecuta los tests"
```

### Flujo de Refactoring

```bash
# Iniciar
cop-refactor "todos los servicios para usar inject() pattern"

# Verificar cambios
copc  # Continúa si hubo interrupción

# Confirmar
cq "Ejecuta lint y tests para verificar los cambios"
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Agregar a ~/.bashrc o ~/.zshrc
export COPILOT_ALLOW_ALL=1
export AUTORENTA_ROOT="/home/edu/autorenta"
export COPILOT_MODEL="claude-sonnet-4.5"
```

### Personalizar Script

Editar `/home/edu/autorenta/tools/copilot-autonomous.sh`:

```bash
# Cambiar modelo por defecto
local model="${2:-claude-haiku-4.5}"

# Agregar más directorios
ALLOWED_DIRS+=(
    "/otro/directorio"
)

# Agregar más herramientas
ALLOWED_TOOLS+=(
    "shell(docker:*)"
)
```

### Modo Debug

```bash
# Ver logs de Copilot
tail -f ~/.copilot/logs/latest.log

# Ejecutar con más verbosidad
copilot --allow-all-tools --allow-all-paths --log-level debug
```

## 📊 Comandos de Verificación

### Antes de Commit

```bash
cq "Ejecuta pnpm run lint y pnpm run test:quick"
```

### Antes de Deploy

```bash
cq "Ejecuta el pipeline CI completo: lint, tests y build"
```

### Verificar Calidad

```bash
cq "Analiza el código en busca de problemas de seguridad y mejores prácticas"
```

## 🔐 Seguridad

### Comandos Seguros

✅ Copilot puede ejecutar:
- Leer y escribir archivos del proyecto
- Ejecutar tests
- Ejecutar lint y formateo
- Commits (pero no push sin confirmación)
- Crear branches
- Ejecutar builds

### Comandos Bloqueados

❌ Copilot NO puede:
- Borrado masivo con `rm -rf`
- Git push forzado
- Cambiar permisos a 777
- Acceder fuera de directorios permitidos

### Revisar Cambios

Aunque Copilot es autónomo, **siempre puedes**:

```bash
# Ver cambios antes de commit
git diff

# Ver historial de sesión
copr  # Resume sesión para ver qué hizo

# Deshacer cambios
git checkout -- <file>
git reset --hard HEAD
```

## 💡 Tips y Trucos

### 1. Ser Específico

❌ Malo: `cq "arregla el código"`
✅ Bueno: `cq "arregla el error de null reference en booking.service.ts línea 45"`

### 2. Context Matters

```bash
# Copilot lee automáticamente:
# - AGENTS.md (instrucciones del proyecto)
# - .github/copilot-instructions.md (patrones)
# - Archivos abiertos en el proyecto
```

### 3. Iteración Rápida

```bash
# Primera iteración
cq "Crea componente de login"

# Continuar iterando
copc
> Añade validación
> Añade estilos
> Añade tests
```

### 4. Usar el Modelo Correcto

```bash
cop-haiku    # Para: renombrar variables, formateo, linting
cop-sonnet   # Para: features nuevas, refactoring
cop-gpt      # Para: arquitectura compleja, optimización
```

### 5. Comandos Encadenados

```bash
# Crear y verificar en una línea
copa run "Crea el servicio de payments" && copa run "Ejecuta los tests"
```

## 🐛 Troubleshooting

### Copilot no encuentra el comando

```bash
# Verificar instalación
which copilot

# Reinstalar si es necesario
npm install -g @githubnext/github-copilot-cli
```

### Aliases no funcionan

```bash
# Recargar shell
source ~/.bashrc

# Verificar que se cargó
echo $COPILOT_ALLOW_ALL  # Debe mostrar: 1
```

### Copilot pide confirmación

```bash
# Asegurar que la variable está configurada
export COPILOT_ALLOW_ALL=1

# O usar los aliases que ya la incluyen
cop
```

### Errores de permisos

```bash
# Dar permisos al script
chmod +x /home/edu/autorenta/tools/copilot-autonomous.sh
```

## 📚 Recursos

- **Documentación del proyecto**: `CLAUDE.md`, `PATTERNS.md`
- **Instrucciones de Copilot**: `.github/copilot-instructions.md`
- **Instrucciones de agentes**: `AGENTS.md`
- **Ayuda del script**: `copa help`
- **Ayuda de aliases**: `cop-help`

## 🎓 Ejemplos Completos

### Ejemplo 1: Nueva Feature Completa

```bash
cq "Implementa un sistema de reviews de autos:
- Modelo Review con rating, comentario, usuario, auto
- Servicio ReviewService con CRUD y Supabase
- Componente ReviewList standalone
- Componente ReviewForm con validación
- Tests unitarios y E2E
- Políticas RLS en Supabase"
```

### Ejemplo 2: Fix de Bug

```bash
cop-fix "El formulario de booking no valida las fechas correctamente:
- Las fechas pasadas deberían estar bloqueadas
- La fecha de fin debe ser después de la fecha de inicio
- Añade tests para estos casos"
```

### Ejemplo 3: Refactoring Masivo

```bash
cop-refactor "Actualiza todos los componentes en src/app/features:
- Convierte a standalone si no lo son
- Usa inject() en lugar de constructor
- Migra estados a signals
- Actualiza los tests correspondientes"
```

---

## 🎉 ¡Listo para Usar!

Tu GitHub Copilot CLI está configurado en **modo extremadamente autónomo**.

```bash
# Empieza ahora mismo
cop
```

¡Happy Coding! 🚀
