import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MoneyPipe } from '../../pipes/money.pipe';

@Component({
  selector: 'app-sticky-cta-mobile',
  standalone: true,
  imports: [CommonModule, MoneyPipe],
  templateUrl: './sticky-cta-mobile.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StickyCtaMobileComponent {
  @Input() pricePerDay: number | null = null;
  @Input() totalPrice: number | null = null;
  @Input() daysCount = 0;
  @Input() ctaText = 'Reservar Ahora';
  /** When true, show the calendar icon (select dates) instead of the check icon (book) */
  @Input() showCalendarIcon = false;
  @Input() disabled = false;
  @Input() loading = false;
  @Input() expressMode = false;
  @Input() showPrice = true;
  /** Optional guarantee/deposit amount in USD */
  @Input() guaranteeAmount: number | null = null;
  /** Show terms checkbox when user can book */
  @Input() showTermsCheckbox = false;
  /** Current state of terms acceptance */
  @Input() termsAccepted = false;
  /** Error message to display */
  @Input() errorMessage: string | null = null;
  @Output() readonly ctaClick = new EventEmitter<void>();
  @Output() readonly termsAcceptedChange = new EventEmitter<boolean>();

  onCtaClick(): void {
    if (!this.disabled && !this.loading && (!this.showTermsCheckbox || this.termsAccepted)) {
      this.ctaClick.emit();
    }
  }

  onTermsChange(checked: boolean): void {
    this.termsAcceptedChange.emit(checked);
  }

  get isButtonDisabled(): boolean {
    return this.disabled || this.loading || (this.showTermsCheckbox && !this.termsAccepted);
  }

  get buttonClasses(): Record<string, boolean> {
    const isInteractive = !this.isButtonDisabled;
    return {
      'opacity-50': this.isButtonDisabled,
      'cursor-not-allowed': this.isButtonDisabled,
      'bg-gradient-to-r': true,
      'from-cta-default': true,
      'to-cta-default/80': !this.expressMode,
      'to-warning-light': this.expressMode,
      'text-cta-text': true,
      'shadow-md': isInteractive,
      'hover:shadow-lg': isInteractive,
      'animate-pulse': isInteractive && this.totalPrice !== null,
    };
  }
}
