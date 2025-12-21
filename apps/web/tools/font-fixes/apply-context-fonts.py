#!/usr/bin/env python3
import os
import re

# Configuración
TARGET_DIR = 'src/app'
EXTENSIONS = {'.html'}

# Diccionarios de Contexto (Palabras clave en minúsculas)
CONTEXT_KEYWORDS = {
    'font-luxury': [
        'ganancia', 'ingreso', 'dinero', 'plata', 'inversión', 'rentabilidad', 'roi', 
        'dueño', 'propietario', 'anfitrión', 'negocio', 'premium', 'exclusivo', 
        'lujo', 'seguro', 'garantizado', 'protegido', 'cobrar', 'pago'
    ],
    'font-friendly': [
        'comunidad', 'vecino', 'amigo', 'viaje', 'explorar', 'vacaciones', 'familia',
        'fácil', 'simple', 'rápido', 'ayuda', 'hola', 'bienvenido', 'nosotros',
        'juntos', 'compartir', 'viajero', 'aventura', 'escapada'
    ]
}

# Regex para encontrar contenido dentro de tags
# Captura: <tag ... class=\"...\"> CONTENIDO </tag>
# Simplificado para no romper HTML complejo, busca texto visible
TEXT_CONTENT_REGEX = re.compile(r'(>)([^<]+)(<)', re.DOTALL)

# Regex para inyectar clase
CLASS_INJECTION_REGEX = re.compile(r'(<[^>]+class=["\'])([^"\'>]*)(["\'][^>]*>)')

def detect_font_context(text):
    text_lower = text.lower()
    
    # Sistema de puntuación simple
    scores = {'font-luxury': 0, 'font-friendly': 0}
    
    for font_class, keywords in CONTEXT_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                scores[font_class] += 1
    
    # Decisión
    if scores['font-luxury'] > 0 and scores['font-luxury'] >= scores['font-friendly']:
        return 'font-luxury'
    elif scores['font-friendly'] > 0:
        return 'font-friendly'
    
    return None

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original_content = content
    lines = content.split('\n')
    new_lines = []
    modified_count = 0

    for line in lines:
        # Analizar contenido de texto en la línea
        text_matches = TEXT_CONTENT_REGEX.findall(line)
        suggested_font = None
        
        for _, text, _ in text_matches:
            if not text.strip(): continue
            font = detect_font_context(text)
            if font:
                suggested_font = font
                break
        
        if suggested_font:
            # Verificar si ya tiene la clase o una conflictiva
            if suggested_font in line:
                new_lines.append(line)
                continue
                
            # Evitar doble tipografía (si ya tiene font-mono, font-satoshi, etc)
            # Damos prioridad a mono para números, así que si es mono, no tocamos
            if 'font-mono' in line:
                new_lines.append(line)
                continue

            # Inyectar la clase sugerida
            if 'class="' in line or "class='" in line:
                def inject_class(match):
                    prefix = match.group(1)
                    classes = match.group(2)
                    suffix = match.group(3)
                    
                    # Limpiar otras fuentes de contexto si existen para reemplazar
                    # (Opcional: por ahora solo agrega, no reemplaza agresivamente)
                    
                    if suggested_font not in classes:
                        return f'{prefix}{classes} {suggested_font}{suffix}'
                    return match.group(0)

                new_line = CLASS_INJECTION_REGEX.sub(inject_class, line)
                if new_line != line:
                    modified_count += 1
                    line = new_line
        
        new_lines.append(line)

    new_content = '\n'.join(new_lines)

    if new_content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True, modified_count
    return False, 0

def main():
    print("🧠 Iniciando análisis de contexto tipográfico (AI-lite)...")
    print("   - Detectando palabras clave de 'Lujo/Negocio' -> font-luxury")
    print("   - Detectando palabras clave de 'Comunidad/Viaje' -> font-friendly")
    
    total_files = 0
    total_modifications = 0

    for root, _, files in os.walk(TARGET_DIR):
        for file in files:
            if os.path.splitext(file)[1] in EXTENSIONS:
                filepath = os.path.join(root, file)
                modified, count = process_file(filepath)
                if modified:
                    print(f"✅ {filepath} ({count} inyecciones de contexto)")
                    total_files += 1
                    total_modifications += count

    print(f"\n📊 Resumen Inteligente:")
    print(f"   Archivos enriquecidos semánticamente: {total_files}")
    print(f"   Elementos tipográficos ajustados: {total_modifications}")

if __name__ == '__main__':
    main()
