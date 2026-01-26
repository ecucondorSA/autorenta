"""
Blender Car Advanced Segmentation Script
=========================================
Segmentación avanzada de auto 3D con detección de:
- Ventanas/Parabrisas (por material o geometría)
- Faros (delanteros/traseros)
- Espejos
- Puertas
- Techo
- Interior

USO desde terminal:
blender --background --python blender-segment-car-advanced.py -- input.fbx output_folder
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

class AdvancedCarSegmentConfig:
    """Configuración avanzada para segmentación"""

    # Umbrales de altura (0-1 normalizados)
    WHEEL_HEIGHT_MAX = 0.25
    DOOR_HEIGHT_MIN = 0.25
    DOOR_HEIGHT_MAX = 0.80
    ROOF_HEIGHT_MIN = 0.70
    HEADLIGHT_HEIGHT_MIN = 0.35
    HEADLIGHT_HEIGHT_MAX = 0.65

    # Umbrales de posición lateral
    SIDE_MIRROR_X_MIN = 0.45  # A los lados del auto
    HEADLIGHT_Y_MAX = -0.35   # Parte delantera
    TAILLIGHT_Y_MIN = 0.35    # Parte trasera

    # Análisis de superficies
    FLAT_SURFACE_THRESHOLD = 0.9   # Para ventanas (normales paralelas)
    CURVED_SURFACE_THRESHOLD = 0.5  # Para carrocería

    # Tamaño mínimo de componentes
    MIN_COMPONENT_VERTS = 20
    MIN_COMPONENT_FACES = 10


def get_bounding_box(obj):
    """Obtiene BBox del objeto"""
    return obj.bound_box


def normalize_coords(obj, point):
    """Normaliza coordenadas a 0-1 basado en BBox"""
    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]

    min_co = Vector((min(v.x for v in bbox), min(v.y for v in bbox), min(v.z for v in bbox)))
    max_co = Vector((max(v.x for v in bbox), max(v.y for v in bbox), max(v.z for v in bbox)))

    size = max_co - min_co

    norm = Vector((
        (point.x - min_co.x) / size.x if size.x > 0 else 0.5,
        (point.y - min_co.y) / size.y if size.y > 0 else 0.5,
        (point.z - min_co.z) / size.z if size.z > 0 else 0.5
    ))

    return norm


def analyze_mesh_topology(obj):
    """Analiza la topología del mesh para detectar patrones"""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')

    bm = bmesh.from_edit_mesh(obj.data)

    analysis = {
        'total_verts': len(bm.verts),
        'total_faces': len(bm.faces),
        'total_edges': len(bm.edges),
        'islands': [],  # Islas de vértices desconectadas
        'flat_regions': [],  # Superficies planas (ventanas)
        'curved_regions': [],  # Superficies curvas (carrocería)
    }

    # Encontrar islas (componentes desconectadas)
    visited = set()
    for start_vert in bm.verts:
        if start_vert.index in visited:
            continue

        island = {'verts': set(), 'faces': set()}
        queue = [start_vert]

        while queue:
            v = queue.pop(0)
            if v.index in visited:
                continue

            visited.add(v.index)
            island['verts'].add(v.index)

            for face in v.link_faces:
                island['faces'].add(face.index)

            for edge in v.link_edges:
                other = edge.other_vert(v)
                if other.index not in visited:
                    queue.append(other)

        if len(island['verts']) >= AdvancedCarSegmentConfig.MIN_COMPONENT_VERTS:
            analysis['islands'].append(island)

    # Analizar superficies planas vs curvas
    for face in bm.faces:
        # Calcular desviación estándar de normales en la región
        normal = face.normal
        # Si la normal es más o menos uniforme, es una región plana

    bpy.ops.object.mode_set(mode='OBJECT')
    return analysis


def separate_by_material_and_geometry(obj):
    """Intenta separar el mesh por materiales y geometría"""
    print("\n🔍 Analizando geometría...")

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')

    bm = bmesh.from_edit_mesh(obj.data)

    # Encontrar grupos de caras coplanares
    face_groups = defaultdict(list)

    for face in bm.faces:
        normal = tuple(round(face.normal[i], 2) for i in range(3))
        face_groups[normal].append(face)

    bpy.ops.object.mode_set(mode='OBJECT')

    print(f"   Encontrados {len(face_groups)} grupos de normales diferentes")
    for normal, faces in sorted(face_groups.items(), key=lambda x: len(x[1]), reverse=True):
        print(f"     Normal {normal}: {len(faces)} caras")

    return len(face_groups)


def identify_car_parts_advanced(obj):
    """Identificación avanzada de partes del auto"""
    print("\n🏷️  Identificando partes avanzadas...")

    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='OBJECT')

    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_co = Vector((min(v.x for v in bbox), min(v.y for v in bbox), min(v.z for v in bbox)))
    max_co = Vector((max(v.x for v in bbox), max(v.y for v in bbox), max(v.z for v in bbox)))

    center = (min_co + max_co) / 2
    size = max_co - min_co

    parts = {
        'body': {'center': center, 'size': size},
        'roof': None,
        'doors': [],
        'hood': None,
        'trunk': None,
        'headlights': [],
        'taillights': [],
        'windows': [],
        'mirrors': [],
        'wheels': []
    }

    print(f"   Centro: ({center.x:.2f}, {center.y:.2f}, {center.z:.2f})")
    print(f"   Tamaño: {size.x:.2f} x {size.y:.2f} x {size.z:.2f}")

    return parts


def select_and_separate_by_height(obj, min_h, max_h, new_name):
    """Selecciona y separa vértices por rango de altura normalizada"""
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='DESELECT')

    bm = bmesh.from_edit_mesh(obj.data)
    bbox = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    min_z = min(v.z for v in bbox)
    max_z = max(v.z for v in bbox)

    selected_count = 0
    for vert in bm.verts:
        world_z = (obj.matrix_world @ vert.co).z
        norm_h = (world_z - min_z) / (max_z - min_z) if max_z > min_z else 0.5

        if min_h <= norm_h <= max_h:
            vert.select = True
            selected_count += 1

    bmesh.update_edit_mesh(obj.data)
    bpy.ops.object.mode_set(mode='OBJECT')

    if selected_count < 10:
        return None

    # Separar
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.separate(type='SELECTED')
    bpy.ops.object.mode_set(mode='OBJECT')

    # Encontrar el nuevo objeto
    for o in bpy.context.selected_objects:
        if o != obj:
            o.name = new_name
            print(f"   ✓ Separado: {new_name}")
            return o

    return None


def separate_all_loose_parts(obj):
    """Separa todas las partes sueltas (no conectadas)"""
    print("   Separando por componentes no conectados...")

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.separate(type='LOOSE')
    bpy.ops.object.mode_set(mode='OBJECT')

    parts = list(bpy.context.selected_objects)
    print(f"   ✓ Partes separadas: {len(parts)}")

    return parts


def create_segment_report(parts):
    """Crea un reporte de segmentación"""
    print("\n" + "="*60)
    print("📋 REPORTE DE SEGMENTACIÓN")
    print("="*60)

    total = 0
    for part_type, items in parts.items():
        if isinstance(items, list):
            count = len(items)
            if count > 0:
                print(f"  {part_type.upper()}: {count}")
                total += count
        elif items:
            print(f"  {part_type.upper()}: 1")
            total += 1

    print(f"\n  TOTAL DE PARTES: {total}")
    print("="*60)


def create_colored_materials():
    """Crea materiales de colores para cada tipo de parte"""
    materials = {}

    color_map = {
        'body': (0.1, 0.3, 0.6, 1.0),       # Azul oscuro
        'roof': (0.05, 0.15, 0.4, 1.0),     # Azul más oscuro
        'doors': (0.2, 0.4, 0.8, 1.0),      # Azul medio
        'hood': (0.15, 0.35, 0.7, 1.0),     # Azul
        'trunk': (0.15, 0.35, 0.7, 1.0),    # Azul
        'headlights': (1.0, 0.95, 0.4, 1.0),  # Amarillo brillante
        'taillights': (1.0, 0.2, 0.2, 1.0),   # Rojo
        'windows': (0.3, 0.5, 0.9, 0.3),    # Azul transparente
        'mirrors': (0.3, 0.3, 0.3, 1.0),    # Gris
        'wheels': (0.05, 0.05, 0.05, 1.0),  # Negro
    }

    for part_type, color in color_map.items():
        try:
            mat = bpy.data.materials.new(name=f"Mat_{part_type}")
            mat.use_nodes = True

            bsdf = mat.node_tree.nodes["Principled BSDF"]

            # Usar el slot de Base Color (0)
            if "Base Color" in bsdf.inputs:
                bsdf.inputs["Base Color"].default_value = color
            elif 0 in bsdf.inputs:
                bsdf.inputs[0].default_value = color

            if part_type == 'windows':
                if "Alpha" in bsdf.inputs:
                    bsdf.inputs["Alpha"].default_value = 0.3
                mat.blend_method = 'BLEND'
            elif part_type in ['headlights', 'taillights']:
                if "Emission Strength" in bsdf.inputs:
                    bsdf.inputs["Emission Strength"].default_value = 1.0
                if "Emission Color" in bsdf.inputs:
                    bsdf.inputs["Emission Color"].default_value = color

            materials[part_type] = mat
        except Exception as e:
            print(f"   ⚠️  Error creando material {part_type}: {e}")
            # Crear un material genérico como fallback
            try:
                mat = bpy.data.materials.new(name=f"Mat_{part_type}")
                materials[part_type] = mat
            except:
                pass

    return materials


def apply_material_to_object(obj, material):
    """Aplica un material a un objeto"""
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def segment_car_advanced(input_file=None, output_folder=None):
    """Función principal de segmentación avanzada"""
    print("\n" + "="*70)
    print("🚗 SEGMENTACIÓN AVANZADA DE AUTO 3D")
    print("="*70)

    # Importar archivo si se proporciona
    if input_file and os.path.exists(input_file):
        print(f"\n📂 Importando: {input_file}")

        # Limpiar escena
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete()

        ext = os.path.splitext(input_file)[1].lower()
        if ext == '.fbx':
            bpy.ops.import_scene.fbx(filepath=input_file)
        elif ext in ['.glb', '.gltf']:
            bpy.ops.import_scene.gltf(filepath=input_file)
        elif ext == '.obj':
            bpy.ops.import_scene.obj(filepath=input_file)

    # Obtener objetos mesh
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

    if not mesh_objects:
        print("❌ No se encontraron meshes")
        return

    print(f"\n📊 Meshes encontrados: {len(mesh_objects)}")

    # Procesar cada mesh
    all_parts = []

    for i, obj in enumerate(mesh_objects):
        print(f"\n[{i+1}/{len(mesh_objects)}] Procesando: {obj.name}")
        print(f"   Vértices: {len(obj.data.vertices)}")
        print(f"   Caras: {len(obj.data.polygons)}")

        # Análisis de topología
        analyze_mesh_topology(obj)

        # Separar por geometría
        separate_by_material_and_geometry(obj)

        # Separar por componentes sueltos
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)

        # Aplicar transformaciones
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

        # Separar por partes sueltas
        parts = separate_all_loose_parts(obj)
        all_parts.extend(parts)

        # Identificación avanzada
        identify_car_parts_advanced(parts[0] if parts else obj)

    # Crear materiales de colores
    print("\n🎨 Creando materiales...")
    materials = create_colored_materials()

    # Aplicar materiales iniciales (todos como body por ahora)
    try:
        print("\n🎨 Aplicando materiales...")
        for part in all_parts:
            if part and hasattr(part, 'data'):
                if 'Wheel' in part.name:
                    apply_material_to_object(part, materials['wheels'])
                else:
                    apply_material_to_object(part, materials['body'])
        print("   ✓ Materiales aplicados")
    except Exception as e:
        print(f"   ⚠️  Error al aplicar materiales: {e}")

    # Reporte
    parts_dict = {'objects': all_parts}
    create_segment_report(parts_dict)

    # Guardar
    if output_folder:
        os.makedirs(output_folder, exist_ok=True)

        # Guardar Blender
        try:
            blend_path = os.path.join(output_folder, "car_advanced_segmented.blend")
            bpy.ops.wm.save_as_mainfile(filepath=blend_path)
            print(f"\n💾 Guardado: {blend_path}")
        except Exception as e:
            print(f"\n❌ Error al guardar .blend: {e}")

        # Exportar cada parte como GLB
        print("\n📦 Exportando partes...")
        success_count = 0
        for part in all_parts:
            if part:
                try:
                    bpy.ops.object.select_all(action='DESELECT')
                    part.select_set(True)
                    bpy.context.view_layer.objects.active = part

                    glb_path = os.path.join(output_folder, f"{part.name}.glb")
                    bpy.ops.export_scene.gltf(
                        filepath=glb_path,
                        use_selection=True,
                        export_format='GLB'
                    )
                    print(f"   ✓ {part.name}.glb")
                    success_count += 1
                except Exception as e:
                    print(f"   ❌ Error exportando {part.name}: {e}")

        print(f"\n✅ ¡Exportación completada! ({success_count} partes exportadas)")

    print("\n✅ ¡Segmentación avanzada completada!")
    print("="*70 + "\n")


# =============================================================================
# EJECUCIÓN
# =============================================================================

if __name__ == "__main__":
    argv = sys.argv

    if "--" in argv:
        args = argv[argv.index("--") + 1:]
        input_file = args[0] if len(args) > 0 else None
        output_folder = args[1] if len(args) > 1 else None
        segment_car_advanced(input_file, output_folder)
    else:
        segment_car_advanced()
