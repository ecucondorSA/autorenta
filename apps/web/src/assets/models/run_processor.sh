#!/bin/bash

# Script para procesar el modelo del auto con Blender
# Uso: ./run_processor.sh

SCRIPT="/home/edu/autorenta/apps/web/src/assets/models/process_car_model.py"
MODELS_DIR="/home/edu/autorenta/apps/web/src/assets/models"

echo "================================"
echo "Procesador de Modelos Blender"
echo "================================"
echo ""
echo "Archivo de script: $SCRIPT"
echo "Directorio de modelos: $MODELS_DIR"
echo ""

# Ejecutar Blender en modo headless con el script (sin archivo blend)
echo "Iniciando Blender..."
blender --background --python "$SCRIPT"

echo ""
echo "✓ Procesamiento completado"
echo "Revisa los archivos exportados en: $MODELS_DIR"
echo ""
ls -lh "$MODELS_DIR"/*.glb
