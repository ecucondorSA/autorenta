"""
Analizar y configurar materiales del coche
Separa Paint (carrocería) de Glass, Rubber y Plastic
"""

import bpy
from pathlib import Path

MODELS_DIR = Path("/home/edu/autorenta/apps/web/src/assets/models")

def clear_scene():
    """Limpiar escena"""
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)

def import_model(filepath):
    """Importar modelo"""
    bpy.ops.import_scene.gltf(filepath=str(filepath))
    return [obj for obj in bpy.context.scene.objects]

def analyze_materials():
    """Analizar todos los materiales"""
    print("\n" + "="*70)
    print("ANÁLISIS DE MATERIALES DEL COCHE")
    print("="*70 + "\n")

    materials_info = {}

    for idx, material in enumerate(bpy.data.materials):
        info = {
            'name': material.name,
            'use_nodes': material.use_nodes,
            'objects': [],
            'type': 'UNKNOWN'
        }

        # Identificar tipo de material
        name_lower = material.name.lower()

        if any(word in name_lower for word in ['paint', 'body', 'car', 'metal', 'color']):
            info['type'] = 'PAINT'
        elif any(word in name_lower for word in ['glass', 'window', 'windshield']):
            info['type'] = 'GLASS'
        elif any(word in name_lower for word in ['rubber', 'tire', 'tyre', 'wheel']):
            info['type'] = 'RUBBER'
        elif any(word in name_lower for word in ['plastic', 'trim', 'bumper', 'light', 'interior']):
            info['type'] = 'PLASTIC'

        # Encontrar objetos que usan este material
        for obj in bpy.context.scene.objects:
            if obj.type == 'MESH':
                for slot in obj.material_slots:
                    if slot.material == material:
                        info['objects'].append(obj.name)

        materials_info[material.name] = info

    # Mostrar información
    print("MATERIALES ENCONTRADOS:\n")
    for name, info in materials_info.items():
        print(f"📌 {name}")
        print(f"   Tipo: {info['type']}")
        print(f"   Nodos: {'Sí' if info['use_nodes'] else 'No'}")
        print(f"   Objetos: {', '.join(info['objects']) if info['objects'] else 'Ninguno'}")
        print()

    return materials_info

def setup_paint_material(material_name):
    """Configurar material de pintura con colores específicos"""
    print(f"\n🎨 Configurando material de pintura: {material_name}\n")

    material = bpy.data.materials[material_name]
    material.use_nodes = True

    # Limpiar nodos existentes
    material.node_tree.nodes.clear()
    material.node_tree.links.clear()

    nodes = material.node_tree.nodes
    links = material.node_tree.links

    # Crear nodos
    bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
    output = nodes.new(type='ShaderNodeOutputMaterial')

    # Configurar BSDF para pintura metalizada de auto
    bsdf.inputs['Base Color'].default_value = (0.8, 0.1, 0.1, 1.0)  # Rojo como default
    bsdf.inputs['Metallic'].default_value = 0.7  # Muy metálico
    bsdf.inputs['Roughness'].default_value = 0.2  # Muy pulido
    bsdf.inputs['Coat Weight'].default_value = 0.5  # Acabado brillante

    # Conectar
    links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

    print(f"✓ {material_name} configurado como Paint Material")
    print(f"  - Base Color: Rojo (lista para cambiar)")
    print(f"  - Metallic: 0.7 (pintura metalizada)")
    print(f"  - Roughness: 0.2 (acabado brillante)\n")

def rename_material_to_paint(old_name):
    """Renombrar material a Car_Paint"""
    material = bpy.data.materials[old_name]
    new_name = "Car_Paint"
    material.name = new_name
    print(f"✓ Material renombrado: {old_name} → {new_name}")
    return new_name

def lock_other_materials():
    """Bloquear otros materiales para que no cambien de color"""
    print("\n🔒 Configurando otros materiales (bloqueados):\n")

    for material in bpy.data.materials:
        if material.name != "Car_Paint":
            material.use_nodes = True

            # Configurar según tipo
            name_lower = material.name.lower()

            if any(word in name_lower for word in ['glass', 'window']):
                # Glass: transparente
                if material.node_tree.nodes:
                    material.node_tree.nodes.clear()
                    material.node_tree.links.clear()

                nodes = material.node_tree.nodes
                links = material.node_tree.links

                glass = nodes.new(type='ShaderNodeBsdfGlass')
                output = nodes.new(type='ShaderNodeOutputMaterial')

                glass.inputs['IOR'].default_value = 1.45
                links.new(glass.outputs['BSDF'], output.inputs['Surface'])
                print(f"  ✓ {material.name} - Glass configurado")

            elif any(word in name_lower for word in ['rubber', 'tire']):
                # Rubber: negro mate
                if not material.node_tree.nodes or len(material.node_tree.nodes) == 0:
                    material.node_tree.nodes.clear()
                    material.node_tree.links.clear()

                nodes = material.node_tree.nodes
                if not nodes:
                    material.node_tree.nodes.clear()
                    material.node_tree.links.clear()
                    nodes = material.node_tree.nodes

                bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
                output = nodes.new(type='ShaderNodeOutputMaterial')

                bsdf.inputs['Base Color'].default_value = (0.1, 0.1, 0.1, 1.0)  # Negro
                bsdf.inputs['Roughness'].default_value = 0.9  # Muy mate
                material.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
                print(f"  ✓ {material.name} - Rubber configurado (BLOQUEADO)")

            elif any(word in name_lower for word in ['plastic', 'trim', 'bumper']):
                # Plastic: gris oscuro mate
                if not material.node_tree.nodes:
                    material.node_tree.nodes.clear()
                    material.node_tree.links.clear()

                nodes = material.node_tree.nodes
                if not nodes:
                    material.node_tree.nodes.clear()
                    material.node_tree.links.clear()
                    nodes = material.node_tree.nodes

                bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
                output = nodes.new(type='ShaderNodeOutputMaterial')

                bsdf.inputs['Base Color'].default_value = (0.3, 0.3, 0.3, 1.0)  # Gris
                bsdf.inputs['Roughness'].default_value = 0.7
                material.node_tree.links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])
                print(f"  ✓ {material.name} - Plastic configurado (BLOQUEADO)")

def main():
    """Pipeline completo"""
    glb_file = MODELS_DIR / "car-3d-model-pbr-optimized.glb"

    # Limpiar e importar
    clear_scene()
    import_model(glb_file)

    # Analizar materiales
    materials = analyze_materials()

    # Encontrar material de pintura
    paint_material = None
    for name, info in materials.items():
        if info['type'] == 'PAINT':
            paint_material = name
            break

    if not paint_material:
        # Si no hay uno identificado, usar el primero que no sea vidrio/goma/plástico
        for name, info in materials.items():
            if info['objects'] and info['type'] == 'UNKNOWN':
                paint_material = name
                break

    if paint_material:
        print(f"\n✅ Material de pintura identificado: {paint_material}\n")

        # Renombrar a Car_Paint
        paint_name = rename_material_to_paint(paint_material)

        # Configurar
        setup_paint_material(paint_name)

        # Configurar otros materiales
        lock_other_materials()

        print("\n" + "="*70)
        print("✓ CONFIGURACIÓN COMPLETADA")
        print("="*70)
        print("\n📌 Resumen:")
        print("   - Car_Paint: CAMBIA DE COLOR (pintura del coche)")
        print("   - Glass: BLOQUEADO (transparente)")
        print("   - Rubber: BLOQUEADO (negro mate)")
        print("   - Plastic: BLOQUEADO (gris oscuro)")
        print("\n✅ Ahora puedes cambiar SOLO el color de la pintura sin afectar otros elementos\n")
    else:
        print("\n❌ No se encontró material de pintura")

if __name__ == "__main__":
    main()
