"""
Mini-MCP Server para Blender
Permite a Claude Code comunicarse con Blender vía HTTP
"""

from flask import Flask, request, jsonify
import bpy
import json
import logging
from pathlib import Path
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configuración
MODELS_DIR = Path("/home/edu/autorenta/apps/web/src/assets/models")
PORT = 5000

class BlenderMCP:
    """Mini MCP Server para Blender"""

    def __init__(self):
        self.scene = bpy.context.scene
        self.imported_objects = []

    def clear_scene(self):
        """Limpiar escena"""
        try:
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.delete(use_global=False)
            return {"status": "success", "message": "Escena limpiada"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def import_glb(self, filepath):
        """Importar archivo GLB"""
        try:
            filepath = str(MODELS_DIR / Path(filepath).name)
            bpy.ops.import_scene.gltf(filepath=filepath)
            self.imported_objects = [obj for obj in bpy.context.scene.objects]
            return {
                "status": "success",
                "message": f"Modelo importado: {filepath}",
                "objects_count": len(self.imported_objects)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_scene_stats(self):
        """Obtener estadísticas de la escena"""
        try:
            total_verts = 0
            total_faces = 0
            objects_count = 0

            for obj in bpy.context.scene.objects:
                if obj.type == 'MESH':
                    objects_count += 1
                    total_verts += len(obj.data.vertices)
                    total_faces += len(obj.data.polygons)

            return {
                "status": "success",
                "data": {
                    "objects": objects_count,
                    "vertices": total_verts,
                    "faces": total_faces,
                    "materials": len(bpy.data.materials),
                    "images": len(bpy.data.images)
                }
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def change_color(self, hex_color):
        """Cambiar color de todos los materiales"""
        try:
            # Convertir hex a RGB (0-1)
            hex_color = hex_color.lstrip('#')
            r = int(hex_color[0:2], 16) / 255.0
            g = int(hex_color[2:4], 16) / 255.0
            b = int(hex_color[4:6], 16) / 255.0

            color = (r, g, b, 1.0)

            for obj in bpy.context.scene.objects:
                if obj.type == 'MESH':
                    for material_slot in obj.material_slots:
                        if material_slot.material:
                            mat = material_slot.material
                            if mat.use_nodes:
                                for node in mat.node_tree.nodes:
                                    if node.type == 'BSDF_PRINCIPLED':
                                        node.inputs['Base Color'].default_value = color

            return {"status": "success", "message": f"Color aplicado: #{hex_color}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def export_glb(self, filename):
        """Exportar escena como GLB"""
        try:
            filepath = MODELS_DIR / filename
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.export_scene.gltf(
                filepath=str(filepath),
                export_format='GLB'
            )
            size_mb = filepath.stat().st_size / (1024 * 1024)
            return {
                "status": "success",
                "message": f"Exportado: {filename}",
                "size_mb": f"{size_mb:.2f}"
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_files(self):
        """Listar archivos en directorio de modelos"""
        try:
            files = []
            for f in MODELS_DIR.glob("*.glb"):
                size = f.stat().st_size / (1024 * 1024)
                files.append({
                    "name": f.name,
                    "size_mb": f"{size:.2f}",
                    "modified": str(f.stat().st_mtime)
                })
            return {"status": "success", "files": files}
        except Exception as e:
            return {"status": "error", "message": str(e)}

# Instancia global
mcp = BlenderMCP()

# ============ ENDPOINTS ============

@app.route('/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        "status": "healthy",
        "blender_version": bpy.app.version_string,
        "timestamp": datetime.now().isoformat()
    })

@app.route('/scene/clear', methods=['POST'])
def scene_clear():
    """Limpiar escena"""
    return jsonify(mcp.clear_scene())

@app.route('/model/import', methods=['POST'])
def model_import():
    """Importar GLB"""
    data = request.json
    filepath = data.get('filepath')
    if not filepath:
        return jsonify({"status": "error", "message": "filepath requerido"}), 400
    return jsonify(mcp.import_glb(filepath))

@app.route('/scene/stats', methods=['GET'])
def scene_stats():
    """Obtener estadísticas"""
    return jsonify(mcp.get_scene_stats())

@app.route('/model/color', methods=['POST'])
def model_color():
    """Cambiar color"""
    data = request.json
    hex_color = data.get('color')
    if not hex_color:
        return jsonify({"status": "error", "message": "color requerido"}), 400
    return jsonify(mcp.change_color(hex_color))

@app.route('/model/export', methods=['POST'])
def model_export():
    """Exportar GLB"""
    data = request.json
    filename = data.get('filename', 'export.glb')
    return jsonify(mcp.export_glb(filename))

@app.route('/files/list', methods=['GET'])
def files_list():
    """Listar archivos"""
    return jsonify(mcp.list_files())

@app.route('/info', methods=['GET'])
def info():
    """Información del servidor"""
    return jsonify({
        "name": "Blender Mini-MCP Server",
        "version": "1.0.0",
        "blender_version": bpy.app.version_string,
        "models_dir": str(MODELS_DIR),
        "port": PORT
    })

# ============ MAIN ============

if __name__ == '__main__':
    logger.info(f"🚀 Blender Mini-MCP Server iniciado en puerto {PORT}")
    logger.info(f"📁 Directorio de modelos: {MODELS_DIR}")
    logger.info(f"Blender: {bpy.app.version_string}")
    logger.info("\n✅ Endpoints disponibles:")
    logger.info("  GET  /health          - Health check")
    logger.info("  GET  /info            - Información")
    logger.info("  POST /scene/clear     - Limpiar escena")
    logger.info("  POST /model/import    - Importar GLB")
    logger.info("  GET  /scene/stats     - Estadísticas")
    logger.info("  POST /model/color     - Cambiar color")
    logger.info("  POST /model/export    - Exportar GLB")
    logger.info("  GET  /files/list      - Listar archivos")

    app.run(host='127.0.0.1', port=PORT, debug=False)
