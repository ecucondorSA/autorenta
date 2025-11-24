"""
Servidor MCP Simple para Blender - Sin dependencias externas
"""

import bpy
import json
import sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs

MODELS_DIR = Path("/home/edu/autorenta/apps/web/src/assets/models")
PORT = 5000

class BlenderHandler(BaseHTTPRequestHandler):
    """Handler para requests HTTP"""

    def do_GET(self):
        """Manejar GET requests"""
        path = urlparse(self.path).path

        if path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "status": "healthy",
                "blender": bpy.app.version_string,
            }
            self.wfile.write(json.dumps(response).encode())

        elif path == '/info':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            response = {
                "name": "Blender Simple MCP",
                "blender": bpy.app.version_string,
                "port": PORT
            }
            self.wfile.write(json.dumps(response).encode())

        elif path == '/scene/stats':
            stats = self.get_scene_stats()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(stats).encode())

        elif path == '/files/list':
            files = self.list_files()
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(files).encode())

        else:
            self.send_response(404)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode())

    def do_POST(self):
        """Manejar POST requests"""
        path = urlparse(self.path).path
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'

        try:
            data = json.loads(body)
        except:
            data = {}

        if path == '/scene/clear':
            result = self.clear_scene()
        elif path == '/model/import':
            filepath = data.get('filepath', '')
            result = self.import_glb(filepath)
        elif path == '/model/color':
            color = data.get('color', '#FF0000')
            result = self.change_color(color)
        elif path == '/model/export':
            filename = data.get('filename', 'export.glb')
            result = self.export_glb(filename)
        else:
            result = {"error": "Unknown endpoint"}

        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(result).encode())

    def clear_scene(self):
        """Limpiar escena"""
        try:
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.object.delete(use_global=False)
            return {"status": "ok", "message": "Escena limpiada"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def import_glb(self, filepath):
        """Importar GLB"""
        try:
            full_path = str(MODELS_DIR / Path(filepath).name)
            bpy.ops.import_scene.gltf(filepath=full_path)
            return {"status": "ok", "message": f"Importado: {filepath}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def get_scene_stats(self):
        """Obtener estadísticas"""
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
                "status": "ok",
                "objects": objects_count,
                "vertices": total_verts,
                "faces": total_faces,
                "materials": len(bpy.data.materials)
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def change_color(self, hex_color):
        """Cambiar color"""
        try:
            hex_color = hex_color.lstrip('#')
            r = int(hex_color[0:2], 16) / 255.0
            g = int(hex_color[2:4], 16) / 255.0
            b = int(hex_color[4:6], 16) / 255.0
            color = (r, g, b, 1.0)

            for obj in bpy.context.scene.objects:
                if obj.type == 'MESH':
                    for slot in obj.material_slots:
                        if slot.material and slot.material.use_nodes:
                            for node in slot.material.node_tree.nodes:
                                if node.type == 'BSDF_PRINCIPLED':
                                    node.inputs['Base Color'].default_value = color

            return {"status": "ok", "message": f"Color: #{hex_color}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def export_glb(self, filename):
        """Exportar GLB"""
        try:
            filepath = MODELS_DIR / filename
            bpy.ops.object.select_all(action='SELECT')
            bpy.ops.export_scene.gltf(filepath=str(filepath), export_format='GLB')
            return {"status": "ok", "message": f"Exportado: {filename}"}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def list_files(self):
        """Listar archivos"""
        try:
            files = []
            for f in MODELS_DIR.glob("*.glb"):
                size = f.stat().st_size / (1024 * 1024)
                files.append({"name": f.name, "size_mb": f"{size:.2f}"})
            return {"status": "ok", "files": files}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def log_message(self, format, *args):
        """Silenciar logs de HTTP"""
        pass

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', PORT), BlenderHandler)
    print(f"\n🚀 Blender MCP Server en puerto {PORT}")
    print(f"✅ GET  /health       - Health check")
    print(f"✅ GET  /info         - Info")
    print(f"✅ GET  /scene/stats  - Estadísticas")
    print(f"✅ POST /scene/clear  - Limpiar")
    print(f"✅ POST /model/import - Importar GLB")
    print(f"✅ POST /model/color  - Cambiar color")
    print(f"✅ POST /model/export - Exportar")
    print(f"✅ GET  /files/list   - Listar\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n✓ Servidor parado")
