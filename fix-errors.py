#!/usr/bin/env python3
"""
Script rápido para corregir errores comunes de compilación TypeScript/Angular
"""
import re
import sys
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_toast_service_calls(file_path: Path):
    """Corrige llamadas a toastService.showToast y métodos con argumentos faltantes"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # 1. Reemplazar showToast(message, type) por success/error/info/warning
        patterns = [
            (r"this\.toastService\.showToast\('([^']+)',\s*'success'\)", r"this.toastService.success('\1', '')"),
            (r"this\.toastService\.showToast\('([^']+)',\s*'error'\)", r"this.toastService.error('\1', '')"),
            (r"this\.toastService\.showToast\('([^']+)',\s*'info'\)", r"this.toastService.info('\1', '')"),
            (r"this\.toastService\.showToast\('([^']+)',\s*'warning'\)", r"this.toastService.warning('\1', '')"),
            (r"this\.toastService\.showToast\(([^)]+)\)", r"this.toastService.info(\1, '')"),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        # 2. Agregar segundo argumento a success/error/info que solo tienen 1
        # success('mensaje') -> success('mensaje', '')
        content = re.sub(
            r"(this\.toastService\.(success|error|info|warning))\('([^']+)'\)",
            r"\1('\3', '')",
            content
        )
        
        # 3. Corregir updateTags -> updateMeta
        content = content.replace('updateTags', 'updateMeta')
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Fixed: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error in {file_path}: {e}")
    return False

def fix_refund_status_component(file_path: Path):
    """Corrige refund-status.component.ts que tiene HTML mal formado"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Verificar si el archivo empieza con HTML (error de formato)
        if content.strip().startswith('/span>') or content.strip().startswith('<'):
            # Buscar el template string
            template_match = re.search(r"template:\s*`([^`]+)`", content, re.DOTALL)
            if template_match:
                # El template está bien, el problema es que el archivo está corrupto
                # Buscar dónde debería empezar el componente
                component_match = re.search(r"@Component\s*\(\s*\{", content)
                if component_match:
                    # El archivo parece estar bien estructurado, solo verificar
                    pass
    except Exception as e:
        print(f"⚠️  Warning in {file_path}: {e}")
    return False

def fix_damage_comparison_template(file_path: Path):
    """Corrige el template de damage-comparison que tiene reduce mal formado"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Corregir reduce en template: mover a computed property o usar método helper
        # Por ahora, simplificar la expresión
        content = re.sub(
            r'\$\{\{\s*damages\(\)\.reduce\(\(sum,\s*d\)\s*=>\s*sum\s*\+\s*d\.estimatedCostUsd,\s*0\)\.toFixed\(2\)\s*\}\}',
            r'{{ getTotalDamageCost() }}',
            content
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Fixed template: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error in {file_path}: {e}")
    return False

def main():
    print("🔧 Corrigiendo errores de compilación...\n")
    
    fixed_count = 0
    
    # Buscar todos los archivos TypeScript
    for ts_file in BASE_DIR.rglob("*.ts"):
        if 'node_modules' in str(ts_file) or '.spec.ts' in str(ts_file):
            continue
            
        if fix_toast_service_calls(ts_file):
            fixed_count += 1
    
    # Corregir template específico
    damage_template = BASE_DIR / "app/shared/components/damage-comparison/damage-comparison.component.html"
    if damage_template.exists():
        if fix_damage_comparison_template(damage_template):
            fixed_count += 1
            # Agregar método helper al componente
            component_file = BASE_DIR / "app/shared/components/damage-comparison/damage-comparison.component.ts"
            if component_file.exists():
                content = component_file.read_text(encoding='utf-8')
                if 'getTotalDamageCost' not in content:
                    # Agregar método antes del último }
                    content = re.sub(
                        r'(\s+)(\}\s*$)',
                        r'\1  getTotalDamageCost(): string {\n'
                        r'\1    return this.damages().reduce((sum, d) => sum + d.estimatedCostUsd, 0).toFixed(2);\n'
                        r'\1  }\n\2',
                        content,
                        flags=re.MULTILINE
                    )
                    component_file.write_text(content, encoding='utf-8')
                    print(f"✅ Added helper method to: {component_file.relative_to(BASE_DIR)}")
    
    print(f"\n✨ Corregidos {fixed_count} archivos")
    print("\n💡 Ejecuta 'npm run build:web' para verificar")

if __name__ == "__main__":
    main()




