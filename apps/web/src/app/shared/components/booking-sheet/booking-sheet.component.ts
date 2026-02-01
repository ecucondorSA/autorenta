import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, ElementRef, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { SoundService } from '@core/services/ui/sound.service';

@Component({
  selector: 'app-booking-sheet',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (car) {
      <div class="fixed inset-0 z-50 flex items-end justify-center pointer-events-none">
        
        <!-- Backdrop (Click to dismiss) -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 pointer-events-auto"
             (click)="dismiss()"></div>

        <!-- Sheet Panel (Swipeable) -->
        <div #sheetPanel
             class="relative w-full max-w-lg bg-black/80 backdrop-blur-xl border-t border-white/10 rounded-t-3xl p-6 pb-safe-bottom shadow-2xl pointer-events-auto animate-slide-up"
             [style.transform]="'translateY(' + dragOffset + 'px)'"
             [style.transition]="isDragging ? 'none' : 'transform 0.3s ease-out'"
             (touchstart)="onTouchStart($event)"
             (touchmove)="onTouchMove($event)"
             (touchend)="onTouchEnd()">
          
          <!-- Handle (Visual indicator for swipe) -->
          <div class="w-12 h-1 bg-white/30 rounded-full mx-auto mb-6 cursor-grab active:cursor-grabbing hover:bg-white/50 transition-colors"></div>

          <div class="flex gap-4">
            <!-- Large Photo -->
            <div class="w-24 h-24 rounded-2xl overflow-hidden bg-surface-secondary border border-white/10 shadow-lg shrink-0 relative group">
               <img [src]="car.photoUrl || '/assets/images/car-placeholder.svg'" class="w-full h-full object-cover" />
            </div>

            <div class="flex-1">
              <h2 class="text-2xl font-black text-white font-satoshi tracking-tight">{{ car.title }}</h2>
              <div class="flex items-center gap-2 mt-1">
                 @if (car.instantBooking) {
                   <span class="text-brand-primary text-sm font-bold bg-brand-primary/10 px-2 py-0.5 rounded flex items-center gap-1">
                     <svg class="w-3 h-3 animate-pulse" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                     Instant
                   </span>
                 } @else {
                   <span class="text-brand-primary text-sm font-bold bg-brand-primary/10 px-2 py-0.5 rounded">Premium</span>
                 }
                 <span class="text-white/60 text-sm">{{ car.city }}</span>
              </div>
            </div>
          </div>

          <!-- Specs Grid -->
          <div class="grid grid-cols-3 gap-3 mt-6">
             <div class="bg-zinc-800/40 backdrop-blur-md rounded-2xl p-3 text-center border border-white/5">
                <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Caja</div>
                <div class="text-white font-bold text-sm">{{ car.transmission === 'automatic' ? 'Auto' : 'Manual' }}</div>
             </div>
             <div class="bg-zinc-800/40 backdrop-blur-md rounded-2xl p-3 text-center border border-white/5">
                <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Asientos</div>
                <div class="text-white font-bold text-sm">{{ car.seats || 5 }}</div>
             </div>
             <div class="bg-zinc-800/40 backdrop-blur-md rounded-2xl p-3 text-center border border-white/5">
                <div class="text-zinc-500 text-[10px] uppercase font-bold tracking-wider mb-1">Motor</div>
                <div class="text-white font-bold text-sm truncate capitalize">{{ car.fuelType || 'Nafta' }}</div>
             </div>
          </div>

          <!-- Description (If available) -->
          @if (car.description) {
            <p class="mt-6 text-zinc-400 text-sm leading-relaxed line-clamp-3 font-medium">
              {{ car.description }}
            </p>
          }

          <!-- Final Action -->
          <div class="mt-8 flex items-center justify-between gap-4 border-t border-white/5 pt-6">
             <div class="text-white">
                <div class="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Aporte diario</div>
                <div class="text-3xl font-black tracking-tight font-sans">
                  USD {{ car.pricePerDay | number:'1.0-0' }}
                </div>
             </div>
             
             <button (click)="onConfirm()"
                     class="flex-1 bg-white text-black font-black text-lg py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl hover:bg-zinc-200">
                Continuar
             </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    @keyframes slide-up {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .animate-slide-up {
      animation: slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `]
})
export class BookingSheetComponent {
  @ViewChild('sheetPanel') sheetPanel!: ElementRef<HTMLDivElement>;

  private sound = inject(SoundService);

  _car: CarMapLocation | null = null;
  dragOffset = 0;
  isDragging = false;
  private startY = 0;
  private readonly DISMISS_THRESHOLD = 100; // px to trigger dismiss

  @Input() set car(value: CarMapLocation | null) {
    this._car = value;
    this.dragOffset = 0; // Reset drag on new car
    if (value) {
      try {
        this.sound.play('pop');
      } catch (e) { console.warn('Sound play failed', e); }
    }
  }
  get car(): CarMapLocation | null {
    return this._car;
  }

  @Output() sheetClosed = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();

  // Keyboard: Escape to dismiss
  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.car) this.dismiss();
  }

  onTouchStart(e: TouchEvent) {
    this.isDragging = true;
    this.startY = e.touches[0].clientY;
  }

  onTouchMove(e: TouchEvent) {
    if (!this.isDragging) return;
    const deltaY = e.touches[0].clientY - this.startY;
    // Only allow dragging down (positive delta)
    this.dragOffset = Math.max(0, deltaY);
  }

  onTouchEnd() {
    this.isDragging = false;
    if (this.dragOffset > this.DISMISS_THRESHOLD) {
      this.dismiss();
    } else {
      // Snap back
      this.dragOffset = 0;
    }
  }

  dismiss() {
    this.sound.play('swoosh');
    this.sheetClosed.emit();
  }

  onConfirm() {
    this.sound.play('success');
    this.confirmed.emit();
  }
}
