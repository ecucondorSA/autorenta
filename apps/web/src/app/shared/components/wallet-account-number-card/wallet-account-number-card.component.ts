import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-wallet-account-number-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './wallet-account-number-card.component.html',
})
export class WalletAccountNumberCardComponent {
  @Input() walletAccountNumber: string | null = null;
  @Input() copied = false;
  @Output() copyWAN = new EventEmitter<void>();
}
