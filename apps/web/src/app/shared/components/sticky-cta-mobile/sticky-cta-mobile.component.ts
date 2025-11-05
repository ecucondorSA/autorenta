import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
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
  @Input() disabled = false;
  @Input() loading = false;
  @Input() expressMode = false;
  @Input() showPrice = true;
  @Output() readonly ctaClick = new EventEmitter<void>();

  onCtaClick(): void {
    if (!this.disabled && !this.loading) {
      this.ctaClick.emit();
    }
  }
}
