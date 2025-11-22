#!/usr/bin/env python3
"""
Script para corregir errores de sintaxis específicos en bookings.service.ts y bookings.service.backup.ts
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

def fix_bookings_service_backup(filepath: Path) -> int:
    """Corrige errores en bookings.service.backup.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Corregir updateClassOnEvent - necesita from() y eventType, quitar bookingId
    # Primera ocurrencia (línea ~1212)
    content = re.sub(
        r"await firstValueFrom\(\s*this\.driverProfileService\.updateClassOnEvent\(\{\s*userId:\s*booking\.user_id,\s*bookingId:\s*bookingId,\s*claimWithFault:\s*false,\s*claimSeverity:\s*0,\s*\}\)\s*\);",
        r"await firstValueFrom(\n            from(this.driverProfileService.updateClassOnEvent({\n              eventType: 'booking_completed',\n              userId: booking.user_id,\n              claimWithFault: false,\n              claimSeverity: 0,\n            })).pipe(ignoreElements()),\n          );",
        content,
        flags=re.DOTALL
    )
    
    # Segunda ocurrencia (línea ~1276)
    content = re.sub(
        r"await firstValueFrom\(\s*this\.driverProfileService\.updateClassOnEvent\(\{\s*userId:\s*booking\.user_id,\s*bookingId:\s*bookingId,\s*claimWithFault:\s*true,\s*claimSeverity:\s*claimSeverity,\s*\}\)\s*\);",
        r"await firstValueFrom(\n            from(this.driverProfileService.updateClassOnEvent({\n              eventType: 'booking_completed',\n              userId: booking.user_id,\n              claimWithFault: true,\n              claimSeverity: claimSeverity,\n            })).pipe(ignoreElements()),\n          );",
        content,
        flags=re.DOTALL
    )
    
    # Agregar imports si no existen
    if "from 'rxjs'" in content and "ignoreElements" not in content:
        content = re.sub(
            r"(import.*from 'rxjs';)",
            r"\1\nimport { ignoreElements } from 'rxjs/operators';",
            content
        )
    
    if "from 'rxjs'" in content and "from" not in content.split("import")[1].split("from 'rxjs'")[0]:
        content = re.sub(
            r"(import\s+)(\{[^}]*\})(\s+from 'rxjs';)",
            lambda m: m.group(1) + "{" + (m.group(2)[1:-1] + ", from" if m.group(2) != "{}" else "from") + "}" + m.group(3),
            content
        )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        fixes += 1
    
    return fixes

def main():
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web" / "src" / "app"
    
    print_info("Corrigiendo errores de sintaxis en bookings.service.backup.ts...")
    
    filepath = web_dir / "core" / "services" / "bookings.service.backup.ts"
    fixes = fix_bookings_service_backup(filepath)
    
    if fixes > 0:
        print_success(f"Corregidos {fixes} errores")
    else:
        print_info("No se encontraron errores para corregir")

if __name__ == "__main__":
    main()






