#!/bin/bash

# Wrapper script para iniciar el entorno de desarrollo
# Este script puede ser llamado directamente sin necesidad de source

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLS_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Arranca el entorno de desarrollo usando el runner consolidado.
# Nota: el archivo claude-workflows.sh ya no es necesario para dev.
exec "$TOOLS_ROOT/run.sh" dev "$@"
