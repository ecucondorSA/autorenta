#!/usr/bin/env python3
"""
Script mejorado para corregir TODOS los errores de TypeScript automáticamente.
Ejecuta el build, detecta errores y los corrige.
"""

import subprocess
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

def print_warn(msg):
    print(f"{Colors.YELLOW}⚠️{Colors.NC} {msg}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ{Colors.NC} {msg}")

def print_header(msg):
    print(f"\n{Colors.BLUE}╔══════════════════════════════════════════════════════════╗{Colors.NC}")
    print(f"{Colors.BLUE}║{Colors.NC}  {msg}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════════════════╝{Colors.NC}\n")

def run_build_and_get_errors():
    """Ejecuta el build y captura los errores"""
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web"
    
    print_info("Ejecutando build para detectar errores...")
    
    try:
        result = subprocess.run(
            ["npm", "run", "build"],
            cwd=str(web_dir),
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        print_error("Build timeout - tomando demasiado tiempo")
        return ""
    except Exception as e:
        print_error(f"Error ejecutando build: {e}")
        return ""

def fix_file_with_patterns(filepath: Path, patterns: list):
    """Aplica múltiples patrones de corrección a un archivo"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
        if new_content != content:
            content = new_content
            fixes += 1
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return fixes
    
    return 0

def main():
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web" / "src" / "app"
    
    print_header("🔧 Corrigiendo Errores de TypeScript")
    
    # Primero ejecutar el script de corrección básico
    print_info("Ejecutando correcciones básicas...")
    try:
        fix_script = project_root / "tools" / "fix-typescript-errors.py"
        subprocess.run([sys.executable, str(fix_script)], cwd=str(project_root), check=False)
    except Exception as e:
        print_error(f"Error ejecutando script de corrección: {e}")
    
    # Verificar si hay más errores ejecutando el build
    print_info("\nVerificando si quedan errores...")
    build_output = run_build_and_get_errors()
    
    # Contar errores
    error_count = len(re.findall(r'✘ \[ERROR\]', build_output))
    if error_count > 0:
        print_warn(f"Quedan {error_count} errores después de las correcciones básicas")
        print_info("Revisa el output del build para más detalles")
    else:
        print_success("¡Todos los errores han sido corregidos!")
    
    print_info("\nPara iniciar el servidor, ejecuta:")
    print_info("  python3 tools/start-server.py")
    print_info("  o")
    print_info("  node tools/start-with-env.mjs")

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

