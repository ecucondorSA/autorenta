import { Directive, ElementRef, Input, OnInit, Renderer2, OnChanges } from '@angular/core';

/**
 * P1-019 FIX: Form Error ARIA Directive
 *
 * Automatically links form error messages to inputs via aria-describedby
 *
 * Usage:
 * <input [appFormErrorAria]="errorMessage" id="email-input">
 * <span id="email-input-error">{{ errorMessage }}</span>
 *
 * Or auto-generate error element:
 * <input [appFormErrorAria]="errorMessage" [formErrorAutoCreate]="true">
 */
@Directive({
  selector: 'input[appFormErrorAria], textarea[appFormErrorAria], select[appFormErrorAria]',
  standalone: true,
})
export class FormErrorAriaDirective implements OnInit, OnChanges {
  @Input() appFormErrorAria?: string | null;
  @Input() formErrorAutoCreate = false;

  private errorElementId?: string;
  private errorElement?: HTMLElement;

  constructor(
    private el: ElementRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    private renderer: Renderer2,
  ) {}

  ngOnInit(): void {
    const inputElement = this.el.nativeElement;
    const inputId = inputElement.id || this.generateId();

    if (!inputElement.id) {
      this.renderer.setAttribute(inputElement, 'id', inputId);
    }

    this.errorElementId = `${inputId}-error`;

    // Create error element if auto-create is enabled
    if (this.formErrorAutoCreate) {
      this.createErrorElement();
    }

    this.updateAriaDescribedBy();
  }

  ngOnChanges(): void {
    this.updateAriaDescribedBy();
  }

  private generateId(): string {
    return `form-field-${Math.random().toString(36).substr(2, 9)}`;
  }

  private createErrorElement(): void {
    if (this.errorElement) return;

    const inputElement = this.el.nativeElement;
    this.errorElement = this.renderer.createElement('span');

    this.renderer.setAttribute(this.errorElement, 'id', this.errorElementId!);
    this.renderer.addClass(this.errorElement, 'text-error-text');
    this.renderer.addClass(this.errorElement, 'text-sm');
    this.renderer.addClass(this.errorElement, 'mt-1');
    this.renderer.setAttribute(this.errorElement, 'role', 'alert');
    this.renderer.setAttribute(this.errorElement, 'aria-live', 'polite');

    // Insert error element after input
    const parent = inputElement.parentElement;
    if (parent) {
      this.renderer.insertBefore(parent, this.errorElement, inputElement.nextSibling);
    }
  }

  private updateAriaDescribedBy(): void {
    const inputElement = this.el.nativeElement;
    const hasError = !!this.appFormErrorAria;

    if (hasError) {
      // Add aria-describedby pointing to error message
      this.renderer.setAttribute(inputElement, 'aria-describedby', this.errorElementId!);
      this.renderer.setAttribute(inputElement, 'aria-invalid', 'true');

      // Update error message if auto-created
      if (this.errorElement) {
        this.renderer.setProperty(this.errorElement, 'textContent', this.appFormErrorAria);
        this.renderer.setStyle(this.errorElement, 'display', 'block');
      }
    } else {
      // Remove aria-describedby when no error
      this.renderer.removeAttribute(inputElement, 'aria-describedby');
      this.renderer.setAttribute(inputElement, 'aria-invalid', 'false');

      // Hide error element if auto-created
      if (this.errorElement) {
        this.renderer.setStyle(this.errorElement, 'display', 'none');
      }
    }
  }
}
