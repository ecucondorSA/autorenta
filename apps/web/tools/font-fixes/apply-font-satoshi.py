#!/usr/bin/env python3
import os
import re

# Configuración
TARGET_DIR = 'src/app'
EXTENSIONS = {'.html'}

# Regex para encontrar headings con clase
# Captura grupos: 1=Tag(h1-6), 2=Previo a class, 3=Contenido clase, 4=Resto
HEADING_REGEX = re.compile(r'(<h[1-6])(.*?class=["\'])([^"\'>]*)(["\'])', re.IGNORECASE)

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    
    def inject_satoshi_style(match):
        tag = match.group(1)
        pre_class = match.group(2)
        classes = match.group(3)
        post_class = match.group(4)
        
        new_classes = classes
        
        # 1. Eliminar font-sans si está presente (ya que ahora Inter será la default)
        new_classes = re.sub(r'\bfont-sans\b', '', new_classes).strip()

        # 2. Asegurar font-satoshi para los headings
        if 'font-satoshi' not in new_classes:
            new_classes += ' font-satoshi'
        
        # 3. Satoshi se ve mejor con tracking-tight en títulos grandes (ya aplicado por el script)
        if 'tracking-tight' not in new_classes and ('text-3xl' in new_classes or 'text-4xl' in new_classes or 'text-5xl' in new_classes or 'text-6xl' in new_classes):
             new_classes += ' tracking-tight'
             
        # 4. Asegurar font-bold o font-black si no está presente en headings (ya aplicado por el script)
        if 'font-' not in new_classes: # Esto podría ser demasiado amplio, revisar con font-satoshi ya inyectado
             new_classes += ' font-bold' # Preferible usar clases específicas de peso de Tailwind
        
        # Limpiar espacios dobles
        new_classes = re.sub(r'\s+', ' ', new_classes).strip()

        if new_classes != classes:
            return f'{tag}{pre_class}{new_classes}{post_class}'
        return match.group(0)

    new_content = HEADING_REGEX.sub(inject_satoshi_style, content)

    if new_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    print("🚀 Iniciando inyección masiva de Satoshi (font-satoshi) en Títulos...")
    total_files = 0

    for root, _, files in os.walk(TARGET_DIR):
        for file in files:
            if os.path.splitext(file)[1] in EXTENSIONS:
                filepath = os.path.join(root, file)
                if process_file(filepath):
                    print(f"✅ {filepath}")
                    total_files += 1

    print(f"\n📊 Resumen:")
    print(f"   Archivos de títulos optimizados con font-satoshi: {total_files}")

if __name__ == '__main__':
    main()