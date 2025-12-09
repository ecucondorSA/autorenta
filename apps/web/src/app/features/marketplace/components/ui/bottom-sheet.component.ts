import { ChangeDetectionStrategy, Component, input, output, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';

/**
 * Bottom Sheet Component V2
 * Mobile bottom sheet with drag-to-dismiss gesture
 *
 * Features:
 * - Swipe down to dismiss
 * - Snap points (collapsed, half, expanded)
 * - Backdrop with tap to dismiss
 * - Smooth spring animations
 * - Header with handle
 * - Scroll lock
 * - Haptic feedback
 */
@Component({
  selector: 'app-bottom-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  animations: [
    trigger('backdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0 }))]),
    ]),
    trigger('sheet', [
      transition(':enter', [
        style({ transform: 'translateY(100%)' }),
        animate('300ms cubic-bezier(0.32, 0.72, 0, 1)', style({ transform: 'translateY(0)' })),
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.4, 0, 1, 1)', style({ transform: 'translateY(100%)' })),
      ]),
    ]),
  ],
  template: `
    @if (isOpen()) {
      <!-- Backdrop -->
      <div class="sheet-backdrop" [@backdrop] (click)="handleBackdropClick()"></div>

      <!-- Bottom Sheet -->
      <div
        class="sheet-container"
        [class]="sheetClasses()"
        [style.transform]="'translateY(' + dragOffset() + 'px)'"
        [@sheet]
        #sheetElement
      >
        <!-- Header with Handle -->
        <div
          class="sheet-header"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd()"
          (mousedown)="onMouseDown($event)"
        >
          <div class="sheet-handle"></div>
          @if (title()) {
            <h3 class="sheet-title">{{ title() }}</h3>
          }
        </div>

        <!-- Content -->
        <div class="sheet-content" [class.is-scrollable]="scrollable()" #contentElement>
          <ng-content />
        </div>

        <!-- Footer -->
        @if (showFooter()) {
          <div class="sheet-footer">
            <ng-content select="[sheetFooter]" />
          </div>
        }
      </div>
    }
  `,
  styles: [
    `
      .sheet-backdrop {
        position: fixed;
        inset: 0;
        background: #4E4E4E;
        backdrop-filter: blur(4px);
        z-index: 50;
      }

      .sheet-container {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        background: white;
        border-radius: 24px 24px 0 0;
        box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.15);
        z-index: 50;
        display: flex;
        flex-direction: column;
        max-height: 90vh;
        transition: transform 0.1s linear;
        will-change: transform;
      }

      /* Snap heights */
      .sheet-collapsed {
        max-height: 30vh;
      }

      .sheet-half {
        max-height: 50vh;
      }

      .sheet-expanded {
        max-height: 90vh;
      }

      /* Desktop centered */
      @media (min-width: 768px) {
        .sheet-container {
          left: 50%;
          right: auto;
          bottom: 2rem;
          transform: translateX(-50%);
          max-width: 480px;
          width: 90%;
          border-radius: 24px;
        }
      }

      .sheet-header {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.75rem 1.5rem 0.5rem;
        cursor: grab;
        user-select: none;
        touch-action: none;
        flex-shrink: 0;
      }

      .sheet-header:active {
        cursor: grabbing;
      }

      .sheet-handle {
        width: 40px;
        height: 4px;
        background: var(--border-default, #d1d5db);
        border-radius: 2px;
        margin-bottom: 0.75rem;
      }

      .sheet-title {
        font-size: 1.125rem;
        font-weight: 700;
        color: var(--text-primary, #1f2937);
        margin: 0;
        align-self: flex-start;
      }

      .sheet-content {
        flex: 1;
        padding: 1rem 1.5rem;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
      }

      .sheet-content.is-scrollable {
        overscroll-behavior: contain;
      }

      .sheet-footer {
        padding: 1rem 1.5rem;
        padding-bottom: calc(1rem + env(safe-area-inset-bottom));
        border-top: 1px solid var(--border-default, #f3f4f6);
        display: flex;
        gap: 0.75rem;
        flex-shrink: 0;
      }

      .sheet-footer:empty {
        display: none;
      }

      /* Dragging state */
      .is-dragging {
        transition: none !important;
      }
    `,
  ],
})
export class BottomSheetComponent {
  @ViewChild('sheetElement') sheetElement!: ElementRef<HTMLDivElement>;
  @ViewChild('contentElement') contentElement!: ElementRef<HTMLDivElement>;

  // Props
  isOpen = input<boolean>(false);
  title = input<string>('');
  snapPoint = input<'collapsed' | 'half' | 'expanded'>('half');
  showFooter = input<boolean>(false);
  closeOnBackdrop = input<boolean>(true);
  dismissThreshold = input<number>(100);
  scrollable = input<boolean>(true);

  // Events
  closed = output<void>();
  opened = output<void>();
  snapPointChanged = output<'collapsed' | 'half' | 'expanded'>();

  // Drag state
  dragOffset = signal(0);
  isDragging = signal(false);
  startY = 0;
  startOffset = 0;

  constructor() {
    // Lock scroll when open
    effect(() => {
      if (typeof document !== 'undefined') {
        document.body.style.overflow = this.isOpen() ? 'hidden' : '';
      }
    });

    // Mouse move listener
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.onMouseMove.bind(this));
      window.addEventListener('mouseup', this.onMouseUp.bind(this));
    }
  }

  sheetClasses(): string {
    const classes = [`sheet-${this.snapPoint()}`];
    if (this.isDragging()) classes.push('is-dragging');
    return classes.join(' ');
  }

  handleBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  // Touch events
  onTouchStart(event: TouchEvent): void {
    this.startY = event.touches[0].clientY;
    this.startOffset = this.dragOffset();
    this.isDragging.set(true);
  }

  onTouchMove(event: TouchEvent): void {
    if (!this.isDragging()) return;

    const currentY = event.touches[0].clientY;
    const delta = currentY - this.startY;

    // Only allow dragging down
    if (delta > 0) {
      this.dragOffset.set(this.startOffset + delta);
    }
  }

  onTouchEnd(): void {
    if (!this.isDragging()) return;

    const offset = this.dragOffset();

    // Dismiss if dragged past threshold
    if (offset > this.dismissThreshold()) {
      this.close();
    } else {
      // Snap back
      this.dragOffset.set(0);
    }

    this.isDragging.set(false);
  }

  // Mouse events (for desktop testing)
  onMouseDown(event: MouseEvent): void {
    this.startY = event.clientY;
    this.startOffset = this.dragOffset();
    this.isDragging.set(true);
    event.preventDefault();
  }

  onMouseMove(event: MouseEvent): void {
    if (!this.isDragging()) return;

    const currentY = event.clientY;
    const delta = currentY - this.startY;

    if (delta > 0) {
      this.dragOffset.set(this.startOffset + delta);
    }
  }

  onMouseUp(): void {
    if (!this.isDragging()) return;

    const offset = this.dragOffset();

    if (offset > this.dismissThreshold()) {
      this.close();
    } else {
      this.dragOffset.set(0);
    }

    this.isDragging.set(false);
  }

  close(): void {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    this.closed.emit();
  }

  open(): void {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }

    this.opened.emit();
  }

  setSnapPoint(point: 'collapsed' | 'half' | 'expanded'): void {
    this.snapPointChanged.emit(point);
  }
}
