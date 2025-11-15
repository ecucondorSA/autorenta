import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MercadopagoCardFormComponent } from '../../../../shared/components/mercadopago-card-form/mercadopago-card-form.component';
import {
  RiskSnapshot,
  FxSnapshot,
  PaymentAuthorization,
} from '../../../../core/models/booking-detail-payment.model';
import { PaymentAuthorizationService } from '../../../../core/services/payment-authorization.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ReembolsabilityBadgeComponent } from './reembolsability-badge.component';

@Component({
  selector: 'app-card-hold-panel',
  standalone: true,
  imports: [CommonModule, MercadopagoCardFormComponent, ReembolsabilityBadgeComponent],
  templateUrl: './card-hold-panel.component.html',
  styleUrls: ['./card-hold-panel.component.css'],
})
export class CardHoldPanelComponent {
  @Input({ required: true }) riskSnapshot!: RiskSnapshot;
  @Input({ required: true }) fxSnapshot!: FxSnapshot;
  @Input() userId = '';
  @Input() bookingId?: string;
  @Input() currentAuthorization: PaymentAuthorization | null = null;

  @Output() authorizationChange = new EventEmitter<PaymentAuthorization | null>();
  @Output() fallbackToWallet = new EventEmitter<void>();

  private readonly paymentAuthorizationService = inject(PaymentAuthorizationService);
  private readonly authService = inject(AuthService);

  readonly userEmail = this.authService.userEmail;

  readonly authorizationStatus = signal<'idle' | 'authorized' | 'expired' | 'failed'>('idle');
  readonly isLoading = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly currentAuthSignal = signal<PaymentAuthorization | null>(null);

  constructor() {
    if (this.currentAuthorization) {
      this.currentAuthSignal.set(this.currentAuthorization);
      this.authorizationStatus.set(this.mapAuthStatus(this.currentAuthorization));
    }
  }

  onCardTokenGenerated(event: { cardToken: string; last4: string }): void {
    this.onAuthorize(event.cardToken, event.last4);
  }

  onAuthorize(cardToken: string, cardLast4: string): void {
    const email = this.userEmail();
    if (!this.userId || !email) {
      this.errorMessage.set('Error: Usuario no identificado');
      this.authorizationStatus.set('failed');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.paymentAuthorizationService
      .authorizePayment({
        userId: this.userId,
        amountUsd: this.riskSnapshot.holdEstimatedUsd,
        amountArs: this.riskSnapshot.holdEstimatedArs,
        fxRate: this.fxSnapshot.rate,
        cardToken,
        payerEmail: email,
        description: `Preautorización para reserva${this.bookingId ? ` ${this.bookingId}` : ''}`,
        bookingId: this.bookingId,
      })
      .subscribe({
        next: (result) => {
          this.isLoading.set(false);
          if (result.ok && result.authorizedPaymentId) {
            const authorization: PaymentAuthorization = {
              authorizedPaymentId: result.authorizedPaymentId,
              amountArs: this.riskSnapshot.holdEstimatedArs,
              amountUsd: this.riskSnapshot.holdEstimatedUsd,
              currency: 'ARS',
              expiresAt: result.expiresAt || new Date(),
              status: 'authorized',
              cardLast4,
              createdAt: new Date(),
            };
            this.currentAuthSignal.set(authorization);
            this.authorizationStatus.set('authorized');
            this.authorizationChange.emit(authorization);
          } else {
            this.errorMessage.set(result.error || 'Error desconocido');
            this.authorizationStatus.set('failed');
            this.authorizationChange.emit(null);
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.message || 'Error de red');
          this.authorizationStatus.set('failed');
          this.authorizationChange.emit(null);
        },
      });
  }

  onReauthorize(): void {
    this.authorizationStatus.set('idle');
  }

  onRetry(): void {
    this.authorizationStatus.set('idle');
    this.errorMessage.set(null);
  }

  onChangeCard(): void {
    const currentAuth = this.currentAuthSignal();
    if (currentAuth) {
      this.paymentAuthorizationService
        .cancelAuthorization(currentAuth.authorizedPaymentId)
        .subscribe(() => {
          this.currentAuthSignal.set(null);
          this.authorizationStatus.set('idle');
          this.authorizationChange.emit(null);
        });
    }
  }

  onFallbackToWallet(): void {
    this.fallbackToWallet.emit();
  }

  private mapAuthStatus(auth: PaymentAuthorization): 'idle' | 'authorized' | 'expired' | 'failed' {
    if (auth.status === 'authorized') return 'authorized';
    if (auth.status === 'expired') return 'expired';
    if (auth.status === 'failed') return 'failed';
    return 'idle';
  }
}
