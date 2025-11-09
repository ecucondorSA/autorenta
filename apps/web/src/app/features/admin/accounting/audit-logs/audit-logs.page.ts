import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, signal } from '@angular/core';
import { AccountingService } from '../../../../core/services/accounting.service';
import type { AuditLog, PaginatedResult } from '../../../../core/services/accounting.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-logs.page.html',
})
export class AuditLogsPage implements OnInit {
  private accountingService!: AccountingService;

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
    this.accountingService = new AccountingService(environment.supabaseUrl, environment.supabaseAnonKey);
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

