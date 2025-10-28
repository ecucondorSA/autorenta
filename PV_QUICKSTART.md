# 🚀 PV - Copilot Autónomo - Guía Rápida

## Inicio Rápido

```bash
# 1. Cargar aliases (solo una vez)
echo 'source /home/edu/autorenta/.copilot-aliases.sh' >> ~/.bashrc
source ~/.bashrc

# 2. Empezar a usar
pv  # Modo interactivo autónomo
```

## 📋 Comandos Principales

### Comandos Base
```bash
pv                              # Modo interactivo completo
pvp "tu prompt aquí"            # Prompt directo
pvq "tu prompt aquí"            # Quick prompt (más corto)
pvc                             # Continuar última sesión
pvr                             # Resumir sesión anterior
```

### Modelos Específicos
```bash
pv-sonnet    # Claude Sonnet 4.5 (default, mejor balance)
pv-haiku     # Claude Haiku 4.5 (más rápido)
pv-gpt       # GPT-5 (tareas muy complejas)
```

### Comandos Especializados
```bash
pv-create "componente de login"           # Crear componentes/servicios
pv-fix "error en booking service"         # Arreglar bugs
pv-test "componente de booking"           # Crear tests
pv-refactor "servicio de auth"            # Refactorizar código
pv-dev "añadir paginación"                # Desarrollo general
pv-debug "problema con validación"        # Debug
```

### Script Personalizado
```bash
pva run                                    # Interactivo
pva run "crea un servicio de auth"        # Con prompt
pva continue                               # Continuar sesión
pva resume                                 # Resumir sesión
pva help                                   # Ver ayuda completa
```

## 🎯 Ejemplos Prácticos

### Crear Componentes
```bash
pv-create "un componente standalone de lista de autos con lazy loading"
pvq "Genera el componente booking-form con validación y signals"
```

### Arreglar Bugs
```bash
pv-fix "el error 500 en el endpoint de pagos"
pv-debug "por qué el formulario no se valida"
```

### Crear Tests
```bash
pv-test "el servicio de bookings con todos los edge cases"
pvq "Añade tests E2E para el flujo de reserva"
```

### Refactorizar
```bash
pv-refactor "el servicio de auth para usar inject()"
pvq "Convierte los componentes de cars a standalone"
```

## ⚡ Workflows Rápidos

### Desarrollo Normal
```bash
pv                              # Iniciar
> Crea un componente de login
> Añade validación
> Crea tests
```

### Quick Tasks
```bash
pvq "Crea un servicio de auth con Supabase"
pvq "Añade validación al formulario de booking"
pvq "Ejecuta lint y tests"
```

### Continuar Trabajo
```bash
pvc                             # Continuar donde quedaste
```

## 🔧 Características

- ✅ **Sin confirmaciones** - Todo automático
- ✅ **Acceso total** - Todos los paths permitidos
- ✅ **Todas las herramientas** - Git, npm, pnpm, ng, etc.
- ✅ **Ejecución paralela** - Múltiples tareas simultáneas
- ✅ **Streaming** - Respuestas en tiempo real

## 📚 Ayuda

```bash
pv-help      # Ver todos los comandos disponibles
pva help     # Ayuda del script personalizado
```

## 💡 Tips

### 1. Ser Específico
❌ `pvq "arregla el código"`
✅ `pvq "arregla el error de null en booking.service.ts línea 45"`

### 2. Usar el Modelo Correcto
```bash
pv-haiku     # Para: formateo, renombrar, fixes simples
pv-sonnet    # Para: features nuevas, refactoring
pv-gpt       # Para: arquitectura compleja
```

### 3. Comandos Encadenados
```bash
pva run "Crea el servicio de payments" && pva run "Ejecuta los tests"
```

## 🎯 Casos de Uso Comunes

### Feature Completa
```bash
pvq "Implementa sistema de reviews:
- Modelo Review con TypeScript
- ReviewService con Supabase CRUD
- ReviewList component standalone
- ReviewForm con validación
- Tests unitarios y E2E
- RLS policies"
```

### Fix Rápido
```bash
pv-fix "El formulario de booking no valida fechas correctamente:
- Bloquear fechas pasadas
- Fecha fin > fecha inicio
- Añadir tests"
```

### Refactoring Masivo
```bash
pv-refactor "Actualiza componentes en src/app/features:
- Convierte a standalone
- Usa inject()
- Migra a signals
- Actualiza tests"
```

## 🔐 Seguridad

✅ **Permitido:**
- Leer/escribir archivos del proyecto
- Ejecutar tests, lint, build
- Git commits y branches
- Comandos de desarrollo

❌ **Bloqueado:**
- `rm -rf *`
- `git push --force`
- `chmod 777 *`

## 🚀 Empezar Ahora

```bash
pv
```

¡Listo para trabajar de forma autónoma! 🎉
