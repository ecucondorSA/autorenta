#!/usr/bin/env python3
"""
Script para aplicar traducciones automáticamente a archivos HTML
Reemplaza texto estático español con {{ 'key' | translate }}
"""

import re
import json
from pathlib import Path
from typing import Dict, Set

# Mapeo de textos a claves i18n
def load_translations():
    """Carga las claves de traducción desde es.json"""
    i18n_path = Path(__file__).parent.parent / 'src' / 'assets' / 'i18n' / 'es.json'
    with open(i18n_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Crear mapeo de texto -> clave
    text_to_key = {}

    def flatten(obj, prefix=''):
        for key, value in obj.items():
            full_key = f'{prefix}.{key}' if prefix else key
            if isinstance(value, dict):
                flatten(value, full_key)
            else:
                text_to_key[value] = full_key

    flatten(data)
    return text_to_key

def apply_translations_to_file(file_path: Path, text_to_key: Dict[str, str], dry_run: bool = True):
    """Aplica traducciones a un archivo HTML"""

    content = file_path.read_text(encoding='utf-8')
    original_content = content
    replacements = []

    # Ordenar por longitud descendente para reemplazar textos más largos primero
    sorted_texts = sorted(text_to_key.items(), key=lambda x: len(x[0]), reverse=True)

    for text, key in sorted_texts:
        # Escapar caracteres especiales para regex
        escaped_text = re.escape(text)

        # Patrones para encontrar el texto en diferentes contextos
        patterns = [
            # Texto dentro de elementos HTML: >Texto<
            (rf'>({escaped_text})<', rf">{{{{ '{key}' | translate }}}}<"),

            # Texto en atributos con comillas dobles
            (rf'="({escaped_text})"', rf"=\"{{{{ '{key}' | translate }}}}\""),

            # Texto en atributos con interpolación
            (rf'\[([^\]]+)\]="[\'"]({escaped_text})[\'"]', rf"[\1]=\"{{{{ '{key}' | translate }}}}\""),
        ]

        for pattern, replacement in patterns:
            matches = list(re.finditer(pattern, content))
            if matches:
                for match in reversed(matches):  # Reverse to maintain indices
                    # Verificar que no esté ya traducido
                    before = content[max(0, match.start() - 20):match.start()]
                    after = content[match.end():min(len(content), match.end() + 20)]

                    if 'translate' not in before and 'translate' not in after:
                        old_text = match.group(0)
                        new_text = re.sub(pattern, replacement, old_text)
                        content = content[:match.start()] + new_text + content[match.end():]
                        replacements.append((text, key))

    if content != original_content:
        if not dry_run:
            file_path.write_text(content, encoding='utf-8')
        return len(set(replacements))

    return 0

def main():
    import argparse

    parser = argparse.ArgumentParser(description='Aplicar traducciones automáticamente')
    parser.add_argument('--dry-run', action='store_true', help='Simular sin modificar archivos')
    parser.add_argument('--file', type=str, help='Aplicar a un archivo específico')
    parser.add_argument('--apply', action='store_true', help='Aplicar cambios realmente')

    args = parser.parse_args()

    dry_run = not args.apply

    if dry_run:
        print("🔍 Modo DRY-RUN: No se modificarán archivos")
    else:
        print("✏️  Aplicando traducciones...")

    # Cargar mapeo de traducciones
    print("\n📚 Cargando claves de traducción...")
    text_to_key = load_translations()
    print(f"   Cargadas {len(text_to_key)} traducciones")

    # Determinar archivos a procesar
    project_root = Path(__file__).parent.parent
    src_path = project_root / 'src' / 'app'

    if args.file:
        files = [Path(args.file)]
    else:
        files = list(src_path.rglob('*.html'))

    print(f"\n📄 Procesando {len(files)} archivos HTML...\n")

    total_replacements = 0
    files_modified = 0

    for file_path in files:
        # Excluir node_modules, dist
        if 'node_modules' in str(file_path) or 'dist' in str(file_path):
            continue

        replacements = apply_translations_to_file(file_path, text_to_key, dry_run)

        if replacements > 0:
            relative_path = file_path.relative_to(project_root)
            status = "📝" if not dry_run else "🔍"
            print(f"{status} {relative_path}: {replacements} reemplazos")
            files_modified += 1
            total_replacements += replacements

    print(f"\n📊 Resumen:")
    print(f"   Archivos modificados: {files_modified}")
    print(f"   Total de reemplazos: {total_replacements}")

    if dry_run:
        print(f"\n💡 Para aplicar los cambios, ejecuta:")
        print(f"   python scripts/apply-translations.py --apply")

if __name__ == '__main__':
    main()
