import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BonusProtectorService } from '../../../core/services/bonus-protector.service';
import { WalletService } from '../../../core/services/wallet.service';

interface ProtectionLevel {
  level: number;
  name: string;
  priceCents: number;
  maxProtectedClaims: number;
  description: string;
  popular?: boolean;
}

@Component({
  selector: 'app-bonus-protector-purchase',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bonus-protector-purchase.component.html',
  styleUrls: ['./bonus-protector-purchase.component.css'],
})
export class BonusProtectorPurchaseComponent {
  private readonly protectorService = inject(BonusProtectorService);
  private readonly walletService = inject(WalletService);

  @Input() userId!: string;
  @Input() compact: boolean = false;
  @Output() purchaseSuccess = new EventEmitter<void>();
  @Output() purchaseError = new EventEmitter<string>();

  selectedLevel: number = 2; // Default to Level 2 (most popular)
  purchasing: boolean = false;
  purchaseMessage: string | null = null;

  readonly hasActiveProtector = this.protectorService.hasActiveProtector;
  readonly loading = this.protectorService.loading;
  readonly error = this.protectorService.error;
  readonly availableBalance = this.walletService.availableBalance;

  protectionLevels: ProtectionLevel[] = [
    {
      level: 1,
      name: 'Básico',
      priceCents: 1500,
      maxProtectedClaims: 1,
      description: 'Protege tu clase de 1 reclamo',
    },
    {
      level: 2,
      name: 'Estándar',
      priceCents: 3000,
      maxProtectedClaims: 2,
      description: 'Protege tu clase de 2 reclamos',
      popular: true,
    },
    {
      level: 3,
      name: 'Premium',
      priceCents: 4500,
      maxProtectedClaims: 3,
      description: 'Protege tu clase de 3 reclamos',
    },
  ];

  selectLevel(level: number): void {
    this.selectedLevel = level;
  }

  getSelectedLevel(): ProtectionLevel | undefined {
    return this.protectionLevels.find(l => l.level === this.selectedLevel);
  }

  formatPrice(cents: number): string {
    return `USD $${(cents / 100).toFixed(2)}`;
  }

  canAfford(priceCents: number): boolean {
    const balanceCents = this.availableBalance() * 100;
    return balanceCents >= priceCents;
  }

  async onPurchase(): Promise<void> {
    if (!this.userId || this.purchasing || this.hasActiveProtector()) {
      return;
    }

    const selected = this.getSelectedLevel();
    if (!selected) return;

    if (!this.canAfford(selected.priceCents)) {
      this.purchaseMessage = 'Saldo insuficiente. Deposita fondos en tu wallet.';
      this.purchaseError.emit(this.purchaseMessage);
      return;
    }

    this.purchasing = true;
    this.purchaseMessage = null;

    try {
      const result = await new Promise((resolve, reject) => {
        this.protectorService.purchaseProtector(this.userId, this.selectedLevel).subscribe({
          next: (data) => resolve(data),
          error: (err) => reject(err),
        });
      });

      const typedResult = result as { success: boolean; message: string };

      if (typedResult.success) {
        this.purchaseMessage = '¡Protector activado exitosamente!';
        this.purchaseSuccess.emit();
      } else {
        this.purchaseMessage = typedResult.message || 'Error al comprar protector';
        this.purchaseError.emit(this.purchaseMessage);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error inesperado';
      this.purchaseMessage = errorMsg;
      this.purchaseError.emit(errorMsg);
    } finally {
      this.purchasing = false;
    }
  }
}
