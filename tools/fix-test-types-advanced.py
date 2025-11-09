#!/usr/bin/env python3
"""
Fix TypeScript Test Errors - Advanced
======================================
Script complementario para corregir errores avanzados de tipos en tests.

Este script maneja errores que requieren análisis más profundo:
- TS1117: Propiedades duplicadas en object literals ⭐ NEW
- TS2345: RPC mocks con PostgrestSingleResponse completo
- TS2367: Type comparison issues
- TS2445: Private/protected property access
- TS2322: Type assignment issues
- TS2353: Object literal con propiedades inválidas
- TS18046: Unknown types en catch blocks
- TS2531: Possibly null/undefined
- TS2678: Type assertions

Uso:
    python3 tools/fix-test-types-advanced.py

Este script complementa fix-test-types.py y debe ejecutarse después.
"""

import re
from pathlib import Path
from typing import List, Tuple

# Colores para output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
NC = '\033[0m'  # No Color

PROJECT_ROOT = Path(__file__).parent.parent


def print_info(msg: str):
    print(f"{BLUE}ℹ {msg}{NC}")


def print_success(msg: str):
    print(f"{GREEN}✅ {msg}{NC}")


def print_warning(msg: str):
    print(f"{YELLOW}⚠️  {msg}{NC}")


def fix_duplicate_properties():
    """Corrige errores TS1117: Propiedades duplicadas en object literals."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar objetos con propiedades duplicadas
        # Patrón: { ..., prop: value, ..., prop: value, ... }
        # Buscar específicamente en resolveTo con duplicados
        pattern = r'\.resolveTo\s*\(\s*\{([^}]+)\}\s*\)'
        
        def remove_duplicates(match):
            obj_content = match.group(1)
            # Dividir por comas y procesar propiedades
            props = []
            seen = set()
            
            # Extraer propiedades individuales
            prop_pattern = r'(\w+):\s*([^,}]+)'
            for prop_match in re.finditer(prop_pattern, obj_content):
                prop_name = prop_match.group(1)
                prop_value = prop_match.group(2).strip()
                
                # Solo agregar si no hemos visto esta propiedad antes
                if prop_name not in seen:
                    props.append(f'{prop_name}: {prop_value}')
                    seen.add(prop_name)
            
            # Reconstruir objeto sin duplicados
            return f".resolveTo({{ {', '.join(props)} }})"
        
        # Buscar y reemplazar objetos con duplicados
        if re.search(pattern, content):
            # Verificar si hay duplicados
            matches = list(re.finditer(pattern, content))
            for match in reversed(matches):
                obj_content = match.group(1)
                # Contar ocurrencias de cada propiedad
                prop_counts = {}
                for prop_match in re.finditer(r'(\w+):', obj_content):
                    prop_name = prop_match.group(1)
                    prop_counts[prop_name] = prop_counts.get(prop_name, 0) + 1
                
                # Si hay duplicados, limpiar
                if any(count > 1 for count in prop_counts.values()):
                    content = content[:match.start()] + remove_duplicates(match) + content[match.end():]

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido duplicate properties en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con duplicate properties")
    return fixed_count


def fix_rpc_postgrest_response():
    """Corrige errores TS2345: RPC mocks con PostgrestSingleResponse incompleto."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar .resolveTo({ data: ..., error: ... }) sin count, status, statusText
        # Patrón: .resolveTo({ data: X, error: Y }) - pero NO si ya tiene count/status
        pattern = r'\.resolveTo\s*\(\s*\{\s*data:\s*([^,}]+),\s*error:\s*([^}]+)\s*\}\s*\)'
        
        def replace_with_full_response(match):
            # Verificar si ya tiene count, status o statusText (evitar duplicados)
            match_text = match.group(0)
            
            # Si ya tiene count, status o statusText, no modificar
            if 'count:' in match_text or 'status:' in match_text or 'statusText:' in match_text:
                return match_text
            
            data = match.group(1).strip()
            error = match.group(2).strip()
            
            # Si error es null, crear respuesta completa de éxito
            if error == 'null':
                return f".resolveTo({{ data: {data}, error: null, count: null, status: 200, statusText: 'OK' }})"
            else:
                # Si hay error, crear respuesta de error completa
                return f".resolveTo({{ data: null, error: {error}, count: null, status: 400, statusText: 'Bad Request' }})"
        
        if re.search(pattern, content):
            content = re.sub(pattern, replace_with_full_response, content)

        # Buscar .returnValue(Promise.resolve({ data: ..., error: ... }))
        # que aún no fueron convertidos
        pattern2 = r'\.returnValue\s*\(\s*Promise\.resolve\s*\(\s*\{\s*data:\s*([^,}]+),\s*error:\s*([^}]+)\s*\}\s*\)\s*\)'
        
        def replace_promise_resolve(match):
            data = match.group(1).strip()
            error = match.group(2).strip()
            
            if error == 'null':
                return f".resolveTo({{ data: {data}, error: null, count: null, status: 200, statusText: 'OK' }})"
            else:
                return f".resolveTo({{ data: null, error: {error}, count: null, status: 400, statusText: 'Bad Request' }})"
        
        if re.search(pattern2, content):
            content = re.sub(pattern2, replace_promise_resolve, content)

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido PostgrestResponse en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con PostgrestResponse")
    return fixed_count


def fix_type_comparison_errors():
    """Corrige errores TS2367: Type comparison issues."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar comparaciones problemáticas como: x === y donde tipos no coinciden
        # Patrón común: Comparar string con number o viceversa
        # Por ahora, solo detectamos y reportamos (requiere análisis manual)
        
        # Buscar patrones comunes de comparación problemática
        patterns = [
            # Comparar string literal con variable number
            (r"(\w+)\s*===\s*['\"](\d+)['\"]", r"\1 === \2"),  # "123" → 123
            (r"(\w+)\s*!==\s*['\"](\d+)['\"]", r"\1 !== \2"),
            # Comparar number con string
            (r"(\d+)\s*===\s*(\w+)", r"'\1' === \2"),  # 123 === var → '123' === var
        ]

        for pattern, replacement in patterns:
            if re.search(pattern, content):
                # Solo aplicar si el contexto sugiere que es un error de tipo
                # Por ahora, solo reportamos
                pass

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido type comparison en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con type comparison")
    return fixed_count


def fix_private_property_access():
    """Corrige errores TS2445: Private/protected property access."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar acceso a propiedades privadas/protected en tests
        # Patrón: service._privateProperty o service.supabaseUrl (protected)
        # Solución: Usar (service as any)._privateProperty
        
        # Propiedades conocidas que son protected/private
        protected_props = ['supabaseUrl', 'supabaseKey']
        
        for prop in protected_props:
            # Buscar patrones como: service.supabaseUrl
            pattern = rf'(\w+)\.{re.escape(prop)}\b'
            matches = list(re.finditer(pattern, content))
            
            for match in reversed(matches):
                var_name = match.group(1)
                # Verificar contexto - solo en tests
                start_pos = max(0, match.start() - 100)
                context = content[start_pos:match.start()]
                
                # Si es en un test, usar type assertion
                if 'describe(' in context or 'it(' in context or 'test(' in context or '.spec.ts' in str(test_file):
                    # Cambiar service.prop a (service as any).prop
                    replacement = f'({var_name} as any).{prop}'
                    content = content[:match.start()] + replacement + content[match.end():]

        # También buscar propiedades que empiezan con _
        pattern2 = r'(\w+)\.(_\w+)\b'
        matches = list(re.finditer(pattern2, content))
        
        for match in reversed(matches):
            var_name = match.group(1)
            private_prop = match.group(2)
            
            # Verificar contexto
            start_pos = max(0, match.start() - 50)
            context = content[start_pos:match.start()]
            
            if 'describe(' in context or 'it(' in context or 'test(' in context:
                replacement = f'({var_name} as any){private_prop}'
                content = content[:match.start()] + replacement + content[match.end():]

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido private/protected property access en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con private/protected property access")
    return fixed_count


def fix_type_assignment_errors():
    """Corrige errores TS2322: Type assignment issues."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar errores de asignación de tipo
        # Ejemplo: getResourceId: (_args: unknown[], result: unknown) => ...
        # Debe ser: getResourceId: (args: unknown[]) => ...
        
        # Buscar funciones con parámetros extra
        pattern = r'(\w+):\s*\(_args:\s*unknown\[\],\s*result:\s*unknown\)\s*=>'
        if re.search(pattern, content):
            # Remover el parámetro 'result' si no se usa
            content = re.sub(
                r'(\w+):\s*\(_args:\s*unknown\[\],\s*result:\s*unknown\)\s*=>',
                r'\1: (args: unknown[]) =>',
                content
            )

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido type assignment en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con type assignment")
    return fixed_count


def fix_object_literal_invalid_properties():
    """Corrige errores TS2353: Object literal con propiedades que no existen en tipos."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    # Propiedades conocidas que no existen en tipos
    invalid_properties = {
        'total_bookings': None,  # No existe en DriverProfile
        'current_class': None,   # No existe en ClassBenefits
    }

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar y remover propiedades inválidas en object literals
        for prop, replacement in invalid_properties.items():
            # Buscar patrones como: { ..., prop: value, ... }
            pattern = rf',\s*{re.escape(prop)}:\s*[^,}}]+'
            if re.search(pattern, content):
                # Remover la propiedad
                content = re.sub(pattern, '', content)
            
            # También buscar al inicio del objeto
            pattern2 = rf'\{{\s*{re.escape(prop)}:\s*([^,}}]+),'
            if re.search(pattern2, content):
                content = re.sub(pattern2, r'{', content)

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido invalid properties en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con invalid properties")
    return fixed_count


def fix_unknown_types_in_catch():
    """Corrige errores TS18046: Unknown types en catch blocks."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar catch (error) sin tipo
        pattern = r'catch\s*\(\s*(\w+)\s*\)'
        matches = list(re.finditer(pattern, content))
        
        for match in reversed(matches):
            error_var = match.group(1)
            # Verificar si ya tiene tipo
            if f'catch ({error_var}:' not in content:
                # Cambiar catch (error) a catch (error: unknown)
                replacement = f'catch ({error_var}: unknown)'
                content = content[:match.start()] + replacement + content[match.end():]

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido unknown types en catch en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con unknown types en catch")
    return fixed_count


def fix_possibly_null_undefined():
    """Corrige errores TS2531: Possibly null/undefined."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0

    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content

        # Buscar acceso a propiedades que pueden ser null/undefined
        # Patrón: variable.property donde variable puede ser null
        # Solución: variable?.property o variable!.property
        
        # Por ahora, solo detectamos (requiere análisis de contexto)
        # Buscar patrones comunes como: result.data donde result puede ser null
        pattern = r'(\w+)\.(\w+)\b'
        # Este es complejo y requiere análisis de tipos, así que lo dejamos para análisis manual

        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
            print_success(f"Corregido possibly null en: {test_file.relative_to(PROJECT_ROOT)}")

    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con possibly null")
    return fixed_count


def main():
    """Función principal."""
    print(f"{BLUE}╔══════════════════════════════════════════════════════════╗{NC}")
    print(f"{BLUE}║{NC}  🔧 Fix TypeScript Test Errors - Advanced")
    print(f"{BLUE}╚══════════════════════════════════════════════════════════╝{NC}\n")
    print(f"{YELLOW}⚠️  Este script complementa fix-test-types.py{NC}")
    print(f"{YELLOW}⚠️  Ejecuta primero: python3 tools/fix-test-types.py{NC}\n")

    changes_made = False

    # Paso 0: Corregir propiedades duplicadas primero (TS1117)
    print(f"{BLUE}📋 Paso 0: Corregir propiedades duplicadas (TS1117){NC}")
    if fix_duplicate_properties() > 0:
        changes_made = True
    print()

    # Paso 1: Corregir PostgrestResponse completo
    print(f"{BLUE}📋 Paso 1: Corregir PostgrestResponse completo (TS2345){NC}")
    if fix_rpc_postgrest_response() > 0:
        changes_made = True
    print()

    # Paso 2: Corregir type assignment (TS2322)
    print(f"{BLUE}📋 Paso 2: Corregir type assignment (TS2322){NC}")
    if fix_type_assignment_errors() > 0:
        changes_made = True
    print()

    # Paso 3: Corregir private property access (TS2445)
    print(f"{BLUE}📋 Paso 3: Corregir private property access (TS2445){NC}")
    if fix_private_property_access() > 0:
        changes_made = True
    print()

    # Paso 4: Corregir invalid properties (TS2353)
    print(f"{BLUE}📋 Paso 4: Corregir invalid properties (TS2353){NC}")
    if fix_object_literal_invalid_properties() > 0:
        changes_made = True
    print()

    # Paso 5: Corregir unknown types en catch (TS18046)
    print(f"{BLUE}📋 Paso 5: Corregir unknown types en catch (TS18046){NC}")
    if fix_unknown_types_in_catch() > 0:
        changes_made = True
    print()

    # Paso 6: Type comparison (TS2367) - requiere análisis manual
    print(f"{BLUE}📋 Paso 6: Type comparison (TS2367){NC}")
    print_info("TS2367 requiere análisis manual de contexto")
    print()

    # Paso 7: Possibly null (TS2531) - requiere análisis manual
    print(f"{BLUE}📋 Paso 7: Possibly null/undefined (TS2531){NC}")
    print_info("TS2531 requiere análisis manual de contexto")
    print()

    if changes_made:
        print_success("Cambios completados. Ejecuta 'npm run test:quick' para verificar.")
        print_warning("Algunos errores pueden requerir corrección manual.")
    else:
        print_info("No se encontraron cambios necesarios.")

    return 0 if changes_made else 1


if __name__ == '__main__':
    exit(main())

