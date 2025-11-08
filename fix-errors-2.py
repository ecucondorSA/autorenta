#!/usr/bin/env python3
"""
Script para corregir errores adicionales
"""
import re
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_signal_has_calls(file_path: Path):
    """Corrige retrying.has() -> retrying().has()"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # retrying.has() -> retrying().has()
        content = re.sub(
            r'retrying\.has\(',
            r'retrying().has(',
            content
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Fixed signal calls: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_encoding_issue(file_path: Path):
    """Intenta leer archivo con diferentes encodings"""
    encodings = ['latin-1', 'iso-8859-1', 'cp1252']
    for enc in encodings:
        try:
            content = file_path.read_text(encoding=enc)
            # Guardar como UTF-8
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Fixed encoding: {file_path.relative_to(BASE_DIR)}")
            return True
        except:
            continue
    return False

def main():
    print("🔧 Corrigiendo errores adicionales...\n")
    
    # Fix signal.has() calls
    offline_panel = BASE_DIR / "app/shared/components/offline-messages-panel/offline-messages-panel.component.ts"
    if offline_panel.exists():
        fix_signal_has_calls(offline_panel)
    
    # Fix encoding issue
    owner_damage = BASE_DIR / "app/features/bookings/owner-damage-report/owner-damage-report.page.ts"
    if owner_damage.exists():
        fix_encoding_issue(owner_damage)
    
    print("\n✨ Correcciones adicionales completadas")

if __name__ == "__main__":
    main()




