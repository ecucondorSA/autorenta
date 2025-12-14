import { CommonModule } from '@angular/common';
import {Component, Input, OnInit, inject,
  ChangeDetectionStrategy} from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { InsuranceSummary } from '../../../core/models/insurance.model';
import { InsuranceService } from '../../../core/services/insurance.service';

/**
 * Componente que muestra el resumen de seguro de una reserva
 * Para mostrar en detalle de booking
 */
@Component({
  selector: 'app-insurance-summary-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule],
  template: `
    @if (summary) {
      <ion-card class="insurance-summary-card">
        <ion-card-header>
          <div class="header-with-icon">
            <ion-icon name="shield-checkmark" color="success"></ion-icon>
            <div>
              <ion-card-title>Cobertura de Seguro</ion-card-title>
              <ion-card-subtitle>{{ summary.insurer_display_name }}</ion-card-subtitle>
            </div>
          </div>
          <ion-badge color="success" class="type-badge">
            {{ summary.policy_type === 'platform_floating' ? 'Seguro Plataforma' : 'Seguro Propio' }}
          </ion-badge>
        </ion-card-header>
        <ion-card-content>
          <!-- Responsabilidad Civil -->
          <div class="coverage-item">
            <div class="coverage-icon">
              <ion-icon name="people" color="primary"></ion-icon>
            </div>
            <div class="coverage-detail">
              <strong>Responsabilidad Civil</strong>
              <p class="coverage-value">
                Hasta {{ summary.liability_coverage | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}
              </p>
            </div>
          </div>
          <!-- Franquicia / Depósito -->
          <div class="coverage-item highlight">
            <div class="coverage-icon">
              <ion-icon name="wallet" color="warning"></ion-icon>
            </div>
            <div class="coverage-detail">
              <strong>Tu Responsabilidad (Franquicia)</strong>
              <p class="coverage-value warning">
                {{ summary.deductible_amount | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}
              </p>
              <small>Monto máximo que pagarías en caso de daños</small>
            </div>
          </div>
          <!-- Coberturas Incluidas -->
          <div class="coverage-section">
            <h4>✅ Coberturas Incluidas:</h4>
            <div class="chips-container">
              @if (summary.coverage_details.rc) {
                <ion-chip color="success">
                  <ion-icon name="people"></ion-icon>
                  <ion-label>RC Terceros</ion-label>
                </ion-chip>
              }
              @if (summary.coverage_details.own_damage) {
                <ion-chip color="success">
                  <ion-icon name="construct"></ion-icon>
                  <ion-label>Daños Propios</ion-label>
                </ion-chip>
              }
              @if (summary.coverage_details.theft) {
                <ion-chip color="success">
                  <ion-icon name="lock-closed"></ion-icon>
                  <ion-label>Robo</ion-label>
                </ion-chip>
              }
              @if (summary.coverage_details.fire) {
                <ion-chip color="success">
                  <ion-icon name="flame"></ion-icon>
                  <ion-label>Incendio</ion-label>
                </ion-chip>
              }
              @if (summary.coverage_details.misappropriation) {
                <ion-chip color="success">
                  <ion-icon name="warning"></ion-icon>
                  <ion-label>Apropiación Indebida</ion-label>
                </ion-chip>
              }
            </div>
          </div>
          <!-- Add-ons Contratados -->
          @if (summary.addons && summary.addons.length > 0) {
            <div class="coverage-section">
              <h4>
                <ion-icon name="star" color="warning"></ion-icon>
                Add-ons Contratados:
              </h4>
              <div class="addon-list">
                @for (addon of summary.addons; track addon) {
                  <div class="addon-item-summary">
                    <ion-icon name="checkmark-circle" color="primary"></ion-icon>
                    <div class="addon-info">
                      <span class="addon-name">{{ addon.name }}</span>
                      <span class="addon-cost">{{
                        addon.total_cost | currency: 'ARS' : 'symbol-narrow' : '1.0-0'
                      }}</span>
                    </div>
                  </div>
                }
              </div>
            </div>
          }
          <!-- Costos -->
          @if (summary.total_premium > 0) {
            <div class="cost-breakdown">
              <div class="cost-row">
                <span>Seguro base:</span>
                <span>{{ summary.total_premium | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span>
              </div>
              @if (summary.daily_premium) {
                <div class="cost-row">
                  <small
                    >({{
                    summary.daily_premium | currency: 'ARS' : 'symbol-narrow' : '1.0-0'
                    }}/día)</small
                    >
                    <span></span>
                  </div>
                }
                @if (addonsTotalCost > 0) {
                  <div class="cost-row total">
                    <span>Add-ons:</span>
                    <span>+{{ addonsTotalCost | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span>
                  </div>
                }
                @if (addonsTotalCost > 0) {
                  <div class="cost-row grand-total">
                    <strong>Total Seguro:</strong>
                    <strong>{{
                      summary.total_premium + addonsTotalCost | currency: 'ARS' : 'symbol-narrow' : '1.0-0'
                    }}</strong>
                  </div>
                }
              </div>
            }
            <!-- Certificado -->
            @if (summary.certificate_number) {
              <ion-button
                expand="block"
                fill="outline"
                size="small"
                class="certificate-button"
                (click)="downloadCertificate()"
                >
                <ion-icon slot="start" name="document-text"></ion-icon>
                Certificado de Cobertura
                <br />
                <small>N° {{ summary.certificate_number }}</small>
              </ion-button>
            }
            <!-- Información Emergencia -->
            <div class="emergency-info">
              <ion-icon name="call" color="danger"></ion-icon>
              <div class="emergency-text">
                <strong>En caso de accidente:</strong>
                <p>
                  Contacta inmediatamente al
                  <a href="tel:0800-AUTORENTAR"><strong>0800-AUTORENTAR</strong></a>
                </p>
                <small>Disponible 24/7 - No muevas el vehículo hasta recibir instrucciones</small>
              </div>
            </div>
          </ion-card-content>
        </ion-card>
      }
    
      <!-- Loading State -->
      @if (loading) {
        <ion-card class="loading-card">
          <ion-card-content>
            <div class="loading-content">
              <ion-spinner name="crescent"></ion-spinner>
              <p>Cargando información del seguro...</p>
            </div>
          </ion-card-content>
        </ion-card>
      }
    
      <!-- Error State -->
      @if (error && !loading) {
        <ion-card color="danger" class="error-card">
          <ion-card-content>
            <div class="error-content">
              <ion-icon name="alert-circle"></ion-icon>
              <p>No se pudo cargar la información del seguro</p>
              <ion-button size="small" fill="clear" (click)="loadInsuranceSummary()">
                Reintentar
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }
    `,
  styles: [
    `
      .insurance-summary-card {
        margin: 16px 0;
        border-left: 4px solid var(--ion-color-success);
      }

      .header-with-icon {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 8px;
      }

      .header-with-icon ion-icon {
        font-size: 32px;
      }

      .type-badge {
        margin-top: 8px;
      }

      .coverage-item {
        display: flex;
        gap: 12px;
        margin-bottom: 16px;
        padding: 12px;
        background: var(--ion-color-light);
        border-radius: 8px;
      }

      .coverage-item.highlight {
        background: var(--ion-color-warning-tint);
        border-left: 4px solid var(--ion-color-warning);
      }

      .coverage-icon {
        flex-shrink: 0;
      }

      .coverage-icon ion-icon {
        font-size: 28px;
      }

      .coverage-detail {
        flex: 1;
      }

      .coverage-detail strong {
        display: block;
        margin-bottom: 4px;
        font-size: 0.95em;
      }

      .coverage-value {
        margin: 4px 0;
        font-size: 1.2em;
        font-weight: 600;
        color: var(--ion-color-primary);
      }

      .coverage-value.warning {
        color: var(--ion-color-warning-shade);
      }

      .coverage-detail small {
        color: var(--ion-color-medium);
        font-size: 0.85em;
      }

      .coverage-section {
        margin: 20px 0;
      }

      .coverage-section h4 {
        font-size: 1em;
        margin-bottom: 12px;
        color: var(--ion-color-dark);
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .addon-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .addon-item-summary {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        background: var(--ion-color-light);
        border-radius: 8px;
      }

      .addon-item-summary ion-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .addon-info {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .addon-name {
        font-weight: 500;
      }

      .addon-cost {
        color: var(--ion-color-primary);
        font-weight: 600;
      }

      .cost-breakdown {
        background: var(--ion-color-light);
        padding: 12px;
        border-radius: 8px;
        margin: 20px 0;
      }

      .cost-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
      }

      .cost-row small {
        color: var(--ion-color-medium);
      }

      .cost-row.total {
        border-top: 1px solid var(--ion-color-medium);
        margin-top: 8px;
        padding-top: 10px;
      }

      .cost-row.grand-total {
        border-top: 2px solid var(--ion-color-primary);
        margin-top: 8px;
        padding-top: 12px;
        font-size: 1.1em;
        color: var(--ion-color-primary);
      }

      .certificate-button {
        margin: 16px 0;
      }

      .certificate-button small {
        font-size: 0.75em;
        opacity: 0.8;
      }

      .emergency-info {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        margin-top: 20px;
        padding: 12px;
        background: var(--ion-color-danger-tint);
        border-radius: 8px;
        border-left: 4px solid var(--ion-color-danger);
      }

      .emergency-info ion-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .emergency-text strong {
        display: block;
        margin-bottom: 4px;
      }

      .emergency-text p {
        margin: 4px 0;
      }

      .emergency-text a {
        color: var(--ion-color-danger-shade);
        text-decoration: none;
      }

      .emergency-text small {
        color: var(--ion-color-medium);
        font-size: 0.85em;
      }

      .loading-card,
      .error-card {
        margin: 16px 0;
      }

      .loading-content,
      .error-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px;
        text-align: center;
      }

      .error-content ion-icon {
        font-size: 48px;
      }
    `,
  ],
})
export class InsuranceSummaryCardComponent implements OnInit {
  @Input() bookingId!: string;

  private readonly insuranceService = inject(InsuranceService);

  summary: InsuranceSummary | null = null;
  loading = true;
  error = false;

  get addonsTotalCost(): number {
    return this.summary?.addons.reduce((sum, addon) => sum + addon.total_cost, 0) || 0;
  }

  ngOnInit() {
    this.loadInsuranceSummary();
  }

  async loadInsuranceSummary() {
    try {
      this.loading = true;
      this.error = false;
      this.summary = await this.insuranceService.getInsuranceSummary(this.bookingId);
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  downloadCertificate() {
    // TODO: Generar PDF del certificado o abrir URL

    const certificateText = `
Certificado de Cobertura de Seguro
N° ${this.summary?.certificate_number}

Aseguradora: ${this.summary?.insurer_display_name}
Responsabilidad Civil: ${this.summary?.liability_coverage}
Franquicia: ${this.summary?.deductible_amount}

Para más información, contacta a tu aseguradora.
    `.trim();

    alert(certificateText);

    // En producción, esto debería:
    // 1. Generar un PDF con el certificado
    // 2. O abrir la URL del certificado si existe
    // 3. O enviar por email
  }
}
