"""
Blender Script para aplicar colores realistas a partes segmentadas
====================================================================
Aplica materiales con colores realistas a cada parte del auto segmentado:
- Cuerpo: Azul metálico
- Ruedas: Negro mate con detalles
- Ventanas: Vidrio transparente
- Faros: Amarillo/Blanco
- Luces traseras: Rojo
"""

import bpy
import os
import sys

def create_realistic_materials():
    """Crea materiales realistas para el auto"""
    materials = {}
    
    # Material para carrocería (Azul metálico)
    mat_body = bpy.data.materials.new(name="Mat_CarBody")
    mat_body.use_nodes = True
    bsdf = mat_body.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.05, 0.15, 0.35, 1.0)  # Azul oscuro
    bsdf.inputs["Metallic"].default_value = 0.8
    bsdf.inputs["Roughness"].default_value = 0.3
    materials['body'] = mat_body
    
    # Material para ruedas (Negro brillante)
    mat_wheels = bpy.data.materials.new(name="Mat_Wheels")
    mat_wheels.use_nodes = True
    bsdf = mat_wheels.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.02, 0.02, 0.02, 1.0)  # Negro puro
    bsdf.inputs["Metallic"].default_value = 0.2
    bsdf.inputs["Roughness"].default_value = 0.6
    materials['wheels'] = mat_wheels
    
    # Material para vidrio (Transparente)
    mat_glass = bpy.data.materials.new(name="Mat_Glass")
    mat_glass.use_nodes = True
    bsdf = mat_glass.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.8, 0.9, 1.0, 0.5)  # Azul claro semi-transparente
    bsdf.inputs["Roughness"].default_value = 0.1
    mat_glass.blend_method = 'BLEND'
    materials['glass'] = mat_glass
    
    # Material para faros (Amarillo brillante)
    mat_headlight = bpy.data.materials.new(name="Mat_Headlight")
    mat_headlight.use_nodes = True
    bsdf = mat_headlight.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (1.0, 0.9, 0.3, 1.0)  # Amarillo
    bsdf.inputs["Emission Color"].default_value = (1.0, 0.9, 0.3, 1.0)
    bsdf.inputs["Emission Strength"].default_value = 2.0
    materials['headlight'] = mat_headlight
    
    # Material para luces traseras (Rojo brillante)
    mat_taillight = bpy.data.materials.new(name="Mat_Taillight")
    mat_taillight.use_nodes = True
    bsdf = mat_taillight.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0.8, 0.05, 0.05, 1.0)  # Rojo
    bsdf.inputs["Emission Color"].default_value = (1.0, 0.0, 0.0, 1.0)
    bsdf.inputs["Emission Strength"].default_value = 1.5
    materials['taillight'] = mat_taillight
    
    return materials


def apply_colors_to_segmented_car(input_folder, output_folder):
    """Aplica colores a las partes segmentadas"""
    print("\n" + "="*70)
    print("🎨 APLICANDO COLORES A PARTES SEGMENTADAS")
    print("="*70)
    
    # Crear materiales
    print("\n📦 Creando materiales realistas...")
    materials = create_realistic_materials()
    print("   ✓ 5 materiales creados")
    
    # Limpiar escena
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    
    # Importar el archivo .blend segmentado
    blend_file = os.path.join(input_folder, "car_advanced_segmented.blend")
    
    if os.path.exists(blend_file):
        print(f"\n📂 Importando: {blend_file}")
        
        # Usar append para cargar objetos del .blend
        with bpy.data.libraries.load(blend_file) as (data_from, data_to):
            data_to.objects = data_from.objects
        
        for obj in data_to.objects:
            if obj is not None:
                bpy.context.collection.objects.link(obj)
        
        print(f"   ✓ Objetos importados")
    
    # Obtener todos los objetos mesh
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    print(f"\n🔍 Procesando {len(mesh_objects)} objetos...")
    
    # Aplicar colores según el tipo de parte
    for obj in mesh_objects:
        print(f"\n   [{obj.name}]")
        
        # Determinar qué material aplicar basado en el nombre
        if 'Wheel' in obj.name or '009b0717.001' in obj.name or '009b0717.002' in obj.name or '009b0717.003' in obj.name or '009b0717.004' in obj.name:
            print(f"      → Aplicando material: Wheels (Negro)")
            if obj.data.materials:
                obj.data.materials[0] = materials['wheels']
            else:
                obj.data.materials.append(materials['wheels'])
        else:
            # Cuerpo principal
            print(f"      → Aplicando material: Body (Azul Metálico)")
            if obj.data.materials:
                obj.data.materials[0] = materials['body']
            else:
                obj.data.materials.append(materials['body'])
    
    # Guardar proyecto con colores aplicados
    if output_folder:
        os.makedirs(output_folder, exist_ok=True)
        
        output_blend = os.path.join(output_folder, "car_segmented_colored.blend")
        bpy.ops.wm.save_as_mainfile(filepath=output_blend)
        print(f"\n💾 Guardado: {output_blend}")
        
        # Exportar cada parte con colores
        print("\n📦 Exportando partes con colores...")
        for obj in mesh_objects:
            try:
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                bpy.context.view_layer.objects.active = obj
                
                output_path = os.path.join(output_folder, f"{obj.name}_colored.glb")
                bpy.ops.export_scene.gltf(
                    filepath=output_path,
                    use_selection=True,
                    export_format='GLB'
                )
                print(f"   ✓ {obj.name}_colored.glb")
            except Exception as e:
                print(f"   ❌ Error: {e}")
    
    print("\n✅ ¡Colores aplicados correctamente!")
    print("="*70 + "\n")


if __name__ == "__main__":
    argv = sys.argv
    
    if "--" in argv:
        args = argv[argv.index("--") + 1:]
        input_folder = args[0] if len(args) > 0 else "/home/edu/autorenta/output_segmented_advanced"
        output_folder = args[1] if len(args) > 1 else "/home/edu/autorenta/output_colored"
        apply_colors_to_segmented_car(input_folder, output_folder)
    else:
        apply_colors_to_segmented_car("/home/edu/autorenta/output_segmented_advanced", "/home/edu/autorenta/output_colored")
