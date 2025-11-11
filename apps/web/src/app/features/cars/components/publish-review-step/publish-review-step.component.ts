import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WizardStepComponent } from '../../../../shared/components/wizard-step/wizard-step.component';
import { PublishBasicInfo } from '../publish-basic-info-step/publish-basic-info-step.component';
import { PublishPhotosDescription } from '../publish-photos-description-step/publish-photos-description-step.component';
import { PublishPriceAvailability } from '../publish-price-availability-step/publish-price-availability-step.component';

@Component({
  selector: 'app-publish-review-step',
  standalone: true,
  imports: [CommonModule, WizardStepComponent],
  template: `
    <app-wizard-step
      title="Revisión y Publicación"
      subtitle="Revisa todos los detalles antes de publicar tu vehículo"
    >
      <div class="review-summary">
        <!-- Basic Info Summary -->
        <div class="summary-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Información Básica
          </h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="item-label">Vehículo</span
              ><span class="item-value"
                >{{ basicInfo().brand }} {{ basicInfo().model }} {{ basicInfo().year }}</span
              >
            </div>
            <div class="summary-item">
              <span class="item-label">Categoría</span
              ><span class="item-value">{{ getCategoryLabel(basicInfo().category) }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Transmisión</span
              ><span class="item-value">{{ basicInfo().transmission }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Combustible</span
              ><span class="item-value">{{ basicInfo().fuelType }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Patente</span
              ><span class="item-value">{{ basicInfo().licensePlate }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Color</span
              ><span class="item-value">{{ basicInfo().color }}</span>
            </div>
          </div>
        </div>

        <!-- Photos & Description Summary -->
        <div class="summary-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            Fotos y Descripción
          </h3>
          <div class="summary-content">
            <p class="summary-text">
              <strong>{{ photos().photos.length }} fotos</strong> seleccionadas
            </p>
            <p class="summary-text description">{{ photos().description }}</p>
            @if (photos().features.length > 0) {
              <div class="features-list">
                <strong>Características:</strong>
                @for (feature of photos().features; track feature) {
                  <span class="feature-tag">{{ feature }}</span>
                }
              </div>
            }
          </div>
        </div>

        <!-- Price & Availability Summary -->
        <div class="summary-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Precio y Disponibilidad
          </h3>
          <div class="summary-grid">
            <div class="summary-item highlight">
              <span class="item-label">Tarifa Diaria</span
              ><span class="item-value price">{{ formatCurrency(priceAvail().dailyRate) }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Descuento Semanal</span
              ><span class="item-value">{{ priceAvail().weeklyDiscount }}%</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Descuento Mensual</span
              ><span class="item-value">{{ priceAvail().monthlyDiscount }}%</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Ubicación</span
              ><span class="item-value">{{ priceAvail().address }}, {{ priceAvail().city }}</span>
            </div>
            <div class="summary-item">
              <span class="item-label">Disponible Desde</span
              ><span class="item-value">{{ formatDate(priceAvail().availableFrom) }}</span>
            </div>
          </div>
        </div>

        <!-- Terms -->
        <div class="terms-section">
          <h3 class="summary-title">
            <svg class="title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Términos y Condiciones
          </h3>
          <ul class="terms-list">
            <li>Confirmo que soy el propietario o tengo autorización para rentar este vehículo</li>
            <li>El vehículo cuenta con seguro vigente y documentación en regla</li>
            <li>
              Acepto las <a href="/legal/terms" target="_blank">condiciones de servicio</a> para
              locadores
            </li>
            <li>Entiendo que AutoRenta cobrará una comisión del 15% por reserva completada</li>
          </ul>
        </div>
      </div>
    </app-wizard-step>
  `,
  styles: [
    `
      .review-summary {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }
      .summary-section {
        background: var(--surface-base);
        border: 1px solid var(--border-default);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
      }
      .summary-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 1rem 0;
      }
      .title-icon {
        width: 1.5rem;
        height: 1.5rem;
        color: var(--cta-default);
      }
      .summary-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 1rem;
      }
      .summary-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .summary-item.highlight {
        grid-column: 1 / -1;
        padding: 0.75rem;
        background: var(--success-50);
        border-radius: var(--radius-md);
      }
      .item-label {
        font-size: 0.8125rem;
        color: var(--text-secondary);
      }
      .item-value {
        font-size: 0.9375rem;
        font-weight: 600;
        color: var(--text-primary);
      }
      .item-value.price {
        font-size: 1.5rem;
        color: var(--success-700);
      }
      .summary-content {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .summary-text {
        margin: 0;
        font-size: 0.875rem;
        color: var(--text-primary);
      }
      .summary-text.description {
        color: var(--text-secondary);
        font-style: italic;
      }
      .features-list {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
      .feature-tag {
        font-size: 0.75rem;
        padding: 0.25rem 0.625rem;
        background: var(--info-50);
        color: var(--info-700);
        border-radius: var(--radius-sm);
      }
      .terms-section {
        background: var(--warning-50);
        border: 1px solid var(--warning-200);
        border-radius: var(--radius-lg);
        padding: 1.5rem;
      }
      .terms-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .terms-list li {
        font-size: 0.875rem;
        color: var(--warning-900);
        padding-left: 1.5rem;
        position: relative;
      }
      .terms-list li::before {
        content: '✓';
        position: absolute;
        left: 0.5rem;
        color: var(--warning-700);
        font-weight: 700;
      }
      .terms-list a {
        color: var(--cta-default);
        text-decoration: underline;
      }
      @media (max-width: 768px) {
        .summary-grid {
          grid-template-columns: 1fr;
        }
        .summary-item.highlight {
          grid-column: 1;
        }
      }
    `,
  ],
})
export class PublishReviewStepComponent {
  basicInfo = input.required<PublishBasicInfo>();
  photos = input.required<PublishPhotosDescription>();
  priceAvail = input.required<PublishPriceAvailability>();

  getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      economy: 'Económico',
      sedan: 'Sedán',
      suv: 'SUV',
      pickup: 'Pickup',
      van: 'Van',
      luxury: 'Lujo',
      sports: 'Deportivo',
    };
    return labels[category] || category;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('es-AR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
