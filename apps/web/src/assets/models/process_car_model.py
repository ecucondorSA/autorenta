"""
Blender Script: Procesar y optimizar modelo GLB del auto
- Importar GLB
- Optimizar malla (reducir polígonos, cleanup)
- Mejorar materiales/texturas PBR
- Exportar múltiples formatos
"""

import bpy
import bmesh
from pathlib import Path

class CarModelProcessor:
    def __init__(self, glb_path, output_dir=None):
        self.glb_path = Path(glb_path)
        self.output_dir = Path(output_dir) if output_dir else self.glb_path.parent
        self.imported_objects = []

    def clear_scene(self):
        """Limpiar escena de objetos por defecto"""
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        print("✓ Escena limpiada")

    def import_glb(self):
        """Importar archivo GLB"""
        bpy.ops.import_scene.gltf(filepath=str(self.glb_path))
        # Seleccionar todos los objetos importados
        self.imported_objects = [obj for obj in bpy.context.scene.objects]
        print(f"✓ GLB importado: {len(self.imported_objects)} objetos")
        return self.imported_objects

    def optimize_mesh(self, decimation_ratio=0.5, remove_doubles=True):
        """Optimizar malla: reducir polígonos y limpiar geometría"""
        optimized_count = 0

        for obj in self.imported_objects:
            if obj.type == 'MESH':
                bpy.context.view_layer.objects.active = obj
                obj.select_set(True)

                # Entrar en edit mode para limpiar
                bpy.ops.object.mode_set(mode='EDIT')
                bpy.ops.mesh.select_all(action='SELECT')

                # Remover vértices duplicados
                if remove_doubles:
                    bpy.ops.mesh.remove_doubles(threshold=0.0001)

                # Salir de edit mode
                bpy.ops.object.mode_set(mode='OBJECT')

                # Aplicar decimation modifier
                decimation = obj.modifiers.new(name="Decimate", type='DECIMATE')
                decimation.ratio = decimation_ratio

                # Aplicar modifier
                with bpy.context.temp_override(object=obj):
                    bpy.ops.object.modifier_apply(modifier=decimation.name)

                # Aplicar shade smooth
                bpy.ops.object.shade_smooth()

                optimized_count += 1
                print(f"  ✓ Optimizado: {obj.name}")

        print(f"✓ Malla optimizada ({optimized_count} objetos)")

    def setup_pbr_materials(self):
        """Configurar/mejorar materiales PBR"""
        material_count = 0

        for obj in self.imported_objects:
            if obj.type == 'MESH':
                for material_slot in obj.material_slots:
                    if material_slot.material:
                        mat = material_slot.material
                        mat.use_nodes = True

                        # Limpiar nodos existentes
                        mat.node_tree.nodes.clear()
                        mat.node_tree.links.clear()

                        # Crear shader tree básico PBR
                        nodes = mat.node_tree.nodes
                        links = mat.node_tree.links

                        # Nodos
                        bsdf = nodes.new(type='ShaderNodeBsdfPrincipled')
                        output = nodes.new(type='ShaderNodeOutputMaterial')

                        # Configuración PBR
                        bsdf.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1.0)
                        bsdf.inputs['Metallic'].default_value = 0.0
                        bsdf.inputs['Roughness'].default_value = 0.5

                        # Conectar
                        links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

                        material_count += 1
                        print(f"  ✓ Material PBR configurado: {mat.name}")

        print(f"✓ Materiales PBR configurados ({material_count} materiales)")

    def optimize_texture_resolution(self, max_resolution=2048):
        """Optimizar resolución de texturas"""
        for image in bpy.data.images:
            if image.size[0] > max_resolution or image.size[1] > max_resolution:
                scale_x = max_resolution / image.size[0]
                scale_y = max_resolution / image.size[1]
                scale = min(scale_x, scale_y)

                new_width = int(image.size[0] * scale)
                new_height = int(image.size[1] * scale)

                image.scale(new_width, new_height)
                print(f"  ✓ Textura redimensionada: {image.name} -> {new_width}x{new_height}")

    def export_glb(self, filename="car-model-optimized.glb"):
        """Exportar como GLB optimizado"""
        # Seleccionar todos los objetos
        bpy.ops.object.select_all(action='SELECT')

        output_path = self.output_dir / filename
        bpy.ops.export_scene.gltf(
            filepath=str(output_path),
            export_format='GLB'
        )
        print(f"✓ Exportado: {output_path}")

    def export_fbx(self, filename="car-model-optimized.fbx"):
        """Exportar como FBX"""
        bpy.ops.object.select_all(action='SELECT')
        output_path = self.output_dir / filename
        bpy.ops.export_scene.fbx(filepath=str(output_path))
        print(f"✓ Exportado: {output_path}")

    def get_stats(self):
        """Obtener estadísticas del modelo"""
        total_verts = 0
        total_faces = 0

        for obj in self.imported_objects:
            if obj.type == 'MESH':
                total_verts += len(obj.data.vertices)
                total_faces += len(obj.data.polygons)

        return {
            'vertices': total_verts,
            'faces': total_faces,
            'objects': len(self.imported_objects),
            'materials': len(bpy.data.materials)
        }

    def process(self, optimize=True, setup_pbr=True, export_formats=['glb']):
        """Pipeline completo de procesamiento"""
        print("\n" + "="*60)
        print("PROCESANDO MODELO GLB DEL AUTO")
        print("="*60 + "\n")

        self.clear_scene()
        self.import_glb()

        print("\nEstadísticas iniciales:")
        stats = self.get_stats()
        print(f"  Vértices: {stats['vertices']:,}")
        print(f"  Caras: {stats['faces']:,}")
        print(f"  Objetos: {stats['objects']}")
        print(f"  Materiales: {stats['materials']}")

        if optimize:
            print("\nOptimizando malla...")
            self.optimize_mesh(decimation_ratio=0.8)  # Mantener 80% de polígonos
            self.optimize_texture_resolution(max_resolution=2048)

        if setup_pbr:
            print("\nConfigurando materiales PBR...")
            self.setup_pbr_materials()

        print("\nEstadísticas finales:")
        stats = self.get_stats()
        print(f"  Vértices: {stats['vertices']:,}")
        print(f"  Caras: {stats['faces']:,}")

        print("\nExportando...")
        if 'glb' in export_formats:
            self.export_glb()
        if 'fbx' in export_formats:
            self.export_fbx()

        print("\n" + "="*60)
        print("PROCESAMIENTO COMPLETADO ✓")
        print("="*60 + "\n")


# Ejecutar desde Blender UI o línea de comandos
if __name__ == "__main__":
    glb_file = "/home/edu/autorenta/apps/web/src/assets/models/car-3d-model-pbr-optimized.glb"
    output_dir = "/home/edu/autorenta/apps/web/src/assets/models"

    processor = CarModelProcessor(glb_file, output_dir)
    processor.process(optimize=True, setup_pbr=True, export_formats=['glb'])
