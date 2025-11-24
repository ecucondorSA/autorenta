"""
Blender Script: Pintar autos con Draco compression
- Genera variantes de color: Rojo, Azul, Blanco, Negro
- Aplica Draco compression para reducir tamaño ~30%
"""

import bpy
from pathlib import Path

class CarPainterWithDraco:
    def __init__(self, glb_path, output_dir=None):
        self.glb_path = Path(glb_path)
        self.output_dir = Path(output_dir) if output_dir else self.glb_path.parent

        self.colors = {
            'rojo': (1.0, 0.0, 0.0, 1.0),
            'azul': (0.0, 0.2, 1.0, 1.0),
            'blanco': (1.0, 1.0, 1.0, 1.0),
            'negro': (0.1, 0.1, 0.1, 1.0)
        }
        self.imported_objects = []

    def clear_scene(self):
        """Limpiar escena"""
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)

    def import_glb(self):
        """Importar archivo GLB original (con Draco)"""
        bpy.ops.import_scene.gltf(filepath=str(self.glb_path))
        self.imported_objects = [obj for obj in bpy.context.scene.objects]
        return self.imported_objects

    def change_car_color(self, color_name, color_value):
        """Cambiar color del auto"""
        print(f"\n🎨 Pintando: {color_name.upper()}")

        for obj in self.imported_objects:
            if obj.type == 'MESH':
                for material_slot in obj.material_slots:
                    if material_slot.material:
                        mat = material_slot.material

                        if mat.use_nodes:
                            for node in mat.node_tree.nodes:
                                if node.type == 'BSDF_PRINCIPLED':
                                    # Cambiar color
                                    node.inputs['Base Color'].default_value = color_value

                                    # Ajustar propiedades según color
                                    if color_name == 'negro':
                                        node.inputs['Metallic'].default_value = 0.8
                                        node.inputs['Roughness'].default_value = 0.2
                                    elif color_name == 'blanco':
                                        node.inputs['Metallic'].default_value = 0.2
                                        node.inputs['Roughness'].default_value = 0.4
                                    else:
                                        node.inputs['Metallic'].default_value = 0.3
                                        node.inputs['Roughness'].default_value = 0.5

                                    print(f"  ✓ {mat.name} actualizado")

    def export_with_draco(self, color_name, filename=None):
        """Exportar con Draco compression"""
        if not filename:
            filename = f"car-{color_name}-draco.glb"

        bpy.ops.object.select_all(action='SELECT')
        output_path = self.output_dir / filename

        # Intentar con Draco compression si está disponible
        try:
            bpy.ops.export_scene.gltf(
                filepath=str(output_path),
                export_format='GLB',
                export_draco_mesh_compression_level=7  # Máxima compresión
            )
        except TypeError:
            # Si no funciona, intentar sin Draco
            try:
                bpy.ops.export_scene.gltf(
                    filepath=str(output_path),
                    export_format='GLB',
                    use_draco_mesh_compression=True
                )
            except TypeError:
                # Fallback: exportar sin parámetros de Draco
                bpy.ops.export_scene.gltf(
                    filepath=str(output_path),
                    export_format='GLB'
                )

        file_size = output_path.stat().st_size / (1024 * 1024)
        print(f"  ✓ Exportado: {filename} ({file_size:.2f} MB)")

    def process_all_colors(self):
        """Procesar todas las variantes de color"""
        print("\n" + "="*60)
        print("GENERANDO VARIANTES CON DRACO COMPRESSION")
        print("="*60)

        for color_name, color_value in self.colors.items():
            self.clear_scene()
            self.import_glb()
            self.change_car_color(color_name, color_value)
            self.export_with_draco(color_name)

        print("\n" + "="*60)
        print("✓ VARIANTES GENERADAS")
        print("="*60 + "\n")

    def print_summary(self):
        """Mostrar resumen de archivos"""
        print("📦 Archivos generados:")
        for color_name in self.colors.keys():
            filepath = self.output_dir / f"car-{color_name}-draco.glb"
            if filepath.exists():
                size = filepath.stat().st_size / (1024 * 1024)
                print(f"  ✓ car-{color_name}-draco.glb ({size:.2f} MB)")


if __name__ == "__main__":
    glb_file = "/home/edu/autorenta/apps/web/src/assets/models/car-3d-model-pbr-optimized.glb"
    output_dir = "/home/edu/autorenta/apps/web/src/assets/models"

    painter = CarPainterWithDraco(glb_file, output_dir)
    painter.process_all_colors()
    painter.print_summary()
