import { Component, input, output, signal, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { animate, style, transition, trigger } from '@angular/animations';

/**
 * Modal Component V2
 * Full-screen mobile modal with backdrop and animations
 * 
 * Features:
 * - Slide-up animation from bottom
 * - Backdrop with blur effect
 * - Close on backdrop click
 * - Close on ESC key
 * - Scroll lock when open
 * - Size variants (full, large, medium, small)
 * - Header with title and close button
 * - Footer for actions
 * - Haptic feedback on open/close
 */
@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  animations: [
    trigger('backdrop', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 })),
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 })),
      ]),
    ]),
    trigger('modal', [
      transition(':enter', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ 
          transform: 'translateY(0)', 
          opacity: 1 
        })),
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 1, 1)', style({ 
          transform: 'translateY(100%)', 
          opacity: 0 
        })),
      ]),
    ]),
  ],
  template: `
    @if (isOpen()) {
      <!-- Backdrop -->
      <div 
        class="modal-backdrop"
        [@backdrop]
        (click)="handleBackdropClick()"
      ></div>

      <!-- Modal Container -->
      <div 
        class="modal-container"
        [class]="modalClasses()"
        [@modal]
        role="dialog"
        [attr.aria-modal]="true"
        [attr.aria-labelledby]="titleId()"
        #modalElement
      >
        <!-- Handle (for visual affordance) -->
        @if (size() !== 'full') {
          <div class="modal-handle"></div>
        }

        <!-- Header -->
        @if (showHeader()) {
          <div class="modal-header">
            <h2 [id]="titleId()" class="modal-title">
              {{ title() }}
            </h2>
            @if (showCloseButton()) {
              <button 
                type="button"
                class="close-btn"
                (click)="close()"
                aria-label="Cerrar"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M18 6L6 18M6 6l12 12" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            }
          </div>
        }

        <!-- Content -->
        <div class="modal-content">
          <ng-content />
        </div>

        <!-- Footer -->
        @if (showFooter()) {
          <div class="modal-footer">
            <ng-content select="[modalFooter]" />
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      z-index: 9998;
    }

    .modal-container {
      position: fixed;
      background: white;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.2);
    }

    /* Size variants */
    .modal-full {
      inset: 0;
      border-radius: 0;
    }

    .modal-large {
      bottom: 0;
      left: 0;
      right: 0;
      top: 10%;
      border-radius: 24px 24px 0 0;
    }

    .modal-medium {
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 70%;
      border-radius: 24px 24px 0 0;
    }

    .modal-small {
      bottom: 0;
      left: 0;
      right: 0;
      max-height: 50%;
      border-radius: 24px 24px 0 0;
    }

    /* Desktop centered modal */
    @media (min-width: 768px) {
      .modal-container:not(.modal-full) {
        left: 50%;
        right: auto;
        bottom: auto;
        top: 50%;
        transform: translate(-50%, -50%);
        max-width: 480px;
        width: 90%;
        border-radius: 24px;
      }
    }

    /* Handle */
    .modal-handle {
      width: 40px;
      height: 4px;
      background: #D1D5DB;
      border-radius: 2px;
      margin: 0.75rem auto 0;
      flex-shrink: 0;
    }

    /* Header */
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      border-bottom: 1px solid #F3F4F6;
      flex-shrink: 0;
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #1F2937;
      margin: 0;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      color: #6B7280;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .close-btn:hover {
      background: #F3F4F6;
      color: #1F2937;
    }

    .close-btn svg {
      width: 20px;
      height: 20px;
    }

    /* Content */
    .modal-content {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    .modal-full .modal-content {
      padding-top: calc(1.5rem + env(safe-area-inset-top));
      padding-bottom: calc(1.5rem + env(safe-area-inset-bottom));
    }

    /* Footer */
    .modal-footer {
      padding: 1rem 1.5rem;
      padding-bottom: calc(1rem + env(safe-area-inset-bottom));
      border-top: 1px solid #F3F4F6;
      display: flex;
      gap: 0.75rem;
      flex-shrink: 0;
    }

    .modal-footer:empty {
      display: none;
    }
  `]
})
export class ModalComponent {
  @ViewChild('modalElement') modalElement!: ElementRef<HTMLDivElement>;

  // Props
  isOpen = input<boolean>(false);
  title = input<string>('');
  titleId = input<string>(`modal-title-${Math.random().toString(36).substr(2, 9)}`);
  size = input<'full' | 'large' | 'medium' | 'small'>('medium');
  showHeader = input<boolean>(true);
  showFooter = input<boolean>(false);
  showCloseButton = input<boolean>(true);
  closeOnBackdrop = input<boolean>(true);
  closeOnEsc = input<boolean>(true);

  // Events
  closed = output<void>();
  opened = output<void>();

  // State
  previousFocusedElement: HTMLElement | null = null;

  constructor() {
    // Handle ESC key
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.closeOnEsc() && this.isOpen()) {
          this.close();
        }
      });
    }
  }

  modalClasses(): string {
    return `modal-${this.size()}`;
  }

  handleBackdropClick(): void {
    if (this.closeOnBackdrop()) {
      this.close();
    }
  }

  close(): void {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    // Emit close event
    this.closed.emit();

    // Restore focus
    if (this.previousFocusedElement) {
      this.previousFocusedElement.focus();
      this.previousFocusedElement = null;
    }

    // Unlock scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
  }

  open(): void {
    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate([10, 50, 10]);
    }

    // Store current focus
    if (typeof document !== 'undefined') {
      this.previousFocusedElement = document.activeElement as HTMLElement;
    }

    // Lock scroll
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }

    // Emit open event
    this.opened.emit();
  }
}
