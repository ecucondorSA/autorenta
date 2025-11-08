#!/usr/bin/env python3
"""
Corrige el uso incorrecto de verificationStatus como array vs objeto
"""
import re
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_verification_page(file_path: Path):
    """Corrige verification.page.ts para usar el primer elemento del array"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Cambiar verificationStatus() para obtener el primer elemento
        # En el template, cambiar @if (verificationStatus(); as status) a @if (currentStatus(); as status)
        
        # Agregar computed para obtener el primer status
        if 'readonly currentStatus = computed' not in content:
            # Buscar después de readonly verificationStatus
            pattern = r'(readonly verificationStatus = this\.verificationService\.statuses;)'
            replacement = r'''\1
  readonly currentStatus = computed(() => {
    const statuses = this.verificationStatus();
    return statuses && statuses.length > 0 ? statuses[0] : null;
  });'''
            content = re.sub(pattern, replacement, content)
        
        # Cambiar en el template
        content = content.replace(
            '@if (verificationStatus(); as status)',
            '@if (currentStatus(); as status)'
        )
        content = content.replace(
            'verificationStatus()?.missing_docs',
            'currentStatus()?.missing_docs'
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_missing_documents_widget(file_path: Path):
    """Corrige missing-documents-widget para usar el primer elemento"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Agregar computed para obtener el primer status
        if 'readonly currentStatus = computed' not in content:
            pattern = r'(readonly verificationStatus = this\.verificationService\.statuses;)'
            replacement = r'''\1
  readonly currentStatus = computed(() => {
    const statuses = this.verificationStatus();
    return statuses && statuses.length > 0 ? statuses[0] : null;
  });'''
            content = re.sub(pattern, replacement, content)
        
        # Cambiar en el template
        content = content.replace(
            'verificationStatus()?.status',
            'currentStatus()?.status'
        )
        content = content.replace(
            'verificationStatus()?.notes',
            'currentStatus()?.notes'
        )
        content = content.replace(
            'verificationStatus()?.missing_docs',
            'currentStatus()?.missing_docs'
        )
        content = content.replace(
            'verificationStatus()',
            'currentStatus()'
        )
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def main():
    print("🔧 Corrigiendo verificationStatus...\n")
    
    verification_file = BASE_DIR / "app/features/verification/verification.page.ts"
    if verification_file.exists():
        fix_verification_page(verification_file)
    
    widget_file = BASE_DIR / "app/shared/components/missing-documents-widget/missing-documents-widget.component.ts"
    if widget_file.exists():
        fix_missing_documents_widget(widget_file)
    
    print("\n✨ Correcciones completadas")

if __name__ == "__main__":
    main()




