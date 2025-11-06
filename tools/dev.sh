#!/bin/bash

# Wrapper script para iniciar el entorno de desarrollo
# Este script puede ser llamado directamente sin necesidad de source

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Cargar el script de workflows
source "$SCRIPT_DIR/claude-workflows.sh"

# Ejecutar la función dev_setup
dev_setup

