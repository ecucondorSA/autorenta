# 🚀 Blender Mini-MCP Server

Servidor HTTP que permite a Claude Code comunicarse con Blender y automatizar tareas 3D.

## 📋 Descripción

Este es un "mini-MCP" (Model Context Protocol simplificado) que proporciona:

- ✅ API REST para comunicarse con Blender
- ✅ Automatización de tareas 3D
- ✅ Fácil integración con Claude Code
- ✅ Sin necesidad de configuración compleja

## 🔧 Instalación

### 1. Requisitos

```bash
pip install flask --break-system-packages
```

Ya debería estar instalado. Verificar:

```bash
python3 -c "import flask; print('Flask OK')"
```

### 2. Ubicación

```
/home/edu/autorenta/apps/web/src/assets/models/blender_mcp_server.py
/home/edu/autorenta/apps/web/src/assets/models/start_blender_mcp.sh
```

## 🚀 Uso

### Iniciar el servidor

```bash
./start_blender_mcp.sh
```

O directamente:

```bash
blender --background --python blender_mcp_server.py
```

El servidor se iniciará en **http://127.0.0.1:5000**

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Respuesta:
```json
{
  "status": "healthy",
  "blender_version": "Blender 5.0.0",
  "timestamp": "2025-11-24T12:00:00"
}
```

### Información

```bash
GET /info
```

Respuesta:
```json
{
  "name": "Blender Mini-MCP Server",
  "version": "1.0.0",
  "blender_version": "Blender 5.0.0",
  "models_dir": "/home/edu/autorenta/apps/web/src/assets/models",
  "port": 5000
}
```

### Limpiar Escena

```bash
POST /scene/clear
```

### Importar GLB

```bash
POST /model/import
Content-Type: application/json

{
  "filepath": "car-3d-model-pbr-optimized.glb"
}
```

### Obtener Estadísticas

```bash
GET /scene/stats
```

Respuesta:
```json
{
  "status": "success",
  "data": {
    "objects": 1,
    "vertices": 812421,
    "faces": 1563251,
    "materials": 3,
    "images": 1
  }
}
```

### Cambiar Color

```bash
POST /model/color
Content-Type: application/json

{
  "color": "#FF0000"
}
```

### Exportar GLB

```bash
POST /model/export
Content-Type: application/json

{
  "filename": "car-custom.glb"
}
```

### Listar Archivos

```bash
GET /files/list
```

## 💻 Ejemplos de Uso

### Desde cURL

```bash
# Health check
curl http://127.0.0.1:5000/health

# Obtener estadísticas
curl http://127.0.0.1:5000/scene/stats

# Importar modelo
curl -X POST http://127.0.0.1:5000/model/import \
  -H "Content-Type: application/json" \
  -d '{"filepath": "car-3d-model-pbr-optimized.glb"}'

# Cambiar color
curl -X POST http://127.0.0.1:5000/model/color \
  -H "Content-Type: application/json" \
  -d '{"color": "#0033FF"}'
```

### Desde Python

```python
import requests

# Conectar al servidor
BASE_URL = "http://127.0.0.1:5000"

# Health check
response = requests.get(f"{BASE_URL}/health")
print(response.json())

# Importar modelo
response = requests.post(
    f"{BASE_URL}/model/import",
    json={"filepath": "car-3d-model-pbr-optimized.glb"}
)
print(response.json())

# Cambiar color
response = requests.post(
    f"{BASE_URL}/model/color",
    json={"color": "#FF0000"}
)
print(response.json())

# Obtener estadísticas
response = requests.get(f"{BASE_URL}/scene/stats")
print(response.json())

# Exportar
response = requests.post(
    f"{BASE_URL}/model/export",
    json={"filename": "output.glb"}
)
print(response.json())
```

### Desde JavaScript/Node.js

```javascript
const BASE_URL = "http://127.0.0.1:5000";

// Health check
fetch(`${BASE_URL}/health`)
  .then(r => r.json())
  .then(d => console.log(d));

// Importar modelo
fetch(`${BASE_URL}/model/import`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filepath: 'car-3d-model-pbr-optimized.glb' })
})
  .then(r => r.json())
  .then(d => console.log(d));

// Cambiar color
fetch(`${BASE_URL}/model/color`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ color: '#FF0000' })
})
  .then(r => r.json())
  .then(d => console.log(d));
```

## 🎯 Flujo de Trabajo Típico

```
1. Iniciar servidor
   → ./start_blender_mcp.sh

2. Importar modelo
   → POST /model/import

3. Obtener estadísticas
   → GET /scene/stats

4. Modificar (color, materiales, etc)
   → POST /model/color

5. Exportar resultado
   → POST /model/export

6. Usar en aplicación web
   → http://localhost:3000/viewer.html
```

## 📊 Funcionalidades Disponibles

| Función | Endpoint | Método | Descripción |
|---------|----------|--------|------------|
| Health Check | `/health` | GET | Verificar servidor |
| Info | `/info` | GET | Información del servidor |
| Clear Scene | `/scene/clear` | POST | Limpiar escena |
| Import GLB | `/model/import` | POST | Importar modelo |
| Scene Stats | `/scene/stats` | GET | Estadísticas de la escena |
| Change Color | `/model/color` | POST | Cambiar color del modelo |
| Export GLB | `/model/export` | POST | Exportar como GLB |
| List Files | `/files/list` | GET | Listar archivos |

## 🔒 Seguridad

⚠️ **Advertencia**: Este servidor está diseñado para desarrollo local.

**NO se recomienda** exponer en producción sin:
- Autenticación
- Validación de entrada rigurosa
- Firewall / VPN
- HTTPS

Para uso en local (127.0.0.1) está seguro.

## 🐛 Troubleshooting

### Puerto 5000 en uso

```bash
# Encontrar proceso
lsof -i :5000

# Matar proceso
kill -9 <PID>
```

### Flask no se importa en Blender

```bash
# Reinstalar
pip uninstall flask
pip install flask --break-system-packages
```

### Conexión rechazada

Verificar que el servidor está corriendo:
```bash
ps aux | grep blender
```

Si no está:
```bash
./start_blender_mcp.sh &
```

## 📚 Referencias

- Flask: https://flask.palletsprojects.com/
- Blender Python API: https://docs.blender.org/api/
- REST API: https://restfulapi.net/

## 📝 Logs

Los logs se mostrarán en la terminal donde se inició el servidor:

```
INFO: 🚀 Blender Mini-MCP Server iniciado en puerto 5000
INFO: ✅ Endpoints disponibles:
INFO:   GET  /health
INFO:   POST /scene/clear
...
```

## ✨ Próximas Mejoras

- [ ] WebSocket para comunicación en tiempo real
- [ ] Autenticación básica
- [ ] Caché de modelos
- [ ] Historial de cambios
- [ ] Soporte para múltiples escenas

---

Creado para: Autorenta 3D Models
Fecha: 2025-11-24
Blender: 5.0.0
