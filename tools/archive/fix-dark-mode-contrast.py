#!/usr/bin/env python3
"""
Script mejorado para corregir TODOS los problemas de contraste en dark mode.
Incluye correcciones para fondos blancos/grises claros que necesitan variantes dark.
"""

import re
import sys
from pathlib import Path
from typing import List, Tuple

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

def print_warn(msg):
    print(f"{Colors.YELLOW}⚠️{Colors.NC} {msg}")

def print_header(msg):
    print(f"\n{Colors.BLUE}╔══════════════════════════════════════════════════════════╗{Colors.NC}")
    print(f"{Colors.BLUE}║{Colors.NC}  {msg}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════════════════╝{Colors.NC}\n")

# Patrones de corrección de contraste mejorados
CONTRAST_FIXES = [
    # Fondos blancos/grises claros sin dark: -> agregar dark:bg-slate-deep o dark:bg-anthracite
    (r'\bbg-white\b(?!\s+dark:)', r'bg-white dark:bg-slate-deep'),
    (r'\bbg-white-pure\b(?!\s+dark:)', r'bg-white-pure dark:bg-slate-deep'),
    (r'\bbg-gray-50\b(?!\s+dark:)', r'bg-gray-50 dark:bg-gray-800'),
    (r'\bbg-gray-100\b(?!\s+dark:)', r'bg-gray-100 dark:bg-gray-800'),
    (r'\bbg-gray-200\b(?!\s+dark:)', r'bg-gray-200 dark:bg-gray-700'),
    
    # Bordes que necesitan variante dark
    (r'\bborder-pearl-gray\b(?!\s+dark:)', r'border-pearl-gray dark:border-gray-600'),
    (r'\bborder-gray-200\b(?!\s+dark:)', r'border-gray-200 dark:border-gray-700'),
    (r'\bborder-gray-300\b(?!\s+dark:)', r'border-gray-300 dark:border-gray-600'),
    
    # Texto que necesita mejor contraste
    (r'\btext-charcoal-medium\b(?!\s+dark:)', r'text-charcoal-medium dark:text-pearl-light'),
    (r'\btext-ash-gray\b(?!\s+dark:)', r'text-ash-gray dark:text-pearl-light/70'),
    (r'\btext-charcoal-light\b(?!\s+dark:)', r'text-charcoal-light dark:text-pearl-light/60'),
    (r'\btext-gray-400\b(?!\s+dark:)', r'text-gray-400 dark:text-gray-300'),
    (r'\btext-gray-500\b(?!\s+dark:)', r'text-gray-500 dark:text-gray-300'),
    (r'\btext-gray-600\b(?!\s+dark:)', r'text-gray-600 dark:text-gray-300'),
    
    # Mejorar text-gray existentes con dark: débil
    (r'\btext-gray-400\s+dark:text-gray-400\b', r'text-gray-400 dark:text-gray-300'),
    (r'\btext-gray-500\s+dark:text-gray-400\b', r'text-gray-500 dark:text-gray-300'),
    (r'\btext-gray-500\s+dark:text-gray-500\b', r'text-gray-500 dark:text-gray-300'),
    (r'\btext-gray-600\s+dark:text-gray-400\b', r'text-gray-600 dark:text-gray-300'),
]

def fix_contrast_in_content(content: str, filepath: Path) -> Tuple[str, int]:
    """Corrige problemas de contraste en el contenido"""
    original_content = content
    fixes = 0
    
    # Aplicar correcciones de contraste
    for pattern, replacement in CONTRAST_FIXES:
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        if new_content != content:
            content = new_content
            fixes += 1
    
    # Correcciones específicas para casos complejos
    
    # 1. Clases condicionales con [class.bg-white]
    content = re.sub(
        r'\[class\.bg-white\]="true"',
        r'[class.bg-white]="true"\n      [class.dark:bg-slate-deep]="true"',
        content
    )
    if content != original_content:
        fixes += 1
    
    # 2. Líneas con múltiples clases que incluyen bg-white pero sin dark:
    lines = content.split('\n')
    new_lines = []
    for line in lines:
        # Buscar líneas con bg-white pero sin dark:bg-
        if re.search(r'\bbg-white\b', line) and 'dark:bg-' not in line:
            # Agregar dark:bg-slate-deep después de bg-white
            line = re.sub(
                r'(\bbg-white\b)',
                r'\1 dark:bg-slate-deep',
                line,
                count=1
            )
            fixes += 1
        
        # Buscar líneas con border-pearl-gray pero sin dark:border-
        if 'border-pearl-gray' in line and 'dark:border-' not in line:
            line = re.sub(
                r'(\bborder-pearl-gray\b)',
                r'\1 dark:border-gray-600',
                line,
                count=1
            )
            fixes += 1
        
        new_lines.append(line)
    
    content = '\n'.join(new_lines)
    
    return content, fixes

def find_html_and_ts_files(root_dir: Path) -> List[Path]:
    """Encuentra archivos HTML y TS con templates"""
    files = []
    
    for pattern in ['*.html', '*.ts']:
        for filepath in root_dir.rglob(pattern):
            # Excluir directorios
            if any(excluded in str(filepath) for excluded in ['node_modules', '.git', 'dist', 'build', '.angular']):
                continue
            
            # Solo archivos en src/app
            if 'src/app' not in str(filepath):
                continue
            
            files.append(filepath)
    
    return files

def fix_file(filepath: Path) -> int:
    """Corrige problemas de contraste en un archivo"""
    if not filepath.exists():
        return 0
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print_error(f"Error leyendo {filepath.name}: {e}")
        return 0
    
    original_content = content
    new_content, fixes = fix_contrast_in_content(content, filepath)
    
    if new_content != original_content:
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return fixes
        except Exception as e:
            print_error(f"Error escribiendo {filepath.name}: {e}")
            return 0
    
    return 0

def main():
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web" / "src" / "app"
    
    print_header("🎨 Corrigiendo TODOS los Problemas de Contraste en Dark Mode")
    
    # Priorizar archivos específicos con problemas conocidos
    priority_files = [
        web_dir / "shared" / "components" / "date-range-picker" / "date-range-picker.component.html",
        web_dir / "shared" / "components" / "car-card" / "car-card.component.html",
        web_dir / "features" / "cars" / "list" / "cars-list.page.html",
    ]
    
    print_info("Corrigiendo archivos prioritarios primero...")
    total_fixes = 0
    files_fixed = 0
    
    for filepath in priority_files:
        if filepath.exists():
            try:
                fixes = fix_file(filepath)
                if fixes > 0:
                    print_success(f"{filepath.relative_to(project_root)}: {fixes} corrección(es)")
                    total_fixes += fixes
                    files_fixed += 1
            except Exception as e:
                print_error(f"Error en {filepath.name}: {e}")
    
    # Buscar otros archivos con problemas
    print_info("\nBuscando otros archivos con problemas de contraste...")
    all_files = find_html_and_ts_files(web_dir)
    
    # Excluir archivos ya procesados
    remaining_files = [f for f in all_files if f not in priority_files]
    
    for filepath in remaining_files[:50]:  # Limitar a 50 para no sobrecargar
        try:
            fixes = fix_file(filepath)
            if fixes > 0:
                print_success(f"{filepath.relative_to(project_root)}: {fixes} corrección(es)")
                total_fixes += fixes
                files_fixed += 1
        except Exception as e:
            continue  # Silenciar errores menores
    
    print_header("✅ Resumen")
    print_success(f"Archivos corregidos: {files_fixed}")
    print_success(f"Total de correcciones: {total_fixes}")
    
    if total_fixes > 0:
        print_info("\nCorrecciones aplicadas:")
        print_info("  • bg-white → dark:bg-slate-deep")
        print_info("  • border-pearl-gray → dark:border-gray-600")
        print_info("  • text-charcoal-medium → dark:text-pearl-light")
        print_info("  • text-ash-gray → dark:text-pearl-light/70")
        print_info("  • text-gray-400/500/600 → dark:text-gray-300")
        print_info("\nEl servidor debería recargarse automáticamente.")
    else:
        print_warn("No se encontraron problemas de contraste para corregir.")
        print_info("Los archivos ya pueden tener las correcciones aplicadas.")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print_info("\n\nProceso interrumpido por el usuario")
        sys.exit(0)
    except Exception as e:
        print_error(f"Error inesperado: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
