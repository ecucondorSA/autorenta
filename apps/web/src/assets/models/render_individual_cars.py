"""
Renderizar cada coche en su color - Rápido y de alta calidad
"""

import bpy
import math
from pathlib import Path

MODELS_DIR = Path("/home/edu/autorenta/apps/web/src/assets/models")
OUTPUT_DIR = Path("/home/edu/autorenta/apps/web/src/assets/renders")
OUTPUT_DIR.mkdir(exist_ok=True)

COLORS = [
    ('rojo', '#FF0000'),
    ('azul', '#0033FF'),
    ('blanco', '#FFFFFF'),
    ('negro', '#1A1A1A'),
]

def clear_scene():
    """Limpiar escena"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def setup_render():
    """Setup renderizado"""
    scene = bpy.context.scene
    scene.render.engine = 'EEVEE'  # Más rápido que CYCLES
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    scene.eevee.taa_samples = 32

    # Lighting
    bpy.ops.object.light_add(type='SUN', location=(8, 8, 12))
    sun = bpy.context.active_object
    sun.data.energy = 1.5
    sun.data.angle = 0.4

    # Fondo
    world = bpy.data.worlds[0]
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.2, 0.2, 0.2, 1.0)

def setup_camera():
    """Cámara"""
    bpy.ops.object.camera_add(location=(6, -10, 4))
    camera = bpy.context.active_object
    camera.rotation_euler = (math.radians(70), 0, math.radians(30))
    bpy.context.scene.camera = camera

def import_final_model(color):
    """Importar modelo del color"""
    path = MODELS_DIR / f"car-{color}-final.glb"
    if path.exists():
        bpy.ops.import_scene.gltf(filepath=str(path))
        return True
    return False

def render(color_name):
    """Renderizar un coche"""
    print(f"🎬 Renderizando {color_name}...", end=" ", flush=True)

    clear_scene()
    setup_render()
    setup_camera()

    if import_final_model(color_name):
        output = OUTPUT_DIR / f"car-{color_name}.png"
        bpy.context.scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        print(f"✅")
        return output
    else:
        print(f"❌ No encontrado")
        return None

def main():
    print("\n" + "="*60)
    print("🚗 RENDERIZANDO AUTOS INDIVIDUALES EN ALTA CALIDAD")
    print("="*60 + "\n")

    for color_name, _ in COLORS:
        render(color_name)

    print("\n" + "="*60)
    print("✅ RENDERS COMPLETADOS")
    print("="*60)
    print(f"📁 Ubicación: {OUTPUT_DIR}\n")

if __name__ == "__main__":
    main()
