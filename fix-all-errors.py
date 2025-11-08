#!/usr/bin/env python3
"""
Script completo para corregir todos los errores de compilación
"""
import re
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_urgent_booking_template(file_path: Path):
    """Mueve template inline a archivo HTML separado"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Buscar el template inline
        template_match = re.search(r"template:\s*`([^`]+)`", content, re.DOTALL)
        if template_match:
            template_content = template_match.group(1)
            
            # Crear archivo HTML
            html_file = file_path.parent / "urgent-booking.page.html"
            html_file.write_text(template_content.strip(), encoding='utf-8')
            
            # Reemplazar template inline con templateUrl
            new_content = content.replace(
                template_match.group(0),
                "templateUrl: './urgent-booking.page.html',"
            )
            
            file_path.write_text(new_content, encoding='utf-8')
            print(f"✅ Movido template a HTML: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_availability_calendar_template(file_path: Path):
    """Corrige filtros en availability-calendar template"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Reemplazar filtros con métodos helper
        content = re.sub(
            r'blockedRanges\(\)\.filter\(r\s*=>\s*r\.type\s*===\s*[\'"]manual_block[\'"]\)\.length\s*>\s*0',
            r'hasManualBlocks()',
            content
        )
        content = re.sub(
            r'blockedRanges\(\)\.filter\(r\s*=>\s*r\.type\s*===\s*[\'"]manual_block[\'"]\)',
            r'getManualBlocks()',
            content
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido template: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def add_availability_calendar_helpers(file_path: Path):
    """Agrega métodos helper a availability-calendar"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        if 'hasManualBlocks' not in content:
            class_end = content.rfind('}')
            if class_end > 0:
                before_last = content[:class_end].rfind('}')
                if before_last > 0:
                    insert_pos = before_last + 1
                    methods = '''
  hasManualBlocks(): boolean {
    return this.blockedRanges().filter((r: any) => r.type === 'manual_block').length > 0;
  }

  getManualBlocks(): any[] {
    return this.blockedRanges().filter((r: any) => r.type === 'manual_block');
  }
'''
                    content = content[:insert_pos] + methods + content[insert_pos:]
                    file_path.write_text(content, encoding='utf-8')
                    print(f"✅ Agregados métodos helper: {file_path.relative_to(BASE_DIR)}")
                    return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_vehicle_documents_toast(file_path: Path):
    """Corrige error de toast en vehicle-documents"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Buscar línea 191 con error
        content = re.sub(
            r"this\.toastService\.(success|error|info)\('([^']+)',\s*''\)",
            r"this.toastService.\1('\2', '')",
            content
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido toast: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_bulk_blocking_methods(file_path: Path):
    """Corrige getMyCars -> listMyCars"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        content = content.replace('getMyCars', 'listMyCars')
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido método: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_availability_calendar_locale(file_path: Path):
    """Corrige import de Spanish a es"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        content = content.replace("import { Spanish } from 'date-fns/locale';", "import { es } from 'date-fns/locale';")
        content = content.replace('Spanish', 'es')
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido locale: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def main():
    print("🔧 Corrigiendo TODOS los errores...\n")
    
    # Fix urgent-booking (mover template a HTML)
    urgent_file = BASE_DIR / "app/features/bookings/urgent-booking/urgent-booking.page.ts"
    if urgent_file.exists():
        print(f"Procesando: urgent-booking.page.ts")
        fix_urgent_booking_template(urgent_file)
    
    # Fix availability-calendar template
    availability_html = BASE_DIR / "app/features/cars/availability-calendar/availability-calendar.page.html"
    if availability_html.exists():
        print(f"\nProcesando: availability-calendar.page.html")
        fix_availability_calendar_template(availability_html)
    
    # Add helpers to availability-calendar
    availability_ts = BASE_DIR / "app/features/cars/availability-calendar/availability-calendar.page.ts"
    if availability_ts.exists():
        print(f"\nProcesando: availability-calendar.page.ts")
        add_availability_calendar_helpers(availability_ts)
        fix_availability_calendar_locale(availability_ts)
    
    # Fix vehicle-documents
    vehicle_ts = BASE_DIR / "app/features/cars/vehicle-documents/vehicle-documents.page.ts"
    if vehicle_ts.exists():
        print(f"\nProcesando: vehicle-documents.page.ts")
        fix_vehicle_documents_toast(vehicle_ts)
    
    # Fix bulk-blocking
    bulk_file = BASE_DIR / "app/features/cars/bulk-blocking/bulk-blocking.page.ts"
    if bulk_file.exists():
        print(f"\nProcesando: bulk-blocking.page.ts")
        fix_bulk_blocking_methods(bulk_file)
    
    print("\n✨ Correcciones completadas")
    print("💡 Ejecuta 'npm run build:web' para verificar")

if __name__ == "__main__":
    main()




