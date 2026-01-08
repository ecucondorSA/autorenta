import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';
import type { BankAccount } from '@core/models/wallet.model';

/**
 * Componente para mostrar lista de cuentas bancarias
 */
@Component({
  selector: 'app-bank-accounts-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  templateUrl: './bank-accounts-list.component.html',
  styleUrl: './bank-accounts-list.component.css',
})
export class BankAccountsListComponent {
  @Input({ required: true }) accounts: BankAccount[] = [];
  @Input() loading = false;

  @Output() setDefault = new EventEmitter<string>();
  @Output() deleteAccount = new EventEmitter<string>();
  @Output() addNew = new EventEmitter<void>();

  readonly confirmingDelete = signal<string | null>(null);

  getAccountTypeLabel(type: string): string {
    switch (type) {
      case 'cbu':
        return 'CBU';
      case 'cvu':
        return 'CVU';
      case 'alias':
        return 'Alias';
      default:
        return type.toUpperCase();
    }
  }

  maskAccountNumber(number: string, type: string): string {
    // Para CBU/CVU mostrar solo últimos 4 dígitos
    if (type === 'cbu' || type === 'cvu') {
      return `•••• •••• •••• •••• ${number.slice(-4)}`;
    }
    // Para alias mostrar completo
    return number;
  }

  onSetDefault(accountId: string): void {
    this.setDefault.emit(accountId);
  }

  onDeleteClick(accountId: string): void {
    this.confirmingDelete.set(accountId);
  }

  onConfirmDelete(accountId: string): void {
    this.deleteAccount.emit(accountId);
    this.confirmingDelete.set(null);
  }

  onCancelDelete(): void {
    this.confirmingDelete.set(null);
  }

  onAddNew(): void {
    this.addNew.emit();
  }
}
