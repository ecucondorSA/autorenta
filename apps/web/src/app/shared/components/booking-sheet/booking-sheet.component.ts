import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, inject, ElementRef, ViewChild, HostListener, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { SoundService } from '@core/services/ui/sound.service';
import { ARPreviewComponent } from '../ar-preview/ar-preview.component';

@Component({
  selector: 'app-booking-sheet',
  standalone: true,
  imports: [CommonModule, ARPreviewComponent],
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
            <!-- Large Photo with AR Badge -->
            <div class="w-24 h-24 rounded-2xl overflow-hidden bg-surface-secondary border border-white/10 shadow-lg shrink-0 relative group cursor-pointer"
                 (click)="openARPreview()">
               <img [src]="car.photoUrl || '/assets/images/car-placeholder.svg'" class="w-full h-full object-cover" />
               <!-- AR Badge -->
               <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <div class="flex flex-col items-center gap-1 text-white">
                   <svg class="w-6 h-6 text-brand-primary" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                   </svg>
                   <span class="text-[10px] font-bold">Ver en AR</span>
                 </div>
               </div>
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
              
              <!-- AR Quick Action -->
              <button (click)="openARPreview()" 
                      class="mt-2 text-xs text-brand-primary flex items-center gap-1 hover:underline">
                <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                </svg>
                Vista 3D / AR
              </button>
            </div>
          </div>

          <!-- Specs Grid -->
          <div class="grid grid-cols-3 gap-2 mt-6">
             <div class="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                <div class="text-white/50 text-xs uppercase font-bold tracking-wider">Motor</div>
                <div class="text-white font-bold mt-1">2.0L Turbo</div>
             </div>
             <div class="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                <div class="text-white/50 text-xs uppercase font-bold tracking-wider">Asientos</div>
                <div class="text-white font-bold mt-1">4 Pasajeros</div>
             </div>
             <div class="bg-white/5 rounded-xl p-3 text-center border border-white/5">
                <div class="text-white/50 text-xs uppercase font-bold tracking-wider">0-100</div>
                <div class="text-white font-bold mt-1">4.5s</div>
             </div>
          </div>

          <!-- Final Action -->
          <div class="mt-8 flex items-center justify-between gap-4">
             <div class="text-white">
                <div class="text-sm text-white/60">Total estimado</div>
                <div class="text-3xl font-black tracking-tight">\${{ (car.pricePerDay * 3) | number:'1.0-0' }}</div>
             </div>
             
             <button (click)="onConfirm()"
                     class="flex-1 bg-brand-primary text-black font-black text-lg py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-neon-glow">
                Confirmar Reserva
             </button>
          </div>
        </div>
      </div>
    }
    
    <!-- AR Preview Modal -->
    @if (showARPreview()) {
      <app-ar-preview 
        [carTitle]="car?.title || ''"
        [posterUrl]="car?.photoUrl || '/assets/images/car-placeholder.svg'"
        (previewClosed)="closeARPreview()">
      </app-ar-preview>
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

  // AR Preview
  showARPreview = signal(false);

  openARPreview() {
    this.sound.play('pop');
    this.showARPreview.set(true);
  }

  closeARPreview() {
    this.sound.play('swoosh');
    this.showARPreview.set(false);
  }
}
