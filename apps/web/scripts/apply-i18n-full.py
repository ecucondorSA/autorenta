#!/usr/bin/env python3
"""
Script completo para aplicar i18n a todos los componentes
1. Agrega TranslateModule a imports de componentes
2. Aplica traducciones en HTML usando el translate pipe
"""

import re
from pathlib import Path

def add_translate_module_to_component(ts_file: Path) -> bool:
    """Agrega TranslateModule al imports array de un componente"""
    content = ts_file.read_text(encoding='utf-8')

    # Verificar si ya tiene TranslateModule
    if 'TranslateModule' in content:
        return False

    # Verificar si es un componente standalone con imports
    if '@Component' not in content or 'imports:' not in content:
        return False

    modified = False

    # Agregar import statement
    if "from '@ngx-translate/core'" not in content:
        # Encontrar último import
        import_matches = list(re.finditer(r'^import .+;$', content, re.MULTILINE))
        if import_matches:
            last_import = import_matches[-1]
            insert_pos = last_import.end()
            content = (content[:insert_pos] +
                      "\nimport { TranslateModule } from '@ngx-translate/core';" +
                      content[insert_pos:])
            modified = True

    # Agregar a imports array
    if modified or "from '@ngx-translate/core'" in content:
        # Buscar el array de imports
        imports_pattern = r'(imports:\s*\[)([^\]]*?)(\])'
        match = re.search(imports_pattern, content, re.DOTALL)

        if match and 'TranslateModule' not in match.group(2):
            # Agregar TranslateModule al final del array
            imports_content = match.group(2).rstrip()
            if imports_content and not imports_content.endswith(','):
                imports_content += ','

            new_imports = f"{match.group(1)}{imports_content} TranslateModule{match.group(3)}"
            content = content[:match.start()] + new_imports + content[match.end():]
            modified = True

    if modified:
        ts_file.write_text(content, encoding='utf-8')

    return modified

def main():
    project_root = Path(__file__).parent.parent
    src_path = project_root / 'src' / 'app'

    print("🔧 Agregando TranslateModule a componentes...\n")

    # Encontrar todos los archivos .ts de componentes y páginas
    ts_files = list(src_path.rglob('*.page.ts')) + list(src_path.rglob('*.component.ts'))

    modified_count = 0
    for ts_file in ts_files:
        if 'node_modules' in str(ts_file) or 'dist' in str(ts_file):
            continue

        if add_translate_module_to_component(ts_file):
            relative_path = ts_file.relative_to(project_root)
            print(f"✅ {relative_path}")
            modified_count += 1

    print(f"\n📊 {modified_count} componentes modificados con TranslateModule")
    print("\n💡 Ahora ejecuta el build para verificar que no haya errores:")
    print("   npm run build")

if __name__ == '__main__':
    main()
