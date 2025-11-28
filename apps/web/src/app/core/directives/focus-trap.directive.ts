import { Directive, ElementRef, OnInit, OnDestroy, Input, AfterViewInit } from '@angular/core';

/**
 * P1-016 FIX: Focus Trap Directive
 *
 * Traps focus within modal/dialog elements for keyboard accessibility
 * - Moves focus to first focusable element on init
 * - Prevents Tab from leaving the modal
 * - Stores and restores previous active element
 */
@Directive({
  selector: '[appFocusTrap]',
  standalone: true,
})
export class FocusTrapDirective implements OnInit, AfterViewInit, OnDestroy {
  @Input() appFocusTrap = true; // Enable/disable focus trap
  @Input() focusTrapRestoreFocus = true; // Restore focus on destroy

  private previousActiveElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    if (this.appFocusTrap && this.focusTrapRestoreFocus) {
      // Store currently focused element
      this.previousActiveElement = document.activeElement as HTMLElement;
    }
  }

  ngAfterViewInit(): void {
    if (!this.appFocusTrap) return;

    // Get all focusable elements within the trapped container
    this.updateFocusableElements();

    // Focus first element
    this.focusFirstElement();

    // Add keyboard listener
    this.elementRef.nativeElement.addEventListener('keydown', this.handleKeyDown);
  }

  ngOnDestroy(): void {
    // Remove keyboard listener
    this.elementRef.nativeElement.removeEventListener('keydown', this.handleKeyDown);

    // Restore focus to previous element
    if (this.focusTrapRestoreFocus && this.previousActiveElement) {
      setTimeout(() => {
        this.previousActiveElement?.focus();
      }, 0);
    }
  }

  private updateFocusableElements(): void {
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    this.focusableElements = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>(focusableSelector),
    );
  }

  private focusFirstElement(): void {
    if (this.focusableElements.length > 0) {
      this.focusableElements[0]?.focus();
    }
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab' || !this.appFocusTrap) return;

    // Update focusable elements (in case DOM changed)
    this.updateFocusableElements();

    if (this.focusableElements.length === 0) return;

    const firstElement = this.focusableElements[0];
    const lastElement = this.focusableElements[this.focusableElements.length - 1];

    if (event.shiftKey) {
      // Shift + Tab: Moving backwards
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement?.focus();
      }
    } else {
      // Tab: Moving forwards
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement?.focus();
      }
    }
  };
}
