import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, inject, signal } from '@angular/core';
import { DatabaseExportService } from '../../../core/services/database-export.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-database-export',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Exportación de Base de Datos</h1>
        <p class="mt-2 text-sm text-text-secondary">
          Genera un snapshot de la base de datos y storage para inspección o backup.
        </p>
      </div>

      <div class="rounded-lg border border-border-default bg-surface-raised p-6 shadow-sm">
        <div class="mb-4">
          <label class="block text-sm font-medium text-text-primary">
            Límite de registros por tabla
          </label>
          <input
            type="number"
            [(ngModel)]="limit"
            min="1"
            max="100"
            class="mt-1 block w-full rounded-md border border-border-subtle px-3 py-2 shadow-sm focus:border-cta-default focus:outline-none focus:ring-cta-default"
          />
          <p class="mt-1 text-xs text-text-secondary">
            Número de registros de muestra a incluir por tabla (1-100)
          </p>
        </div>

        <button
          (click)="exportSnapshot()"
          [disabled]="exporting()"
          class="rounded-lg bg-cta-default text-cta-text hover:bg-cta-default disabled:opacity-50"
        >
          @if (exporting()) {
            <span class="flex items-center gap-2">
              <span
                class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
              ></span>
              Exportando...
            </span>
          } @else {
            <span class="flex items-center gap-2">
              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Exportar Snapshot
            </span>
          }
        </button>

        @if (error()) {
          <div class="mt-4 rounded-lg bg-error-50 p-4 text-error-800">
            <p class="font-medium">Error al exportar</p>
            <p class="text-sm">{{ error() }}</p>
          </div>
        }
      </div>

      @if (lastExport()) {
        <div class="mt-6 rounded-lg border border-success-light/40 bg-success-light/10 p-4">
          <p class="text-sm font-medium text-success-light">
            Última exportación: {{ lastExport() }}
          </p>
        </div>
      }
    </div>
  `,
})
export class DatabaseExportPage {
  private readonly exportService = inject(DatabaseExportService);
  private readonly toastService = inject(ToastService);

  limit = 3;
  readonly exporting = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastExport = signal<string | null>(null);

  async exportSnapshot(): Promise<void> {
    this.exporting.set(true);
    this.error.set(null);

    try {
      const { filename, blob } = await this.exportService.exportSnapshot(this.limit);

      // Crear link de descarga
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.lastExport.set(new Date().toLocaleString());
      this.toastService.success('Exportación completada', `Archivo generado: ${filename}`);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
      this.error.set(errorMsg);
      this.toastService.error('Error al exportar', errorMsg);
    } finally {
      this.exporting.set(false);
    }
  }
}
