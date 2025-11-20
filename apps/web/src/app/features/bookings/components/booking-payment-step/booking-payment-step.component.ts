import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, Input, OnInit, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Car } from '../../../../core/models';
import { BookingWizardData } from '../../pages/booking-wizard/booking-wizard.page';

@Component({
  selector: 'app-booking-payment-step',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <div class="payment-step-container">
      <div class="step-header">
        <h2>Método de pago</h2>
        <p>Selecciona cómo quieres pagar tu reserva</p>
      </div>

      <!-- Payment Method -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Método de pago</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-radio-group [(ngModel)]="paymentMethod" (ngModelChange)="onDataChange()">
            <ion-item>
              <ion-radio value="card">
                <ion-label>
                  <h3>Tarjeta de crédito/débito</h3>
                  <p>Pago seguro con MercadoPago</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio value="wallet">
                <ion-label>
                  <h3>Saldo en wallet</h3>
                  <p>Usa tu saldo disponible</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio value="bank_transfer">
                <ion-label>
                  <h3>Transferencia bancaria</h3>
                  <p>Pago mediante transferencia</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio value="split">
                <ion-label>
                  <h3>Pago mixto</h3>
                  <p>Combina wallet + tarjeta</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-card-content>
      </ion-card>

      <!-- Payment Plan -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Plan de pago</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-radio-group [(ngModel)]="paymentPlan" (ngModelChange)="onDataChange()">
            <ion-item>
              <ion-radio value="full">
                <ion-label>
                  <h3>Pago completo ahora</h3>
                  <p>Mejor precio</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio value="split_50_50">
                <ion-label>
                  <h3>50% ahora, 50% al check-in</h3>
                  <p>Divide el pago</p>
                </ion-label>
              </ion-radio>
            </ion-item>
            <ion-item>
              <ion-radio value="deposit_20">
                <ion-label>
                  <h3>20% ahora, resto 7 días antes</h3>
                  <p>Mayor flexibilidad</p>
                </ion-label>
              </ion-radio>
            </ion-item>
          </ion-radio-group>
        </ion-card-content>
      </ion-card>

      <!-- Promo Code -->
      <ion-card>
        <ion-card-header>
          <ion-card-title>Código promocional</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <ion-item>
            <ion-label position="stacked">¿Tienes un código?</ion-label>
            <ion-input
              [(ngModel)]="promoCode"
              (ngModelChange)="onDataChange()"
              placeholder="Ej: SUMMER2025"
            ></ion-input>
          </ion-item>
        </ion-card-content>
      </ion-card>

      @if (!isValid()) {
        <ion-note color="warning"> Selecciona un método de pago y plan de pago </ion-note>
      }
    </div>
  `,
  styles: [
    `
      .payment-step-container {
        max-width: 600px;
        margin: 0 auto;
      }
      .step-header {
        text-align: center;
        margin-bottom: 1.5rem;
      }
      .step-header h2 {
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
      }
      .step-header p {
        color: var(--ion-color-medium);
      }
      ion-card {
        margin-bottom: 1.5rem;
      }
      ion-radio {
        width: 100%;
      }
      ion-label h3 {
        font-weight: 600;
        margin: 0;
      }
      ion-label p {
        color: var(--ion-color-medium);
        font-size: 0.85rem;
        margin: 0.25rem 0 0;
      }
    `,
  ],
})
export class BookingPaymentStepComponent implements OnInit {
  @Input() car: Car | null = null;
  @Input() data: BookingWizardData | null = null;
  @Output() dataChange = new EventEmitter<Partial<BookingWizardData>>();

  paymentMethod = signal<string>('');
  paymentPlan = signal<string>('');
  promoCode = signal<string>('');

  isValid = computed(() => this.paymentMethod() !== '' && this.paymentPlan() !== '');

  ngOnInit() {
    if (this.data) {
      this.paymentMethod.set(this.data.paymentMethod || '');
      this.paymentPlan.set(this.data.paymentPlan || '');
      this.promoCode.set(this.data.promoCode || '');
    }
  }

  onDataChange() {
    this.dataChange.emit({
      paymentMethod: this.paymentMethod() as 'wallet' | 'card' | 'bank_transfer' | 'split' | null,
      paymentPlan: this.paymentPlan() as
        | 'full'
        | 'split_50_50'
        | 'deposit_20'
        | 'installments'
        | null,
      promoCode: this.promoCode() || null,
    });
  }
}
