import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { InsuranceService } from '../../../core/services/insurance.service';
import { InsuranceAddon } from '../../../core/models/insurance.model';

/**
 * Componente selector de seguros para checkout
 * Muestra cobertura incluida + add-ons opcionales
 */
@Component({
  selector: 'app-insurance-selector',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card class="insurance-card">
      <ion-card-header>
        <div class="header-content">
          <ion-icon name="shield-checkmark" color="success" class="shield-icon"></ion-icon>
          <div>
            <ion-card-title>Seguro Todo Riesgo Incluido</ion-card-title>
            <ion-card-subtitle>{{ insurerName }}</ion-card-subtitle>
          </div>
        </div>
      </ion-card-header>

      <ion-card-content>
        <!-- Cobertura Básica Incluida -->
        <div class="included-coverage">
          <h3>✅ Incluido en tu reserva:</h3>
          <ul class="coverage-list">
            <li>
              <ion-icon name="shield" color="success"></ion-icon>
              <span>Responsabilidad Civil hasta <strong>$180.000.000</strong></span>
            </li>
            <li>
              <ion-icon name="car" color="success"></ion-icon>
              <span>Daños propios, robo e incendio</span>
            </li>
            <li>
              <ion-icon name="rainy" color="success"></ion-icon>
              <span>Granizo sin límite</span>
            </li>
            <li>
              <ion-icon name="alert-circle" color="success"></ion-icon>
              <span>Apropiación indebida hasta $25M</span>
            </li>
            <li>
              <ion-icon name="call" color="success"></ion-icon>
              <span>Asistencia mecánica 24/7</span>
            </li>
          </ul>

          <div class="premium-info">
            <div class="premium-row" *ngIf="!hasOwnerInsurance">
              <span class="label">Seguro:</span>
              <span class="value"
                >{{ dailyPremium | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}/día</span
              >
            </div>
            <div class="premium-row total" *ngIf="!hasOwnerInsurance">
              <span class="label">Total {{ rentalDays }} días:</span>
              <span class="value highlight">{{
                totalBasePremium | currency: 'ARS' : 'symbol-narrow' : '1.0-0'
              }}</span>
            </div>
            <div class="owner-insurance-badge" *ngIf="hasOwnerInsurance">
              <ion-icon name="checkmark-circle" color="success"></ion-icon>
              <span>Este auto tiene seguro propio del dueño - <strong>Sin cargo</strong></span>
            </div>
          </div>

          <div class="deposit-info">
            <ion-icon name="information-circle" color="warning"></ion-icon>
            <div class="deposit-text">
              <strong>Tu Responsabilidad (Franquicia):</strong>
              <p>{{ depositAmount | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</p>
              <small
                >Este monto se congela en tu tarjeta durante el alquiler. Se devuelve
                automáticamente si no hay daños.</small
              >
            </div>
          </div>
        </div>

        <!-- Add-ons Opcionales -->
        <div class="addons-section" *ngIf="availableAddons.length > 0">
          <h3>
            <ion-icon name="star" color="warning"></ion-icon>
            Mejora tu cobertura (opcional):
          </h3>

          <div class="addon-item" *ngFor="let addon of availableAddons">
            <ion-checkbox
              [checked]="isAddonSelected(addon.id)"
              (ionChange)="toggleAddon(addon)"
              labelPlacement="end"
            >
            </ion-checkbox>
            <div class="addon-content" (click)="toggleAddon(addon)">
              <div class="addon-header">
                <h4>{{ addon.name }}</h4>
                <span class="addon-price"
                  >+{{ addon.daily_cost | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}/día</span
                >
              </div>
              <p class="addon-description">{{ addon.description }}</p>
              <div class="addon-total" *ngIf="isAddonSelected(addon.id)">
                <ion-icon name="calculator" color="primary"></ion-icon>
                <span
                  >Total:
                  {{
                    addon.daily_cost * rentalDays | currency: 'ARS' : 'symbol-narrow' : '1.0-0'
                  }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- Resumen Total con Add-ons -->
        <div class="total-section" *ngIf="totalAddonsCost > 0">
          <div class="total-row">
            <span>Seguro base:</span>
            <span>{{ totalBasePremium | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span>
          </div>
          <div class="total-row">
            <span>Add-ons seleccionados:</span>
            <span>+{{ totalAddonsCost | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</span>
          </div>
          <div class="total-row grand-total">
            <strong>Total Seguro:</strong>
            <strong>{{ totalInsuranceCost | currency: 'ARS' : 'symbol-narrow' : '1.0-0' }}</strong>
          </div>
        </div>

        <!-- Información Importante -->
        <ion-note color="medium" class="important-note">
          <ion-icon name="information-circle"></ion-icon>
          <div>
            <strong>En caso de accidente:</strong> Contacta inmediatamente al
            <strong>0800-AUTORENTAR</strong> (24/7). La franquicia se descuenta del depósito solo si
            hay daños.
          </div>
        </ion-note>

        <!-- Loading State -->
        <div class="loading-state" *ngIf="loading">
          <ion-spinner name="crescent"></ion-spinner>
          <p>Calculando cobertura...</p>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .insurance-card {
        margin: 16px 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .shield-icon {
        font-size: 32px;
      }

      .included-coverage {
        background: var(--ion-color-success-tint);
        padding: 16px;
        border-radius: 12px;
        margin-bottom: 20px;
      }

      .included-coverage h3 {
        font-size: 1.1em;
        margin: 0 0 12px 0;
        color: var(--ion-color-success-shade);
      }

      .coverage-list {
        list-style: none;
        padding: 0;
        margin: 0 0 16px 0;
      }

      .coverage-list li {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 0;
        font-size: 0.95em;
      }

      .coverage-list ion-icon {
        font-size: 18px;
        flex-shrink: 0;
      }

      .premium-info {
        background: white;
        padding: 12px;
        border-radius: 8px;
        margin-top: 12px;
      }

      .premium-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        font-size: 0.95em;
      }

      .premium-row.total {
        border-top: 2px solid var(--ion-color-light);
        margin-top: 8px;
        padding-top: 12px;
        font-size: 1.05em;
      }

      .premium-row .highlight {
        color: var(--ion-color-primary);
        font-weight: 600;
      }

      .owner-insurance-badge {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background: var(--ion-color-success-tint);
        border-radius: 8px;
        border-left: 4px solid var(--ion-color-success);
      }

      .owner-insurance-badge ion-icon {
        font-size: 24px;
      }

      .deposit-info {
        display: flex;
        gap: 12px;
        align-items: flex-start;
        background: var(--ion-color-warning-tint);
        padding: 12px;
        border-radius: 8px;
        margin-top: 12px;
        border-left: 4px solid var(--ion-color-warning);
      }

      .deposit-info ion-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .deposit-text strong {
        display: block;
        margin-bottom: 4px;
      }

      .deposit-text p {
        margin: 4px 0;
        font-size: 1.2em;
        color: var(--ion-color-warning-shade);
        font-weight: 600;
      }

      .deposit-text small {
        color: var(--ion-color-medium);
        font-size: 0.85em;
        line-height: 1.4;
      }

      .addons-section {
        margin-top: 24px;
      }

      .addons-section h3 {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1.1em;
        margin-bottom: 16px;
        color: var(--ion-color-dark);
      }

      .addon-item {
        display: flex;
        gap: 12px;
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 12px;
        margin-bottom: 12px;
        border: 2px solid transparent;
        transition: all 0.2s;
      }

      .addon-item:has(ion-checkbox:checked) {
        background: var(--ion-color-primary-tint);
        border-color: var(--ion-color-primary);
      }

      .addon-content {
        flex: 1;
        cursor: pointer;
      }

      .addon-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;
      }

      .addon-header h4 {
        margin: 0;
        font-size: 1em;
        font-weight: 600;
      }

      .addon-price {
        color: var(--ion-color-primary);
        font-weight: 600;
        font-size: 0.95em;
      }

      .addon-description {
        margin: 4px 0;
        font-size: 0.9em;
        color: var(--ion-color-medium);
      }

      .addon-total {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        padding: 8px;
        background: white;
        border-radius: 6px;
        font-weight: 600;
        color: var(--ion-color-primary);
      }

      .total-section {
        margin-top: 20px;
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 12px;
      }

      .total-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
      }

      .total-row.grand-total {
        border-top: 2px solid var(--ion-color-primary);
        margin-top: 8px;
        padding-top: 12px;
        font-size: 1.15em;
        color: var(--ion-color-primary);
      }

      .important-note {
        display: flex;
        gap: 12px;
        margin-top: 20px;
        padding: 12px;
        background: var(--ion-color-light);
        border-radius: 8px;
        border-left: 4px solid var(--ion-color-medium);
      }

      .important-note ion-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .important-note strong {
        color: var(--ion-color-dark);
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 24px;
      }

      .loading-state p {
        margin: 0;
        color: var(--ion-color-medium);
      }
    `,
  ],
})
export class InsuranceSelectorComponent implements OnInit {
  @Input() carId!: string;
  @Input() rentalDays: number = 1;
  @Output() addonsSelected = new EventEmitter<string[]>();
  @Output() totalCostChange = new EventEmitter<number>();
  @Output() depositCalculated = new EventEmitter<number>();

  private readonly insuranceService: InsuranceService = inject(InsuranceService);

  availableAddons: InsuranceAddon[] = [];
  selectedAddons = new Map<string, InsuranceAddon>();

  dailyPremium = 13500; // Default
  depositAmount = 750000; // Default
  hasOwnerInsurance = false;
  insurerName = 'Río Uruguay Seguros';
  loading = true;

  get totalBasePremium(): number {
    return this.hasOwnerInsurance ? 0 : this.dailyPremium * this.rentalDays;
  }

  get totalAddonsCost(): number {
    let total = 0;
    this.selectedAddons.forEach((addon) => {
      total += addon.daily_cost * this.rentalDays;
    });
    return total;
  }

  get totalInsuranceCost(): number {
    return this.totalBasePremium + this.totalAddonsCost;
  }

  ngOnInit() {
    this.loadInsuranceData();
  }

  async loadInsuranceData() {
    try {
      this.loading = true;

      // Cargar add-ons disponibles
      this.insuranceService.getAvailableAddons().subscribe((addons: InsuranceAddon[]) => {
        this.availableAddons = addons;
      });

      // Calcular depósito
      this.depositAmount = await this.insuranceService.calculateSecurityDeposit(this.carId);
      this.depositCalculated.emit(this.depositAmount);

      // Verificar si tiene seguro propio
      this.hasOwnerInsurance = await this.insuranceService.hasOwnerInsurance(this.carId);

      // Emitir costo inicial
      this.totalCostChange.emit(this.totalInsuranceCost);
    } catch {
      /* Silenced */
    } finally {
      this.loading = false;
    }
  }

  isAddonSelected(addonId: string): boolean {
    return this.selectedAddons.has(addonId);
  }

  toggleAddon(addon: InsuranceAddon) {
    if (this.selectedAddons.has(addon.id)) {
      this.selectedAddons.delete(addon.id);
    } else {
      this.selectedAddons.set(addon.id, addon);
    }

    this.emitChanges();
  }

  private emitChanges() {
    const selectedIds = Array.from(this.selectedAddons.keys());
    this.addonsSelected.emit(selectedIds);
    this.totalCostChange.emit(this.totalInsuranceCost);
  }
}
