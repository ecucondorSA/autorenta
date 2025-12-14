#!/usr/bin/env python3
import os
import re

# Configuración
TARGET_DIR = 'src/app'
EXTENSIONS = {'.html'}

# Patrones que indican que el contenido debe ser Monoespaciado
# Detecta: {{ val | currency }}, {{ val | number }}, {{ val | percent }}
NUMBER_PATTERNS = [
    r'\{\{.*?\|\s*currency.*?\}\}',
    r'\{\{.*?\|\s*number.*?\}\}',
    r'\{\{.*?\|\s*percent.*?\}\}',
    r'\$\s*\{\{.*?\}\}' # Detecta $ {{ valor }}
]

# Regex para encontrar la clase en un tag HTML
# Captura: <tag ... class=" contenido " ... >
CLASS_REGEX = re.compile(r'(<[^>]+class=["\'])([^"\'>]*)(["\'][^>]*>)')

def should_apply_mono(content_chunk):
    for pattern in NUMBER_PATTERNS:
        if re.search(pattern, content_chunk, re.DOTALL):
            return True
    return False

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    # Estrategia: Dividir el archivo por tags para encontrar el contexto
    # Esto es una aproximación robusta sin usar un parser completo (que requeriría dependencias externas)
    
    # 1. Buscar líneas o bloques que contengan los patrones numéricos
    lines = content.split('\n')
    new_lines = []
    modified_count = 0

    for line in lines:
        if should_apply_mono(line):
            # Si la línea ya tiene font-mono, saltar
            if 'font-mono' in line:
                new_lines.append(line)
                continue

            # Intentar inyectar font-mono en el atributo class existente
            if 'class="' in line or "class='" in line:
                # Buscar el atributo class y añadir font-mono
                # Usamos una función de reemplazo para evitar romper el string
                def inject_class(match):
                    prefix = match.group(1)
                    classes = match.group(2)
                    suffix = match.group(3)
                    
                    if 'font-mono' not in classes:
                        return f'{prefix}{classes} font-mono{suffix}'
                    return match.group(0)

                new_line = CLASS_REGEX.sub(inject_class, line)
                if new_line != line:
                    modified_count += 1
                    line = new_line
            
            # Caso avanzado: No tiene clase, habría que agregarla (Omitido por seguridad para no romper estructura)
            # Generalmente en Tailwind todo tiene clase.
            
        new_lines.append(line)

    new_content = '\n'.join(new_lines)

    if new_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, modified_count
    return False, 0

def main():
    print("🚀 Iniciando inyección masiva de JetBrains Mono (font-mono)...")
    total_files = 0
    total_modifications = 0

    for root, _, files in os.walk(TARGET_DIR):
        for file in files:
            if os.path.splitext(file)[1] in EXTENSIONS:
                filepath = os.path.join(root, file)
                modified, count = process_file(filepath)
                if modified:
                    print(f"✅ {filepath} ({count} cambios)")
                    total_files += 1
                    total_modifications += count

    print(f"\n📊 Resumen:")
    print(f"   Archivos modificados: {total_files}")
    print(f"   Líneas numéricas actualizadas: {total_modifications}")

if __name__ == '__main__':
    main()
