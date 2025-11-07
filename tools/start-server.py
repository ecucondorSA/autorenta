#!/usr/bin/env python3
"""
Script para levantar el servidor de desarrollo y corregir errores automáticamente.
"""

import subprocess
import sys
import os
from pathlib import Path
import re
import time

# Colores para output
class Colors:
    GREEN = '\033[0;32m'
    RED = '\033[0;31m'
    YELLOW = '\033[1;33m'
    BLUE = '\033[0;34m'
    CYAN = '\033[0;36m'
    NC = '\033[0m'  # No Color

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

def check_dependencies():
    """Verifica que las dependencias estén instaladas"""
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web"
    
    if not (web_dir / "node_modules").exists():
        print_warn("Dependencias de web no instaladas. Instalando...")
        subprocess.run(["npm", "install"], cwd=web_dir, check=True)
        print_success("Dependencias instaladas")
    
    worker_dir = project_root / "functions" / "workers" / "payments_webhook"
    if not (worker_dir / "node_modules").exists():
        print_warn("Dependencias de worker no instaladas. Instalando...")
        subprocess.run(["npm", "install"], cwd=worker_dir, check=True)
        print_success("Dependencias instaladas")

def fix_lint_errors():
    """Ejecuta smart-fix.py para corregir errores de lint"""
    project_root = Path(__file__).parent.parent
    smart_fix = project_root / "apps" / "web" / "smart-fix.py"
    
    if smart_fix.exists():
        print_info("Corrigiendo errores de lint...")
        try:
            result = subprocess.run(
                [sys.executable, str(smart_fix)],
                cwd=project_root,
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                print_success("Errores de lint corregidos")
            else:
                print_warn(f"Algunos errores no se pudieron corregir automáticamente")
        except Exception as e:
            print_warn(f"No se pudo ejecutar smart-fix: {e}")

def check_env_file():
    """Verifica que exista el archivo .env.development.local"""
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web"
    env_file = web_dir / ".env.development.local"
    
    if not env_file.exists():
        print_warn(".env.development.local no encontrado")
        env_example = web_dir / ".env.development.local.example"
        if env_example.exists():
            print_info("Copiando .env.development.local.example...")
            import shutil
            shutil.copy(env_example, env_file)
            print_success("Archivo .env creado. Por favor configura las variables necesarias.")
        else:
            print_error("No se encontró .env.development.local ni .env.development.local.example")
            return False
    
    return True

def start_web_server():
    """Inicia el servidor web"""
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web"
    
    # Verificar que el script start-with-env.mjs existe
    start_script = web_dir / "tools" / "start-with-env.mjs"
    if not start_script.exists():
        print_error(f"No se encontró {start_script}")
        return False
    
    print_info("Iniciando servidor web en http://localhost:4200")
    print_info("Presiona Ctrl+C para detener")
    
    try:
        # Ejecutar el script de inicio
        subprocess.run(
            ["node", str(start_script)],
            cwd=str(web_dir),
            check=True
        )
    except KeyboardInterrupt:
        print_info("\nServidor detenido por el usuario")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Error al iniciar el servidor: {e}")
        return False
    
    return True

def start_worker():
    """Inicia el worker en background"""
    project_root = Path(__file__).parent.parent
    worker_dir = project_root / "functions" / "workers" / "payments_webhook"
    
    if not (worker_dir / "package.json").exists():
        print_warn("Worker no encontrado, continuando sin worker...")
        return None
    
    print_info("Iniciando worker en http://localhost:8787")
    
    try:
        process = subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=str(worker_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        return process
    except Exception as e:
        print_warn(f"No se pudo iniciar el worker: {e}")
        return None

def main():
    print_header("🚀 Iniciando Servidor de Desarrollo")
    
    # 1. Verificar dependencias
    print_info("Verificando dependencias...")
    check_dependencies()
    
    # 2. Verificar archivo .env
    if not check_env_file():
        print_error("No se puede continuar sin archivo .env")
        sys.exit(1)
    
    # 3. Corregir errores de lint
    fix_lint_errors()
    
    # 4. Iniciar worker en background (opcional)
    worker_process = start_worker()
    
    # 5. Iniciar servidor web (bloqueante)
    try:
        start_web_server()
    finally:
        # Detener worker si está corriendo
        if worker_process:
            print_info("Deteniendo worker...")
            worker_process.terminate()
            worker_process.wait()
            print_success("Worker detenido")

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


