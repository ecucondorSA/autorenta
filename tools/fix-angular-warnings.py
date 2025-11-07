#!/usr/bin/env python3
"""
Script para corregir warnings de Angular automáticamente.
- Remueve imports no usados (RouterLink)
- Corrige optional chaining innecesario (status()?.value -> status().value)
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

def print_header(msg):
    print(f"\n{Colors.BLUE}╔══════════════════════════════════════════════════════════╗{Colors.NC}")
    print(f"{Colors.BLUE}║{Colors.NC}  {msg}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════════════════╝{Colors.NC}\n")

def fix_routerlink_unused(filepath: Path) -> int:
    """Remueve RouterLink si no se usa en el template"""
    if not filepath.exists():
        return 0
    
    html_file = filepath.parent / (filepath.stem.replace('.component', '') + '.component.html')
    if not html_file.exists():
        html_file = filepath.parent / (filepath.stem + '.html')
    
    # Verificar si RouterLink se usa en el template
    uses_routerlink = False
    if html_file.exists():
        with open(html_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
            uses_routerlink = 'routerLink' in html_content or '[routerLink]' in html_content
    
    if uses_routerlink:
        return 0  # Se usa, no hacer nada
    
    # Remover RouterLink del import y del array de imports
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Remover RouterLink del import
    content = re.sub(
        r"import\s*\{\s*RouterLink\s*\}\s*from\s*'@angular/router';?\n",
        r"",
        content
    )
    
    # Remover RouterLink del array de imports
    content = re.sub(
        r"imports:\s*\[\s*CommonModule,\s*RouterLink\s*\]",
        r"imports: [CommonModule]",
        content
    )
    
    content = re.sub(
        r"imports:\s*\[\s*RouterLink,\s*CommonModule\s*\]",
        r"imports: [CommonModule]",
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1
    
    return 0

def fix_optional_chaining(filepath: Path) -> int:
    """Corrige optional chaining innecesario en templates"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    # Patrones para corregir status()?.property -> status().property
    # Solo en templates (dentro de backticks o strings de template)
    patterns = [
        # status()?.value
        (r"status\(\)\?\.value", r"status().value"),
        # status()?.isVerified
        (r"status\(\)\?\.isVerified", r"status().isVerified"),
        # status()?.verifiedAt
        (r"status\(\)\?\.verifiedAt", r"status().verifiedAt"),
        # status()?.otpSent
        (r"status\(\)\?\.otpSent", r"status().otpSent"),
        # status()?.canResend
        (r"status\(\)\?\.canResend", r"status().canResend"),
        # status()?.cooldownSeconds
        (r"status\(\)\?\.cooldownSeconds", r"status().cooldownSeconds"),
        # status()?.faceMatchScore
        (r"status\(\)\?\.faceMatchScore", r"status().faceMatchScore"),
        # status()?.livenessScore
        (r"status\(\)\?\.livenessScore", r"status().livenessScore"),
        # status()?.requiresLevel2
        (r"status\(\)\?\.requiresLevel2", r"status().requiresLevel2"),
    ]
    
    for pattern, replacement in patterns:
        new_content = re.sub(pattern, replacement, content)
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
    
    print_header("🔧 Corrigiendo Warnings de Angular")
    
    files_to_fix = [
        (web_dir / "shared" / "components" / "autorentar-credit-card" / "autorentar-credit-card.component.ts", fix_routerlink_unused),
        (web_dir / "shared" / "components" / "email-verification" / "email-verification.component.ts", fix_optional_chaining),
        (web_dir / "shared" / "components" / "phone-verification" / "phone-verification.component.ts", fix_optional_chaining),
        (web_dir / "shared" / "components" / "selfie-capture" / "selfie-capture.component.ts", fix_optional_chaining),
    ]
    
    total_fixes = 0
    files_fixed = 0
    
    for filepath, fix_func in files_to_fix:
        if not filepath.exists():
            print_error(f"Archivo no encontrado: {filepath.name}")
            continue
        
        try:
            print_info(f"Corrigiendo {filepath.name}...")
            fixes = fix_func(filepath)
            if fixes > 0:
                total_fixes += fixes
                files_fixed += 1
                print_success(f"  {fixes} corrección(es) aplicada(s)")
        except Exception as e:
            print_error(f"Error corrigiendo {filepath.name}: {e}")
            import traceback
            traceback.print_exc()
    
    print_header("✅ Resumen")
    print_success(f"Archivos corregidos: {files_fixed}")
    print_success(f"Total de correcciones: {total_fixes}")
    
    if total_fixes > 0:
        print_info("\nLos warnings deberían estar corregidos. El servidor se recargará automáticamente.")

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


