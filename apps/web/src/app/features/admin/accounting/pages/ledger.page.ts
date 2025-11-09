import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import {
  AccountingService,
  LedgerEntry,
  PaginatedResult,
} from '../../../../core/services/accounting.service';
import { SupabaseClientService } from '../../../../core/services/supabase-client.service';

@Component({
  selector: 'app-ledger',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './ledger.page.html',
  styleUrls: ['./ledger.page.scss'],
})
export class LedgerPage implements OnInit {
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly accountingService: AccountingService;

  readonly loading = signal(false);
  readonly ledgerData = signal<PaginatedResult<LedgerEntry>>({
    data: [],
    total: 0,
    page: 1,
    pageSize: 50,
    totalPages: 0,
  });
  readonly filters = signal({
    startDate: '',
    endDate: '',
    accountCode: '',
    referenceType: '',
    searchTerm: '',
  });
  readonly currentPage = signal(1);
  readonly pageSize = signal(50);

  constructor() {
    const supabase = this.supabaseService.getClient();
    this.accountingService = new AccountingService(supabase.supabaseUrl, supabase.supabaseKey);
  }

  async ngOnInit(): Promise<void> {
    await this.loadLedger();
  }

  async loadLedger(): Promise<void> {
    this.loading.set(true);
    try {
      const cleanFilters = {
        startDate: this.filters().startDate || undefined,
        endDate: this.filters().endDate || undefined,
        accountCode: this.filters().accountCode || undefined,
        referenceType: this.filters().referenceType || undefined,
        searchTerm: this.filters().searchTerm || undefined,
      };
      const result = await this.accountingService.getLedgerPaginated(
        this.currentPage(),
        this.pageSize(),
        cleanFilters,
      );
      this.ledgerData.set(result);
    } catch (error) {
      console.error('Error loading ledger:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async applyFilters(): Promise<void> {
    this.currentPage.set(1);
    await this.loadLedger();
  }

  async clearFilters(): Promise<void> {
    this.filters.set({
      startDate: '',
      endDate: '',
      accountCode: '',
      referenceType: '',
      searchTerm: '',
    });
    this.currentPage.set(1);
    await this.loadLedger();
  }

  async changePage(page: number): Promise<void> {
    this.currentPage.set(page);
    await this.loadLedger();
  }

  exportToCSV(): void {
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

  private convertToCSV(data: any[], fields: string[], headers: string[]): string {
    const csvRows: string[] = [];
    csvRows.push(headers.join(','));
    for (const row of data) {
      const values = fields.map((field) => {
        const value = row[field];
        if (value === null || value === undefined) return '';
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
}
