import { ChangeDetectionStrategy, Component, computed, EventEmitter, input, Output } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import type { BookingCardAction, BookingUiState } from '@core/services/bookings/booking-ui.service';
import { BookingStatusBadgeComponent } from '../booking-status-badge/booking-status-badge.component';

export interface BookingActionCardData {
  id: string;
  /** Pre-computed UI state from BookingUiService */
  ui: BookingUiState;
  /** Car photo URL */
  carImage?: string | null;
  /** Car title (e.g. "Ford Ka 2018") */
  carTitle?: string;
  /** Date range display (e.g. "15 Mar - 20 Mar") */
  dateRange: string;
  /** Total amount display (e.g. "$45.000") */
  totalDisplay: string;
  /** Counterparty name (renter or owner name) */
  counterpartyName?: string;
  /** Counterparty avatar URL */
  counterpartyAvatar?: string;
}

/**
 * BookingActionCard — Molecule component
 *
 * "What do I need to do?" card showing:
 * - Left color accent border by status
 * - Car photo + title
 * - Status badge
 * - Contextual hint text
 * - Primary CTA button
 *
 * Sizes:
 * - 'full': Large card for Action Required section (big CTA)
 * - 'compact': Slim card for history/upcoming (small badge only)
 */
@Component({
  selector: 'app-booking-action-card',
  standalone: true,
  imports: [IonicModule, BookingStatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <!-- Full card (Action Required / Active) -->
    @if (variant() === 'full') {
      <div
        class="group relative rounded-2xl bg-white border border-slate-100 shadow-sm
               hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer
               border-l-4"
        [class]="data().ui.borderClass"
        (click)="cardClick.emit(data().id)">

        <div class="flex gap-3 p-3">
          <!-- Car Photo -->
          <div class="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-slate-100">
            @if (data().carImage) {
              <img
                [src]="data().carImage"
                [alt]="data().carTitle || 'Auto'"
                class="w-full h-full object-cover"
                loading="lazy" />
            } @else {
              <div class="w-full h-full flex items-center justify-center text-3xl">🚗</div>
            }
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0 flex flex-col justify-between">
            <!-- Top row: title + badge -->
            <div class="flex items-start justify-between gap-2">
              <p class="text-sm font-semibold text-slate-900 truncate">
                {{ data().carTitle || 'Auto' }}
              </p>
              <app-booking-status-badge
                [label]="data().ui.labelShort"
                [icon]="data().ui.icon"
                [badgeClass]="data().ui.badgeClass" />
            </div>

            <!-- Hint text (action-oriented) -->
            <p class="text-xs text-slate-500 line-clamp-2 mt-1">
              {{ data().ui.hint }}
            </p>

            <!-- Bottom row: date + amount -->
            <div class="flex items-center justify-between mt-1.5">
              <span class="text-xs text-slate-400">{{ data().dateRange }}</span>
              <span class="text-xs font-semibold text-slate-700">{{ data().totalDisplay }}</span>
            </div>
          </div>
        </div>

        <!-- Primary CTA -->
        @if (data().ui.primaryAction) {
          <div class="border-t border-slate-50 px-3 py-2">
            <button
              class="w-full flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold
                     transition-all duration-150 active:scale-[0.98]"
              [class]="ctaClasses()"
              (click)="actionClick.emit(data().ui.primaryAction!); $event.stopPropagation()">
              <ion-icon [name]="data().ui.primaryAction!.icon" class="text-base"></ion-icon>
              {{ data().ui.primaryAction!.label }}
            </button>
          </div>
        }
      </div>
    }

    <!-- Compact card (History / Upcoming) -->
    @if (variant() === 'compact') {
      <div
        class="flex items-center gap-3 rounded-xl bg-white border border-slate-100 p-3
               hover:bg-slate-50 transition-colors cursor-pointer border-l-4"
        [class]="data().ui.borderClass"
        (click)="cardClick.emit(data().id)">

        <!-- Small car photo -->
        <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-slate-100">
          @if (data().carImage) {
            <img [src]="data().carImage" [alt]="data().carTitle" class="w-full h-full object-cover" loading="lazy" />
          } @else {
            <div class="w-full h-full flex items-center justify-center text-xl">🚗</div>
          }
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <p class="text-sm font-medium text-slate-800 truncate">{{ data().carTitle || 'Auto' }}</p>
            <app-booking-status-badge
              [label]="data().ui.labelShort"
              [icon]="data().ui.icon"
              [badgeClass]="data().ui.badgeClass" />
          </div>
          <p class="text-xs text-slate-400 mt-0.5">{{ data().dateRange }}</p>
        </div>

        <!-- Amount -->
        <span class="text-sm font-semibold text-slate-600 flex-shrink-0">{{ data().totalDisplay }}</span>

        <!-- Chevron -->
        <ion-icon name="chevron-forward" class="text-slate-300 text-lg flex-shrink-0"></ion-icon>
      </div>
    }
  `,
})
export class BookingActionCardComponent {
  readonly data = input.required<BookingActionCardData>();
  readonly variant = input<'full' | 'compact'>('full');

  @Output() readonly cardClick = new EventEmitter<string>();
  @Output() readonly actionClick = new EventEmitter<BookingCardAction>();

  protected readonly ctaClasses = computed(() => {
    const action = this.data().ui.primaryAction;
    if (!action) return '';
    switch (action.variant) {
      case 'primary': return 'bg-blue-600 text-white hover:bg-blue-700';
      case 'danger': return 'bg-red-600 text-white hover:bg-red-700';
      case 'secondary': return 'bg-slate-100 text-slate-700 hover:bg-slate-200';
      case 'ghost': return 'text-blue-600 hover:bg-blue-50';
      default: return 'bg-blue-600 text-white';
    }
  });
}
