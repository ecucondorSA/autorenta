import { Component, Input, Output, EventEmitter, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BookingWizardData } from '../../pages/booking-wizard/booking-wizard.page';
import { Car } from '../../../../core/models';

@Component({
  selector: 'app-booking-review-step',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  template: `
    <div class="review-step-container">
      <div class="step-header">
        <h2>Revisa tu reserva</h2>
        <p>Verifica que todo esté correcto antes de confirmar</p>
      </div>

      <!-- Car Summary -->
      @if (car) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>Auto seleccionado</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="car-summary">
              <img
                [src]="car.photos?.[0]?.url || '/assets/placeholder-car.jpg'"
                class="car-image"
              />
              <div>
                <h3>{{ car.brand }} {{ car.model }}</h3>
                <p>\${{ car.price_per_day }}/día</p>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      }

      <!-- Trip Details -->
      @if (data) {
        <ion-card>
          <ion-card-header>
            <ion-card-title>Detalles del viaje</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="detail-row">
              <span>Desde:</span>
              <strong>{{ data.startDate | date: 'short' }}</strong>
            </div>
            <div class="detail-row">
              <span>Hasta:</span>
              <strong>{{ data.endDate | date: 'short' }}</strong>
            </div>
            <div class="detail-row">
              <span>Recogida:</span>
              <strong>{{ data.pickupLocation?.address || 'N/A' }}</strong>
            </div>
            <div class="detail-row">
              <span>Seguro:</span>
              <strong>{{ data.insuranceLevel || 'N/A' }}</strong>
            </div>
            @if (data.extras && data.extras.length > 0) {
              <div class="detail-row">
                <span>Extras:</span>
                <strong>{{ data.extras.length }} seleccionado(s)</strong>
              </div>
            }
          </ion-card-content>
        </ion-card>

        <!-- Payment Summary -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Resumen de pago</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <div class="detail-row">
              <span>Método:</span>
              <strong>{{ getPaymentMethodLabel(data.paymentMethod) }}</strong>
            </div>
            <div class="detail-row">
              <span>Plan:</span>
              <strong>{{ getPaymentPlanLabel(data.paymentPlan) }}</strong>
            </div>
            @if (data.promoCode) {
              <div class="detail-row">
                <span>Código promo:</span>
                <strong>{{ data.promoCode }}</strong>
              </div>
            }
          </ion-card-content>
        </ion-card>
      }

      <!-- Terms & Conditions -->
      <ion-card>
        <ion-card-content>
          <ion-item lines="none">
            <ion-checkbox
              [(ngModel)]="termsAccepted"
              (ngModelChange)="onDataChange()"
            ></ion-checkbox>
            <ion-label class="ion-text-wrap">
              Acepto los <a href="/terms">términos y condiciones</a> de AutoRenta
            </ion-label>
          </ion-item>
          <ion-item lines="none">
            <ion-checkbox
              [(ngModel)]="cancellationPolicyAccepted"
              (ngModelChange)="onDataChange()"
            ></ion-checkbox>
            <ion-label class="ion-text-wrap">
              He leído y acepto la <a href="/cancellation">política de cancelación</a>
            </ion-label>
          </ion-item>
        </ion-card-content>
      </ion-card>

      @if (!isValid()) {
        <ion-note color="warning">
          Debes aceptar los términos y la política de cancelación para continuar
        </ion-note>
      }
    </div>
  `,
  styles: [
    `
      .review-step-container {
        max-width: 700px;
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
      .car-summary {
        display: flex;
        gap: 1rem;
        align-items: center;
      }
      .car-image {
        width: 120px;
        height: 90px;
        object-fit: cover;
        border-radius: 8px;
      }
      .car-summary h3 {
        font-weight: 600;
        margin: 0;
      }
      .car-summary p {
        color: var(--ion-color-primary);
        font-weight: 700;
        margin: 0.25rem 0 0;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem 0;
        border-bottom: 1px solid var(--ion-color-light);
      }
      .detail-row:last-child {
        border-bottom: none;
      }
      ion-item {
        --padding-start: 0;
      }
      a {
        color: var(--ion-color-primary);
        text-decoration: none;
      }
    `,
  ],
})
export class BookingReviewStepComponent implements OnInit {
  @Input() car: Car | null = null;
  @Input() data: BookingWizardData | null = null;
  @Output() dataChange = new EventEmitter<Partial<BookingWizardData>>();

  termsAccepted = signal(false);
  cancellationPolicyAccepted = signal(false);

  isValid = computed(() => this.termsAccepted() && this.cancellationPolicyAccepted());

  ngOnInit() {
    if (this.data) {
      this.termsAccepted.set(this.data.termsAccepted || false);
      this.cancellationPolicyAccepted.set(this.data.cancellationPolicyAccepted || false);
    }
  }

  onDataChange() {
    this.dataChange.emit({
      termsAccepted: this.termsAccepted(),
      cancellationPolicyAccepted: this.cancellationPolicyAccepted(),
    });
  }

  getPaymentMethodLabel(method: string | null): string {
    const labels: Record<string, string> = {
      card: 'Tarjeta',
      wallet: 'Wallet',
      bank_transfer: 'Transferencia',
      split: 'Pago mixto',
    };
    return labels[method || ''] || 'N/A';
  }

  getPaymentPlanLabel(plan: string | null): string {
    const labels: Record<string, string> = {
      full: 'Pago completo',
      split_50_50: '50% ahora, 50% al check-in',
      deposit_20: '20% ahora, resto 7 días antes',
    };
    return labels[plan || ''] || 'N/A';
  }
}
