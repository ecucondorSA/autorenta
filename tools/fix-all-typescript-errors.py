#!/usr/bin/env python3
"""
Script completo para corregir TODOS los errores de TypeScript automáticamente.
Corrige tipos unknown, variables mal nombradas, typos, y propiedades faltantes.
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

def print_warn(msg):
    print(f"{Colors.YELLOW}⚠️{Colors.NC} {msg}")

def print_info(msg):
    print(f"{Colors.CYAN}ℹ{Colors.NC} {msg}")

def print_header(msg):
    print(f"\n{Colors.BLUE}╔══════════════════════════════════════════════════════════╗{Colors.NC}")
    print(f"{Colors.BLUE}║{Colors.NC}  {msg}")
    print(f"{Colors.BLUE}╚══════════════════════════════════════════════════════════╝{Colors.NC}\n")

def fix_file(filepath: Path, patterns: List[Tuple[str, str, str]]) -> int:
    """Aplica múltiples patrones de corrección a un archivo"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    fixes = 0
    
    for pattern, replacement, description in patterns:
        new_content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
        if new_content != content:
            content = new_content
            fixes += 1
            if description:
                print_info(f"  {description}")
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return fixes
    
    return 0

def fix_analytics_service(filepath: Path) -> int:
    """Corrige errores en analytics.service.ts"""
    patterns = [
        (r"\b_error\b", r"error", "Corrección de _error -> error"),
    ]
    return fix_file(filepath, patterns)

def fix_autorentar_credit_service(filepath: Path) -> int:
    """Corrige errores en autorentar-credit.service.ts"""
    patterns = [
        (r"error\?\.message", r"(error as any)?.message", "Tipado de error"),
        (r"this\.logger\.error\(defaultMessage, error\);",
         r"this.logger.error(defaultMessage, (error as Error)?.message || String(error));",
         "Conversión de error a string"),
    ]
    return fix_file(filepath, patterns)

def fix_booking_completion_service(filepath: Path) -> int:
    """Corrige errores en booking-completion.service.ts"""
    # Necesita corrección manual más compleja
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Remover bookingId de los objetos
    content = re.sub(
        r"bookingId:\s*booking\.id,\s*\n",
        r"",
        content
    )
    
    # Convertir Promise a Observable usando from()
    content = re.sub(
        r"this\.driverProfileService\.updateClassOnEvent\(\{",
        r"from(this.driverProfileService.updateClassOnEvent({",
        content
    )
    
    # Cerrar el from() después del updateClassOnEvent
    content = re.sub(
        r"(updateClassOnEvent\(\{[^}]+eventType:[^}]+\}\));",
        r"\1).pipe(ignoreElements());",
        content
    )
    
    if content != original_content:
        # Agregar import de from e ignoreElements si no existe
        if "from 'rxjs'" not in content:
            content = re.sub(
                r"(import.*from 'rxjs';)",
                r"\1\nimport { from } from 'rxjs';\nimport { ignoreElements } from 'rxjs/operators';",
                content
            )
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1
    
    return 0

def fix_booking_validation_service(filepath: Path) -> int:
    """Corrige errores en booking-validation.service.ts"""
    patterns = [
        (r"this\.logger\.warn\('Waitlist activated due to unavailable error', \{",
         r"this.logger.warn('Waitlist activated due to unavailable error: ' + JSON.stringify({",
         "Conversión de objeto a string"),
        (r"\}\);", r"}));", "Cierre de JSON.stringify"),
    ]
    return fix_file(filepath, patterns)

def fix_bookings_service(filepath: Path) -> int:
    """Corrige errores en bookings.service.ts"""
    patterns = [
        (r"this\.logger\.error\('request_booking RPC failed', \{",
         r"this.logger.error('request_booking RPC failed: ' + JSON.stringify({",
         "Conversión de objeto a string"),
        (r"\}\);", r"}));", "Cierre de JSON.stringify"),
    ]
    return fix_file(filepath, patterns)

def fix_email_service(filepath: Path) -> int:
    """Corrige errores en email.service.ts"""
    patterns = [
        (r"\b_error\b", r"error", "Corrección de _error -> error"),
    ]
    return fix_file(filepath, patterns)

def fix_error_handler_service(filepath: Path) -> int:
    """Corrige errores en error-handler.service.ts"""
    patterns = [
        (r"this\.logger\.critical\(`Critical error in \$\{context\}`, error\);",
         r"this.logger.critical(`Critical error in ${context}`, error?.message || String(error));",
         "Conversión de error a string"),
        (r"this\.logger\.critical\(message, error\);",
         r"this.logger.critical(message, error?.message || String(error));",
         "Conversión de error a string"),
        (r"this\.logger\.critical\(message, new Error\(String\(error\)\)\);",
         r"this.logger.critical(message, String(error));",
         "Simplificación de conversión"),
    ]
    return fix_file(filepath, patterns)

def fix_exchange_rate_service(filepath: Path) -> int:
    """Corrige errores en exchange-rate.service.ts"""
    patterns = [
        (r"\b_error\b", r"error", "Corrección de _error -> error"),
    ]
    return fix_file(filepath, patterns)

def fix_fgo_service(filepath: Path) -> int:
    """Corrige errores en fgo-v1-1.service.ts"""
    patterns = [
        (r"response\._error", r"response.error", "Corrección de _error -> error"),
    ]
    return fix_file(filepath, patterns)

def fix_fx_service(filepath: Path) -> int:
    """Corrige errores en fx.service.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Corregir console.error mal escrito
    content = re.sub(r"console,\s*:\s*\.error", r"console.error", content)
    
    # Corregir catchError mal formado
    content = re.sub(
        r"catchError\(\(\(_error\)\)\s*=>\s*\{",
        r"catchError((error: any) => {",
        content
    )
    
    # Corregir referencias a _error
    content = re.sub(r"\b_error\b", r"error", content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1
    
    return 0

def fix_location_service(filepath: Path) -> int:
    """Corrige errores en location.service.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Corregir console.warn mal escrito
    content = re.sub(r"console,\s*:\s*\.warn", r"console.warn", content)
    
    # Corregir catch mal formado
    content = re.sub(
        r"\(\(_error\)\)\s*=>\s*\{",
        r"(error: any) => {",
        content
    )
    
    # Corregir referencias a _error
    content = re.sub(r"\b_error\b", r"error", content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1
    
    return 0

def fix_marketplace_onboarding_service(filepath: Path) -> int:
    """Corrige errores en marketplace-onboarding.service.ts"""
    patterns = [
        (r"\b_error\b", r"error", "Corrección de _error -> error"),
        (r"const hasActiveTokens = data\.mp_token_expires_at",
         r"const hasActiveTokens = data?.mp_token_expires_at",
         "Null check para data"),
        (r"\? new Date\(data\.mp_token_expires_at\)",
         r"? new Date(data?.mp_token_expires_at!)",
         "Null check para data"),
        (r"isApproved:\s*data\.marketplace_approved",
         r"isApproved: data?.marketplace_approved",
         "Null check para data"),
        (r"collectorId:\s*data\.mercadopago_collector_id",
         r"collectorId: data?.mercadopago_collector_id",
         "Null check para data"),
        (r"completedAt:\s*data\.mp_onboarding_completed_at",
         r"completedAt: data?.mp_onboarding_completed_at",
         "Null check para data"),
    ]
    return fix_file(filepath, patterns)

def fix_marketplace_service(filepath: Path) -> int:
    """Corrige errores en marketplace.service.ts"""
    patterns = [
        (r"\b_error\b", r"error", "Corrección de _error -> error"),
    ]
    return fix_file(filepath, patterns)

def fix_mercado_pago_script_service(filepath: Path) -> int:
    """Corrige errores en mercado-pago-script.service.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Buscar el contexto del error
    # Necesitamos encontrar el catch block y agregar el parámetro error
    content = re.sub(
        r"catch\s*\{[\s\S]*?JSON\.stringify\(error",
        lambda m: m.group(0).replace("catch {", "catch (error: any) {"),
        content,
        flags=re.DOTALL
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1
    
    return 0

def fix_mercadopago_oauth_service(filepath: Path) -> int:
    """Corrige errores en mercadopago-oauth.service.ts"""
    patterns = [
        (r"(err)\.message", r"(err as Error).message", "Tipado de err"),
    ]
    return fix_file(filepath, patterns)

def fix_messages_repo(filepath: Path) -> int:
    """Corrige errores en messages.repo.ts"""
    patterns = [
        (r"const \{ full_name, \.\.\.rest \} = input;",
         r"const { full_name, ...rest } = input as any;",
         "Tipado de input"),
    ]
    return fix_file(filepath, patterns)

def fix_messages_service(filepath: Path) -> int:
    """Corrige errores en messages.service.ts"""
    patterns = [
        (r"throw _error", r"throw error", "Corrección de _error -> error"),
    ]
    return fix_file(filepath, patterns)

def fix_payment_authorization_service(filepath: Path) -> int:
    """Corrige errores en payment-authorization.service.ts"""
    if not filepath.exists():
        return 0
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Corregir body as any mal formado
    content = re.sub(
        r"body as any,",
        r"(body as any),",
        content
    )
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return 1
    
    return 0

def fix_share_service(filepath: Path) -> int:
    """Corrige errores en share.service.ts"""
    patterns = [
        (r"if \(error\.name === 'AbortError'\)",
         r"if ((error as any)?.name === 'AbortError')",
         "Tipado de error"),
    ]
    return fix_file(filepath, patterns)

def fix_user_notifications_service(filepath: Path) -> int:
    """Corrige errores en user-notifications.service.ts"""
    patterns = [
        (r"throw error;",
         r"throw error as Error;",
         "Tipado de error"),
    ]
    return fix_file(filepath, patterns)

def fix_cars_map_component(filepath: Path) -> int:
    """Corrige errores en cars-map.component.ts"""
    patterns = [
        (r"consol\(e as any\)", r"console", "Corrección de typo consol -> console"),
        (r"consol\(e as any\)\.error", r"console.error", "Corrección de typo consol -> console"),
        (r"popup\.setLngLat\(coords\)",
         r"popup.setLngLat(coords as [number, number])",
         "Tipado de coords"),
    ]
    return fix_file(filepath, patterns)

def main():
    project_root = Path(__file__).parent.parent
    web_dir = project_root / "apps" / "web" / "src" / "app"
    
    print_header("🔧 Corrigiendo TODOS los Errores de TypeScript")
    
    # Lista de archivos y sus funciones de corrección
    files_to_fix = [
        (web_dir / "core" / "services" / "analytics.service.ts", fix_analytics_service),
        (web_dir / "core" / "services" / "autorentar-credit.service.ts", fix_autorentar_credit_service),
        (web_dir / "core" / "services" / "booking-completion.service.ts", fix_booking_completion_service),
        (web_dir / "core" / "services" / "booking-validation.service.ts", fix_booking_validation_service),
        (web_dir / "core" / "services" / "bookings.service.ts", fix_bookings_service),
        (web_dir / "core" / "services" / "bookings.service.backup.ts", fix_bookings_service),
        (web_dir / "core" / "services" / "email.service.ts", fix_email_service),
        (web_dir / "core" / "services" / "error-handler.service.ts", fix_error_handler_service),
        (web_dir / "core" / "services" / "exchange-rate.service.ts", fix_exchange_rate_service),
        (web_dir / "core" / "services" / "fgo-v1-1.service.ts", fix_fgo_service),
        (web_dir / "core" / "services" / "fx.service.ts", fix_fx_service),
        (web_dir / "core" / "services" / "location.service.ts", fix_location_service),
        (web_dir / "core" / "services" / "marketplace-onboarding.service.ts", fix_marketplace_onboarding_service),
        (web_dir / "core" / "services" / "marketplace.service.ts", fix_marketplace_service),
        (web_dir / "core" / "services" / "mercado-pago-script.service.ts", fix_mercado_pago_script_service),
        (web_dir / "core" / "services" / "mercadopago-oauth.service.ts", fix_mercadopago_oauth_service),
        (web_dir / "core" / "services" / "messages.repo.ts", fix_messages_repo),
        (web_dir / "core" / "services" / "messages.service.ts", fix_messages_service),
        (web_dir / "core" / "services" / "payment-authorization.service.ts", fix_payment_authorization_service),
        (web_dir / "core" / "services" / "share.service.ts", fix_share_service),
        (web_dir / "core" / "services" / "user-notifications.service.ts", fix_user_notifications_service),
        (web_dir / "shared" / "components" / "cars-map" / "cars-map.component.ts", fix_cars_map_component),
    ]
    
    total_fixes = 0
    files_fixed = 0
    
    for filepath, fix_func in files_to_fix:
        if not filepath.exists():
            print_warn(f"Archivo no encontrado: {filepath.name}")
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
        print_info("\nPara verificar, ejecuta:")
        print_info("  cd apps/web && npm run build")

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
