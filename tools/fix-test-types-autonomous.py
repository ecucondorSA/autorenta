#!/usr/bin/env python3
"""
Fix TypeScript Test Errors - Autonomous Mode
============================================
Script autónomo que itera hasta llegar a 0 errores de TypeScript.

Este script:
1. Ejecuta fix-test-types.py (básico)
2. Ejecuta fix-test-types-advanced.py (avanzado)
3. Analiza errores restantes
4. Intenta corregir más errores automáticamente
5. Itera hasta 0 errores o hasta que no pueda hacer más progreso

Uso:
    python3 tools/fix-test-types-autonomous.py
    # O con límite de iteraciones:
    python3 tools/fix-test-types-autonomous.py --max-iterations 10

Diseñado para ejecución autónoma por Cursor Agent.
"""

import re
import subprocess
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime

# Colores para output
GREEN = '\033[0;32m'
RED = '\033[0;31m'
YELLOW = '\033[1;33m'
BLUE = '\033[0;34m'
CYAN = '\033[0;36m'
NC = '\033[0m'  # No Color

PROJECT_ROOT = Path(__file__).parent.parent
BASIC_SCRIPT = PROJECT_ROOT / 'tools/fix-test-types.py'
ADVANCED_SCRIPT = PROJECT_ROOT / 'tools/fix-test-types-advanced.py'


def print_header(msg: str):
    print(f"\n{BLUE}╔══════════════════════════════════════════════════════════╗{NC}")
    print(f"{BLUE}║{NC}  {msg}")
    print(f"{BLUE}╚══════════════════════════════════════════════════════════╝{NC}\n")


def print_info(msg: str):
    print(f"{BLUE}ℹ {msg}{NC}")


def print_success(msg: str):
    print(f"{GREEN}✅ {msg}{NC}")


def print_error(msg: str):
    print(f"{RED}❌ {msg}{NC}")


def print_warning(msg: str):
    print(f"{YELLOW}⚠️  {msg}{NC}")


def print_progress(msg: str):
    print(f"{CYAN}🔄 {msg}{NC}")


def run_command(cmd: List[str], capture_output: bool = True) -> Tuple[int, str, str]:
    """Ejecuta un comando y retorna (exit_code, stdout, stderr)."""
    try:
        result = subprocess.run(
            cmd,
            cwd=PROJECT_ROOT,
            capture_output=capture_output,
            text=True,
            timeout=300  # 5 minutos máximo
        )
        return result.returncode, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "Command timed out"
    except Exception as e:
        return -1, "", str(e)


def get_typescript_errors() -> Dict[str, int]:
    """Obtiene el conteo de errores TypeScript por tipo."""
    print_progress("Ejecutando tests para obtener errores...")
    
    exit_code, stdout, stderr = run_command(['npm', 'run', 'test:quick'])
    output = stdout + stderr
    
    # Extraer errores TS
    error_pattern = r'TS(\d+)'
    errors = {}
    
    for match in re.finditer(error_pattern, output):
        error_code = f'TS{match.group(1)}'
        errors[error_code] = errors.get(error_code, 0) + 1
    
    return errors


def get_total_errors() -> int:
    """Obtiene el total de errores TypeScript."""
    errors = get_typescript_errors()
    return sum(errors.values())


def run_basic_fixes() -> bool:
    """Ejecuta el script básico de fixes."""
    print_progress("Ejecutando fixes básicos...")
    
    if not BASIC_SCRIPT.exists():
        print_error(f"Script no encontrado: {BASIC_SCRIPT}")
        return False
    
    exit_code, stdout, stderr = run_command(['python3', str(BASIC_SCRIPT)])
    
    if exit_code == 0:
        print_success("Fixes básicos completados")
        return True
    else:
        print_warning(f"Fixes básicos terminaron con código {exit_code}")
        return False


def run_advanced_fixes() -> bool:
    """Ejecuta el script avanzado de fixes."""
    print_progress("Ejecutando fixes avanzados...")
    
    if not ADVANCED_SCRIPT.exists():
        print_error(f"Script no encontrado: {ADVANCED_SCRIPT}")
        return False
    
    exit_code, stdout, stderr = run_command(['python3', str(ADVANCED_SCRIPT)])
    
    if exit_code == 0:
        print_success("Fixes avanzados completados")
        return True
    else:
        print_warning(f"Fixes avanzados terminaron con código {exit_code}")
        return False


def fix_common_ts2339_errors():
    """Intenta corregir errores TS2339 comunes automáticamente."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0
    
    # Patrones comunes de TS2339 que podemos corregir
    fixes = []
    
    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content
        
        # Fix 1: Property 'subscribe' does not exist on type 'X'
        # Cambiar a: from(X).subscribe() o of(X).subscribe()
        pattern1 = r'(\w+)\.subscribe\s*\('
        matches = list(re.finditer(pattern1, content))
        
        for match in reversed(matches):
            var_name = match.group(1)
            start_pos = max(0, match.start() - 150)
            context = content[start_pos:match.start()]
            
            # Si es Promise o objeto no Observable
            if 'Promise' in context or 'ActiveBonusProtector' in context:
                # Verificar si ya hay import de rxjs
                if 'from rxjs' not in content and 'from \'rxjs\'' not in content:
                    import_line = "import { from, of } from 'rxjs';\n"
                    import_section = re.search(r'(^import\s+.*?;\n)+', content, re.MULTILINE)
                    if import_section:
                        insert_pos = import_section.end()
                        content = content[:insert_pos] + import_line + content[insert_pos:]
                    else:
                        content = import_line + content
                
                # Cambiar a from() o of()
                if 'Promise' in context:
                    replacement = f'from({var_name}).subscribe'
                else:
                    replacement = f'of({var_name}).subscribe'
                
                content = content[:match.start()] + replacement + content[match.end():]
                fixes.append(f"Fixed subscribe on {var_name} in {test_file.name}")
        
        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
    
    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con TS2339 comunes")
        for fix in fixes[:5]:  # Mostrar primeros 5
            print_info(f"  - {fix}")
        if len(fixes) > 5:
            print_info(f"  ... y {len(fixes) - 5} más")
    
    return fixed_count


def fix_common_ts2307_errors():
    """Intenta corregir errores TS2307 (module not found) comunes."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0
    
    # Mapeo de imports incorrectos comunes
    import_fixes = {
        'supabase.service': 'supabase-client.service',
        'supabaseService': 'SupabaseClientService',
    }
    
    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content
        
        for wrong_import, correct_import in import_fixes.items():
            # Buscar imports incorrectos
            pattern = rf"from\s+['\"]([^'\"]*{re.escape(wrong_import)}[^'\"]*)['\"]"
            if re.search(pattern, content):
                # Reemplazar
                content = re.sub(
                    pattern,
                    lambda m: m.group(0).replace(wrong_import, correct_import),
                    content
                )
        
        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
    
    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con TS2307")
    
    return fixed_count


def fix_common_ts2554_errors():
    """Intenta corregir errores TS2554 (wrong number of arguments) comunes."""
    test_files = list(PROJECT_ROOT.glob('apps/web/src/**/*.spec.ts'))
    fixed_count = 0
    
    for test_file in test_files:
        content = test_file.read_text(encoding='utf-8')
        original_content = content
        
        # Fix: toastService.success('msg') → toastService.success('Title', 'msg')
        pattern = r"toastService\.(success|error|warning|info)\s*\(\s*['\"]([^'\"]+)['\"]\s*\)"
        
        def add_title(match):
            method = match.group(1)
            message = match.group(2)
            # Generar título basado en el método
            titles = {
                'success': 'Éxito',
                'error': 'Error',
                'warning': 'Advertencia',
                'info': 'Información'
            }
            title = titles.get(method, 'Notificación')
            return f"toastService.{method}('{title}', '{message}')"
        
        if re.search(pattern, content):
            content = re.sub(pattern, add_title, content)
        
        if content != original_content:
            test_file.write_text(content, encoding='utf-8')
            fixed_count += 1
    
    if fixed_count > 0:
        print_success(f"Corregidos {fixed_count} archivos con TS2554")
    
    return fixed_count


def analyze_remaining_errors() -> Dict[str, any]:
    """Analiza errores restantes y sugiere acciones."""
    errors = get_typescript_errors()
    total = sum(errors.values())
    
    analysis = {
        'total': total,
        'by_type': errors,
        'top_errors': sorted(errors.items(), key=lambda x: x[1], reverse=True)[:10],
        'suggestions': []
    }
    
    # Sugerencias basadas en tipos de errores
    if 'TS2339' in errors and errors['TS2339'] > 50:
        analysis['suggestions'].append({
            'type': 'TS2339',
            'count': errors['TS2339'],
            'action': 'sync:types',
            'description': 'Sincronizar tipos de Supabase puede resolver muchos errores TS2339'
        })
    
    if 'TS2307' in errors and errors['TS2307'] > 10:
        analysis['suggestions'].append({
            'type': 'TS2307',
            'count': errors['TS2307'],
            'action': 'check_imports',
            'description': 'Verificar imports incorrectos'
        })
    
    return analysis


def autonomous_fix_iteration(iteration: int, max_iterations: int) -> Tuple[bool, int]:
    """
    Ejecuta una iteración de fixing autónomo.
    Retorna (made_progress, current_error_count)
    """
    print_header(f"Iteración {iteration}/{max_iterations}")
    
    # Obtener errores iniciales
    initial_errors = get_total_errors()
    print_info(f"Errores iniciales: {initial_errors}")
    
    if initial_errors == 0:
        print_success("¡Ya hay 0 errores! 🎉")
        return False, 0
    
    # Paso 1: Fixes básicos
    if iteration == 1 or iteration % 3 == 1:  # Ejecutar cada 3 iteraciones
        run_basic_fixes()
    
    # Paso 2: Fixes avanzados
    if iteration == 1 or iteration % 3 == 2:
        run_advanced_fixes()
    
    # Paso 3: Fixes adicionales automáticos
    print_progress("Aplicando fixes adicionales automáticos...")
    fixes_applied = 0
    
    fixes_applied += fix_common_ts2339_errors()
    fixes_applied += fix_common_ts2307_errors()
    fixes_applied += fix_common_ts2554_errors()
    
    if fixes_applied > 0:
        print_success(f"Aplicados {fixes_applied} fixes adicionales")
    
    # Obtener errores finales
    final_errors = get_total_errors()
    print_info(f"Errores finales: {final_errors}")
    
    # Calcular progreso
    progress = initial_errors - final_errors
    if progress > 0:
        print_success(f"Progreso: -{progress} errores ({initial_errors} → {final_errors})")
        return True, final_errors
    else:
        print_warning("No se hizo progreso en esta iteración")
        return False, final_errors


def main():
    """Función principal."""
    parser = argparse.ArgumentParser(
        description='Fix TypeScript errors autonomously until 0 errors'
    )
    parser.add_argument(
        '--max-iterations',
        type=int,
        default=10,
        help='Maximum number of iterations (default: 10)'
    )
    parser.add_argument(
        '--target-errors',
        type=int,
        default=0,
        help='Target number of errors (default: 0)'
    )
    parser.add_argument(
        '--min-progress',
        type=int,
        default=5,
        help='Minimum progress per iteration to continue (default: 5)'
    )
    
    args = parser.parse_args()
    
    print_header("🔧 Fix TypeScript Errors - Autonomous Mode")
    print_info(f"Modo autónomo: Trabajando hasta {args.target_errors} errores")
    print_info(f"Máximo de iteraciones: {args.max_iterations}")
    print_info(f"Progreso mínimo por iteración: {args.min_progress} errores\n")
    
    # Obtener errores iniciales
    initial_errors = get_total_errors()
    print_info(f"Errores iniciales: {initial_errors}")
    
    if initial_errors == 0:
        print_success("¡Ya hay 0 errores! No hay nada que hacer. 🎉")
        return 0
    
    # Análisis inicial
    print_progress("Analizando errores iniciales...")
    analysis = analyze_remaining_errors()
    
    print(f"\n{CYAN}📊 Análisis de errores:{NC}")
    print(f"  Total: {analysis['total']} errores")
    print(f"  Top 5 tipos de errores:")
    for error_type, count in analysis['top_errors'][:5]:
        print(f"    {error_type}: {count} errores")
    
    if analysis['suggestions']:
        print(f"\n{YELLOW}💡 Sugerencias:{NC}")
        for suggestion in analysis['suggestions']:
            print(f"  - {suggestion['description']} ({suggestion['count']} errores {suggestion['type']})")
    
    # Iteraciones autónomas
    iteration = 1
    current_errors = initial_errors
    last_errors = initial_errors
    no_progress_count = 0
    
    while iteration <= args.max_iterations:
        print(f"\n{BLUE}{'='*60}{NC}")
        print(f"{BLUE}Iteración {iteration}/{args.max_iterations}{NC}")
        print(f"{BLUE}{'='*60}{NC}\n")
        
        made_progress, current_errors = autonomous_fix_iteration(iteration, args.max_iterations)
        
        # Verificar si alcanzamos el objetivo
        if current_errors <= args.target_errors:
            print_success(f"\n🎉 ¡Objetivo alcanzado! Errores: {current_errors} (objetivo: {args.target_errors})")
            break
        
        # Verificar progreso
        progress = last_errors - current_errors
        
        if progress < args.min_progress:
            no_progress_count += 1
            print_warning(f"Progreso insuficiente ({progress} < {args.min_progress}). Sin progreso: {no_progress_count}/3")
            
            if no_progress_count >= 3:
                print_warning("\n⚠️  No se ha hecho progreso suficiente en 3 iteraciones consecutivas.")
                print_warning("Deteniendo ejecución autónoma.")
                print_info("Los errores restantes pueden requerir corrección manual.")
                break
        else:
            no_progress_count = 0
        
        last_errors = current_errors
        iteration += 1
    
    # Resumen final
    print_header("📊 Resumen Final")
    
    final_errors = get_total_errors()
    total_fixed = initial_errors - final_errors
    reduction_pct = (total_fixed / initial_errors * 100) if initial_errors > 0 else 0
    
    print(f"{CYAN}Errores iniciales:{NC} {initial_errors}")
    print(f"{CYAN}Errores finales:{NC} {final_errors}")
    print(f"{CYAN}Errores corregidos:{NC} {total_fixed}")
    print(f"{CYAN}Reducción:{NC} {reduction_pct:.1f}%")
    print(f"{CYAN}Iteraciones ejecutadas:{NC} {iteration - 1}")
    
    if final_errors == 0:
        print_success("\n🎉 ¡Éxito! Se alcanzaron 0 errores de TypeScript!")
        return 0
    elif final_errors < initial_errors:
        print_success(f"\n✅ Progreso realizado: {total_fixed} errores corregidos")
        print_warning(f"⚠️  Quedan {final_errors} errores que pueden requerir corrección manual")
        
        # Mostrar análisis de errores restantes
        final_analysis = analyze_remaining_errors()
        if final_analysis['top_errors']:
            print(f"\n{CYAN}Errores restantes más comunes:{NC}")
            for error_type, count in final_analysis['top_errors'][:5]:
                print(f"  {error_type}: {count} errores")
        
        return 1
    else:
        print_error("\n❌ No se pudo reducir el número de errores")
        return 2


if __name__ == '__main__':
    exit(main())



