"""
Blender Script: Pintar autos en múltiples colores
- Genera variantes del auto en: Rojo, Azul, Blanco, Negro
- Exporta cada variante como GLB optimizado
"""

import bpy
from pathlib import Path

class CarPainter:
    def __init__(self, glb_path, output_dir=None):
        self.glb_path = Path(glb_path)
        self.output_dir = Path(output_dir) if output_dir else self.glb_path.parent

        # Paleta de colores (RGB 0-1)
        self.colors = {
            'rojo': (1.0, 0.0, 0.0, 1.0),           # Rojo puro
            'azul': (0.0, 0.2, 1.0, 1.0),           # Azul vibrante
            'blanco': (1.0, 1.0, 1.0, 1.0),         # Blanco puro
            'negro': (0.1, 0.1, 0.1, 1.0)           # Negro oscuro
        }

        self.imported_objects = []

    def clear_scene(self):
        """Limpiar escena"""
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)

    def import_glb(self):
        """Importar archivo GLB"""
        bpy.ops.import_scene.gltf(filepath=str(self.glb_path))
        self.imported_objects = [obj for obj in bpy.context.scene.objects]
        return self.imported_objects

    def change_car_color(self, color_name, color_value):
        """Cambiar el color del auto"""
        print(f"\n🎨 Pintando auto de color: {color_name.upper()}")

        for obj in self.imported_objects:
            if obj.type == 'MESH':
                for material_slot in obj.material_slots:
                    if material_slot.material:
                        mat = material_slot.material

                        # Usar nodos para cambiar color
                        if mat.use_nodes:
                            # Buscar el nodo Principled BSDF
                            for node in mat.node_tree.nodes:
                                if node.type == 'BSDF_PRINCIPLED':
                                    # Cambiar Base Color
                                    node.inputs['Base Color'].default_value = color_value

                                    # Ajustar Metallic y Roughness según color
                                    if color_name == 'negro':
                                        node.inputs['Metallic'].default_value = 0.8
                                        node.inputs['Roughness'].default_value = 0.2
                                    elif color_name == 'blanco':
                                        node.inputs['Metallic'].default_value = 0.2
                                        node.inputs['Roughness'].default_value = 0.4
                                    else:
                                        node.inputs['Metallic'].default_value = 0.3
                                        node.inputs['Roughness'].default_value = 0.5

                                    print(f"  ✓ Material actualizado: {mat.name}")

    def export_color_variant(self, color_name, filename=None):
        """Exportar variante de color"""
        if not filename:
            filename = f"car-{color_name}.glb"

        bpy.ops.object.select_all(action='SELECT')
        output_path = self.output_dir / filename

        bpy.ops.export_scene.gltf(
            filepath=str(output_path),
            export_format='GLB'
        )

        # Obtener tamaño del archivo
        file_size = output_path.stat().st_size / (1024 * 1024)  # MB
        print(f"  ✓ Exportado: {filename} ({file_size:.2f} MB)")

    def paint_all_variants(self):
        """Generar todas las variantes de color"""
        print("\n" + "="*60)
        print("GENERADOR DE VARIANTES DE AUTOS")
        print("="*60)

        for color_name, color_value in self.colors.items():
            # Limpiar y re-importar para cada variante
            self.clear_scene()
            self.import_glb()

            # Cambiar color
            self.change_car_color(color_name, color_value)

            # Exportar
            self.export_color_variant(color_name)

        print("\n" + "="*60)
        print("✓ GENERACIÓN DE VARIANTES COMPLETADA")
        print("="*60 + "\n")

    def print_summary(self):
        """Mostrar resumen de archivos generados"""
        print("📦 Archivos generados:")
        for color_name in self.colors.keys():
            filepath = self.output_dir / f"car-{color_name}.glb"
            if filepath.exists():
                size = filepath.stat().st_size / (1024 * 1024)
                print(f"  ✓ car-{color_name}.glb ({size:.2f} MB)")


if __name__ == "__main__":
    glb_file = "/home/edu/autorenta/apps/web/src/assets/models/car-model-optimized.glb"
    output_dir = "/home/edu/autorenta/apps/web/src/assets/models"

    painter = CarPainter(glb_file, output_dir)
    painter.paint_all_variants()
    painter.print_summary()
