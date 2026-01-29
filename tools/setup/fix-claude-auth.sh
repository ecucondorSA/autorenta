#!/bin/bash
# ==================================================
# Script para limpiar autenticacion de Claude Code
# y asegurar que usa tu suscripcion de Anthropic
# ==================================================

echo "=== Limpiando variables de Vertex AI ==="
unset GOOGLE_APPLICATION_CREDENTIALS
unset ANTHROPIC_VERTEX_PROJECT_ID
unset CLOUD_ML_REGION

echo "=== Verificando token OAuth ==="
if [ -n "$CLAUDE_CODE_OAUTH_TOKEN" ]; then
    echo "OK: Token OAuth configurado (${CLAUDE_CODE_OAUTH_TOKEN:0:20}...)"
else
    echo "ADVERTENCIA: No hay token OAuth configurado"
    echo "Ejecuta: source ~/.bashrc"
fi

echo ""
echo "=== Estado actual ==="
echo "GOOGLE_APPLICATION_CREDENTIALS: ${GOOGLE_APPLICATION_CREDENTIALS:-[no configurado]}"
echo "ANTHROPIC_VERTEX_PROJECT_ID: ${ANTHROPIC_VERTEX_PROJECT_ID:-[no configurado]}"
echo "CLAUDE_CODE_OAUTH_TOKEN: ${CLAUDE_CODE_OAUTH_TOKEN:+configurado}"

echo ""
echo "=== Siguiente paso ==="
echo "Cierra esta terminal y abre una nueva, luego ejecuta:"
echo "  cd /home/edu/autorenta && claude"
echo ""
echo "O si quieres reiniciar ahora sin cerrar la terminal:"
echo "  source ~/.bashrc && claude"
