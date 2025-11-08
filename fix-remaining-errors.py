#!/usr/bin/env python3
"""
Script para corregir errores restantes de compilación
"""
import re
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_template_filters(file_path: Path):
    """Corrige filtros en templates HTML que Angular no puede parsear"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Reemplazar filtros complejos en templates con métodos helper
        # car.blockedRanges.filter(r => r.type === 'booking').length
        # -> getBookingCount(car)
        
        # Buscar patrones de filter en templates
        patterns = [
            (r'car\.blockedRanges\.filter\(r\s*=>\s*r\.type\s*===\s*[\'"]booking[\'"]\)\.length',
             r'getBookingCount(car)'),
            (r'car\.blockedRanges\.filter\(r\s*=>\s*r\.type\s*===\s*[\'"]manual_block[\'"]\)\.length',
             r'getManualBlockCount(car)'),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido template: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def add_helper_methods_to_calendar(file_path: Path):
    """Agrega métodos helper al componente multi-car-calendar"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        if 'getBookingCount' not in content:
            # Buscar el final de la clase antes del último }
            class_end = content.rfind('}')
            if class_end > 0:
                # Buscar el penúltimo } (cierre de clase)
                before_last = content[:class_end].rfind('}')
                if before_last > 0:
                    insert_pos = before_last + 1
                    methods = '''
  getBookingCount(car: any): number {
    return car.blockedRanges?.filter((r: any) => r.type === 'booking').length || 0;
  }

  getManualBlockCount(car: any): number {
    return car.blockedRanges?.filter((r: any) => r.type === 'manual_block').length || 0;
  }
'''
                    content = content[:insert_pos] + methods + content[insert_pos:]
                    file_path.write_text(content, encoding='utf-8')
                    print(f"✅ Agregados métodos helper: {file_path.relative_to(BASE_DIR)}")
                    return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_notifications_settings(file_path: Path):
    """Corrige error de tipo en notifications-settings"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Buscar línea con error: , '')
        # Debe ser: , 0) o cambiar la llamada
        content = re.sub(
            r"this\.toastService\.(success|error|info|warning)\('([^']+)',\s*''\)",
            r"this.toastService.\1('\2', '')",
            content
        )
        
        # Buscar específicamente el error en línea 107
        content = re.sub(
            r"(,\s*)''(\s*\)\s*;?\s*$)",
            r"\10\2",
            content,
            flags=re.MULTILINE
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_vehicle_documents_template(file_path: Path):
    """Corrige template de vehicle-documents que tiene map en binding"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Reemplazar map complejo con método helper
        content = re.sub(
            r"getMissingRequiredDocs\(\)\.map\(k\s*=>\s*getDocumentKindLabel\(k\)\)\.join\(',\s*'\)",
            r"getMissingDocsLabel()",
            content
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido template: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def add_missing_docs_helper(file_path: Path):
    """Agrega método helper para missing docs"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        if 'getMissingDocsLabel' not in content:
            class_end = content.rfind('}')
            if class_end > 0:
                before_last = content[:class_end].rfind('}')
                if before_last > 0:
                    insert_pos = before_last + 1
                    method = '''
  getMissingDocsLabel(): string {
    return this.getMissingRequiredDocs().map(k => this.getDocumentKindLabel(k)).join(', ');
  }
'''
                    content = content[:insert_pos] + method + content[insert_pos:]
                    file_path.write_text(content, encoding='utf-8')
                    print(f"✅ Agregado método helper: {file_path.relative_to(BASE_DIR)}")
                    return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def main():
    print("🔧 Corrigiendo errores restantes...\n")
    
    # Fix multi-car-calendar template
    calendar_html = BASE_DIR / "app/features/dashboard/components/multi-car-calendar/multi-car-calendar.component.html"
    if calendar_html.exists():
        print(f"Procesando: multi-car-calendar.component.html")
        fix_template_filters(calendar_html)
    
    # Add helper methods to calendar component
    calendar_ts = BASE_DIR / "app/features/dashboard/components/multi-car-calendar/multi-car-calendar.component.ts"
    if calendar_ts.exists():
        print(f"\nProcesando: multi-car-calendar.component.ts")
        add_helper_methods_to_calendar(calendar_ts)
    
    # Fix notifications-settings
    notifications_file = BASE_DIR / "app/features/profile/notifications-settings/notifications-settings.page.ts"
    if notifications_file.exists():
        print(f"\nProcesando: notifications-settings.page.ts")
        fix_notifications_settings(notifications_file)
    
    # Fix vehicle-documents template
    vehicle_html = BASE_DIR / "app/features/cars/vehicle-documents/vehicle-documents.page.html"
    if vehicle_html.exists():
        print(f"\nProcesando: vehicle-documents.page.html")
        fix_vehicle_documents_template(vehicle_html)
    
    # Add helper method to vehicle-documents component
    vehicle_ts = BASE_DIR / "app/features/cars/vehicle-documents/vehicle-documents.page.ts"
    if vehicle_ts.exists():
        print(f"\nProcesando: vehicle-documents.page.ts")
        add_missing_docs_helper(vehicle_ts)
    
    print("\n✨ Correcciones completadas")

if __name__ == "__main__":
    main()




