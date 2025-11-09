#!/usr/bin/env python3
"""
Fix TypeScript Test Errors
==========================
Script para corregir automáticamente errores de tipos en tests de TypeScript.

Errores que corrige:
1. Tipos faltantes en database.types.ts (UserRole, CarStatus, etc.)
2. Imports incorrectos de tipos
3. Errores de tipos en tests (TS2345, TS2305, etc.)
"""

import re
import os
from pathlib import Path
from typing import Dict, List, Tuple
import subprocess

# Colores para output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

# Tipos que necesitamos agregar a database.types.ts
MISSING_TYPES = {
    'UserRole': "export type UserRole = 'locador' | 'locatario' | 'ambos' | 'admin';",
    'CarStatus': "export type CarStatus = 'draft' | 'pending' | 'active' | 'suspended' | 'deleted';",
    'FuelType': "export type FuelType = 'nafta' | 'gasoil' | 'hibrido' | 'electrico';",
    'Transmission': "export type Transmission = 'manual' | 'automatic';",
    'CancelPolicy': "export type CancelPolicy = 'flex' | 'moderate' | 'strict';",
    'BookingStatus': """export type BookingStatus =
  | 'pending'
  | 'pending_payment'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'expired';""",
    'PaymentStatus': """export type PaymentStatus =
  | 'requires_payment'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'refunded'
  | 'partial_refund'
  | 'chargeback'
  | 'approved'
  | 'cancelled'
  | 'pending'
  | 'rejected';""",
    'PaymentProvider': "export type PaymentProvider = 'mercadopago' | 'stripe' | 'mock' | 'otro';",
}

# Mapeo de nombres snake_case a PascalCase (para compatibilidad)
SNAKE_TO_PASCAL = {
    'booking_status': 'BookingStatus',
    'car_status': 'CarStatus',
    'payment_status': 'PaymentStatus',
    'payment_provider': 'PaymentProvider',
    'fuel_type': 'FuelType',
    'user_role': 'UserRole',
}

PROJECT_ROOT = Path(__file__).parent.parent
DATABASE_TYPES_FILE = PROJECT_ROOT / 'apps/web/src/app/core/types/database.types.ts'
SUPABASE_TYPES_FILE = PROJECT_ROOT / 'apps/web/src/types/supabase.types.ts'


def print_info(msg: str):
    print(f"{BLUE}ℹ {msg}{NC}")


def print_success(msg: str):
    print(f"{GREEN}✅ {msg}{NC}")


def print_error(msg: str):
    print(f"{RED}❌ {msg}{NC}")


def print_warning(msg: str):
    print(f"{YELLOW}⚠️  {msg}{NC}")


def check_type_exists_in_file(file_path: Path, type_name: str) -> bool:
    """Verifica si un tipo existe en un archivo."""
    if not file_path.exists():
        return False
    content = file_path.read_text(encoding='utf-8')
    # Buscar export type o export interface
    pattern = rf'export\s+(type|interface)\s+{type_name}\b'
    return bool(re.search(pattern, content))


def add_missing_types_to_database_types():
    """Agrega tipos faltantes a database.types.ts."""
    if not DATABASE_TYPES_FILE.exists():
        print_error(f"Archivo no encontrado: {DATABASE_TYPES_FILE}")
        return False

    content = DATABASE_TYPES_FILE.read_text(encoding='utf-8')
    added_types = []

    # Buscar el final del archivo o una sección apropiada
    # Agregar después de los imports o al final
    
    # Verificar qué tipos faltan
    missing = []
    for type_name, type_def in MISSING_TYPES.items():
        if not check_type_exists_in_file(DATABASE_TYPES_FILE, type_name):
            missing.append((type_name, type_def))
            print_info(f"Tipo faltante detectado: {type_name}")

    if not missing:
        print_success("Todos los tipos ya existen en database.types.ts")
        return True

    # Buscar un lugar apropiado para agregar los tipos
    # Intentar encontrar una sección de tipos custom o agregar al final
    if '// CUSTOM TYPES' in content or '// Custom types' in content:
        # Agregar después de la sección de custom types
        pattern = r'(//\s*(CUSTOM|Custom)\s*TYPES[^\n]*\n)'
        match = re.search(pattern, content, re.IGNORECASE)
        if match:
            insert_pos = match.end()
            types_section = '\n\n// ============================================================================\n'
            types_section += '// MISSING TYPE EXPORTS (added by fix-test-types.py)\n'
            types_section += '// ============================================================================\n\n'
            for type_name, type_def in missing:
                types_section += f'{type_def}\n\n'
            content = content[:insert_pos] + types_section + content[insert_pos:]
        else:
            # Agregar al final del archivo
            types_section = '\n\n// ============================================================================\n'
            types_section += '// MISSING TYPE EXPORTS (added by fix-test-types.py)\n'
            types_section += '// ============================================================================\n\n'
            for type_name, type_def in missing:
                types_section += f'{type_def}\n\n'
            content = content.rstrip() + '\n\n' + types_section
    else:
        # Agregar al final del archivo
        types_section = '\n\n// ============================================================================\n'
        types_section += '// MISSING TYPE EXPORTS (added by fix-test-types.py)\n'
        types_section += '// ============================================================================\n\n'
        for type_name, type_def in missing:
            types_section += f'{type_def}\n\n'
        content = content.rstrip() + '\n\n' + types_section

    # Escribir el archivo actualizado
    DATABASE_TYPES_FILE.write_text(content, encoding='utf-8')
    print_success(f"Agregados {len(missing)} tipos a {DATABASE_TYPES_FILE.name}")
    for type_name, _ in missing:
        print(f"  - {type_name}")
    return True


def fix_imports_in_tests():
    """Corrige imports incorrectos en archivos de test."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar imports de database.types que referencian tipos faltantes
        for type_name in MISSING_TYPES.keys():
            # Verificar si el archivo usa el tipo pero no lo importa correctamente
            if re.search(rf'\b{type_name}\b', content):
                # Verificar si hay un import de database.types
                import_pattern = rf"import\s+(?:type\s+)?\{{[^}}]*{type_name}[^}}]*\}}\s+from\s+['\"].*database\.types['\"]"
                if not re.search(import_pattern, content):
                    # Agregar el tipo al import existente o crear uno nuevo
                    existing_import = re.search(
                        r"import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['\"]([^'\"]*database\.types[^'\"]*)['\"]",
                        content
                    )
                    if existing_import:
                        # Agregar al import existente
                        imports = existing_import.group(1)
                        if type_name not in imports:
                            new_imports = imports.rstrip() + f', {type_name}'
                            content = content.replace(
                                existing_import.group(0),
                                f"import type {{{new_imports}}} from {existing_import.group(2)!r}"
                            )
                    else:
                        # Crear nuevo import
                        import_line = f"import type {{{type_name}}} from '../types/database.types';\n"
                        # Insertar después de otros imports
                        import_section = re.search(r'(^import\s+.*?;\n)+', content, re.MULTILINE)
                        if import_section:
                            insert_pos = import_section.end()
                            content = content[:insert_pos] + import_line + content[insert_pos:]
                        else:
                            content = import_line + content

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos imports en {fixed_count} archivos de test")
    else:
        print_info("No se encontraron imports para corregir")
    return fixed_count


def fix_snake_case_to_pascal_case():
    """Corrige referencias de snake_case a PascalCase en tests."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Reemplazar referencias de tipos snake_case por PascalCase
        for snake_name, pascal_name in SNAKE_TO_PASCAL.items():
            # Buscar imports o usos de snake_case
            pattern = rf'\b{snake_name}\b'
            if re.search(pattern, content):
                # Reemplazar en imports
                content = re.sub(
                    rf"import\s+(?:type\s+)?\{{([^}}]*){snake_name}([^}}]*)\}}\s+from\s+['\"]([^'\"]*)['\"]",
                    rf"import type {{\1{pascal_name}\2}} from '\3'",
                    content
                )
                # Reemplazar usos del tipo
                content = re.sub(rf'\b{snake_name}\b', pascal_name, content)

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido snake_case en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con snake_case")
    return fixed_count


def fix_rpc_mock_errors():
    """Corrige errores TS2345: Promise pasado a rpc() en lugar de usar callFake/resolveTo."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Patrón 1: .rpc.and.returnValue(Promise.resolve(...))
        # Cambiar a .rpc.and.resolveTo(...)
        pattern1 = r'\.rpc\.and\.returnValue\s*\(\s*Promise\.resolve\s*\(([^)]+)\)\s*\)'
        matches = list(re.finditer(pattern1, content))
        for match in reversed(matches):  # Reversed para no afectar índices
            promise_content = match.group(1)
            replacement = f'.rpc.and.resolveTo({promise_content})'
            content = content[:match.start()] + replacement + content[match.end():]

        # Patrón 2: .rpc.and.returnValue(Promise.reject(...))
        # Cambiar a .rpc.and.rejectWith(...)
        pattern2 = r'\.rpc\.and\.returnValue\s*\(\s*Promise\.reject\s*\(([^)]+)\)\s*\)'
        matches = list(re.finditer(pattern2, content))
        for match in reversed(matches):
            reject_content = match.group(1)
            replacement = f'.rpc.and.rejectWith({reject_content})'
            content = content[:match.start()] + replacement + content[match.end():]

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido RPC mock en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con errores de RPC mock")
    return fixed_count


def fix_missing_booking_type():
    """Corrige errores TS2304: 'Booking' no encontrado."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar usos de 'Booking' sin import
        if re.search(r'\bBooking\b', content) and not re.search(r'import.*Booking.*from', content):
            # Verificar si hay imports de database.types
            db_import = re.search(
                r"import\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['\"]([^'\"]*database\.types[^'\"]*)['\"]",
                content
            )
            if db_import:
                # Agregar Booking al import existente
                imports = db_import.group(1)
                if 'Booking' not in imports:
                    new_imports = imports.rstrip() + ', Booking'
                    content = content.replace(
                        db_import.group(0),
                        f"import type {{{new_imports}}} from {db_import.group(2)!r}"
                    )
            else:
                # Crear nuevo import
                import_line = "import type { Booking } from '../types/database.types';\n"
                import_section = re.search(r'(^import\s+.*?;\n)+', content, re.MULTILINE)
                if import_section:
                    insert_pos = import_section.end()
                    content = content[:insert_pos] + import_line + content[insert_pos:]
                else:
                    content = import_line + content

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido Booking type en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con Booking type faltante")
    return fixed_count


def main():
    """Función principal."""
    print(f"{BLUE}╔══════════════════════════════════════════════════════════╗{NC}")
    print(f"{BLUE}║{NC}  🔧 Fix TypeScript Test Errors")
    print(f"{BLUE}╚══════════════════════════════════════════════════════════╝{NC}\n")

    changes_made = False

    # Paso 1: Agregar tipos faltantes
    print(f"{BLUE}📋 Paso 1: Agregar tipos faltantes a database.types.ts{NC}")
    if add_missing_types_to_database_types():
        changes_made = True
    print()

    # Paso 2: Corregir imports
    print(f"{BLUE}📋 Paso 2: Corregir imports en archivos de test{NC}")
    if fix_imports_in_tests() > 0:
        changes_made = True
    print()

    # Paso 3: Corregir snake_case a PascalCase
    print(f"{BLUE}📋 Paso 3: Corregir snake_case a PascalCase{NC}")
    if fix_snake_case_to_pascal_case() > 0:
        changes_made = True
    print()

    # Paso 4: Corregir errores de RPC mocks (TS2345)
    print(f"{BLUE}📋 Paso 4: Corregir errores de RPC mocks (TS2345){NC}")
    if fix_rpc_mock_errors() > 0:
        changes_made = True
    print()

    # Paso 5: Corregir Booking type faltante (TS2304)
    print(f"{BLUE}📋 Paso 5: Corregir Booking type faltante (TS2304){NC}")
    if fix_missing_booking_type() > 0:
        changes_made = True
    print()

    if changes_made:
        print_success("Cambios completados. Ejecuta 'npm run test:quick' para verificar.")
    else:
        print_info("No se encontraron cambios necesarios.")

    return 0 if changes_made else 1


if __name__ == '__main__':
    exit(main())

