#!/usr/bin/env python3
"""
GLB Color Manager - Herramienta para gestionar colores en modelos GLB

Este script permite:
1. Auditar la estructura y materiales de un archivo GLB
2. Modificar el color base del material PBR
3. Generar variantes de color del modelo 3D

Uso:
    # Auditar el GLB actual
    python glb_color_manager.py audit

    # Cambiar a un color específico
    python glb_color_manager.py set-color --color rojo --output car-red.glb

    # Generar todas las variantes de colores predefinidos
    python glb_color_manager.py generate-variants

    # Usar un color personalizado (RGB 0-255)
    python glb_color_manager.py set-color --rgb 255,100,50 --output car-custom.glb
"""

import argparse
import os
from pathlib import Path
from typing import List, Tuple
from pygltflib import GLTF2

# Directorio base del proyecto
PROJECT_ROOT = Path(__file__).parent.parent
MODELS_DIR = PROJECT_ROOT / "apps" / "web" / "src" / "assets" / "models"
DEFAULT_INPUT = MODELS_DIR / "car-3d-model-pbr.glb"

# Paleta de colores predefinidos (RGB 0-1) - Colores Automotrices Profesionales
PRESET_COLORS = {
    # === BLANCOS Y PLATAS ===
    "blanco-perla": (1.0, 1.0, 0.98),
    "blanco-diamante": (0.98, 0.98, 1.0),
    "plata-gt": (0.64, 0.67, 0.70),  # GT Silver Metallic
    "plata-titanio": (0.61, 0.64, 0.71),  # Titanium Silver
    "plata-lunar": (0.85, 0.87, 0.90),
    "gris-nardo": (0.65, 0.66, 0.67),  # Audi Nardo Grey
    "gris-cemento": (0.55, 0.56, 0.57),
    "gris-grafito": (0.35, 0.36, 0.37),

    # === NEGROS ===
    "negro-profundo": (0.02, 0.02, 0.02),
    "negro-zafiro": (0.05, 0.05, 0.08),  # Sapphire Black
    "negro-obsidiana": (0.08, 0.08, 0.08),
    "gris-oscuro": (0.25, 0.25, 0.25),

    # === AZULES ===
    "azul-porsche": (0.01, 0.53, 0.85),  # Porsche Blue Metallic
    "azul-marino": (0.0, 0.18, 0.39),  # Navy Blue
    "azul-electrico": (0.0, 0.45, 0.81),
    "azul-estoril": (0.13, 0.40, 0.68),  # BMW Estoril Blue
    "azul-francia": (0.0, 0.28, 0.67),  # French Racing Blue
    "azul-miami": (0.0, 0.67, 0.87),  # Miami Blue
    "azul-cobalto": (0.0, 0.28, 0.67),

    # === ROJOS ===
    "rojo-racing": (0.90, 0.0, 0.0),  # Racing Red
    "rojo-ferrari": (0.87, 0.0, 0.05),  # Rosso Corsa
    "rojo-candy": (0.75, 0.0, 0.15),  # Candy Red
    "rojo-granate": (0.55, 0.0, 0.15),  # Garnet Red
    "rojo-vino": (0.45, 0.05, 0.15),  # Wine Red
    "naranja-papaya": (1.0, 0.38, 0.0),  # McLaren Papaya
    "naranja-fuego": (1.0, 0.27, 0.0),  # Fire Orange

    # === VERDES ===
    "verde-british": (0.0, 0.26, 0.15),  # British Racing Green
    "verde-esmeralda": (0.0, 0.58, 0.44),
    "verde-lima": (0.62, 0.86, 0.0),  # Lime Green
    "verde-menta": (0.40, 0.87, 0.68),
    "verde-militar": (0.30, 0.35, 0.25),

    # === AMARILLOS Y DORADOS ===
    "amarillo-speed": (1.0, 0.85, 0.0),  # Speed Yellow
    "amarillo-austin": (0.98, 0.93, 0.0),  # Austin Yellow
    "dorado-champagne": (0.96, 0.91, 0.70),
    "dorado-rose": (0.72, 0.43, 0.47),  # Rose Gold
    "bronce-metalico": (0.80, 0.50, 0.20),

    # === MORADOS Y ROSAS ===
    "morado-ultra": (0.48, 0.0, 0.65),  # Ultra Violet
    "morado-amatista": (0.60, 0.40, 0.80),
    "rosa-magenta": (0.90, 0.0, 0.60),
    "rosa-sakura": (1.0, 0.71, 0.76),

    # === MARRONES ===
    "marron-cognac": (0.55, 0.27, 0.07),
    "marron-chocolate": (0.48, 0.25, 0.0),
}


def rgb_to_factor(r: int, g: int, b: int) -> Tuple[float, float, float, float]:
    """Convierte RGB (0-255) a factor de color GLB (0-1) con alpha 1.0"""
    return (r / 255.0, g / 255.0, b / 255.0, 1.0)


def factor_to_rgb(factor: List[float]) -> Tuple[int, int, int]:
    """Convierte factor de color GLB (0-1) a RGB (0-255)"""
    return (
        int(factor[0] * 255),
        int(factor[1] * 255),
        int(factor[2] * 255),
    )


def audit_glb(input_path: Path):
    """Audita y muestra información detallada del archivo GLB"""
    print("\n" + "=" * 70)
    print("🔍 AUDITORÍA DEL MODELO GLB")
    print("=" * 70)

    if not input_path.exists():
        print(f"❌ Error: El archivo {input_path} no existe")
        return

    gltf = GLTF2().load(str(input_path))

    print(f"\n📁 Archivo: {input_path.name}")
    print(f"📏 Tamaño: {input_path.stat().st_size / (1024 * 1024):.2f} MB")

    print(f"\n📊 Estructura del modelo:")
    print(f"  • Meshes: {len(gltf.meshes)}")
    print(f"  • Materiales: {len(gltf.materials)}")
    print(f"  • Texturas: {len(gltf.textures)}")
    print(f"  • Imágenes: {len(gltf.images)}")
    print(f"  • Nodos: {len(gltf.nodes)}")

    print("\n" + "=" * 70)
    print("🎨 DETALLES DE MATERIALES PBR")
    print("=" * 70)

    for i, material in enumerate(gltf.materials):
        print(f"\n📦 Material {i}: {material.name}")
        print("-" * 70)

        if material.pbrMetallicRoughness:
            pbr = material.pbrMetallicRoughness

            # Color base
            base_color = pbr.baseColorFactor
            r, g, b = factor_to_rgb(base_color)
            print(f"\n  🎨 Color Base:")
            print(f"     Factor: {base_color}")
            print(f"     RGB: ({r}, {g}, {b})")
            print(f"     Hex: #{r:02x}{g:02x}{b:02x}")

            # Encontrar el color preset más cercano
            closest_color = None
            min_distance = float('inf')
            for color_name, (cr, cg, cb) in PRESET_COLORS.items():
                distance = ((base_color[0] - cr)**2 +
                           (base_color[1] - cg)**2 +
                           (base_color[2] - cb)**2)**0.5
                if distance < min_distance:
                    min_distance = distance
                    closest_color = color_name

            if closest_color:
                print(f"     Similar a: '{closest_color}'")

            # Propiedades PBR
            print(f"\n  ✨ Propiedades PBR:")
            print(f"     Metallic: {pbr.metallicFactor:.2f} ({'Alto' if pbr.metallicFactor > 0.7 else 'Medio' if pbr.metallicFactor > 0.3 else 'Bajo'})")
            print(f"     Roughness: {pbr.roughnessFactor:.2f} ({'Rugoso' if pbr.roughnessFactor > 0.7 else 'Normal' if pbr.roughnessFactor > 0.3 else 'Brillante'})")

            # Texturas
            print(f"\n  🖼️  Texturas:")
            if pbr.baseColorTexture:
                print(f"     ✓ Base Color (índice {pbr.baseColorTexture.index})")
            if pbr.metallicRoughnessTexture:
                print(f"     ✓ Metallic/Roughness (índice {pbr.metallicRoughnessTexture.index})")

        if material.normalTexture:
            print(f"     ✓ Normal Map (índice {material.normalTexture.index})")

        # Otros parámetros
        print(f"\n  ⚙️  Otros:")
        print(f"     Emissive: {material.emissiveFactor}")
        print(f"     Alpha Mode: {material.alphaMode}")
        print(f"     Double Sided: {material.doubleSided}")

    print("\n" + "=" * 70)
    print("🎨 COLORES PRESET DISPONIBLES")
    print("=" * 70)
    print("\nPuedes usar estos nombres con --color <nombre>:\n")

    for color_name, (r, g, b) in PRESET_COLORS.items():
        rgb = factor_to_rgb([r, g, b, 1.0])
        print(f"  • {color_name:12} - RGB({rgb[0]:3}, {rgb[1]:3}, {rgb[2]:3}) - #{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}")

    print("\n" + "=" * 70)


def set_glb_color(
    input_path: Path,
    output_path: Path,
    color_factor: Tuple[float, float, float, float],
    color_name: str = "personalizado"
):
    """
    Modifica el color base del material PBR en el archivo GLB

    Args:
        input_path: Ruta del archivo GLB de entrada
        output_path: Ruta del archivo GLB de salida
        color_factor: Tupla (R, G, B, A) con valores 0-1
        color_name: Nombre descriptivo del color
    """
    if not input_path.exists():
        print(f"❌ Error: El archivo {input_path} no existe")
        return False

    print(f"\n🎨 Aplicando color '{color_name}' al modelo...")
    print(f"   Factor de color: {color_factor}")

    # Cargar el GLB
    gltf = GLTF2().load(str(input_path))

    # Modificar el color de todos los materiales
    modified_count = 0
    for material in gltf.materials:
        if material.pbrMetallicRoughness:
            old_color = material.pbrMetallicRoughness.baseColorFactor
            material.pbrMetallicRoughness.baseColorFactor = list(color_factor)
            modified_count += 1

            print(f"   ✓ Material '{material.name}' modificado")
            print(f"     Anterior: {old_color}")
            print(f"     Nuevo:    {color_factor}")

    # Guardar el archivo modificado
    output_path.parent.mkdir(parents=True, exist_ok=True)
    gltf.save(str(output_path))

    output_size = output_path.stat().st_size / (1024 * 1024)
    print(f"\n✅ Archivo guardado exitosamente:")
    print(f"   📁 {output_path}")
    print(f"   📏 Tamaño: {output_size:.2f} MB")
    print(f"   🎨 Color: {color_name}")
    print(f"   📦 Materiales modificados: {modified_count}")

    return True


def generate_color_variants(input_path: Path, output_dir: Path):
    """Genera múltiples variantes de color del modelo GLB"""
    print("\n" + "=" * 70)
    print("🎨 GENERADOR DE VARIANTES DE COLOR")
    print("=" * 70)

    if not input_path.exists():
        print(f"❌ Error: El archivo {input_path} no existe")
        return

    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n📁 Archivo base: {input_path.name}")
    print(f"📂 Directorio de salida: {output_dir}")
    print(f"🎨 Generando {len(PRESET_COLORS)} variantes de color...\n")

    successful = 0
    failed = 0

    for color_name, (r, g, b) in PRESET_COLORS.items():
        color_factor = (r, g, b, 1.0)
        output_filename = f"car-3d-model-{color_name}.glb"
        output_path = output_dir / output_filename

        print(f"  [{successful + failed + 1}/{len(PRESET_COLORS)}] Generando: {output_filename}...")

        try:
            if set_glb_color(input_path, output_path, color_factor, color_name):
                successful += 1
        except Exception as e:
            print(f"     ❌ Error: {e}")
            failed += 1

    print("\n" + "=" * 70)
    print(f"✅ Proceso completado: {successful} exitosos, {failed} fallidos")
    print("=" * 70)


def main():
    parser = argparse.ArgumentParser(
        description="Gestiona colores en modelos GLB 3D",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__
    )

    subparsers = parser.add_subparsers(dest='command', help='Comandos disponibles')

    # Comando: audit
    audit_parser = subparsers.add_parser('audit', help='Audita el archivo GLB')
    audit_parser.add_argument(
        '--input', '-i',
        type=Path,
        default=DEFAULT_INPUT,
        help=f'Archivo GLB de entrada (default: {DEFAULT_INPUT.name})'
    )

    # Comando: set-color
    color_parser = subparsers.add_parser('set-color', help='Cambia el color del modelo')
    color_parser.add_argument(
        '--input', '-i',
        type=Path,
        default=DEFAULT_INPUT,
        help=f'Archivo GLB de entrada (default: {DEFAULT_INPUT.name})'
    )
    color_parser.add_argument(
        '--output', '-o',
        type=Path,
        required=True,
        help='Archivo GLB de salida'
    )

    color_group = color_parser.add_mutually_exclusive_group(required=True)
    color_group.add_argument(
        '--color', '-c',
        choices=list(PRESET_COLORS.keys()),
        help='Color predefinido'
    )
    color_group.add_argument(
        '--rgb',
        type=str,
        help='Color personalizado en formato "R,G,B" (valores 0-255)'
    )

    # Comando: generate-variants
    variants_parser = subparsers.add_parser(
        'generate-variants',
        help='Genera variantes de todos los colores predefinidos'
    )
    variants_parser.add_argument(
        '--input', '-i',
        type=Path,
        default=DEFAULT_INPUT,
        help=f'Archivo GLB de entrada (default: {DEFAULT_INPUT.name})'
    )
    variants_parser.add_argument(
        '--output-dir', '-d',
        type=Path,
        default=MODELS_DIR / "variants",
        help='Directorio de salida para las variantes'
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    if args.command == 'audit':
        audit_glb(args.input)

    elif args.command == 'set-color':
        if args.color:
            color_factor = PRESET_COLORS[args.color] + (1.0,)
            color_name = args.color
        else:
            # Parsear RGB personalizado
            try:
                r, g, b = map(int, args.rgb.split(','))
                if not all(0 <= c <= 255 for c in (r, g, b)):
                    print("❌ Error: Los valores RGB deben estar entre 0 y 255")
                    return
                color_factor = rgb_to_factor(r, g, b)
                color_name = f"RGB({r},{g},{b})"
            except ValueError:
                print("❌ Error: Formato RGB inválido. Use: R,G,B (ej: 255,0,0)")
                return

        set_glb_color(args.input, args.output, color_factor, color_name)

    elif args.command == 'generate-variants':
        generate_color_variants(args.input, args.output_dir)


if __name__ == "__main__":
    main()
