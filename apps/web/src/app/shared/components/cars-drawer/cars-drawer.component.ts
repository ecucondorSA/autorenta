import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarCardComponent } from '../car-card/car-card.component';
import { SocialProofIndicatorsComponent } from '../social-proof-indicators/social-proof-indicators.component';
import { StickyCtaMobileComponent } from '../sticky-cta-mobile/sticky-cta-mobile.component';
import type { Car } from '../../../core/models';

export interface CarWithDistance extends Car {
  distance?: number;
  distanceText?: string;
}

@Component({
  selector: 'app-cars-drawer',
  standalone: true,
  imports: [
    CommonModule,
    CarCardComponent,
    SocialProofIndicatorsComponent,
    StickyCtaMobileComponent,
  ],
  template: `
    <div class="cars-drawer" [class.cars-drawer--open]="isOpen()">
      <!-- Header -->
      <div class="drawer-header">
        <div class="drawer-header-content">
          <h2 class="drawer-title">Autos disponibles</h2>
          <p class="drawer-subtitle" *ngIf="cars().length > 0">
            {{ cars().length }} {{ cars().length === 1 ? 'auto encontrado' : 'autos encontrados' }}
          </p>
        </div>
        <button
          type="button"
          (click)="onClose()"
          class="drawer-close-btn"
          aria-label="Cerrar panel"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <!-- Content -->
      <div class="drawer-content">
        <!-- Empty state -->
        <div *ngIf="cars().length === 0" class="drawer-empty">
          <svg
            class="w-16 h-16 text-text-secondary dark:text-text-secondary/50 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          <p class="text-text-secondary dark:text-text-secondary">No hay autos disponibles</p>
          <p class="text-sm text-text-secondary dark:text-text-secondary/70 mt-2">
            Intenta ajustar los filtros
          </p>
        </div>

        <!-- Car cards list -->
        <div
          *ngIf="cars().length > 0"
          class="drawer-cards grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div
            *ngFor="let car of cars(); trackBy: trackByCarId"
            class="drawer-card-wrapper flex flex-col gap-2 h-full"
            [class.drawer-card-wrapper--selected]="selectedCarId() === car.id"
          >
            <app-car-card
              [car]="car"
              [selected]="selectedCarId() === car.id"
              [distance]="car.distanceText"
              (click)="onCarSelected(car.id)"
              class="drawer-card"
            />
            <app-social-proof-indicators [car]="car" class="mt-2" />
          </div>
        </div>
      </div>

      <!-- Footer with CTA (desktop only) -->
      <div *ngIf="selectedCarId() && selectedCar()" class="drawer-footer">
        <app-sticky-cta-mobile
          [pricePerDay]="selectedCar()!.price_per_day"
          [ctaText]="'Reservar sin tarjeta'"
          [expressMode]="false"
          (ctaClick)="onReserveClick()"
        />
      </div>
    </div>
  `,
  styles: [
    `
      .cars-drawer {
        position: fixed;
        top: 0;
        right: -100%;
        width: 30%;
        height: 100vh;
        background: white;
        box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
        transition: right 0.3s ease;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .cars-drawer--open {
        right: 0;
      }

      .drawer-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem;
        border-bottom: 1px solid #e5e7eb;
        background: white;
        flex-shrink: 0;
      }

      .drawer-header-content {
        flex: 1;
      }

      .drawer-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1f2937;
        margin: 0 0 0.25rem 0;
      }

      .drawer-subtitle {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .drawer-close-btn {
        padding: 0.5rem;
        border: none;
        background: transparent;
        color: #6b7280;
        cursor: pointer;
        border-radius: 0.375rem;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .drawer-close-btn:hover {
        background: #f3f4f6;
        color: #1f2937;
      }

      .drawer-content {
        flex: 1;
        overflow-y: auto;
        padding: 1rem;
      }

      .drawer-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 3rem 1rem;
        text-align: center;
      }

      .drawer-card-wrapper {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        height: 100%;
        transition: all 0.2s ease;
      }

      .drawer-card-wrapper app-car-card {
        flex: 1 1 auto;
      }

      .drawer-card-wrapper--selected {
        transform: scale(1.02);
      }

      .drawer-card {
        border-radius: 0.75rem;
        overflow: hidden;
      }

      .drawer-footer {
        padding: 1rem;
        border-top: 1px solid #e5e7eb;
        background: white;
        flex-shrink: 0;
      }

      /* Mobile styles */
      @media (max-width: 1024px) {
        .cars-drawer {
          width: 100%;
          bottom: 0;
          top: auto;
          height: 60vh;
          right: 0;
          transform: translateY(100%);
          border-radius: 1rem 1rem 0 0;
        }

        .cars-drawer--open {
          transform: translateY(0);
        }

        .drawer-header {
          padding: 1rem;
        }

        .drawer-title {
          font-size: 1.125rem;
        }

        .drawer-content {
          padding: 0.75rem;
        }

        .drawer-footer {
          display: none; /* Hide footer on mobile, use sticky CTA instead */
        }
      }

      /* Dark mode */
      @media (prefers-color-scheme: dark) {
        .cars-drawer {
          background: #1f2937;
        }

        .drawer-header {
          background: #1f2937;
          border-bottom-color: #374151;
        }

        .drawer-title {
          color: #f9fafb;
        }

        .drawer-subtitle {
          color: #9ca3af;
        }

        .drawer-close-btn {
          color: #9ca3af;
        }

        .drawer-close-btn:hover {
          background: #374151;
          color: #f9fafb;
        }

        .drawer-footer {
          background: #1f2937;
          border-top-color: #374151;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsDrawerComponent {
  private readonly _cars = signal<CarWithDistance[]>([]);
  private readonly _isOpen = signal(false);
  private readonly _selectedCarId = signal<string | null>(null);

  readonly cars = this._cars.asReadonly();

  @Input()
  set carsInput(value: CarWithDistance[]) {
    this._cars.set(value);
  }

  readonly isOpen = this._isOpen.asReadonly();

  @Input()
  set isOpenInput(value: boolean) {
    this._isOpen.set(value);
  }

  readonly selectedCarId = this._selectedCarId.asReadonly();

  @Input()
  set selectedCarIdInput(value: string | null) {
    this._selectedCarId.set(value);
  }

  @Output() readonly carSelected = new EventEmitter<string>();
  @Output() readonly closeDrawer = new EventEmitter<void>();
  @Output() readonly reserveClick = new EventEmitter<string>();

  readonly selectedCar = computed(() => {
    const carId = this.selectedCarId();
    if (!carId) return null;
    return this.cars().find((c: CarWithDistance) => c.id === carId) || null;
  });

  onCarSelected(carId: string): void {
    this.carSelected.emit(carId);
  }

  onClose(): void {
    this.closeDrawer.emit();
  }

  onReserveClick(): void {
    const carId = this.selectedCarId();
    if (carId) {
      this.reserveClick.emit(carId);
    }
  }

  trackByCarId(_index: number, car: CarWithDistance): string {
    return car.id;
  }
}
