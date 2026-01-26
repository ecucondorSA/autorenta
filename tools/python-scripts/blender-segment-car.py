"""
Blender Car Segmentation Script
================================
Segmenta un modelo de auto 3D en partes separadas:
- Carrocería (body)
- Ruedas (wheels)
- Ventanas/Cristales (windows)
- Faros (headlights/taillights)
- Espejos (mirrors)
- Interior

USO:
1. Abre Blender
2. Importa tu modelo FBX (File > Import > FBX)
3. Selecciona el objeto del auto
4. Abre la consola de Python (Scripting tab)
5. Pega y ejecuta este script

O desde línea de comandos:
blender --background --python blender-segment-car.py -- input.fbx output_folder
"""

import bpy
import bmesh
import math
import os
import sys
from mathutils import Vector
from collections import defaultdict

# =============================================================================
# CONFIGURACIÓN
# =============================================================================

class CarSegmentConfig:
    """Configuración para la segmentación del auto"""

    # Umbrales de altura (normalizados 0-1 del bounding box)
    WHEEL_HEIGHT_MAX = 0.25  # Las ruedas están en el 25% inferior
    ROOF_HEIGHT_MIN = 0.75   # El techo está en el 25% superior

    # Umbrales de normales (para detectar superficies planas como ventanas)
    WINDOW_NORMAL_THRESHOLD = 0.85  # Normales casi verticales

    # Tamaño mínimo de componentes (en vértices)
    MIN_COMPONENT_VERTS = 50

    # Radio máximo para detectar ruedas
    WHEEL_CIRCULARITY_THRESHOLD = 0.8


# =============================================================================
# FUNCIONES DE ANÁLISIS GEOMÉTRICO
# =============================================================================

def get_mesh_bounds(obj):
    """Obtiene los límites del mesh en coordenadas mundo"""
    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]

    min_co = Vector((
        min(v.x for v in bbox),
        min(v.y for v in bbox),
        min(v.z for v in bbox)
    ))
    max_co = Vector((
        max(v.x for v in bbox),
        max(v.y for v in bbox),
        max(v.z for v in bbox)
    ))

    return min_co, max_co


def normalize_height(z, min_z, max_z):
    """Normaliza la altura Z a rango 0-1"""
    if max_z - min_z == 0:
        return 0.5
    return (z - min_z) / (max_z - min_z)


def analyze_vertex_position(vert, min_co, max_co, config):
    """Analiza la posición de un vértice y sugiere su categoría"""
    norm_height = normalize_height(vert.co.z, min_co.z, max_co.z)

    # Detectar ruedas por altura
    if norm_height < config.WHEEL_HEIGHT_MAX:
        return 'potential_wheel'

    # Detectar techo
    if norm_height > config.ROOF_HEIGHT_MIN:
        return 'roof'

    return 'body'


def analyze_face_normal(face, config):
    """Analiza la normal de una cara para detectar ventanas"""
    # Las ventanas suelen tener normales que apuntan hacia arriba o hacia los lados
    normal = face.normal

    # Ventanas laterales: normal apuntando hacia X o -X
    if abs(normal.x) > config.WINDOW_NORMAL_THRESHOLD:
        return 'side_window'

    # Parabrisas: normal apuntando hacia adelante/atrás con inclinación
    if abs(normal.y) > 0.5 and abs(normal.z) > 0.3:
        return 'windshield'

    return None


def find_connected_components(bm):
    """Encuentra componentes conectados en el mesh"""
    components = []
    visited = set()

    for vert in bm.verts:
        if vert.index in visited:
            continue

        # BFS para encontrar vértices conectados
        component = set()
        queue = [vert]

        while queue:
            v = queue.pop(0)
            if v.index in visited:
                continue

            visited.add(v.index)
            component.add(v.index)

            # Agregar vértices conectados por aristas
            for edge in v.link_edges:
                other = edge.other_vert(v)
                if other.index not in visited:
                    queue.append(other)

        if len(component) >= CarSegmentConfig.MIN_COMPONENT_VERTS:
            components.append(component)

    return components


def analyze_component_shape(bm, vert_indices):
    """Analiza la forma de un componente para identificarlo"""
    verts = [bm.verts[i] for i in vert_indices]

    # Calcular centro y bounds del componente
    center = Vector((0, 0, 0))
    for v in verts:
        center += v.co
    center /= len(verts)

    # Calcular dimensiones
    min_co = Vector((
        min(v.co.x for v in verts),
        min(v.co.y for v in verts),
        min(v.co.z for v in verts)
    ))
    max_co = Vector((
        max(v.co.x for v in verts),
        max(v.co.y for v in verts),
        max(v.co.z for v in verts)
    ))

    size = max_co - min_co

    # Detectar rueda: forma aproximadamente circular en vista lateral
    # (similar ancho Y y alto Z, mucho más pequeño en X)
    if size.x < size.y * 0.5 and abs(size.y - size.z) < size.y * 0.3:
        # Verificar circularidad
        avg_radius = (size.y + size.z) / 4
        distances = [((v.co - center).length) for v in verts]
        avg_dist = sum(distances) / len(distances)
        variance = sum((d - avg_dist) ** 2 for d in distances) / len(distances)

        if variance < avg_radius * 0.5:  # Baja varianza = más circular
            return 'wheel', center, size

    # Detectar espejo: componente pequeño a los lados
    total_volume = size.x * size.y * size.z
    if total_volume < 0.1 and abs(center.x) > size.x * 2:
        return 'mirror', center, size

    return 'body', center, size


# =============================================================================
# FUNCIONES DE SEGMENTACIÓN
# =============================================================================

def select_vertices_by_height(obj, min_height, max_height):
    """Selecciona vértices por rango de altura normalizada"""
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')

    bm = bmesh.from_edit_mesh(obj.data)
    min_co, max_co = get_mesh_bounds(obj)

    for vert in bm.verts:
        world_co = obj.matrix_world @ vert.co
        norm_height = normalize_height(world_co.z, min_co.z, max_co.z)

        if min_height <= norm_height <= max_height:
            vert.select = True

    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode='OBJECT')


def separate_selection(obj, new_name):
    """Separa la selección actual en un nuevo objeto"""
    bpy.ops.object.mode_set(mode='EDIT')

    # Verificar si hay algo seleccionado
    bm = bmesh.from_edit_mesh(obj.data)
    selected = [v for v in bm.verts if v.select]

    if len(selected) < 10:
        bpy.ops.object.mode_set(mode='OBJECT')
        return None

    # Separar
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')

    # El nuevo objeto es el último seleccionado
    for o in bpy.context.selected_objects:
        if o != obj:
            o.name = new_name
            return o

    return None


def segment_by_loose_parts(obj):
    """Separa el mesh por partes sueltas (componentes no conectados)"""
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')

    return list(bpy.context.selected_objects)


def identify_and_rename_parts(objects):
    """Identifica y renombra las partes separadas"""
    config = CarSegmentConfig()

    wheel_count = 0
    parts = {
        'body': None,
        'wheels': [],
        'windows': [],
        'mirrors': [],
        'lights': [],
        'other': []
    }

    for obj in objects:
        if obj.type != 'MESH':
            continue

        # Analizar el objeto
        min_co, max_co = get_mesh_bounds(obj)
        center = (min_co + max_co) / 2
        size = max_co - min_co

        # Calcular altura normalizada del centro
        overall_min = min(o.location.z for o in objects if o.type == 'MESH')
        overall_max = max(o.location.z + o.dimensions.z for o in objects if o.type == 'MESH')
        norm_height = normalize_height(center.z, overall_min, overall_max)

        # Clasificar por características
        volume = size.x * size.y * size.z if all(s > 0 for s in size) else 0

        # Rueda: parte baja, forma aproximadamente cuadrada en YZ
        if norm_height < 0.35 and abs(size.y - size.z) < max(size.y, size.z) * 0.4:
            wheel_count += 1
            obj.name = f"Wheel_{wheel_count}"
            parts['wheels'].append(obj)
            print(f"  ✓ Rueda detectada: {obj.name}")

        # Espejo: pequeño, a los lados
        elif volume < 0.05 and abs(center.x) > 0.5:
            obj.name = f"Mirror_{'L' if center.x < 0 else 'R'}"
            parts['mirrors'].append(obj)
            print(f"  ✓ Espejo detectado: {obj.name}")

        # Carrocería: el objeto más grande
        elif parts['body'] is None or volume > parts['body'].dimensions.x * parts['body'].dimensions.y * parts['body'].dimensions.z:
            if parts['body'] is not None:
                parts['other'].append(parts['body'])
            parts['body'] = obj
            obj.name = "Body"
            print(f"  ✓ Carrocería detectada: {obj.name}")

        else:
            parts['other'].append(obj)

    return parts


def create_materials_for_parts(parts):
    """Crea materiales de colores para identificar las partes"""
    colors = {
        'body': (0.2, 0.4, 0.8, 1.0),      # Azul
        'wheels': (0.1, 0.1, 0.1, 1.0),     # Negro
        'windows': (0.3, 0.5, 0.7, 0.5),    # Azul transparente
        'mirrors': (0.3, 0.3, 0.3, 1.0),    # Gris oscuro
        'lights': (1.0, 0.9, 0.5, 1.0),     # Amarillo
        'other': (0.5, 0.5, 0.5, 1.0)       # Gris
    }

    for part_type, color in colors.items():
        mat = bpy.data.materials.new(name=f"Mat_{part_type}")
        mat.use_nodes = True
        mat.node_tree.nodes["Principled BSDF"].inputs[0].default_value = color

        if part_type == 'windows':
            mat.node_tree.nodes["Principled BSDF"].inputs[21].default_value = 0.5  # Alpha
            mat.blend_method = 'BLEND'

        # Aplicar a objetos
        if part_type == 'body' and parts['body']:
            parts['body'].data.materials.clear()
            parts['body'].data.materials.append(mat)
        elif part_type in parts:
            for obj in parts.get(part_type, []):
                if obj and hasattr(obj, 'data') and hasattr(obj.data, 'materials'):
                    obj.data.materials.clear()
                    obj.data.materials.append(mat)


# =============================================================================
# FUNCIÓN PRINCIPAL
# =============================================================================

def segment_car(input_file=None, output_folder=None):
    """
    Función principal para segmentar el auto

    Args:
        input_file: Ruta al archivo FBX/GLB (opcional, usa objeto activo si no se proporciona)
        output_folder: Carpeta para guardar los archivos segmentados
    """
    print("\n" + "="*60)
    print("🚗 SEGMENTACIÓN DE AUTO 3D")
    print("="*60)

    # Si se proporciona archivo, importarlo
    if input_file and os.path.exists(input_file):
        print(f"\n📂 Importando: {input_file}")

        # Limpiar escena
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete()

        # Importar según extensión
        ext = os.path.splitext(input_file)[1].lower()
        if ext == '.fbx':
            bpy.ops.import_scene.fbx(filepath=input_file)
        elif ext in ['.glb', '.gltf']:
            bpy.ops.import_scene.gltf(filepath=input_file)
        elif ext == '.obj':
            bpy.ops.import_scene.obj(filepath=input_file)
        else:
            print(f"❌ Formato no soportado: {ext}")
            return

    # Obtener objetos mesh
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

    if not mesh_objects:
        print("❌ No se encontraron objetos mesh en la escena")
        return

    print(f"\n📊 Objetos encontrados: {len(mesh_objects)}")

    # Si hay un solo objeto, intentar separar por partes sueltas
    if len(mesh_objects) == 1:
        print("\n🔧 Separando por componentes conectados...")
        obj = mesh_objects[0]
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Aplicar transformaciones
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Separar por partes sueltas
        mesh_objects = segment_by_loose_parts(obj)
        print(f"   Partes separadas: {len(mesh_objects)}")

    # Identificar y renombrar partes
    print("\n🏷️  Identificando partes...")
    parts = identify_and_rename_parts(mesh_objects)

    # Crear materiales
    print("\n🎨 Aplicando materiales...")
    create_materials_for_parts(parts)

    # Resumen
    print("\n" + "="*60)
    print("📋 RESUMEN DE SEGMENTACIÓN")
    print("="*60)
    print(f"  Carrocería: {'✓' if parts['body'] else '✗'}")
    print(f"  Ruedas: {len(parts['wheels'])}")
    print(f"  Espejos: {len(parts['mirrors'])}")
    print(f"  Ventanas: {len(parts['windows'])}")
    print(f"  Luces: {len(parts['lights'])}")
    print(f"  Otros: {len(parts['other'])}")

    # Guardar si se especificó carpeta de salida
    if output_folder:
        os.makedirs(output_folder, exist_ok=True)

        # Guardar archivo Blender completo
        blend_path = os.path.join(output_folder, "car_segmented.blend")
        bpy.ops.wm.save_as_mainfile(filepath=blend_path)
        print(f"\n💾 Guardado: {blend_path}")

        # Exportar cada parte como GLB
        for part_type, objs in parts.items():
            if part_type == 'body' and objs:
                objs = [objs]
            elif not objs:
                continue

            for obj in objs:
                if obj:
                    # Deseleccionar todo y seleccionar solo este objeto
                    bpy.ops.object.select_all(action='DESELECT')
                    obj.select_set(True)
                    bpy.context.view_layer.objects.active = obj

                    # Exportar
                    glb_path = os.path.join(output_folder, f"{obj.name}.glb")
                    bpy.ops.export_scene.gltf(
                        filepath=glb_path,
                        use_selection=True,
                        export_format='GLB'
                    )
                    print(f"   Exportado: {glb_path}")

    print("\n✅ Segmentación completada!")
    print("="*60 + "\n")

    return parts


# =============================================================================
# EJECUCIÓN
# =============================================================================

if __name__ == "__main__":
    # Verificar si se ejecuta desde línea de comandos con argumentos
    argv = sys.argv

    if "--" in argv:
        # Argumentos después de "--"
        args = argv[argv.index("--") + 1:]

        input_file = args[0] if len(args) > 0 else None
        output_folder = args[1] if len(args) > 1 else None

        segment_car(input_file, output_folder)
    else:
        # Ejecutar en el objeto activo actual
        segment_car()
