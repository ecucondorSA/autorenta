import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DriverProfileService, ClassBenefits } from '../../../core/services/driver-profile.service';

@Component({
  selector: 'app-driver-profile-advanced',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Progreso hacia siguiente clase -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-6 shadow-sm">
        <h3 class="mb-4 text-lg font-semibold text-text-primary">Progreso de Clase</h3>
        @if (progress(); as p) {
          <div class="space-y-4">
            <div>
              <div class="mb-2 flex items-center justify-between">
                <span class="text-sm font-medium text-text-primary">Clase Actual</span>
                <span class="text-lg font-bold text-text-primary">Clase {{ p.currentClass }}</span>
              </div>
              @if (p.canImprove) {
                <div class="mb-2 flex items-center justify-between">
                  <span class="text-sm text-text-secondary">Próxima Clase</span>
                  <span class="text-sm font-medium text-cta-default">Clase {{ p.nextClass }}</span>
                </div>
                <div class="h-2 w-full rounded-full bg-surface-hover">
                  <div class="h-2 rounded-full bg-cta-default" [style.width.%]="50"></div>
                </div>
                <p class="mt-2 text-xs text-text-secondary">
                  Necesitas {{ p.yearsNeeded }} año(s) sin siniestros para mejorar
                </p>
              } @else {
                <p class="text-sm text-success-light">¡Ya estás en la mejor clase!</p>
              }
            </div>
          </div>
        }
      </div>

      <!-- Beneficios de todas las clases -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-6 shadow-sm">
        <h3 class="mb-4 text-lg font-semibold text-text-primary">Beneficios por Clase</h3>
        @if (loadingBenefits()) {
          <div class="flex items-center justify-center py-8">
            <div
              class="h-6 w-6 animate-spin rounded-full border-2 border-cta-default border-t-transparent"
            ></div>
          </div>
        } @else if (allBenefits().length > 0) {
          <div class="space-y-3">
            @for (benefit of allBenefits(); track benefit.class) {
              <div
                class="rounded-lg border p-4"
                [class.bg-success-light/10]="benefit.is_discount"
                [class.bg-error-bg]="!benefit.is_discount && benefit.fee_multiplier > 1"
                [class.bg-surface-base]="benefit.fee_multiplier === 1"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <h4 class="font-semibold text-text-primary">Clase {{ benefit.class }}</h4>
                    <p class="text-sm text-text-secondary">{{ benefit.description }}</p>
                  </div>
                  <div class="text-right">
                    @if (benefit.is_discount) {
                      <p class="text-sm font-medium text-success-light">
                        -{{ benefit.fee_discount_pct }}% fee
                      </p>
                      <p class="text-xs text-success-light">
                        -{{ benefit.guarantee_discount_pct }}% garantía
                      </p>
                    } @else if (benefit.fee_multiplier > 1) {
                      <p class="text-sm font-medium text-error-text">
                        +{{ roundPercent((benefit.fee_multiplier - 1) * 100) }}% fee
                      </p>
                      <p class="text-xs text-error-text">
                        +{{ roundPercent((benefit.guarantee_multiplier - 1) * 100) }}% garantía
                      </p>
                    } @else {
                      <p class="text-sm font-medium text-text-secondary">Sin ajustes</p>
                    }
                  </div>
                </div>
              </div>
            }
          </div>
        }
      </div>

      <!-- Impacto de siniestro -->
      <div class="rounded-lg border border-border-default bg-surface-raised p-6 shadow-sm">
        <h3 class="mb-4 text-lg font-semibold text-text-primary">Simulador de Impacto</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-text-primary"
              >Severidad del Siniestro</label
            >
            <select
              [(ngModel)]="claimSeverity"
              (change)="calculateImpact()"
              class="mt-1 block w-full rounded-md border border-border-muted px-3 py-2 text-sm"
            >
              <option [value]="1">Leve</option>
              <option [value]="2">Moderado</option>
              <option [value]="3">Grave</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-primary">
              <input
                type="checkbox"
                [(ngModel)]="withFault"
                (change)="calculateImpact()"
                class="mr-2"
              />
              Con culpa
            </label>
          </div>
          @if (impact(); as i) {
            <div class="rounded-lg bg-warning-bg p-4">
              <p class="text-sm font-medium text-warning-strong">Impacto Estimado:</p>
              <p class="mt-1 text-sm text-warning-strong">
                Clase actual: {{ i.currentClass }} → Nueva clase: {{ i.newClass }}
              </p>
              @if (i.classIncrease > 0) {
                <p class="mt-1 text-sm text-error-text">Aumento de clase: +{{ i.classIncrease }}</p>
              } @else {
                <p class="mt-1 text-sm text-success-light">Sin cambio de clase</p>
              }
            </div>
          }
        </div>
      </div>

      <!-- Mensaje motivacional -->
      @if (scoreMessage()) {
        <div class="rounded-lg border border-cta-default/40 bg-cta-default/10 p-4">
          <p class="text-sm font-medium text-cta-default">{{ scoreMessage() }}</p>
        </div>
      }
    </div>
  `,
})
export class DriverProfileAdvancedComponent implements OnInit {
  private readonly driverProfileService = inject(DriverProfileService);

  readonly progress = signal<{
    currentClass: number;
    nextClass: number;
    canImprove: boolean;
    yearsNeeded: number;
  } | null>(null);
  readonly allBenefits = signal<ClassBenefits[]>([]);
  readonly impact = signal<{
    currentClass: number;
    newClass: number;
    classIncrease: number;
  } | null>(null);
  readonly scoreMessage = signal<string | null>(null);
  readonly loadingBenefits = signal(false);

  claimSeverity = 1;
  withFault = false;

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadProgress(), this.loadAllBenefits(), this.loadScoreMessage()]);
  }

  async loadProgress(): Promise<void> {
    const progress = this.driverProfileService.getProgressToNextClass();
    this.progress.set(progress);
  }

  async loadAllBenefits(): Promise<void> {
    this.loadingBenefits.set(true);

    try {
      const benefits = await this.driverProfileService.getAllClassBenefits();
      this.allBenefits.set(benefits);
    } catch (err) {
      console.error('Error loading class benefits:', err);
    } finally {
      this.loadingBenefits.set(false);
    }
  }

  calculateImpact(): void {
    const impact = this.driverProfileService.calculateClaimImpact(
      this.claimSeverity,
      this.withFault,
    );
    this.impact.set(impact);
  }

  async loadScoreMessage(): Promise<void> {
    const message = this.driverProfileService.getScoreMessage();
    this.scoreMessage.set(message);
  }

  roundPercent(value: number): number {
    return Math.round(value);
  }
}
