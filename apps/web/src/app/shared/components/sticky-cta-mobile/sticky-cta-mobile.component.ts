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
  /** Optional guarantee/deposit amount in ARS */
  @Input() guaranteeAmount: number | null = null;
  @Output() readonly ctaClick = new EventEmitter<void>();

  onCtaClick(): void {
    if (!this.disabled && !this.loading) {
      this.ctaClick.emit();
    }
  }

  get buttonClasses(): Record<string, boolean> {
    const isInteractive = !this.disabled && !this.loading;
    return {
      'opacity-50': this.disabled || this.loading,
      'cursor-not-allowed': this.disabled || this.loading,
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
