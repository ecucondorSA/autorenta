import {
  Component,
  input,
  output,
  signal,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonItem,
  IonLabel,
  IonCheckbox,
  IonButton,
  IonIcon,
  IonAccordionGroup,
  IonAccordion,
  IonText,
  IonChip,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  wine,
  shieldCheckmark,
  lockClosed,
  timer,
  location,
  map,
  batteryCharging,
  flash,
  construct,
  checkmarkCircle,
  alertCircle,
  chevronDown,
} from 'ionicons/icons';

import {
  type BaseClausesAccepted,
  type EVClausesAccepted,
  type ClausesAccepted,
  BASE_CLAUSE_DEFINITIONS,
  EV_CLAUSE_DEFINITIONS,
} from '@core/services/bookings/contracts.service';

/**
 * Output event when all clauses are accepted
 */
export interface ClausesAcceptedEvent {
  baseClauses: BaseClausesAccepted;
  evClauses?: EVClausesAccepted;
  allClauses: ClausesAccepted;
}

type BaseClauseId = keyof BaseClausesAccepted;
type EVClauseId = keyof EVClausesAccepted;

const BASE_CLAUSE_IDS: ReadonlySet<BaseClauseId> = new Set([
  'culpaGrave',
  'indemnidad',
  'retencion',
  'mora',
]);

const EV_CLAUSE_IDS: ReadonlySet<EVClauseId> = new Set([
  'gpsTracking',
  'geofencing',
  'batteryManagement',
  'chargingObligations',
  'evDamagePolicy',
]);

/**
 * Component for granular acceptance of contract clauses
 *
 * Features:
 * - Expandable clause descriptions
 * - Separate sections for base and EV clauses
 * - Visual feedback for accepted/pending clauses
 * - Validation that all required clauses are accepted
 */
@Component({
  selector: 'app-contract-clauses-acceptance',
  standalone: true,
  imports: [
    FormsModule,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonButton,
    IonIcon,
    IonAccordionGroup,
    IonAccordion,
    IonText,
    IonChip,
    IonNote,
  ],
  template: `
    <div class="clauses-container">
      <!-- Base Clauses Section -->
      <div class="clauses-section">
        <div class="section-header">
          <ion-text color="dark">
            <h3 class="section-title">Cláusulas Generales</h3>
          </ion-text>
          <ion-chip [color]="baseClausesComplete() ? 'success' : 'warning'" size="small">
            <ion-icon
              [name]="baseClausesComplete() ? 'checkmark-circle' : 'alert-circle'"
            ></ion-icon>
            {{ baseClausesAcceptedCount() }}/{{ baseClauseDefinitions.length }}
          </ion-chip>
        </div>

        <ion-accordion-group [multiple]="true">
          @for (clause of baseClauseDefinitions; track clause.id) {
            <ion-accordion [value]="clause.id">
              <ion-item slot="header" [lines]="'full'" class="clause-header">
                <ion-checkbox
                  slot="start"
                  [checked]="isBaseClauseAccepted(clause.id)"
                  (ionChange)="toggleBaseClause(clause.id, $event)"
                  (click)="$event.stopPropagation()"
                ></ion-checkbox>
                <ion-icon
                  [name]="clause.icon"
                  slot="start"
                  class="clause-icon"
                  [color]="isBaseClauseAccepted(clause.id) ? 'success' : 'medium'"
                ></ion-icon>
                <ion-label>
                  <h2>{{ clause.title }}</h2>
                  @if (clause.legalReference) {
                    <p class="legal-ref">{{ clause.legalReference }}</p>
                  }
                </ion-label>
              </ion-item>

              <div slot="content" class="clause-content">
                <p>{{ clause.description }}</p>
              </div>
            </ion-accordion>
          }
        </ion-accordion-group>
      </div>

      <!-- EV Clauses Section (only if EV vehicle) -->
      @if (isEVVehicle()) {
        <div class="clauses-section ev-section">
          <div class="section-header">
            <ion-text color="dark">
              <h3 class="section-title">
                <ion-icon name="flash" class="ev-icon"></ion-icon>
                Cláusulas Vehículo Eléctrico
              </h3>
            </ion-text>
            <ion-chip [color]="evClausesComplete() ? 'success' : 'warning'" size="small">
              <ion-icon
                [name]="evClausesComplete() ? 'checkmark-circle' : 'alert-circle'"
              ></ion-icon>
              {{ evClausesAcceptedCount() }}/{{ evClauseDefinitions.length }}
            </ion-chip>
          </div>

          <ion-note class="ev-notice" color="primary">
            Estas cláusulas son específicas para vehículos eléctricos y cubren aspectos de batería,
            carga y sistemas especiales.
          </ion-note>

          <ion-accordion-group [multiple]="true">
            @for (clause of evClauseDefinitions; track clause.id) {
              <ion-accordion [value]="clause.id">
                <ion-item slot="header" [lines]="'full'" class="clause-header">
                  <ion-checkbox
                    slot="start"
                    [checked]="isEVClauseAccepted(clause.id)"
                    (ionChange)="toggleEVClause(clause.id, $event)"
                    (click)="$event.stopPropagation()"
                  ></ion-checkbox>
                  <ion-icon
                    [name]="clause.icon"
                    slot="start"
                    class="clause-icon"
                    [color]="isEVClauseAccepted(clause.id) ? 'success' : 'medium'"
                  ></ion-icon>
                  <ion-label>
                    <h2>{{ clause.title }}</h2>
                  </ion-label>
                </ion-item>

                <div slot="content" class="clause-content">
                  <p>{{ clause.description }}</p>
                </div>
              </ion-accordion>
            }
          </ion-accordion-group>
        </div>
      }

      <!-- Accept All Button -->
      <div class="accept-section">
        @if (!allClausesAccepted()) {
          <ion-button expand="block" fill="outline" (click)="acceptAll()" class="accept-all-btn">
            <ion-icon name="checkmark-circle" slot="start"></ion-icon>
            Aceptar Todas las Cláusulas
          </ion-button>
        }

        <ion-button
          expand="block"
          [disabled]="!allClausesAccepted()"
          (click)="confirmAcceptance()"
          class="confirm-btn"
        >
          <ion-icon name="shield-checkmark" slot="start"></ion-icon>
          @if (allClausesAccepted()) {
            Confirmar y Firmar Contrato
          } @else {
            Acepta todas las cláusulas para continuar
          }
        </ion-button>
      </div>
    </div>
  `,
  styles: [
    `
      .clauses-container {
        padding: 16px;
      }

      .clauses-section {
        margin-bottom: 24px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding: 0 8px;
      }

      .section-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .ev-icon {
        color: var(--ion-color-primary);
      }

      .ev-section {
        background: var(--ion-color-primary-tint);
        border-radius: 12px;
        padding: 16px;
        margin-top: 24px;
      }

      .ev-notice {
        display: block;
        padding: 12px;
        margin-bottom: 16px;
        background: var(--ion-color-primary-contrast);
        border-radius: 8px;
        font-size: 0.85rem;
      }

      .clause-header {
        --padding-start: 0;
      }

      .clause-icon {
        font-size: 1.5rem;
        margin-right: 8px;
      }

      .clause-content {
        padding: 16px;
        background: var(--ion-color-light);
        border-radius: 8px;
        margin: 8px 16px 16px 16px;

        p {
          margin: 0;
          color: var(--ion-color-dark);
          line-height: 1.5;
        }
      }

      .legal-ref {
        color: var(--ion-color-medium) !important;
        font-size: 0.85rem;
        font-style: italic;
      }

      .accept-section {
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--ion-color-light-shade);
      }

      .accept-all-btn {
        margin-bottom: 12px;
      }

      .confirm-btn {
        --background: var(--ion-color-success);
      }

      .confirm-btn[disabled] {
        --background: var(--ion-color-medium);
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContractClausesAcceptanceComponent {
  // Inputs
  readonly isEVVehicle = input<boolean>(false);
  readonly initialBaseClauses = input<Partial<BaseClausesAccepted>>({});
  readonly initialEVClauses = input<Partial<EVClausesAccepted>>({});

  // Outputs
  readonly clausesConfirmed = output<ClausesAcceptedEvent>();

  // Clause definitions
  readonly baseClauseDefinitions = BASE_CLAUSE_DEFINITIONS;
  readonly evClauseDefinitions = EV_CLAUSE_DEFINITIONS;

  // State
  readonly baseClauses = signal<BaseClausesAccepted>({
    culpaGrave: false,
    indemnidad: false,
    retencion: false,
    mora: false,
  });

  readonly evClauses = signal<EVClausesAccepted>({
    gpsTracking: false,
    geofencing: false,
    batteryManagement: false,
    chargingObligations: false,
    evDamagePolicy: false,
  });

  // Computed
  readonly baseClausesAcceptedCount = computed(() => {
    const clauses = this.baseClauses();
    return Object.values(clauses).filter(Boolean).length;
  });

  readonly evClausesAcceptedCount = computed(() => {
    const clauses = this.evClauses();
    return Object.values(clauses).filter(Boolean).length;
  });

  readonly baseClausesComplete = computed(() => {
    return this.baseClausesAcceptedCount() === this.baseClauseDefinitions.length;
  });

  readonly evClausesComplete = computed(() => {
    if (!this.isEVVehicle()) return true;
    return this.evClausesAcceptedCount() === this.evClauseDefinitions.length;
  });

  readonly allClausesAccepted = computed(() => {
    return this.baseClausesComplete() && this.evClausesComplete();
  });

  constructor() {
    addIcons({
      wine,
      shieldCheckmark,
      lockClosed,
      timer,
      location,
      map,
      batteryCharging,
      flash,
      construct,
      checkmarkCircle,
      alertCircle,
      chevronDown,
    });

    // Initialize from inputs
    effect(() => {
      const initial = this.initialBaseClauses();
      if (Object.keys(initial).length > 0) {
        this.baseClauses.update((current) => ({ ...current, ...initial }));
      }
    });

    effect(() => {
      const initial = this.initialEVClauses();
      if (Object.keys(initial).length > 0) {
        this.evClauses.update((current) => ({ ...current, ...initial }));
      }
    });
  }

  private isBaseClauseId(id: string): id is BaseClauseId {
    return BASE_CLAUSE_IDS.has(id as BaseClauseId);
  }

  private isEVClauseId(id: string): id is EVClauseId {
    return EV_CLAUSE_IDS.has(id as EVClauseId);
  }

  isBaseClauseAccepted(id: string): boolean {
    if (!this.isBaseClauseId(id)) {
      return false;
    }
    return this.baseClauses()[id];
  }

  isEVClauseAccepted(id: string): boolean {
    if (!this.isEVClauseId(id)) {
      return false;
    }
    return this.evClauses()[id];
  }

  toggleBaseClause(clauseId: string, event: CustomEvent): void {
    if (!this.isBaseClauseId(clauseId)) return;
    event.stopPropagation();
    const checked = event.detail.checked;
    this.baseClauses.update((current) => ({
      ...current,
      [clauseId]: checked,
    }));
  }

  toggleEVClause(clauseId: string, event: CustomEvent): void {
    if (!this.isEVClauseId(clauseId)) return;
    event.stopPropagation();
    const checked = event.detail.checked;
    this.evClauses.update((current) => ({
      ...current,
      [clauseId]: checked,
    }));
  }

  acceptAll(): void {
    // Accept all base clauses
    this.baseClauses.set({
      culpaGrave: true,
      indemnidad: true,
      retencion: true,
      mora: true,
    });

    // Accept all EV clauses if applicable
    if (this.isEVVehicle()) {
      this.evClauses.set({
        gpsTracking: true,
        geofencing: true,
        batteryManagement: true,
        chargingObligations: true,
        evDamagePolicy: true,
      });
    }
  }

  confirmAcceptance(): void {
    if (!this.allClausesAccepted()) return;

    const baseClauses = this.baseClauses();
    const evClauses = this.isEVVehicle() ? this.evClauses() : undefined;

    const allClauses: ClausesAccepted = {
      ...baseClauses,
      ...(evClauses || {}),
    };

    this.clausesConfirmed.emit({
      baseClauses,
      evClauses,
      allClauses,
    });
  }
}
