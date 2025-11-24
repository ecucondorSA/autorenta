"""
Renderizar múltiples autos en diferentes colores en una sola imagen
"""

import bpy
import math
from pathlib import Path

MODELS_DIR = Path("/home/edu/autorenta/apps/web/src/assets/models")
OUTPUT_DIR = Path("/home/edu/autorenta/apps/web/src/assets/renders")

# Crear directorio de renders
OUTPUT_DIR.mkdir(exist_ok=True)

# Colores a renderizar
COLORS = [
    ('rojo', '#FF0000'),
    ('azul', '#0033FF'),
    ('blanco', '#FFFFFF'),
    ('negro', '#1A1A1A'),
    ('verde', '#00AA00'),
    ('naranja', '#FF8800'),
]

def clear_scene():
    """Limpiar escena completamente"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def setup_render_scene():
    """Configurar escena para renderizado"""
    # Configurar renderizado
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.render.samples = 64
    scene.render.tile_x = 256
    scene.render.tile_y = 256
    scene.render.use_denoising = True
    scene.render.resolution_x = 1920
    scene.render.resolution_y = 1080

    # Iluminación
    bpy.ops.object.light_add(type='SUN', location=(10, 10, 15))
    sun = bpy.context.active_object
    sun.data.energy = 2.0
    sun.data.angle = 0.5

    # Luz de relleno
    bpy.ops.object.light_add(type='AREA', location=(-8, -8, 5))
    fill_light = bpy.context.active_object
    fill_light.data.energy = 500
    fill_light.data.size = 10

    # Fondo gris
    world = bpy.data.worlds[0]
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (0.15, 0.15, 0.15, 1.0)

def import_car(color_name):
    """Importar coche para un color específico"""
    # Intentar con archivo final, sino con original
    paths_to_try = [
        MODELS_DIR / f"car-{color_name}-final.glb",
        MODELS_DIR / "car-3d-model-pbr-optimized.glb"
    ]

    for filepath in paths_to_try:
        if filepath.exists():
            bpy.ops.import_scene.gltf(filepath=str(filepath))
            return True

    return False

def position_cars():
    """Posicionar autos en la escena"""
    cars = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

    # Distribuir en grid
    num_cars = len(cars)
    cols = math.ceil(math.sqrt(num_cars))
    rows = math.ceil(num_cars / cols)

    spacing_x = 8
    spacing_y = 8

    for idx, car in enumerate(cars):
        row = idx // cols
        col = idx % cols

        x = col * spacing_x - (cols * spacing_x) / 2
        y = row * spacing_y - (rows * spacing_y) / 2

        car.location = (x, y, 0)
        car.rotation_euler = (0, 0, 0)

def setup_camera():
    """Posicionar cámara"""
    bpy.ops.object.camera_add(location=(0, -20, 10))
    camera = bpy.context.active_object
    camera.rotation_euler = (math.radians(65), 0, 0)
    bpy.context.scene.camera = camera

def render_scene(filename):
    """Renderizar escena"""
    filepath = OUTPUT_DIR / filename
    bpy.context.scene.render.filepath = str(filepath)
    bpy.ops.render.render(write_still=True)
    return filepath

def main():
    print("\n" + "="*70)
    print("🎬 RENDERIZANDO MÚLTIPLES AUTOS EN COLORES")
    print("="*70 + "\n")

    # Limpiar y setup
    clear_scene()
    setup_render_scene()
    setup_camera()

    # Importar autos de diferentes colores
    for color_name, hex_color in COLORS:
        print(f"📦 Importando {color_name}...", end=" ", flush=True)
        if import_car(color_name):
            print("✓")
        else:
            print("✗ No encontrado")

    # Posicionar
    print(f"\n📍 Posicionando autos...")
    position_cars()

    # Renderizar
    print(f"\n🎬 Renderizando imagen final...")
    output_file = render_scene("autorenta-all-colors.png")

    print(f"\n✅ Renderizado completado")
    print(f"📁 Guardado en: {output_file}\n")

if __name__ == "__main__":
    main()
