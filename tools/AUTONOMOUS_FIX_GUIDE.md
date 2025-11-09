# Fix TypeScript Errors - Autonomous Mode

## 🚀 Uso Rápido

```bash
# Modo autónomo completo (hasta 0 errores o 10 iteraciones)
npm run fix:test-types:autonomous

# Con opciones personalizadas
python3 tools/fix-test-types-autonomous.py --max-iterations 5 --target-errors 50
```

## 🎯 ¿Qué hace este script?

El script `fix-test-types-autonomous.py` es un **orquestador autónomo** que:

1. ✅ Ejecuta `fix-test-types.py` (fixes básicos)
2. ✅ Ejecuta `fix-test-types-advanced.py` (fixes avanzados)
3. ✅ Aplica fixes adicionales automáticos
4. ✅ Analiza errores restantes
5. ✅ Itera hasta 0 errores o hasta que no pueda hacer más progreso
6. ✅ Genera reportes de progreso en cada iteración

## 📋 Opciones

```bash
python3 tools/fix-test-types-autonomous.py [opciones]

Opciones:
  --max-iterations N    Máximo de iteraciones (default: 10)
  --target-errors N     Objetivo de errores (default: 0)
  --min-progress N      Progreso mínimo por iteración (default: 5)
```

## 🔄 Flujo de Ejecución

### Iteración Típica

```
Iteración 1/10
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Errores iniciales: 397

1. Ejecutando fixes básicos...
   ✅ Fixes básicos completados

2. Ejecutando fixes avanzados...
   ✅ Fixes avanzados completados

3. Aplicando fixes adicionales automáticos...
   ✅ Corregidos 5 archivos con TS2339 comunes
   ✅ Corregidos 2 archivos con TS2307
   ✅ Corregidos 3 archivos con TS2554

Errores finales: 350
✅ Progreso: -47 errores (397 → 350)
```

### Criterios de Parada

El script se detiene cuando:

1. ✅ **Objetivo alcanzado**: Errores ≤ `--target-errors` (default: 0)
2. ⚠️  **Sin progreso**: 3 iteraciones consecutivas sin progreso suficiente
3. ⏱️  **Límite alcanzado**: Se alcanza `--max-iterations`

## 📊 Ejemplo de Ejecución Completa

```bash
$ npm run fix:test-types:autonomous

╔══════════════════════════════════════════════════════════╗
║  🔧 Fix TypeScript Errors - Autonomous Mode
╚══════════════════════════════════════════════════════════╝

ℹ Modo autónomo: Trabajando hasta 0 errores
ℹ Máximo de iteraciones: 10
ℹ Progreso mínimo por iteración: 5 errores

ℹ Errores iniciales: 397

📊 Análisis de errores:
  Total: 397 errores
  Top 5 tipos de errores:
    TS2339: 175 errores
    TS2345: 59 errores
    TS7006: 19 errores
    TS2353: 19 errores
    TS2367: 16 errores

💡 Sugerencias:
  - Sincronizar tipos de Supabase puede resolver muchos errores TS2339 (175 errores TS2339)

══════════════════════════════════════════════════════════
Iteración 1/10
══════════════════════════════════════════════════════════

🔄 Ejecutando tests para obtener errores...
ℹ Errores iniciales: 397

🔄 Ejecutando fixes básicos...
✅ Fixes básicos completados

🔄 Ejecutando fixes avanzados...
✅ Fixes avanzados completados

🔄 Aplicando fixes adicionales automáticos...
✅ Corregidos 8 archivos con TS2339 comunes
✅ Corregidos 3 archivos con TS2307
✅ Corregidos 5 archivos con TS2554

ℹ Errores finales: 340
✅ Progreso: -57 errores (397 → 340)

[... más iteraciones ...]

╔══════════════════════════════════════════════════════════╗
║  📊 Resumen Final
╚══════════════════════════════════════════════════════════╝

Errores iniciales: 397
Errores finales: 250
Errores corregidos: 147
Reducción: 37.0%
Iteraciones ejecutadas: 5

✅ Progreso realizado: 147 errores corregidos
⚠️  Quedan 250 errores que pueden requerir corrección manual
```

## 🎯 Casos de Uso

### Caso 1: Fixing Completo Autónomo

```bash
# Dejar que el script trabaje hasta 0 errores
npm run fix:test-types:autonomous

# El script:
# - Ejecuta todos los fixes automáticos
# - Itera hasta 0 errores o hasta que no pueda hacer más
# - Genera reporte final
```

**Tiempo estimado**: 10-20 minutos (dependiendo de errores)

---

### Caso 2: Reducción Parcial

```bash
# Reducir a máximo 100 errores
python3 tools/fix-test-types-autonomous.py --target-errors 100 --max-iterations 5
```

**Útil cuando**: Quieres reducir errores pero no necesitas llegar a 0.

---

### Caso 3: Ejecución con Límite de Iteraciones

```bash
# Solo 3 iteraciones (más rápido)
python3 tools/fix-test-types-autonomous.py --max-iterations 3
```

**Útil cuando**: Quieres un fix rápido sin esperar a 0 errores.

---

## 🔧 Integración con Cursor Agent

### Ejecución Autónoma

Cursor Agent puede ejecutar este script de manera completamente autónoma:

```python
# En Cursor Agent
subprocess.run(['npm', 'run', 'fix:test-types:autonomous'], check=False)
```

El script:
- ✅ No requiere interacción del usuario
- ✅ Genera reportes claros
- ✅ Se detiene automáticamente cuando no puede hacer más progreso
- ✅ Retorna códigos de salida apropiados (0 = éxito, 1 = progreso parcial, 2 = sin progreso)

### Códigos de Salida

- `0`: Éxito completo (0 errores alcanzados)
- `1`: Progreso parcial (errores reducidos pero no a 0)
- `2`: Sin progreso (no se pudo reducir errores)

---

## 📈 Estrategias de Fixing

### Estrategia 1: Agresiva (0 errores)

```bash
python3 tools/fix-test-types-autonomous.py --max-iterations 20 --target-errors 0
```

**Cuándo usar**: Antes de un release importante, cuando necesitas 0 errores.

---

### Estrategia 2: Conservadora (Reducción gradual)

```bash
python3 tools/fix-test-types-autonomous.py --max-iterations 5 --target-errors 200
```

**Cuándo usar**: Durante desarrollo activo, reducir errores sin bloquear.

---

### Estrategia 3: Rápida (Fix rápido)

```bash
python3 tools/fix-test-types-autonomous.py --max-iterations 2 --min-progress 10
```

**Cuándo usar**: Antes de un commit rápido, fix de errores obvios.

---

## 🛠️ Fixes Adicionales Automáticos

El script aplica fixes adicionales que no están en los scripts básicos:

### 1. TS2339 - Subscribe errors comunes
- Convierte `promise.subscribe()` → `from(promise).subscribe()`
- Convierte `object.subscribe()` → `of(object).subscribe()`

### 2. TS2307 - Imports incorrectos
- Corrige imports de `supabase.service` → `supabase-client.service`

### 3. TS2554 - Toast service
- Corrige `toastService.success('msg')` → `toastService.success('Title', 'msg')`

---

## 📊 Monitoreo del Progreso

### Durante la Ejecución

El script muestra:
- ✅ Errores iniciales y finales por iteración
- ✅ Progreso (reducción de errores)
- ✅ Archivos corregidos
- ✅ Análisis de errores restantes

### Reporte Final

Al finalizar, el script muestra:
- 📊 Total de errores corregidos
- 📈 Porcentaje de reducción
- 🔍 Top 5 tipos de errores restantes
- 💡 Sugerencias para errores restantes

---

## ⚠️ Limitaciones

### Errores que Requieren Corrección Manual

Algunos errores no pueden corregirse automáticamente:

- **TS2339 complejos**: Propiedades que no existen y requieren cambios en tipos
- **TS2367**: Comparaciones de tipos que requieren análisis de contexto
- **TS2353 complejos**: Object literals con propiedades inválidas que requieren refactoring
- **TS2445 complejos**: Acceso a propiedades privadas que requieren cambios arquitectónicos

### Cuándo Detenerse

El script se detiene automáticamente cuando:
- No puede hacer más progreso (3 iteraciones sin progreso suficiente)
- Alcanza el límite de iteraciones
- Alcanza el objetivo de errores

---

## 🎓 Mejores Prácticas

### 1. **Ejecutar después de cambios grandes**

```bash
# Después de merge de main
git pull origin main
npm run fix:test-types:autonomous
```

### 2. **Antes de PRs importantes**

```bash
# Asegurar 0 errores antes de PR
npm run fix:test-types:autonomous -- --target-errors 0
```

### 3. **Durante desarrollo activo**

```bash
# Fix rápido cada cierto tiempo
npm run fix:test-types:autonomous -- --max-iterations 2
```

### 4. **Con monitoreo tmux**

```bash
# Terminal 1: Ejecutar script autónomo
npm run fix:test-types:autonomous

# Terminal 2: Monitorear progreso
npm run tmux:monitor
```

---

## 🔄 Integración con CI/CD

### Pre-commit Hook (Opcional)

```bash
# .husky/pre-commit
#!/bin/sh
# Fix automático antes de commit
npm run fix:test-types:autonomous -- --max-iterations 2 --target-errors 50
```

**Nota**: Puede hacer commits más lentos. Considera ejecutarlo manualmente.

---

## 📚 Referencias

- [fix-test-types.py](./fix-test-types.py) - Script básico
- [fix-test-types-advanced.py](./fix-test-types-advanced.py) - Script avanzado
- [TMUX_WORKFLOW_GUIDE.md](./TMUX_WORKFLOW_GUIDE.md) - Guía de flujo con tmux

---

## 🚀 Ejemplo Completo para Cursor Agent

```python
# Cursor Agent puede ejecutar esto autónomamente
import subprocess
import sys

def fix_typescript_errors_autonomously():
    """Ejecuta fixing autónomo de errores TypeScript."""
    result = subprocess.run(
        ['python3', 'tools/fix-test-types-autonomous.py', '--max-iterations', '10'],
        cwd='/home/edu/autorenta',
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    
    return result.returncode

# Ejecutar
exit_code = fix_typescript_errors_autonomously()
# 0 = éxito (0 errores)
# 1 = progreso parcial
# 2 = sin progreso
```

---

**Última actualización**: 2025-11-09
**Versión**: 1.0.0
**Diseñado para**: Ejecución autónoma por Cursor Agent



