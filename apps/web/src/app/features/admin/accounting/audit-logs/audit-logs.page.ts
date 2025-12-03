import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, signal, inject } from '@angular/core';
import { AccountingService } from '../../../../core/services/accounting.service';
import type { AuditLog, PaginatedResult } from '../../../../core/services/accounting.service';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mx-auto px-4 py-8">
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-text-primary">Logs de Auditoría</h1>
        <p class="mt-2 text-sm text-text-secondary">
          Revisa los logs de auditoría del sistema contable.
        </p>
      </div>

      <div class="mb-4 rounded-lg border border-border-default bg-surface-raised p-4">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <label class="block text-sm font-medium text-text-primary">Severidad</label>
            <select
              [(ngModel)]="filters.severity"
              (change)="loadLogs()"
              class="mt-1 block w-full rounded-md border border-border-muted px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary">Tipo</label>
            <select
              [(ngModel)]="filters.auditType"
              (change)="loadLogs()"
              class="mt-1 block w-full rounded-md border border-border-muted px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="balance_check">Verificación de Balance</option>
              <option value="reconciliation">Conciliación</option>
              <option value="provision">Provisiones</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary">Estado</label>
            <select
              [(ngModel)]="filters.resolutionStatus"
              (change)="loadLogs()"
              class="mt-1 block w-full rounded-md border border-border-muted px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="open">Abierto</option>
              <option value="resolved">Resuelto</option>
            </select>
          </div>
          <div class="flex items-end">
            <button
              (click)="loadLogs()"
              class="w-full rounded-lg bg-cta-default text-cta-text hover:bg-cta-default"
            >
              Filtrar
            </button>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-12">
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-cta-default border-t-transparent"
          ></div>
        </div>
      } @else if (logs().data.length === 0) {
        <div class="rounded-lg border border-border-default bg-surface-base p-8 text-center">
          <p class="text-text-secondary">No hay logs de auditoría disponibles.</p>
        </div>
      } @else {
        <div class="space-y-4">
          @for (log of logs().data; track log.id) {
            <div
              class="rounded-lg border p-4"
              [class.bg-error-bg]="log.severity === 'critical'"
              [class.bg-warning-light/10]="log.severity === 'high'"
              [class.bg-warning-bg]="log.severity === 'medium'"
              [class.bg-cta-default/10]="log.severity === 'low'"
            >
              <div class="flex items-start justify-between">
                <div class="flex-1">
                  <div class="mb-2 flex items-center gap-2">
                    <span
                      class="rounded-full px-2 py-1 text-xs font-medium"
                      [class.bg-error-bg-hover]="log.severity === 'critical'"
                      [class.text-error-strong]="log.severity === 'critical'"
                      [class.bg-warning-light/20]="log.severity === 'high'"
                      [class.text-warning-light]="log.severity === 'high'"
                      [class.bg-warning-bg-hover]="log.severity === 'medium'"
                      [class.text-warning-strong]="log.severity === 'medium'"
                      [class.bg-cta-default/20]="log.severity === 'low'"
                      [class.text-cta-default]="log.severity === 'low'"
                    >
                      {{ log.severity }}
                    </span>
                    <span class="text-xs text-text-secondary">{{ log.audit_type }}</span>
                  </div>
                  <p class="text-sm font-medium text-text-primary">{{ log.description }}</p>
                  @if (log.variance !== null && log.variance !== undefined) {
                    <p class="mt-1 text-xs text-text-secondary">
                      Diferencia: \${{ log.variance | number: '1.2-2' }}
                    </p>
                  }
                  <p class="mt-1 text-xs text-text-secondary">
                    {{ log.created_at | date: 'short' }}
                  </p>
                </div>
                <span
                  class="rounded-full px-2 py-1 text-xs font-medium"
                  [class.bg-success-light/20]="log.resolution_status === 'resolved'"
                  [class.text-success-light]="log.resolution_status === 'resolved'"
                  [class.bg-surface-raised]="log.resolution_status === 'open'"
                  [class.text-text-primary]="log.resolution_status === 'open'"
                >
                  {{ log.resolution_status }}
                </span>
              </div>
            </div>
          }

          <!-- Paginación -->
          @if (logs().totalPages > 1) {
            <div
              class="flex items-center justify-between rounded-lg border border-border-default bg-surface-raised p-4"
            >
              <button
                (click)="previousPage()"
                [disabled]="currentPage() === 1"
                class="rounded-lg border border-border-muted px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-base disabled:opacity-50"
              >
                Anterior
              </button>
              <span class="text-sm text-text-secondary">
                Página {{ currentPage() }} de {{ logs().totalPages }}
              </span>
              <button
                (click)="nextPage()"
                [disabled]="currentPage() === logs().totalPages"
                class="rounded-lg border border-border-muted px-4 py-2 text-sm font-medium text-text-primary hover:bg-surface-base disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AuditLogsPage implements OnInit {
  private readonly accountingService = inject(AccountingService);

  readonly logs = signal<PaginatedResult<AuditLog>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 0,
  });
  readonly loading = signal(false);
  readonly currentPage = signal(1);

  filters = {
    severity: '',
    auditType: '',
    resolutionStatus: '',
  };

  async ngOnInit(): Promise<void> {
    await this.loadLogs();
  }

  async loadLogs(): Promise<void> {
    this.loading.set(true);

    try {
      const result = await this.accountingService.getAuditLogs(this.currentPage(), 50, {
        severity: this.filters.severity || undefined,
        auditType: this.filters.auditType || undefined,
        resolutionStatus: this.filters.resolutionStatus || undefined,
      });
      this.logs.set(result);
    } catch (err) {
      console.error('Error loading audit logs:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async nextPage(): Promise<void> {
    if (this.currentPage() < this.logs().totalPages) {
      this.currentPage.update((p) => p + 1);
      await this.loadLogs();
    }
  }

  async previousPage(): Promise<void> {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
      await this.loadLogs();
    }
  }
}
