import { Component, ChangeDetectionStrategy, input, computed } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  documentTextOutline,
  logInOutline,
  carSportOutline,
  logOutOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { RentalStage } from '../models/rental-stage.model';

/**
 * BookingStepperComponent — Visual horizontal stepper for 5 rental stages.
 *
 * Shows: Pre-checkin → Check-in → En Viaje → Checkout → Post-checkout
 * Each step shows completed (green check), active (pulsing accent), or locked (grey).
 *
 * Modes:
 * - compact: short labels, 32px dots (for list items)
 * - normal: full labels, 32px dots (default)
 * - detailed: full labels + descriptions, 40px dots, ring highlight (for asset dashboard)
 */
@Component({
  selector: 'app-booking-stepper',
  standalone: true,
  imports: [IonIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="w-full">
      @if (detailed()) {
        <!-- ═══ DETAILED MODE: Asset Dashboard prominent stepper ═══ -->
        <div class="relative flex items-start justify-between mb-1">
          <!-- Background track -->
          <div
            class="absolute top-5 left-[10%] right-[10%] h-1 bg-slate-200 rounded-full"
          ></div>
          <!-- Filled track -->
          <div
            class="absolute top-5 left-[10%] h-1 bg-emerald-500 rounded-full transition-all duration-500"
            [style.width.%]="filledPercent()"
          ></div>

          <!-- Step dots (40px) -->
          @for (stage of stages(); track stage.id) {
            <div class="relative z-10 flex flex-col items-center" [style.width.%]="20">
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2"
                [class]="stepDotClassDetailed(stage)"
              >
                @if (stage.status === 'completed') {
                  <ion-icon name="checkmark-outline" class="text-base text-white"></ion-icon>
                } @else {
                  <ion-icon
                    [name]="stage.icon"
                    class="text-base"
                    [class]="stepIconClass(stage)"
                  ></ion-icon>
                }
              </div>
              <!-- Label -->
              <span
                class="text-xs font-semibold text-center leading-tight mt-2 transition-colors"
                [class]="stepLabelClass(stage)"
              >
                {{ stage.label }}
              </span>
              <!-- Description (only for active stage) -->
              @if (stage.status === 'active' && stage.detailedDescription) {
                <span class="text-[10px] text-emerald-600 text-center mt-0.5 max-w-[90px] leading-tight">
                  {{ stage.detailedDescription }}
                </span>
              }
            </div>
          }
        </div>
      } @else {
        <!-- ═══ COMPACT / NORMAL MODE (original) ═══ -->
        <div class="relative flex items-center justify-between mb-2">
          <!-- Background track -->
          <div
            class="absolute top-1/2 left-[10%] right-[10%] h-0.5 bg-slate-200 -translate-y-1/2 rounded-full"
          ></div>
          <!-- Filled track -->
          <div
            class="absolute top-1/2 left-[10%] h-0.5 bg-emerald-500 -translate-y-1/2 rounded-full transition-all duration-500"
            [style.width.%]="filledPercent()"
          ></div>

          <!-- Step dots (32px) -->
          @for (stage of stages(); track stage.id) {
            <div class="relative z-10 flex flex-col items-center" [style.width.%]="20">
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2"
                [class]="stepDotClass(stage)"
              >
                @if (stage.status === 'completed') {
                  <ion-icon name="checkmark-outline" class="text-sm text-white"></ion-icon>
                } @else {
                  <ion-icon
                    [name]="stage.icon"
                    class="text-sm"
                    [class]="stepIconClass(stage)"
                  ></ion-icon>
                }
              </div>
            </div>
          }
        </div>

        <!-- Labels row -->
        <div class="flex items-start justify-between">
          @for (stage of stages(); track stage.id) {
            <div class="flex flex-col items-center" [style.width.%]="20">
              <span
                class="text-[10px] font-semibold text-center leading-tight mt-1 transition-colors"
                [class]="stepLabelClass(stage)"
              >
                {{ compact() ? stage.shortLabel : stage.label }}
              </span>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class BookingStepperComponent {
  stages = input.required<RentalStage[]>();
  compact = input<boolean>(false);
  detailed = input<boolean>(false);

  constructor() {
    addIcons({
      documentTextOutline,
      logInOutline,
      carSportOutline,
      logOutOutline,
      checkmarkCircleOutline,
      checkmarkOutline,
    });
  }

  readonly filledPercent = computed(() => {
    const stg = this.stages();
    const activeIdx = stg.findIndex((s) => s.status === 'active');
    const completedCount = stg.filter((s) => s.status === 'completed').length;

    if (activeIdx === -1 && completedCount === stg.length) return 80; // all done
    if (activeIdx === -1) return 0;

    // Fill up to the active step (percent of the track between first and last dot)
    return (activeIdx / (stg.length - 1)) * 80;
  });

  // ─── Compact/Normal mode classes ─────────────────────────────────

  stepDotClass(stage: RentalStage): string {
    switch (stage.status) {
      case 'completed':
        return 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-200';
      case 'active':
        return 'bg-white border-emerald-500 shadow-md shadow-emerald-100 animate-pulse';
      case 'locked':
        return 'bg-slate-50 border-slate-200';
    }
  }

  // ─── Detailed mode classes ───────────────────────────────────────

  stepDotClassDetailed(stage: RentalStage): string {
    switch (stage.status) {
      case 'completed':
        return 'bg-emerald-500 border-emerald-500 shadow-md shadow-emerald-200';
      case 'active':
        return 'bg-white border-emerald-500 shadow-lg shadow-emerald-100 ring-4 ring-emerald-100';
      case 'locked':
        return 'bg-slate-50 border-slate-200';
    }
  }

  // ─── Shared classes ──────────────────────────────────────────────

  stepIconClass(stage: RentalStage): string {
    switch (stage.status) {
      case 'active':
        return 'text-emerald-600';
      case 'locked':
        return 'text-slate-300';
      default:
        return 'text-white';
    }
  }

  stepLabelClass(stage: RentalStage): string {
    switch (stage.status) {
      case 'completed':
        return 'text-emerald-600';
      case 'active':
        return 'text-slate-900 font-bold';
      case 'locked':
        return 'text-slate-300';
    }
  }
}
