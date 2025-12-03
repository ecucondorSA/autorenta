import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PromotionService, PromoCode } from '../../../core/services/promotion.service';

@Component({
  selector: 'app-promo-code-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="promo-container">
      <div class="flex gap-2">
        <input
          type="text"
          [(ngModel)]="code"
          placeholder="Código de descuento"
          class="input input-bordered w-full"
          [disabled]="loading()"
        />
        <button class="btn btn-outline" (click)="apply()" [disabled]="!code || loading()">
          {{ loading() ? '...' : 'Aplicar' }}
        </button>
      </div>

      <p *ngIf="error()" class="text-error text-sm mt-1">{{ error() }}</p>
      <p *ngIf="success()" class="text-success text-sm mt-1">
        ¡Cupón aplicado! Ahorras {{ success()?.percent_off }}%
      </p>
    </div>
  `,
})
export class PromoCodeInputComponent {
  private promoService = inject(PromotionService);

  code = '';
  loading = signal(false);
  error = signal<string | null>(null);
  success = signal<PromoCode | undefined>(undefined);

  @Output() promoApplied = new EventEmitter<PromoCode>();

  async apply() {
    this.loading.set(true);
    this.error.set(null);

    try {
      const result = await this.promoService.validatePromoCode(this.code);
      if (result.valid && result.promo) {
        this.success.set(result.promo);
        this.promoApplied.emit(result.promo);
      } else {
        this.error.set(result.error || 'Cupón inválido');
      }
    } catch {
      this.error.set('Error al validar cupón');
    } finally {
      this.loading.set(false);
    }
  }
}
