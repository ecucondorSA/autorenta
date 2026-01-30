import { Component, Input, ElementRef, ViewChild, ChangeDetectionStrategy, effect, inject, HostListener, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { SoundService } from '@core/services/ui/sound.service';
import { CarMiniCardComponent } from '../car-mini-card/car-mini-card.component';
import { BrowseStore } from '../../../features/cars/browse/browse.store';

@Component({
  selector: 'app-car-carousel',
  standalone: true,
  imports: [CommonModule, CarMiniCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pointer-events-auto w-full overflow-hidden px-4 sm:px-8 pb-6"
         tabindex="0"
         (focus)="onFocus()">
      @if (loading) {
        <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 hide-scrollbar">
          @for (i of [1,2,3]; track i) {
            <div class="min-w-[85vw] sm:min-w-[350px] h-32 bg-surface-secondary/40 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden relative">
              <!-- Shimmer Effect -->
              <div class="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>
          }
        </div>
      } @else {
        <div #scrollContainer
             class="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-4 hide-scrollbar items-center pr-[30vw]"
             (scroll)="onScroll()"
             (touchstart)="onTouchStart($event)"
             (touchmove)="onTouchMove($event)"
             (touchend)="onTouchEnd()">
          @for (car of cars; track car.carId) {
            <div [id]="'card-' + car.carId"
                 class="snap-center shrink-0 min-w-[70vw] sm:min-w-[280px] h-full">
              <app-car-mini-card 
                [car]="car" 
                [isSelected]="selectedCarId === car.carId"
                (cardClicked)="onCardClick(car.carId)">
              </app-car-mini-card>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes shimmer { 100% { transform: translateX(100%); } }
    .animate-shimmer { animation: shimmer 1.5s infinite; }
  `]
})
export class CarCarouselComponent {
  @Input() cars: CarMapLocation[] = [];
  @Input() selectedCarId: string | null = null;
  @Input() loading = false;

  /** Emits the carId of the card currently in the center during scroll (preview, not selection) */
  @Output() readonly previewChange = new EventEmitter<string | null>();

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  /** The car currently being previewed (in center of carousel during scroll) */
  readonly previewCarId = signal<string | null>(null);

  private store = inject(BrowseStore);
  private sound = inject(SoundService);
  private scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  private isProgrammaticScroll = false;

  // Touch/swipe tracking to prevent accidental clicks during scroll
  private touchStartX = 0;
  private touchStartY = 0;
  private isSwipe = false;
  private readonly SWIPE_THRESHOLD = 10; // pixels moved to consider it a swipe

  // Keyboard Navigation
  @HostListener('document:keydown.arrowLeft')
  onArrowLeft() { this.navigateCarousel(-1); }

  @HostListener('document:keydown.arrowRight')
  onArrowRight() { this.navigateCarousel(1); }

  onFocus() { /* Allows keyboard focus */ }

  navigateCarousel(direction: -1 | 1) {
    if (this.loading || this.cars.length === 0) return;

    const currentIndex = this.cars.findIndex(c => c.carId === this.selectedCarId);
    let newIndex = currentIndex + direction;

    // Wrap around
    if (newIndex < 0) newIndex = this.cars.length - 1;
    if (newIndex >= this.cars.length) newIndex = 0;

    const newCar = this.cars[newIndex];
    if (newCar) {
      this.sound.play('tick');
      this.store.setActiveCar(newCar.carId, 'carousel');
      this.scrollToCard(newCar.carId);
    }
  }

  constructor() {
    effect(() => {
      const activeId = this.store.activeCarId();
      const source = this.store.interactionSource();

      if (activeId && source === 'map' && this.scrollContainer) {
        this.scrollToCard(activeId);
      }
    });
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.isSwipe = false;
  }

  onTouchMove(event: TouchEvent) {
    if (this.isSwipe) return; // Already marked as swipe

    const deltaX = Math.abs(event.touches[0].clientX - this.touchStartX);
    const deltaY = Math.abs(event.touches[0].clientY - this.touchStartY);

    // If finger moved more than threshold, it's a swipe not a tap
    if (deltaX > this.SWIPE_THRESHOLD || deltaY > this.SWIPE_THRESHOLD) {
      this.isSwipe = true;
    }
  }

  onTouchEnd() {
    // Reset after a short delay to allow click event to check isSwipe
    setTimeout(() => {
      this.isSwipe = false;
    }, 100);
  }

  onCardClick(carId: string) {
    // Ignore clicks that were actually swipes
    if (this.isSwipe) {
      return;
    }

    this.sound.play('click');
    this.store.setActiveCar(carId, 'carousel');
    this.scrollToCard(carId);
  }

  scrollToCard(carId: string) {
    requestAnimationFrame(() => {
      const el = document.getElementById('card-' + carId);
      if (el && this.scrollContainer) {
        this.isProgrammaticScroll = true;
        const container = this.scrollContainer.nativeElement;
        const cardLeft = el.offsetLeft;
        const cardWidth = el.offsetWidth;
        const containerWidth = container.offsetWidth;

        const scrollLeft = cardLeft - (containerWidth / 2) + (cardWidth / 2);

        container.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });

        setTimeout(() => this.isProgrammaticScroll = false, 500);
      }
    });
  }

  onScroll() {
    if (this.isProgrammaticScroll) return;

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = setTimeout(() => {
      this.detectActiveCard();
    }, 150);
  }

  private detectActiveCard() {
    if (!this.scrollContainer || this.loading) return;
    const container = this.scrollContainer.nativeElement;
    const scrollLeft = container.scrollLeft;
    const center = scrollLeft + container.offsetWidth / 2;

    let closestCard = '';
    let minDistance = Infinity;

    this.cars.forEach(car => {
      const el = document.getElementById('card-' + car.carId);
      if (el) {
        const cardCenter = el.offsetLeft + el.offsetWidth / 2;
        const distance = Math.abs(center - cardCenter);
        if (distance < minDistance) {
          minDistance = distance;
          closestCard = car.carId;
        }
      }
    });

    // Only update preview, NOT selection - selection requires explicit click
    if (closestCard && closestCard !== this.previewCarId()) {
      this.sound.play('tick'); // Haptic Snap Feedback
      this.previewCarId.set(closestCard);
      this.previewChange.emit(closestCard);
    }
  }
}
