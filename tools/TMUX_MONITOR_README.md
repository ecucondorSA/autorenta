# TMUX Development Monitor

Scripts para configurar un entorno de desarrollo con tmux para AutoRenta.

## 🚀 Uso Rápido

```bash
# Entorno completo (scripts + monitoreo)
npm run tmux:dev

# Solo monitoreo
npm run tmux:monitor
```

## 📋 Scripts Disponibles

### 1. `tmux-dev-monitor.sh` - Entorno Completo

Crea una sesión tmux con dos paneles:

- **Panel Izquierdo**: Ejecución de scripts y comandos
  - Ejecutar `fix-test-types.py`
  - Ejecutar tests
  - Build del proyecto
  - Linting

- **Panel Derecho**: Monitoreo y logs
  - Comandos de monitoreo pre-cargados
  - Ver errores en tiempo real
  - Análisis de errores por tipo

**Ventana adicional**: Logs de build y tests

### 2. `tmux-monitor-only.sh` - Solo Monitoreo

Crea una sesión tmux dedicada solo a monitoreo:

- Monitoreo continuo de errores TypeScript
- Actualización automática cada 30 segundos
- Top 10 errores por tipo
- Últimos 5 errores mostrados

## ⌨️ Atajos de Teclado

### Navegación Básica
- `Ctrl+B, ←→↑↓`: Navegar entre paneles
- `Ctrl+B, %`: Dividir verticalmente
- `Ctrl+B, "`: Dividir horizontalmente
- `Ctrl+B, X`: Cerrar panel actual
- `Ctrl+B, D`: Desconectar (mantiene sesión activa)

### Ventanas
- `Ctrl+B, C`: Crear nueva ventana
- `Ctrl+B, N`: Siguiente ventana
- `Ctrl+B, P`: Ventana anterior
- `Ctrl+B, 0-9`: Ir a ventana específica

### Sesiones
- `Ctrl+B, D`: Desconectar de sesión
- `tmux attach -t autorenta-dev`: Reconectar a sesión

## 📊 Comandos Útiles en el Panel de Monitoreo

```bash
# Contar errores totales
npm run test:quick 2>&1 | grep TS | wc -l

# Top errores por tipo
npm run test:quick 2>&1 | grep TS | grep -o "TS[0-9]*" | sort | uniq -c | sort -rn

# Ver errores específicos
npm run test:quick 2>&1 | grep "TS2339"

# Monitoreo continuo manual
watch -n 5 'npm run test:quick 2>&1 | grep TS | wc -l'
```

## 🔧 Configuración

### Detección Automática de Sesiones

Los scripts detectan automáticamente si la sesión ya existe:
- Si existe: Se reconecta a la sesión existente
- Si no existe: Crea una nueva sesión

### Personalización

Puedes editar los scripts para:
- Cambiar el intervalo de actualización (default: 30 segundos)
- Agregar más paneles
- Cambiar el layout de paneles
- Agregar más comandos pre-cargados

## 🐛 Troubleshooting

### tmux no está instalado

```bash
sudo apt-get update
sudo apt-get install -y tmux
```

### Sesión no se crea

```bash
# Verificar si hay sesiones existentes
tmux ls

# Matar sesión existente
tmux kill-session -t autorenta-dev

# Intentar de nuevo
npm run tmux:dev
```

### Paneles no se dividen correctamente

```bash
# Dentro de tmux, ajustar layout
Ctrl+B, Space  # Cambiar entre layouts
```

## 📝 Ejemplos de Uso

### Ejemplo 1: Desarrollo con Monitoreo

```bash
# Terminal 1: Iniciar entorno completo
npm run tmux:dev

# En panel izquierdo:
python3 tools/fix-test-types.py

# En panel derecho: Ver errores actualizarse automáticamente
```

### Ejemplo 2: Solo Monitoreo en Segunda Terminal

```bash
# Terminal 1: Trabajar normalmente
cd /home/edu/autorenta
npm run test:quick

# Terminal 2: Monitoreo dedicado
npm run tmux:monitor
```

## 🎯 Mejores Prácticas

1. **Usa `tmux:dev` para desarrollo activo**
   - Panel izquierdo para ejecutar comandos
   - Panel derecho para monitorear resultados

2. **Usa `tmux:monitor` para monitoreo pasivo**
   - Deja corriendo en segundo plano
   - Revisa periódicamente

3. **Desconecta en lugar de cerrar**
   - `Ctrl+B, D` mantiene la sesión activa
   - Puedes reconectar después

4. **Guarda logs importantes**
   ```bash
   npm run test:quick 2>&1 | tee test-$(date +%Y%m%d).log
   ```

## 📚 Referencias

- [tmux Manual](https://man.openbsd.org/tmux)
- [tmux Cheat Sheet](https://tmuxcheatsheet.com/)

