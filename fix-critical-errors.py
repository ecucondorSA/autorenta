#!/usr/bin/env python3
"""
Script para corregir errores críticos que bloquean el build
"""
import re
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_urgent_booking_class(file_path: Path):
    """Verifica y corrige la estructura de la clase UrgentBookingPage"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Verificar que la clase esté correctamente definida
        if 'export class UrgentBookingPage' not in content:
            print(f"⚠️  Clase no encontrada en {file_path.name}")
            return False
        
        # Verificar que @Component esté antes de la clase
        component_match = re.search(r'@Component\s*\([^)]+\)', content, re.DOTALL)
        class_match = re.search(r'export class UrgentBookingPage', content)
        
        if component_match and class_match:
            if component_match.end() > class_match.start():
                print(f"✅ Estructura correcta en {file_path.name}")
                return False  # No necesita corrección
        
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def fix_toast_calls_missing_message(file_path: Path):
    """Corrige llamadas a toastService que faltan el segundo parámetro message"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Buscar patrones como: toastService.success('mensaje') sin segundo parámetro
        # y agregar '', como segundo parámetro
        patterns = [
            (r"(this\.toastService\.success)\('([^']+)'\)", r"\1('\2', '')"),
            (r"(this\.toastService\.error)\('([^']+)'\)", r"\1('\2', '')"),
            (r"(this\.toastService\.info)\('([^']+)'\)", r"\1('\2', '')"),
            (r"(this\.toastService\.warning)\('([^']+)'\)", r"\1('\2', '')"),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Fixed toast calls: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def main():
    print("🔧 Corrigiendo errores críticos...\n")
    
    # Verificar urgent-booking
    urgent_file = BASE_DIR / "app/features/bookings/urgent-booking/urgent-booking.page.ts"
    if urgent_file.exists():
        fix_urgent_booking_class(urgent_file)
    
    # Buscar y corregir todos los archivos con problemas de toast
    for ts_file in BASE_DIR.rglob("*.ts"):
        if 'node_modules' in str(ts_file) or '.spec.ts' in str(ts_file):
            continue
        fix_toast_calls_missing_message(ts_file)
    
    print("\n✨ Correcciones completadas")
    print("💡 Intenta el build nuevamente: npm run build:web")

if __name__ == "__main__":
    main()




