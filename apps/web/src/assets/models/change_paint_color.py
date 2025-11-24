"""
Cambiar SOLO el color de la pintura del coche (Car_Paint)
Sin afectar vidrios, gomas, plásticos
"""

import sys
import json

def change_paint_color(hex_color):
    """Cambiar solo Car_Paint"""
    try:
        import bpy

        # Convertir hex a RGB
        hex_color = hex_color.lstrip('#')
        r = int(hex_color[0:2], 16) / 255.0
        g = int(hex_color[2:4], 16) / 255.0
        b = int(hex_color[4:6], 16) / 255.0
        color = (r, g, b, 1.0)

        # Buscar y cambiar SOLO Car_Paint
        if "Car_Paint" in bpy.data.materials:
            mat = bpy.data.materials["Car_Paint"]

            if mat.use_nodes:
                # Buscar nodo BSDF
                for node in mat.node_tree.nodes:
                    if node.type == 'BSDF_PRINCIPLED':
                        node.inputs['Base Color'].default_value = color
                        return {
                            "status": "ok",
                            "message": f"Car_Paint cambiado a #{hex_color}",
                            "metallic": 0.7,
                            "roughness": 0.2
                        }

            return {"status": "error", "message": "Car_Paint no tiene nodos"}
        else:
            return {"status": "error", "message": "Material Car_Paint no encontrado"}

    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) > 1:
        color = sys.argv[1]
        result = change_paint_color(color)
        print(json.dumps(result))
    else:
        print(json.dumps({"error": "Color required"}))
