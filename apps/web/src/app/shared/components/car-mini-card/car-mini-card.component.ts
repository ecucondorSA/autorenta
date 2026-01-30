import { Component, Input, ChangeDetectionStrategy, Output, EventEmitter, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/cars/car-locations.service';

@Component({
  selector: 'app-car-mini-card',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="relative group cursor-pointer transition-all duration-300 transform h-full preserve-3d"
      [class.scale-105]="isSelected"
      [class.z-30]="isSelected"
      [style.transform]="cardTransform"
      (click)="onClick($event)"
      (touchstart)="onTouchStart($event)"
      (touchmove)="onTouchMoveCard($event)"
      (touchend)="onTouchEndCard()"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
      (mousemove)="onMouseMove($event)">
      
      <!-- Glow Effect Background -->
      @if (isSelected) {
        <div class="absolute -inset-1 bg-gradient-to-r from-brand-primary/30 via-brand-primary/50 to-brand-primary/30 blur-xl rounded-2xl opacity-60 animate-pulse"></div>
      }
      
      <!-- Glass Card -->
      <div class="relative h-full bg-black/60 backdrop-blur-xl border-l-[3px] rounded-2xl p-3 flex gap-4 transition-all duration-300 hover:bg-black/80"
           [class.border-brand-primary]="isSelected"
           [class.border-transparent]="!isSelected"
           [class.shadow-neon-glow]="isSelected">
        
        <!-- Photo with Parallax + Blur Placeholder -->
        <div class="w-24 h-24 rounded-lg overflow-hidden shrink-0 relative border border-white/5">
           <!-- Skeleton Placeholder -->
           <div class="absolute inset-0 bg-gradient-to-r from-surface-secondary via-white/5 to-surface-secondary animate-pulse"></div>
           
           <img [src]="car.photoUrl || '/assets/images/car-placeholder.svg'" 
                class="absolute inset-0 w-full h-full object-cover transition-all duration-500"
                [class.opacity-0]="!imageLoaded"
                [class.blur-sm]="!imageLoaded"
                [class.scale-105]="!imageLoaded"
                [style.transform]="imageLoaded ? 'scale(1.1) translate(' + parallaxX + 'px, ' + parallaxY + 'px)' : ''"
                (load)="onImageLoad()"
                loading="lazy" />
           
           <!-- Shine overlay -->
           <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        </div>

        <!-- Info -->
        <div class="flex-1 flex flex-col justify-center min-w-0">
          <div class="flex justify-between items-start gap-2">
            <div class="min-w-0">
              <h3 class="font-bold text-white leading-tight font-satoshi truncate text-ellipsis">{{ car.title }}</h3>
              <div class="flex items-center gap-2 mt-1">
                <p class="text-xs text-white/50 truncate">{{ car.city }}</p>
                <!-- Rating Stars -->
                <div class="flex items-center gap-0.5">
                  <svg class="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  <span class="text-xs text-white/60 font-medium">4.9</span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              @if (car.instantBooking) {
                <div class="bg-brand-primary/10 p-1 rounded-md animate-pulse" title="Reserva Instantánea">
                  <svg class="text-brand-primary w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
              }
              <!-- Verified Owner Badge -->
              <div class="bg-blue-500/10 p-1 rounded-md" title="Propietario Verificado">
                <svg class="text-blue-400 w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
              </div>
            </div>
          </div>

          <div class="mt-3 flex items-center justify-between gap-2">
            <span class="text-lg font-black text-white tracking-tight shrink-0">
              \${{ car.pricePerDay | number:'1.0-0' }}
              <span class="text-[10px] font-normal text-white/50 align-top">/día</span>
            </span>
            
            <button class="bg-brand-primary text-black text-xs font-bold px-4 py-1.5 rounded-lg transition-all duration-200 hover:scale-105 hover:bg-white hover:text-black active:scale-95 whitespace-nowrap">
              Reservar
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; perspective: 1000px; }
    .preserve-3d { transform-style: preserve-3d; }
  `]
})
export class CarMiniCardComponent {
  @Input({ required: true }) car!: CarMapLocation;
  @Input() isSelected = false;
  @Output() cardClicked = new EventEmitter<void>();

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
    // Don't emit click if this was triggered by a touch that moved (swipe)
    if (this.wasSwiped) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.cardClicked.emit();
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
