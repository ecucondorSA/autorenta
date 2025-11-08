#!/usr/bin/env python3
"""
Script para eliminar métodos duplicados y corregir archivos corruptos
"""
import re
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_damage_comparison(file_path: Path):
    """Elimina métodos getTotalDamageCost duplicados y deja solo uno al final"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Eliminar todos los métodos getTotalDamageCost duplicados
        # Patrón: método completo con llaves
        pattern = r'\s+getTotalDamageCost\(\):\s*string\s*\{\s*return this\.damages\(\)\.reduce\(\(sum,\s*d\)\s*=>\s*sum\s*\+\s*d\.estimatedCostUsd,\s*0\)\.toFixed\(2\);\s*\}\s*'
        
        # Encontrar todas las ocurrencias
        matches = list(re.finditer(pattern, content))
        
        if len(matches) > 1:
            # Eliminar todas excepto la última
            for match in reversed(matches[:-1]):
                start, end = match.span()
                # Verificar que no esté dentro de otro método
                before = content[:start]
                after = content[end:]
                
                # Contar llaves abiertas antes
                open_braces = before.count('{') - before.count('}')
                
                # Si está dentro de otro método (open_braces > 0), eliminarlo
                if open_braces > 0:
                    content = content[:start] + content[end:]
                    print(f"  Eliminado método duplicado en línea ~{before.count(chr(10)) + 1}")
        
        # Asegurar que hay un método al final de la clase (antes del último })
        if 'getTotalDamageCost(): string' not in content:
            # Agregar método antes del último }
            last_brace = content.rfind('}')
            if last_brace > 0:
                # Buscar el penúltimo } (cierre de clase)
                before_last = content[:last_brace].rfind('}')
                if before_last > 0:
                    insert_pos = before_last + 1
                    method = '\n  getTotalDamageCost(): string {\n    return this.damages().reduce((sum, d) => sum + d.estimatedCostUsd, 0).toFixed(2);\n  }\n'
                    content = content[:insert_pos] + method + content[insert_pos:]
                    print(f"  Agregado método getTotalDamageCost al final de la clase")
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido: {file_path.relative_to(BASE_DIR)}")
            return True
        else:
            print(f"ℹ️  Sin cambios: {file_path.relative_to(BASE_DIR)}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def fix_refund_status(file_path: Path):
    """Verifica y corrige refund-status si está corrupto"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Verificar si empieza con HTML (corrupto)
        if content.strip().startswith('/span>') or content.strip().startswith('<'):
            print(f"⚠️  Archivo parece corrupto, intentando restaurar...")
            # Buscar el inicio real del componente
            component_start = content.find('import {')
            if component_start > 0:
                content = content[component_start:]
                file_path.write_text(content, encoding='utf-8')
                print(f"✅ Restaurado: {file_path.relative_to(BASE_DIR)}")
                return True
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🔧 Corrigiendo métodos duplicados y archivos corruptos...\n")
    
    # Fix damage-comparison
    damage_file = BASE_DIR / "app/shared/components/damage-comparison/damage-comparison.component.ts"
    if damage_file.exists():
        print(f"Procesando: {damage_file.name}")
        fix_damage_comparison(damage_file)
    
    # Fix refund-status
    refund_file = BASE_DIR / "app/shared/components/refund-status/refund-status.component.ts"
    if refund_file.exists():
        print(f"\nProcesando: {refund_file.name}")
        fix_refund_status(refund_file)
    
    print("\n✨ Correcciones completadas")

if __name__ == "__main__":
    main()




