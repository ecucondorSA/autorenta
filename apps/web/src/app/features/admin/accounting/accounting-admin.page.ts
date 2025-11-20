import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AccountingService,
  LedgerEntry,
  ProvisionDetail,
  PeriodClosure,
  AuditLog,
  RevenueRecognition,
  WalletReconciliation,
  PaginatedResult,
} from '@core/services/accounting.service';
import { environment } from '../../../../environments/environment';
import { MoneyPipe } from '@shared/pipes/money.pipe';
import { TranslateModule } from '@ngx-translate/core';

type ActiveTab = 'ledger' | 'provisions' | 'closures' | 'audit';

@Component({
  selector: 'autorenta-accounting-admin-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MoneyPipe, TranslateModule],
  templateUrl: './accounting-admin.page.html',
  styleUrl: './accounting-admin.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountingAdminPage implements OnInit {
  private readonly accountingService: AccountingService;

  // Tab management
  readonly activeTab = signal<ActiveTab>('ledger');

  // Ledger state
  readonly ledgerData = signal<PaginatedResult<LedgerEntry>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 0,
  });
  readonly ledgerLoading = signal<boolean>(false);
  readonly ledgerFilters = signal({
    startDate: '',
    endDate: '',
    accountCode: '',
    referenceType: '',
    searchTerm: '',
  });
  readonly ledgerPage = signal<number>(1);

  // Provisions state
  readonly provisions = signal<ProvisionDetail[]>([]);
  readonly provisionsLoading = signal<boolean>(false);
  readonly provisionsFilters = signal({
    status: '',
    provisionType: '',
  });

  // Period Closures state
  readonly periodClosures = signal<PeriodClosure[]>([]);
  readonly closuresLoading = signal<boolean>(false);
  readonly closuresFilters = signal({
    periodType: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  readonly showClosureDialog = signal<boolean>(false);
  readonly closurePeriodType = signal<'daily' | 'monthly' | 'yearly'>('daily');
  readonly closurePeriodCode = signal<string>('');

  // Audit Logs state
  readonly auditLogs = signal<PaginatedResult<AuditLog>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 0,
  });
  readonly auditLogsLoading = signal<boolean>(false);
  readonly auditLogsFilters = signal({
    severity: '',
    auditType: '',
    resolutionStatus: '',
    startDate: '',
    endDate: '',
  });
  readonly auditLogsPage = signal<number>(1);

  // Additional features
  readonly walletReconciliation = signal<WalletReconciliation[]>([]);
  readonly revenueRecognition = signal<RevenueRecognition[]>([]);
  readonly showReconciliation = signal<boolean>(false);
  readonly showRevenue = signal<boolean>(false);

  // Computed values
  readonly activeProvisionsCount = computed(
    () => this.provisions().filter((p) => p.status === 'active').length,
  );
  readonly totalProvisionsAmount = computed(() =>
    this.provisions()
      .filter((p) => p.status === 'active')
      .reduce((sum, p) => sum + p.amount, 0),
  );

  constructor() {
    this.accountingService = new AccountingService(
      environment.supabaseUrl,
      environment.supabaseAnonKey,
    );
  }

  async ngOnInit(): Promise<void> {
    await this.loadLedger();
  }

  // Tab management
  setActiveTab(tab: ActiveTab): void {
    this.activeTab.set(tab);
    switch (tab) {
      case 'ledger':
        this.loadLedger();
        break;
      case 'provisions':
        this.loadProvisions();
        break;
      case 'closures':
        this.loadPeriodClosures();
        break;
      case 'audit':
        this.loadAuditLogs();
        break;
    }
  }

  // Ledger methods
  async loadLedger(): Promise<void> {
    this.ledgerLoading.set(true);
    try {
      const filters = this.ledgerFilters();
      const cleanFilters = {
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        accountCode: filters.accountCode || undefined,
        referenceType: filters.referenceType || undefined,
        searchTerm: filters.searchTerm || undefined,
      };
      const result = await this.accountingService.getLedgerPaginated(
        this.ledgerPage(),
        50,
        cleanFilters,
      );
      this.ledgerData.set(result);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      this.ledgerLoading.set(false);
    }
  }

  updateLedgerFilters(
    updates: Partial<{
      startDate: string;
      endDate: string;
      accountCode: string;
      referenceType: string;
      searchTerm: string;
    }>,
  ): void {
    this.ledgerFilters.update((current) => ({ ...current, ...updates }));
  }

  async applyLedgerFilters(): Promise<void> {
    this.ledgerPage.set(1);
    await this.loadLedger();
  }

  async clearLedgerFilters(): Promise<void> {
    this.ledgerFilters.set({
      startDate: '',
      endDate: '',
      accountCode: '',
      referenceType: '',
      searchTerm: '',
    });
    this.ledgerPage.set(1);
    await this.loadLedger();
  }

  async changeLedgerPage(page: number): Promise<void> {
    this.ledgerPage.set(page);
    await this.loadLedger();
  }

  exportLedgerToCSV(): void {
    const data = this.ledgerData().data;
    const csvContent = this.convertToCSV(
      data,
      [
        'entry_date',
        'account_code',
        'debit',
        'credit',
        'description',
        'reference_type',
        'fiscal_period',
      ],
      ['Fecha', 'Cuenta', 'Débito', 'Crédito', 'Descripción', 'Tipo', 'Período'],
    );
    this.downloadCSV(csvContent, `ledger-${new Date().toISOString()}.csv`);
  }

  // Provisions methods
  async loadProvisions(): Promise<void> {
    this.provisionsLoading.set(true);
    try {
      const filters = this.provisionsFilters();
      const cleanFilters = {
        status: filters.status || undefined,
        provisionType: filters.provisionType || undefined,
      };
      const result = await this.accountingService.getProvisions(cleanFilters);
      this.provisions.set(result);
    } catch (error) {
      console.error('Error loading provisions:', error);
    } finally {
      this.provisionsLoading.set(false);
    }
  }

  updateProvisionsFilters(updates: Partial<{ status: string; provisionType: string }>): void {
    this.provisionsFilters.update((current) => ({ ...current, ...updates }));
  }

  async applyProvisionsFilters(): Promise<void> {
    await this.loadProvisions();
  }

  async clearProvisionsFilters(): Promise<void> {
    this.provisionsFilters.set({
      status: '',
      provisionType: '',
    });
    await this.loadProvisions();
  }

  exportProvisionsToCSV(): void {
    const data = this.provisions();
    const csvContent = this.convertToCSV(
      data,
      ['created_date', 'provision_type', 'amount', 'status', 'probability', 'notes'],
      ['Fecha', 'Tipo', 'Monto', 'Estado', 'Probabilidad', 'Notas'],
    );
    this.downloadCSV(csvContent, `provisions-${new Date().toISOString()}.csv`);
  }

  // Period Closures methods
  async loadPeriodClosures(): Promise<void> {
    this.closuresLoading.set(true);
    try {
      const filters = this.closuresFilters();
      const cleanFilters = {
        periodType: filters.periodType || undefined,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const result = await this.accountingService.getPeriodClosures(cleanFilters);
      this.periodClosures.set(result);
    } catch (error) {
      console.error('Error loading period closures:', error);
    } finally {
      this.closuresLoading.set(false);
    }
  }

  updateClosuresFilters(
    updates: Partial<{ periodType: string; status: string; startDate: string; endDate: string }>,
  ): void {
    this.closuresFilters.update((current) => ({ ...current, ...updates }));
  }

  async applyClosuresFilters(): Promise<void> {
    await this.loadPeriodClosures();
  }

  async clearClosuresFilters(): Promise<void> {
    this.closuresFilters.set({
      periodType: '',
      status: '',
      startDate: '',
      endDate: '',
    });
    await this.loadPeriodClosures();
  }

  openClosureDialog(): void {
    this.showClosureDialog.set(true);
    // Set default period code based on type
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const type = this.closurePeriodType();
    if (type === 'daily') {
      this.closurePeriodCode.set(`${year}-${month}-${day}`);
    } else if (type === 'monthly') {
      this.closurePeriodCode.set(`${year}-${month}`);
    } else {
      this.closurePeriodCode.set(`${year}`);
    }
  }

  closeClosureDialog(): void {
    this.showClosureDialog.set(false);
  }

  async executePeriodClosure(): Promise<void> {
    const type = this.closurePeriodType();
    const code = this.closurePeriodCode();

    if (!confirm(`¿Ejecutar cierre de período ${type} para ${code}?`)) {
      return;
    }

    try {
      const result = await this.accountingService.executePeriodClosure(type, code);
      if (result.success) {
        alert(result.message);
        this.closeClosureDialog();
        await this.loadPeriodClosures();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error('Error executing period closure:', error);
      alert('Error al ejecutar cierre de período');
    }
  }

  exportClosuresToCSV(): void {
    const data = this.periodClosures();
    const csvContent = this.convertToCSV(
      data,
      [
        'period_code',
        'period_type',
        'status',
        'total_debits',
        'total_credits',
        'balance_check',
        'closed_at',
      ],
      ['Período', 'Tipo', 'Estado', 'Total Débitos', 'Total Créditos', 'Balanceado', 'Cerrado'],
    );
    this.downloadCSV(csvContent, `closures-${new Date().toISOString()}.csv`);
  }

  // Audit Logs methods
  async loadAuditLogs(): Promise<void> {
    this.auditLogsLoading.set(true);
    try {
      const filters = this.auditLogsFilters();
      const cleanFilters = {
        severity: filters.severity || undefined,
        auditType: filters.auditType || undefined,
        resolutionStatus: filters.resolutionStatus || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      };
      const result = await this.accountingService.getAuditLogs(
        this.auditLogsPage(),
        50,
        cleanFilters,
      );
      this.auditLogs.set(result);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      this.auditLogsLoading.set(false);
    }
  }

  updateAuditLogsFilters(
    updates: Partial<{
      severity: string;
      auditType: string;
      resolutionStatus: string;
      startDate: string;
      endDate: string;
    }>,
  ): void {
    this.auditLogsFilters.update((current) => ({ ...current, ...updates }));
  }

  async applyAuditLogsFilters(): Promise<void> {
    this.auditLogsPage.set(1);
    await this.loadAuditLogs();
  }

  async clearAuditLogsFilters(): Promise<void> {
    this.auditLogsFilters.set({
      severity: '',
      auditType: '',
      resolutionStatus: '',
      startDate: '',
      endDate: '',
    });
    this.auditLogsPage.set(1);
    await this.loadAuditLogs();
  }

  async changeAuditLogsPage(page: number): Promise<void> {
    this.auditLogsPage.set(page);
    await this.loadAuditLogs();
  }

  exportAuditLogsToCSV(): void {
    const data = this.auditLogs().data;
    const csvContent = this.convertToCSV(
      data,
      [
        'created_at',
        'severity',
        'audit_type',
        'description',
        'affected_period',
        'resolution_status',
      ],
      ['Fecha', 'Severidad', 'Tipo', 'Descripción', 'Período', 'Estado'],
    );
    this.downloadCSV(csvContent, `audit-logs-${new Date().toISOString()}.csv`);
  }

  // Additional features
  async loadWalletReconciliation(): Promise<void> {
    try {
      const result = await this.accountingService.getWalletReconciliation();
      this.walletReconciliation.set(result);
      this.showReconciliation.set(true);
    } catch (error) {
      console.error('Error loading wallet reconciliation:', error);
    }
  }

  async loadRevenueRecognition(): Promise<void> {
    try {
      const result = await this.accountingService.getRevenueRecognition();
      this.revenueRecognition.set(result);
      this.showRevenue.set(true);
    } catch (error) {
      console.error('Error loading revenue recognition:', error);
    }
  }

  // Utility methods
  private convertToCSV(data: Record<string, unknown>[], fields: string[], headers: string[]): string {
    const csvRows: string[] = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = fields.map((field) => {
        const value = row[field];
        if (value === null || value === undefined) {
          return '';
        }
        // Escape commas and quotes
        const escaped = String(value).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Severity badge class
  getSeverityClass(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'badge-critical';
      case 'error':
        return 'badge-error';
      case 'warning':
        return 'badge-warning';
      case 'info':
        return 'badge-info';
      default:
        return 'badge-default';
    }
  }

  // Status badge class
  getStatusClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'closed':
        return 'badge-info';
      case 'pending':
        return 'badge-warning';
      case 'utilized':
      case 'released':
        return 'badge-default';
      default:
        return 'badge-default';
    }
  }
}
