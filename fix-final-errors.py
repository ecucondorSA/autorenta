#!/usr/bin/env python3
"""
Script final para corregir errores críticos restantes
"""
import re
from pathlib import Path

BASE_DIR = Path("/home/edu/autorenta/apps/web/src")

def fix_refund_status_corrupt(file_path: Path):
    """Restaura refund-status.component.ts si está corrupto"""
    try:
        content = file_path.read_text(encoding='utf-8')
        
        # Si empieza con HTML, está corrupto
        if content.strip().startswith('/span>') or content.strip().startswith('<'):
            print(f"⚠️  Archivo corrupto detectado, restaurando desde backup o estructura base...")
            # Buscar el inicio real
            import_match = re.search(r'^import\s+\{', content, re.MULTILINE)
            if import_match:
                content = content[import_match.start():]
                file_path.write_text(content, encoding='utf-8')
                print(f"✅ Restaurado desde imports")
                return True
            else:
                # Restaurar estructura básica
                basic_structure = '''import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { RefundService } from '../../../core/services/refund.service';

@Component({
  selector: 'app-refund-status',
  standalone: true,
  imports: [CommonModule],
  template: \`
    @if (loading()) {
      <div class="flex items-center justify-center p-4">
        <div class="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
      </div>
    } @else if (status(); as s) {
      <div class="rounded-lg border border-gray-200 bg-white p-4">
        <div class="flex justify-between">
          <span class="text-gray-600">Monto:</span>
          <span class="font-semibold text-gray-900">${{ formatCurrency(s.refund_amount || 0) }}</span>
        </div>
        @if (s.refund_date) {
          <div class="flex justify-between">
            <span class="text-gray-600">Fecha:</span>
            <span class="text-gray-900">{{ formatDate(s.refund_date) }}</span>
          </div>
        }
      </div>
    } @else {
      <div class="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-600">
        No hay reembolso registrado para esta reserva.
      </div>
    }
    @if (error()) {
      <div class="rounded-lg bg-red-50 p-4 text-sm text-red-800">
        {{ error() }}
      </div>
    }
  \`,
})
export class RefundStatusComponent implements OnInit {
  @Input() bookingId = '';
  
  private readonly refundService = inject(RefundService);
  
  readonly loading = signal(false);
  readonly status = signal<any>(null);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    if (this.bookingId) {
      this.loadRefundStatus();
    }
  }

  async loadRefundStatus(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    
    try {
      const refund = await this.refundService.getRefundStatus(this.bookingId);
      this.status.set(refund);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error al cargar estado');
    } finally {
      this.loading.set(false);
    }
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount / 100);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('es-AR');
  }
}
'''
                file_path.write_text(basic_structure, encoding='utf-8')
                print(f"✅ Restaurado con estructura básica")
                return True
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def fix_payout_stats_template(file_path: Path):
    """Corrige el template de payout-stats que tiene problemas de sintaxis"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # El problema es que el template tiene ${{ que se interpreta mal
        # Necesitamos escapar o cambiar la sintaxis
        content = re.sub(
            r'\$\{\{\s*s\.(\w+)\s*\|\s*number:\s*[\'"]1\.2-2[\'"]\s*\}\}',
            r'{{ formatCurrency(s.\1) }}',
            content
        )
        
        # Agregar método formatCurrency si no existe
        if 'formatCurrency' not in content and 'export class' in content:
            # Buscar el final de la clase antes del último }
            class_end = content.rfind('}')
            if class_end > 0:
                method = '''
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
    }).format(amount / 100);
  }
'''
                content = content[:class_end] + method + content[class_end:]
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_date_fns_import(file_path: Path):
    """Corrige import de date-fns Spanish"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Cambiar import de Spanish a es
        content = content.replace(
            "import { Spanish } from 'date-fns/locale';",
            "import { es } from 'date-fns/locale';"
        )
        content = content.replace('Spanish', 'es')
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido import date-fns: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def fix_toast_missing_message(file_path: Path):
    """Corrige llamadas a toastService que faltan el segundo parámetro"""
    try:
        content = file_path.read_text(encoding='utf-8')
        original = content
        
        # Buscar patrones como: toastService.success('mensaje') sin segundo parámetro
        patterns = [
            (r"(this\.toastService\.success)\('([^']+)'\)", r"\1('\2', '')"),
            (r"(this\.toastService\.error)\('([^']+)'\)", r"\1('\2', '')"),
            (r"(this\.toastService\.info)\('([^']+)'\)", r"\1('\2', '')"),
        ]
        
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content)
        
        if content != original:
            file_path.write_text(content, encoding='utf-8')
            print(f"✅ Corregido toast: {file_path.relative_to(BASE_DIR)}")
            return True
    except Exception as e:
        print(f"❌ Error: {e}")
    return False

def main():
    print("🔧 Corrigiendo errores finales críticos...\n")
    
    # Fix refund-status corrupto
    refund_file = BASE_DIR / "app/shared/components/refund-status/refund-status.component.ts"
    if refund_file.exists():
        print(f"Procesando: refund-status.component.ts")
        fix_refund_status_corrupt(refund_file)
    
    # Fix payout-stats template
    payout_file = BASE_DIR / "app/features/payouts/payout-stats/payout-stats.component.ts"
    if payout_file.exists():
        print(f"\nProcesando: payout-stats.component.ts")
        fix_payout_stats_template(payout_file)
    
    # Fix date-fns import
    calendar_file = BASE_DIR / "app/features/dashboard/components/multi-car-calendar/multi-car-calendar.component.ts"
    if calendar_file.exists():
        print(f"\nProcesando: multi-car-calendar.component.ts")
        fix_date_fns_import(calendar_file)
    
    # Fix toast calls
    ai_photo_file = BASE_DIR / "app/shared/components/ai-photo-generator/ai-photo-generator.component.ts"
    if ai_photo_file.exists():
        print(f"\nProcesando: ai-photo-generator.component.ts")
        fix_toast_missing_message(ai_photo_file)
    
    print("\n✨ Correcciones completadas")

if __name__ == "__main__":
    main()




