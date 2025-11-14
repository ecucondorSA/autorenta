import { Directive, ElementRef, OnInit, OnDestroy, output, input } from '@angular/core';

/**
 * Click Outside Directive
 *
 * Listens for clicks outside the element and emits an event.
 * Commonly used for closing dropdowns, modals, and other overlay components.
 *
 * Usage:
 * <div appClickOutside (clickOutside)="closeDropdown()">
 *   <!-- Dropdown content -->
 * </div>
 *
 * With excluded elements:
 * <div appClickOutside [exclude]="[bellButton]" (clickOutside)="closeDropdown()">
 *   <!-- Dropdown content -->
 * </div>
 *
 * WCAG 2.1 Compliance:
 * - 2.1.1 Keyboard (Level A) - Works with mouse and keyboard
 * - 3.2.1 On Focus (Level A) - Does not cause unexpected context changes
 */
@Directive({
  selector: '[appClickOutside]',
  standalone: true,
})
export class ClickOutsideDirective implements OnInit, OnDestroy {
  /** Emits when a click occurs outside the element */
  clickOutside = output<void>();

  /** Elements to exclude from click outside detection (e.g., trigger buttons) */
  exclude = input<HTMLElement[]>([]);

  private clickListener: ((event: MouseEvent) => void) | null = null;

  constructor(private elementRef: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    // Use setTimeout to avoid immediate trigger on component initialization
    setTimeout(() => {
      this.clickListener = this.handleClick.bind(this);
      document.addEventListener('click', this.clickListener, true);
    }, 0);
  }

  ngOnDestroy(): void {
    if (this.clickListener) {
      document.removeEventListener('click', this.clickListener, true);
      this.clickListener = null;
    }
  }

  /**
   * Handles click events and checks if the click is outside the element
   */
  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const element = this.elementRef.nativeElement;
    const excludedElements = this.exclude();

    // Check if click is on an excluded element
    const isExcluded = excludedElements.some((excluded) => excluded && excluded.contains(target));

    // Check if the click is outside the element and not on an excluded element
    if (element && !element.contains(target) && !isExcluded) {
      // Emit the click outside event
      this.clickOutside.emit();
    }
  }
}
