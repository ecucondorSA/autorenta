import {
  Component,
  Input,
  ChangeDetectionStrategy,
  Output,
  EventEmitter,
  ElementRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/cars/car-locations.service';

@Component({
  selector: 'app-car-mini-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative group transition-all duration-300 transform h-full preserve-3d"
      [class.scale-105]="isSelected"
      [class.z-30]="isSelected"
      [class.cursor-pointer]="!isDisabled"
      [class.cursor-not-allowed]="isDisabled"
      [class.opacity-80]="isDisabled"
      [style.transform]="cardTransform"
      (click)="onClick($event)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMoveCard($event)"
      (touchend)="onTouchEndCard()"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
      (mousemove)="onMouseMove($event)"
    >
      <!-- Glass Card (Dark Ivory Style) -->
      <div
        class="relative h-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 flex gap-4 transition-all duration-300 hover:border-zinc-700 hover:bg-zinc-800/80"
        [class.ring-1]="isSelected"
        [class.ring-white]="isSelected"
        [class.bg-zinc-800]="isSelected"
      >
        <!-- Photo with Parallax + Blur Placeholder -->
        <div class="w-24 h-24 rounded-lg overflow-hidden shrink-0 relative bg-zinc-950">
          <!-- Skeleton Placeholder -->
          @if (!imageLoaded) {
            <div class="absolute inset-0 bg-zinc-800 animate-pulse"></div>
          }

          <img
            [src]="car.photoUrl || '/assets/images/car-placeholder.svg'"
            class="absolute inset-0 w-full h-full object-cover transition-all duration-500"
            [class.opacity-0]="!imageLoaded"
            [class.scale-105]="!imageLoaded"
            [class.grayscale]="isDisabled"
            [class.opacity-70]="isDisabled"
            [style.transform]="
              imageLoaded ? 'scale(1.1) translate(' + parallaxX + 'px, ' + parallaxY + 'px)' : ''
            "
            (load)="onImageLoad()"
            loading="lazy"
            [alt]="car.title || 'Auto'"
          />

          @if (isDisabled) {
            <div class="absolute inset-0 bg-black/35 flex items-center justify-center">
              <span
                class="text-[9px] font-black uppercase tracking-wide text-white bg-black/70 px-2 py-1 rounded-md border border-white/10"
              >
                En verificación
              </span>
            </div>
          }
        </div>

        <!-- Info -->
        <div class="flex-1 flex flex-col justify-center min-w-0">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <h3
                class="font-bold text-white leading-tight font-sans truncate text-ellipsis text-sm"
              >
                {{ car.title }}
              </h3>
              <div class="flex items-center gap-2 mt-1">
                <p class="text-[10px] text-zinc-400 truncate uppercase tracking-wide font-bold">
                  {{ car.city }}
                </p>
                <!-- New badge (no reviews yet in platform) -->
                <div
                  class="flex items-center gap-0.5 bg-zinc-950 px-1.5 py-0.5 rounded border border-white/5"
                >
                  <svg class="w-2.5 h-2.5 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fill-rule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clip-rule="evenodd"
                    />
                  </svg>
                  <span class="text-[10px] text-emerald-400 font-bold">Nuevo</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              @if (car.instantBooking) {
                <div class="bg-emerald-500/10 p-1 rounded-md" title="Reserva Instantánea">
                  <svg
                    class="text-emerald-500 w-3 h-3"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                  >
                    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                  </svg>
                </div>
              }
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
            <span
              class="text-sm font-black text-white tracking-tight shrink-0 flex items-baseline gap-1"
            >
              <span class="text-[10px] font-bold text-zinc-500">USD</span>
              {{ car.pricePerDay | number: '1.0-0' }}
            </span>

            <button
              class="text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all duration-200 active:scale-95 whitespace-nowrap"
              [class.bg-white]="!isDisabled"
              [class.text-black]="!isDisabled"
              [class.hover:bg-zinc-200]="!isDisabled"
              [class.bg-zinc-700]="isDisabled"
              [class.text-zinc-200]="isDisabled"
              [class.cursor-not-allowed]="isDisabled"
              [attr.aria-disabled]="isDisabled ? 'true' : null"
            >
              {{ isDisabled ? 'En verificación' : 'Ver Info' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        perspective: 1000px;
      }
      .preserve-3d {
        transform-style: preserve-3d;
      }
    `,
  ],
})
export class CarMiniCardComponent {
  @Input({ required: true }) car!: CarMapLocation;
  @Input() isSelected = false;
  @Output() cardClicked = new EventEmitter<MouseEvent>();

  private el = inject(ElementRef);

  cardTransform = '';
  parallaxX = 0;
  parallaxY = 0;
  imageLoaded = false;
  private isHovering = false;

  onImageLoad() {
    this.imageLoaded = true;
  }

  // Track touch to prevent click during swipe
  private touchStartX = 0;
  private touchStartY = 0;
  private wasSwiped = false;
  private readonly TOUCH_MOVE_THRESHOLD = 5;

  get isDisabled(): boolean {
    return this.car?.ownerVerified === false;
  }

  onTouchStart(event: TouchEvent) {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
    this.wasSwiped = false;
  }

  onTouchMoveCard(event: TouchEvent) {
    if (this.wasSwiped) return;
    const deltaX = Math.abs(event.touches[0].clientX - this.touchStartX);
    const deltaY = Math.abs(event.touches[0].clientY - this.touchStartY);
    if (deltaX > this.TOUCH_MOVE_THRESHOLD || deltaY > this.TOUCH_MOVE_THRESHOLD) {
      this.wasSwiped = true;
    }
  }

  onTouchEndCard() {
    // Keep wasSwiped true for a bit to catch the click event
    setTimeout(() => {
      this.wasSwiped = false;
    }, 150);
  }

  onClick(event: MouseEvent) {
    if (this.isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // Don't emit click if this was triggered by a touch that moved (swipe)
    if (this.wasSwiped) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    // Pass the event so parent can validate isTrusted
    this.cardClicked.emit(event);
  }

  onMouseEnter() {
    this.isHovering = true;
  }

  onMouseLeave() {
    this.isHovering = false;
    this.cardTransform = 'rotateX(0deg) rotateY(0deg)';
    this.parallaxX = 0;
    this.parallaxY = 0;
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isHovering) return;

    const rect = this.el.nativeElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateY = ((x - centerX) / centerX) * 8; // Max 8deg
    const rotateX = ((centerY - y) / centerY) * 5; // Max 5deg

    this.cardTransform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

    // Parallax for photo
    this.parallaxX = ((x - centerX) / centerX) * 5;
    this.parallaxY = ((y - centerY) / centerY) * 5;
  }
}
