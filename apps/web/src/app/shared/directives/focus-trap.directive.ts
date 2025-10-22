import {
  Directive,
  ElementRef,
  OnInit,
  OnDestroy,
  AfterViewInit,
  input,
} from '@angular/core';

/**
 * Focus Trap Directive
 *
 * Traps keyboard focus within an element (typically a modal or dialog).
 * When activated, Tab/Shift+Tab will cycle through focusable elements
 * within the container without escaping to the background page.
 *
 * Usage:
 * <div appFocusTrap [isActive]="isModalOpen">
 *   <!-- Modal content -->
 * </div>
 *
 * WCAG 2.1 Compliance:
 * - 2.1.2 No Keyboard Trap (Level A) - Users can navigate away using ESC
 * - 2.4.3 Focus Order (Level A) - Maintains logical focus order
 * - 2.4.7 Focus Visible (Level AA) - Focus indicators remain visible
 */
@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements OnInit, AfterViewInit, OnDestroy {
  /** Whether the focus trap is active */
  isActive = input<boolean>(false);

  private focusableElements: HTMLElement[] = [];
  private firstFocusableElement: HTMLElement | null = null;
  private lastFocusableElement: HTMLElement | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  /** Query selector for focusable elements */
  private readonly focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    // Store the currently focused element to restore later
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
  }

  ngAfterViewInit(): void {
    if (this.isActive()) {
      this.activate();
    }
  }

  ngOnDestroy(): void {
    this.deactivate();
  }

  /**
   * Activates the focus trap
   */
  private activate(): void {
    // Find all focusable elements within the container
    this.updateFocusableElements();

    // Set focus to the first focusable element
    if (this.firstFocusableElement) {
      setTimeout(() => {
        this.firstFocusableElement?.focus();
      }, 100);
    }

    // Add keyboard event listener
    this.elementRef.nativeElement.addEventListener('keydown', this.handleKeyDown);
  }

  /**
   * Deactivates the focus trap and restores previous focus
   */
  private deactivate(): void {
    this.elementRef.nativeElement.removeEventListener('keydown', this.handleKeyDown);

    // Restore focus to previously focused element
    if (this.previouslyFocusedElement) {
      setTimeout(() => {
        this.previouslyFocusedElement?.focus();
      }, 100);
    }
  }

  /**
   * Updates the list of focusable elements
   */
  private updateFocusableElements(): void {
    const elements = this.elementRef.nativeElement.querySelectorAll<HTMLElement>(
      this.focusableSelectors
    );

    this.focusableElements = Array.from(elements).filter(
      (el) => el.offsetParent !== null && !el.hasAttribute('disabled')
    );

    this.firstFocusableElement = this.focusableElements[0] || null;
    this.lastFocusableElement =
      this.focusableElements[this.focusableElements.length - 1] || null;
  }

  /**
   * Handles keyboard events for focus trapping
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') {
      return;
    }

    // Update focusable elements in case the DOM changed
    this.updateFocusableElements();

    if (!this.firstFocusableElement || !this.lastFocusableElement) {
      return;
    }

    // Shift+Tab: Moving backwards
    if (event.shiftKey) {
      if (document.activeElement === this.firstFocusableElement) {
        event.preventDefault();
        this.lastFocusableElement.focus();
      }
    }
    // Tab: Moving forwards
    else {
      if (document.activeElement === this.lastFocusableElement) {
        event.preventDefault();
        this.firstFocusableElement.focus();
      }
    }
  };
}
