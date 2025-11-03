#!/bin/bash
# Script para iniciar la aplicación fácilmente

echo "🔍 Iniciando Buscador de Duplicados CSV..."
echo ""

# Verificar si existe el entorno virtual
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
echo "✅ Activando entorno virtual..."
source venv/bin/activate

# Instalar dependencias si no están instaladas
echo "📥 Verificando dependencias..."
pip install -q -r requirements.txt

# Crear carpeta de uploads si no existe
mkdir -p uploads

# Iniciar aplicación
echo ""
echo "🚀 Iniciando servidor Flask..."
echo "📱 Abre tu navegador en: http://localhost:5000"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

python app.py

