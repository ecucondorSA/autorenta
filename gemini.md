# Espacio de Trabajo del Agente Gemini

Este archivo documenta los hallazgos, planes y comandos clave relacionados con el proyecto AutoRenta, gestionado por el agente Gemini.

## Comandos de Workflow del Proyecto

El proyecto utiliza un script de workflows personalizados para automatizar tareas comunes. Para usar estos comandos, primero carga el entorno:

```bash
source tools/claude-workflows.sh
```

### Comandos Principales

- `dev_setup`: Inicia el entorno de desarrollo completo, incluyendo el servidor web de Angular y los workers de backend.
- `dev_stop`: Detiene todos los procesos del entorno de desarrollo.
- `ci_pipeline`: Ejecuta el pipeline completo de Integración Continua (linting, tests, build).
- `quick_test`: Ejecuta los tests unitarios de forma rápida.
- `workflows_help`: Muestra una lista completa de todos los comandos disponibles.

### Iniciar Servidor Web (Manual)

Si solo necesitas iniciar el servidor web, puedes usar el script de npm:

```bash
npm run dev:web
```