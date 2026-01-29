import { Directive, ElementRef, OnInit, OnDestroy, output } from '@angular/core';

/**
 * Escape Key Directive
 *
 * Listens for the ESC key press and emits an event.
 * Commonly used for closing modals, dialogs, dropdowns, and other overlay components.
 *
 * Usage:
 * <div appEscapeKey (escapePressed)="closeModal()">
 *   <!-- Component content -->
 * </div>
 *
 * WCAG 2.1 Compliance:
 * - 2.1.2 No Keyboard Trap (Level A) - Provides keyboard escape mechanism
 * - 3.2.1 On Focus (Level A) - Does not cause unexpected context changes
 */
@Directive({
  selector: '[appEscapeKey]',
  standalone: true,
})
export class EscapeKeyDirective implements OnInit, OnDestroy {
  /** Emits when the ESC key is pressed */
  escapePressed = output<void>();

  private keydownListener: ((event: KeyboardEvent) => void) | null = null;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.keydownListener = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.keydownListener);
  }

  ngOnDestroy(): void {
    if (this.keydownListener) {
      document.removeEventListener('keydown', this.keydownListener);
      this.keydownListener = null;
    }
  }

  /**
   * Handles the keydown event and emits if ESC is pressed
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape' || event.key === 'Esc') {
      // Prevent default browser behavior
      event.preventDefault();
      event.stopPropagation();

      // Emit the escape event
      this.escapePressed.emit();
    }
  }
}
