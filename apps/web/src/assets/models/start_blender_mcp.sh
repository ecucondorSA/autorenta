#!/bin/bash

# Script para iniciar el servidor Mini-MCP de Blender
# Este servidor permite a Claude Code comunicarse con Blender

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MCP_SCRIPT="$SCRIPT_DIR/blender_mcp_server.py"
PORT=5000

echo "================================"
echo "🚀 Blender Mini-MCP Server"
echo "================================"
echo ""
echo "Iniciando servidor en puerto $PORT..."
echo "Script: $MCP_SCRIPT"
echo ""

# Verificar que Flask está instalado
if ! python3 -c "import flask" 2>/dev/null; then
    echo "⚠️  Flask no está instalado. Instalando..."
    pip install flask
fi

# Iniciar servidor con Blender
echo "Iniciando Blender con Flask MCP Server..."
blender --background --python "$MCP_SCRIPT"

echo ""
echo "================================"
echo "✓ Servidor parado"
echo "================================"
