import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { AccountingService, AccountingAccount } from '@core/services/payments/accounting.service';

interface JournalEntryLine {
  account_code: string;
  account_name?: string;
  debit?: number;
  credit?: number;
  description: string;
}

@Component({
  selector: 'app-manual-journal-entry',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonicModule],
  templateUrl: './manual-journal-entry.page.html',
  styleUrls: ['./manual-journal-entry.page.scss'],
})
export class ManualJournalEntryPage implements OnInit {
  private readonly accountingService = inject(AccountingService);

  readonly loading = signal(false);
  readonly accounts = signal<AccountingAccount[]>([]);
  readonly entryLines = signal<JournalEntryLine[]>([
    { account_code: '', debit: undefined, credit: undefined, description: '' },
    { account_code: '', debit: undefined, credit: undefined, description: '' },
  ]);
  readonly transactionType = signal('');
  readonly description = signal('');
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadAccounts();
  }

  async loadAccounts(): Promise<void> {
    this.loading.set(true);
    try {
      const accounts = await this.accountingService.getChartOfAccounts();
      this.accounts.set(accounts);
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.error.set('Error al cargar plan de cuentas');
    } finally {
      this.loading.set(false);
    }
  }

  addEntryLine(): void {
    this.entryLines.update((lines) => [
      ...lines,
      { account_code: '', debit: undefined, credit: undefined, description: '' },
    ]);
  }

  removeEntryLine(index: number): void {
    this.entryLines.update((lines) => lines.filter((_, i) => i !== index));
  }

  getAccountName(code: string): string {
    const account = this.accounts().find((a) => a.code === code);
    return account?.name || '';
  }

  validateEntry(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const lines = this.entryLines();

    if (!this.transactionType()) {
      errors.push('Tipo de transacción es requerido');
    }

    if (!this.description()) {
      errors.push('Descripción es requerida');
    }

    if (lines.length < 2) {
      errors.push('Debe haber al menos 2 líneas de asiento');
    }

    let totalDebit = 0;
    let totalCredit = 0;

    lines.forEach((line, index) => {
      if (!line.account_code) {
        errors.push(`Línea ${index + 1}: Cuenta es requerida`);
      }

      if (!line.debit && !line.credit) {
        errors.push(`Línea ${index + 1}: Debe tener débito o crédito`);
      }

      if (line.debit && line.credit) {
        errors.push(`Línea ${index + 1}: No puede tener débito y crédito simultáneamente`);
      }

      if (line.debit && line.debit < 0) {
        errors.push(`Línea ${index + 1}: Débito no puede ser negativo`);
      }

      if (line.credit && line.credit < 0) {
        errors.push(`Línea ${index + 1}: Crédito no puede ser negativo`);
      }

      totalDebit += line.debit || 0;
      totalCredit += line.credit || 0;
    });

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push(
        `Asiento desbalanceado: Débito $${totalDebit.toFixed(2)} ≠ Crédito $${totalCredit.toFixed(2)}`,
      );
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async createEntry(): Promise<void> {
    this.error.set(null);
    this.success.set(null);

    const validation = this.validateEntry();
    if (!validation.valid) {
      this.error.set(validation.errors.join('\n'));
      return;
    }

    this.loading.set(true);

    try {
      const lines = this.entryLines().map((line) => ({
        account_code: line.account_code,
        debit: line.debit,
        credit: line.credit,
        description: line.description || undefined,
      }));

      const entryId = await this.accountingService.createManualJournalEntry(
        this.transactionType(),
        this.description(),
        lines,
      );

      if (entryId) {
        this.success.set(`Asiento contable creado exitosamente: ${entryId}`);
        this.resetForm();
      } else {
        this.error.set('Error al crear el asiento contable');
      }
    } catch (err) {
      console.error('Error creating journal entry:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al crear asiento');
    } finally {
      this.loading.set(false);
    }
  }

  resetForm(): void {
    this.transactionType.set('');
    this.description.set('');
    this.entryLines.set([
      { account_code: '', debit: undefined, credit: undefined, description: '' },
      { account_code: '', debit: undefined, credit: undefined, description: '' },
    ]);
  }

  getTotalDebit(): number {
    return this.entryLines().reduce((sum, line) => sum + (line.debit || 0), 0);
  }

  getTotalCredit(): number {
    return this.entryLines().reduce((sum, line) => sum + (line.credit || 0), 0);
  }

  isBalanced(): boolean {
    return Math.abs(this.getTotalDebit() - this.getTotalCredit()) < 0.01;
  }

  getDifference(): number {
    return Math.abs(this.getTotalDebit() - this.getTotalCredit());
  }
}
