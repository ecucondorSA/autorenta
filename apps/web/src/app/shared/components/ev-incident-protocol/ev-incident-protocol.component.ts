import {
  Component,
  input,
  output,
  signal,
  computed,
  inject,
  effect,
  ChangeDetectionStrategy,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonCheckbox,
  IonInput,
  IonTextarea,
  IonAccordionGroup,
  IonAccordion,
  IonText,
  IonChip,
  IonBadge,
  IonProgressBar,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonNote,
  IonFab,
  IonFabButton,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  shieldCheckmark,
  batteryFull,
  thermometer,
  warning,
  flash,
  snow,
  power,
  documentText,
  camera,
  checkmarkCircle,
  alertCircle,
  chevronForward,
  chevronBack,
  call,
  logoWhatsapp,
  navigate,
} from 'ionicons/icons';

import { EVIncidentProtocolService } from '@core/services/ev-incident-protocol.service';
import type {
  EVProtocolSection,
  RiskAssessment,
  GeoLocation,
} from '@core/models/ev-incident-protocol.model';
import { getRiskColor, getRiskIcon } from '@core/models/ev-incident-protocol.model';

/**
 * EV Incident Protocol Bottom Sheet Component
 *
 * A step-by-step guide for documenting EV-specific incidents.
 * Features 8 collapsible sections with checklists and photo upload.
 */
@Component({
  selector: 'app-ev-incident-protocol',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonCheckbox,
    IonInput,
    IonTextarea,
    IonAccordionGroup,
    IonAccordion,
    IonText,
    IonChip,
    IonBadge,
    IonProgressBar,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonNote,
    IonFab,
    IonFabButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon name="close" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>Protocolo Incidente EV</ion-title>
        <ion-buttons slot="end">
          @if (service.saving()) {
            <ion-spinner name="dots"></ion-spinner>
          }
        </ion-buttons>
      </ion-toolbar>
      <ion-progress-bar [value]="progressValue()"></ion-progress-bar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (service.loading()) {
        <div class="loading-container">
          <ion-spinner name="circular"></ion-spinner>
          <p>Cargando protocolo...</p>
        </div>
      } @else if (service.error()) {
        <ion-card color="danger">
          <ion-card-content>
            <p>{{ service.error() }}</p>
            <ion-button fill="clear" (click)="service.clearError()">
              Reintentar
            </ion-button>
          </ion-card-content>
        </ion-card>
      } @else {
        <!-- Risk Assessment Card (if calculated) -->
        @if (service.riskAssessment(); as risk) {
          <ion-card [color]="getRiskCardColor(risk.overall_risk)">
            <ion-card-header>
              <ion-card-title>
                <ion-icon [name]="getRiskIcon(risk.overall_risk)"></ion-icon>
                Evaluación de Riesgo: {{ getRiskLabel(risk.overall_risk) }}
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="risk-action">{{ risk.recommended_action }}</p>
              @if (!risk.battery_safe) {
                <ion-note color="danger">
                  ⚠️ Batería potencialmente comprometida
                </ion-note>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- Sections Accordion -->
        <ion-accordion-group [multiple]="true" [value]="expandedSections()">
          @for (section of service.sections(); track section.id; let i = $index) {
            <ion-accordion [value]="section.id">
              <ion-item slot="header" [lines]="'full'" class="section-header">
                <ion-badge
                  slot="start"
                  [color]="getSectionStatusColor(section)"
                >
                  {{ section.step_number }}
                </ion-badge>
                <ion-icon
                  [name]="section.icon"
                  slot="start"
                  class="section-icon"
                  [color]="getSectionRiskColor(section)"
                ></ion-icon>
                <ion-label>
                  <h2>{{ section.title }}</h2>
                  <p>{{ section.description }}</p>
                </ion-label>
                @if (section.status === 'completed') {
                  <ion-icon
                    name="checkmark-circle"
                    slot="end"
                    color="success"
                  ></ion-icon>
                } @else if (section.risk_level === 'red') {
                  <ion-icon
                    name="alert-circle"
                    slot="end"
                    color="danger"
                  ></ion-icon>
                }
              </ion-item>

              <div slot="content" class="section-content">
                <!-- Checklist -->
                <ion-list lines="full">
                  @for (item of section.checklist; track item.id) {
                    <ion-item>
                      @switch (item.answer_type) {
                        @case ('yes_no') {
                          <ion-checkbox
                            slot="start"
                            [checked]="item.answer === true"
                            (ionChange)="onChecklistChange(section.id, item.id, $event.detail.checked)"
                          ></ion-checkbox>
                          <ion-label class="ion-text-wrap">
                            <h3>{{ item.question }}</h3>
                            @if (item.guidance && item.answer === true && item.risk_if_yes) {
                              <ion-note [color]="getRiskNoteColor(item.risk_if_yes)">
                                {{ item.guidance }}
                              </ion-note>
                            }
                          </ion-label>
                          @if (item.risk_if_yes) {
                            <ion-chip
                              slot="end"
                              [color]="item.answer === true ? getRiskNoteColor(item.risk_if_yes) : 'medium'"
                              size="small"
                            >
                              {{ item.risk_if_yes }}
                            </ion-chip>
                          }
                        }
                        @case ('number') {
                          <ion-label position="stacked">{{ item.question }}</ion-label>
                          <ion-input
                            type="number"
                            [value]="item.answer"
                            (ionChange)="onChecklistChange(section.id, item.id, $event.detail.value)"
                            placeholder="Ingresa un valor"
                          ></ion-input>
                        }
                        @case ('text') {
                          <ion-label position="stacked">{{ item.question }}</ion-label>
                          <ion-textarea
                            [value]="item.answer"
                            (ionChange)="onChecklistChange(section.id, item.id, $event.detail.value)"
                            placeholder="Escribe aquí..."
                            [autoGrow]="true"
                            rows="3"
                          ></ion-textarea>
                        }
                      }
                    </ion-item>
                  }
                </ion-list>

                <!-- Photos Section -->
                @if (section.photos_required > 0) {
                  <div class="photos-section">
                    <ion-text color="medium">
                      <p class="photos-label">
                        <ion-icon name="camera"></ion-icon>
                        Fotos requeridas: {{ section.photos_uploaded.length }}/{{ section.photos_required }}
                      </p>
                    </ion-text>

                    <div class="photos-grid">
                      @for (photo of section.photos_uploaded; track photo) {
                        <div class="photo-thumb">
                          <img [src]="photo" alt="Foto de evidencia" />
                        </div>
                      }
                      @if (section.photos_uploaded.length < section.photos_required) {
                        <ion-button
                          fill="outline"
                          class="add-photo-btn"
                          (click)="openCamera(section.id)"
                        >
                          <ion-icon name="camera" slot="icon-only"></ion-icon>
                        </ion-button>
                      }
                    </div>
                  </div>
                }

                <!-- Complete Section Button -->
                @if (section.status !== 'completed') {
                  <ion-button
                    expand="block"
                    [disabled]="!canCompleteSection(section)"
                    (click)="completeSection(section.id)"
                    class="complete-section-btn"
                  >
                    <ion-icon name="checkmark-circle" slot="start"></ion-icon>
                    Completar Sección
                  </ion-button>
                }
              </div>
            </ion-accordion>
          }
        </ion-accordion-group>

        <!-- Complete Protocol Button -->
        @if (service.isComplete()) {
          <div class="complete-protocol-section">
            <ion-button
              expand="block"
              color="success"
              (click)="completeProtocol()"
              [disabled]="service.saving()"
            >
              <ion-icon name="shield-checkmark" slot="start"></ion-icon>
              Finalizar Protocolo y Ver Evaluación
            </ion-button>
          </div>
        }

        <!-- Dealerships Section (shown after completion or if high risk) -->
        @if (showDealerships()) {
          <div class="dealerships-section">
            <ion-text color="dark">
              <h3>Concesionarios Oficiales Cercanos</h3>
            </ion-text>

            @if (service.nearbyDealerships().length === 0) {
              <ion-note>
                No se encontraron concesionarios cercanos. Contacta a la marca directamente.
              </ion-note>
            } @else {
              @for (dealer of service.nearbyDealerships(); track dealer.id) {
                <ion-card class="dealer-card">
                  <ion-card-header>
                    <ion-card-title>{{ dealer.name }}</ion-card-title>
                    <ion-chip size="small" color="primary">
                      {{ dealer.brand }}
                    </ion-chip>
                    @if (dealer.distance_km) {
                      <ion-chip size="small" color="medium">
                        {{ dealer.distance_km | number:'1.1-1' }} km
                      </ion-chip>
                    }
                  </ion-card-header>
                  <ion-card-content>
                    <p>{{ dealer.address }}, {{ dealer.city }}</p>
                    <div class="dealer-actions">
                      @if (dealer.emergency_phone) {
                        <ion-button
                          fill="outline"
                          size="small"
                          [href]="'tel:' + dealer.emergency_phone"
                        >
                          <ion-icon name="call" slot="start"></ion-icon>
                          Emergencia
                        </ion-button>
                      }
                      @if (dealer.whatsapp) {
                        <ion-button
                          fill="outline"
                          size="small"
                          [href]="'https://wa.me/' + dealer.whatsapp"
                          target="_blank"
                        >
                          <ion-icon name="logo-whatsapp" slot="start"></ion-icon>
                          WhatsApp
                        </ion-button>
                      }
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            }
          </div>
        }
      }
    </ion-content>

    <!-- Navigation FAB -->
    @if (!service.loading() && service.sections().length > 0) {
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button
          [disabled]="currentSectionIndex() >= service.sections().length - 1"
          (click)="service.nextSection()"
        >
          <ion-icon name="chevron-forward"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    }
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 50vh;
      gap: 16px;
    }

    .section-header {
      --padding-start: 8px;
    }

    .section-icon {
      font-size: 1.5rem;
      margin-left: 8px;
    }

    .section-content {
      padding: 16px;
      background: var(--ion-color-light);
    }

    .photos-section {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid var(--ion-color-light-shade);
    }

    .photos-label {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
      gap: 8px;
    }

    .photo-thumb {
      aspect-ratio: 1;
      border-radius: 8px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .add-photo-btn {
      aspect-ratio: 1;
      width: 100%;
      height: 80px;
    }

    .complete-section-btn {
      margin-top: 16px;
    }

    .complete-protocol-section {
      margin: 24px 0;
      padding: 16px;
      background: var(--ion-color-success-tint);
      border-radius: 12px;
    }

    .dealerships-section {
      margin-top: 24px;

      h3 {
        margin-bottom: 16px;
      }
    }

    .dealer-card {
      margin-bottom: 12px;
    }

    .dealer-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .risk-action {
      font-weight: 500;
      margin-bottom: 8px;
    }

    ion-note {
      display: block;
      margin-top: 8px;
      font-size: 0.85rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EVIncidentProtocolComponent implements OnDestroy {
  private readonly modalController = inject(ModalController);
  readonly service = inject(EVIncidentProtocolService);

  // Inputs
  readonly bookingId = input.required<string>();
  readonly claimId = input<string>();
  readonly carBrand = input<string>('');
  readonly location = input<GeoLocation>();

  // Outputs
  readonly protocolCompleted = output<RiskAssessment>();

  // Local state
  readonly expandedSections = signal<string[]>([]);
  readonly currentSectionIndex = computed(() => this.service.currentSectionIndex());

  readonly progressValue = computed(() => this.service.progress() / 100);

  readonly showDealerships = computed(() => {
    const risk = this.service.riskAssessment();
    const hasHighRisk = this.service.hasHighRisk();
    return risk !== null || hasHighRisk;
  });

  constructor() {
    addIcons({
      close,
      shieldCheckmark,
      batteryFull,
      thermometer,
      warning,
      flash,
      snow,
      power,
      documentText,
      camera,
      checkmarkCircle,
      alertCircle,
      chevronForward,
      chevronBack,
      call,
      logoWhatsapp,
      navigate,
    });

    // Initialize protocol when component loads
    effect(() => {
      const bookingId = this.bookingId();
      if (bookingId) {
        this.initializeProtocol();
      }
    });

    // Expand current section
    effect(() => {
      const sections = this.service.sections();
      const index = this.service.currentSectionIndex();
      if (sections.length > 0 && sections[index]) {
        this.expandedSections.set([sections[index].id]);
      }
    });

    // Fetch dealerships when high risk is detected
    effect(() => {
      if (this.service.hasHighRisk() && this.location()) {
        const loc = this.location()!;
        const brand = this.carBrand();
        this.service.getNearbyDealerships(brand, loc);
      }
    });
  }

  ngOnDestroy(): void {
    this.service.clearProtocol();
  }

  async initializeProtocol(): Promise<void> {
    try {
      await this.service.createProtocol(
        this.bookingId(),
        this.claimId(),
        this.location(),
      );
    } catch (err) {
      console.error('Failed to initialize protocol:', err);
    }
  }

  async onChecklistChange(
    sectionId: string,
    itemId: string,
    value: boolean | string | number | null | undefined,
  ): Promise<void> {
    if (value === null || value === undefined) return;
    try {
      await this.service.updateChecklistAnswer(sectionId, itemId, value);
      // Recalculate local risk
      this.service.calculateLocalRisk();
    } catch (err) {
      console.error('Failed to update checklist:', err);
    }
  }

  async openCamera(sectionId: string): Promise<void> {
    // In a real implementation, this would open the camera
    // For now, we'll use file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';

    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          await this.service.uploadSectionPhoto(sectionId, file);
        } catch (err) {
          console.error('Failed to upload photo:', err);
        }
      }
    };

    input.click();
  }

  canCompleteSection(section: EVProtocolSection): boolean {
    // Check all yes/no questions are answered
    const allYesNoAnswered = section.checklist
      .filter(item => item.answer_type === 'yes_no')
      .every(item => item.answer !== undefined);

    // Check minimum photos uploaded
    const hasEnoughPhotos = section.photos_uploaded.length >= section.photos_required;

    return allYesNoAnswered && hasEnoughPhotos;
  }

  async completeSection(sectionId: string): Promise<void> {
    try {
      await this.service.completeSection(sectionId);
    } catch (err) {
      console.error('Failed to complete section:', err);
    }
  }

  async completeProtocol(): Promise<void> {
    try {
      const assessment = await this.service.completeProtocol();
      this.protocolCompleted.emit(assessment);

      // Fetch dealerships if risk is high
      const loc = this.location();
      if (loc && (assessment.overall_risk === 'critical' || assessment.overall_risk === 'danger')) {
        await this.service.getNearbyDealerships(this.carBrand(), loc);
      }
    } catch (err) {
      console.error('Failed to complete protocol:', err);
    }
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  getSectionStatusColor(section: EVProtocolSection): string {
    if (section.status === 'completed') return 'success';
    if (section.status === 'in_progress') return 'primary';
    return 'medium';
  }

  getSectionRiskColor(section: EVProtocolSection): string {
    return getRiskColor(section.risk_level);
  }

  getRiskCardColor(risk: string): string {
    switch (risk) {
      case 'safe': return 'success';
      case 'caution': return 'warning';
      case 'danger': return 'warning';
      case 'critical': return 'danger';
      default: return 'medium';
    }
  }

  getRiskIcon(risk: string): string {
    return getRiskIcon(risk as 'safe' | 'caution' | 'danger' | 'critical');
  }

  getRiskLabel(risk: string): string {
    switch (risk) {
      case 'safe': return 'Seguro';
      case 'caution': return 'Precaución';
      case 'danger': return 'Peligro';
      case 'critical': return 'Crítico';
      default: return 'Desconocido';
    }
  }

  getRiskNoteColor(risk: string): string {
    switch (risk) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'warning';
      case 'critical': return 'danger';
      default: return 'medium';
    }
  }
}
