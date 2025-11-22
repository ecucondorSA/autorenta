#!/usr/bin/env python3
"""
Script para corregir errores de TypeScript automáticamente.
Corrige tipos unknown, propiedades faltantes y módulos no encontrados.
"""

import re
import sys
from pathlib import Path

class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'

def print_success(msg):
    print(f"{Colors.GREEN}✅{Colors.NC} {msg}")

def print_error(msg):
    print(f"{Colors.RED}❌{Colors.NC} {msg}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ{Colors.NC} {msg}")

def fix_cars_map_component(filepath: Path) -> int:
    """Corrige errores en cars-map.component.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Fix 1: err.message cuando err es unknown (línea 205)
    # Cambiar: err.message
    # Por: (err as Error).message
    content = re.sub(
        r"err\.message",
        r"(err as Error).message",
        content
    )
    
    # Fix 2: Tipar eventos de Mapbox (líneas 394, 418)
    # Cambiar: (e: unknown) => { ... e.point ... }
    # Por: (e: mapboxgl.MapMouseEvent) => { ... e.point ... }
    content = re.sub(
        r"this\.map\.on\('click', 'clusters', \(e: unknown\)",
        r"this.map.on('click', 'clusters', (e: mapboxgl.MapMouseEvent)",
        content
    )
    
    content = re.sub(
        r"this\.map\.on\('click', 'unclustered-point', \(e: unknown\)",
        r"this.map.on('click', 'unclustered-point', (e: mapboxgl.MapMouseEvent)",
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes += 1
        print_success(f"Corregidos errores en cars-map.component.ts")
    
    return fixes

def fix_deposit_modal_component(filepath: Path) -> int:
    """Corrige errores en deposit-modal.component.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Fix: error?.code y error?.message cuando error es unknown
    # Necesitamos crear un type guard o usar type assertion
    # Cambiar la función getFriendlyErrorMessage para tipar correctamente
    
    # Buscar la función y reemplazarla
    pattern = r"(private getFriendlyErrorMessage\(error: unknown\): string \{[^}]+)"
    
    def replace_function(match):
        func_body = match.group(1)
        # Reemplazar error?.code por (error as any)?.code
        func_body = re.sub(r"error\?\.code", r"(error as any)?.code", func_body)
        func_body = re.sub(r"error\?\.message", r"(error as any)?.message", func_body)
        return func_body
    
    content = re.sub(pattern, replace_function, content, flags=re.DOTALL)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes += 1
        print_success(f"Corregidos errores en deposit-modal.component.ts")
    
    return fixes

def fix_inline_calendar_modal_component(filepath: Path) -> int:
    """Corrige errores en inline-calendar-modal.component.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Fix: event.detail.value cuando event es unknown
    # Cambiar: async onDateChange(event: unknown)
    # Por: async onDateChange(event: CustomEvent)
    content = re.sub(
        r"async onDateChange\(event: unknown\)",
        r"async onDateChange(event: CustomEvent)",
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes += 1
        print_success(f"Corregidos errores en inline-calendar-modal.component.ts")
    
    return fixes

def fix_location_picker_component(filepath: Path) -> int:
    """Corrige errores en location-picker.component.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Fix 1: addressSearchTimeout debe ser number | undefined, no unknown
    content = re.sub(
        r"private addressSearchTimeout: unknown;",
        r"private addressSearchTimeout: ReturnType<typeof setTimeout> | undefined;",
        content
    )
    
    # Fix 2: error.message cuando error es unknown
    content = re.sub(
        r"error\.message",
        r"(error as Error).message",
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes += 1
        print_success(f"Corregidos errores en location-picker.component.ts")
    
    return fixes

def fix_paypal_button_component(filepath: Path) -> int:
    """Corrige errores en paypal-button.component.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Fix: data.orderID cuando data es unknown
    # Cambiar: onApprove: async (data: unknown, actions: unknown)
    # Por: onApprove: async (data: any, actions: any)
    content = re.sub(
        r"onApprove: async \(data: unknown, actions: unknown\)",
        r"onApprove: async (data: any, actions: any)",
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes += 1
        print_success(f"Corregidos errores en paypal-button.component.ts")
    
    return fixes

def fix_tabs_routes(filepath: Path) -> int:
    """Corrige error de módulo no encontrado en tabs.routes.ts"""
    if not filepath.exists():
        return 0
    
    project_root = Path(__file__).parent.parent
    cars_dir = project_root / "apps" / "web" / "src" / "app" / "features" / "cars"
    
    # Buscar archivos de publish disponibles
    publish_files = list(cars_dir.glob("**/publish*.page.ts"))
    
    if not publish_files:
        print_error("No se encontró ningún archivo publish*.page.ts")
        return 0
    
    # Usar el primer archivo encontrado
    publish_file = publish_files[0]
    # Obtener ruta relativa desde features/cars
    relative_path = publish_file.relative_to(cars_dir.parent)
    # Convertir a ruta de import (sin extensión)
    import_path = str(relative_path).replace('.ts', '').replace('\\', '/')
    # Obtener nombre del componente
    component_name = publish_file.stem.replace('.page', '').replace('-', '')
    # Capitalizar primera letra de cada palabra
    component_name = ''.join(word.capitalize() for word in component_name.split('-'))
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Reemplazar la importación
    content = re.sub(
        r"import\('\.\./features/cars/publish/publish-car-v2\.page'\)\.then\(\(m\) => m\.PublishCarV2Page\)",
        f"import('../{import_path}').then((m) => m.{component_name}Page)",
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print_success(f"Corregido import en tabs.routes.ts -> {import_path}")
        return 1
    
    return 0

def main():
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web" / "src" / "app"
    
    print_info("Corrigiendo errores de TypeScript...")
    
    total_fixes = 0
    
    # Archivos a corregir
    files_to_fix = [
        (web_dir / "shared" / "components" / "cars-map" / "cars-map.component.ts", fix_cars_map_component),
        (web_dir / "shared" / "components" / "deposit-modal" / "deposit-modal.component.ts", fix_deposit_modal_component),
        (web_dir / "shared" / "components" / "inline-calendar-modal" / "inline-calendar-modal.component.ts", fix_inline_calendar_modal_component),
        (web_dir / "shared" / "components" / "location-picker" / "location-picker.component.ts", fix_location_picker_component),
        (web_dir / "shared" / "components" / "paypal-button" / "paypal-button.component.ts", fix_paypal_button_component),
        (web_dir / "tabs" / "tabs.routes.ts", fix_tabs_routes),
    ]
    
    for filepath, fix_func in files_to_fix:
        try:
            fixes = fix_func(filepath)
            total_fixes += fixes
        except Exception as e:
            print_error(f"Error corrigiendo {filepath}: {e}")
    
    if total_fixes > 0:
        print_success(f"\nTotal: {total_fixes} archivo(s) corregido(s)")
    else:
        print_info("No se encontraron errores para corregir")

if __name__ == "__main__":
    main()

