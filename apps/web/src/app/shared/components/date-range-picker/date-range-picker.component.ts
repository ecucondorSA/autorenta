import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface DateRange {
  from: string | null;
  to: string | null;
}

@Component({
  selector: 'app-date-range-picker',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './date-range-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DateRangePickerComponent {
  @Input() label = 'Fechas';
  @Input() initialFrom: string | null = null;
  @Input() initialTo: string | null = null;
  @Output() readonly rangeChange = new EventEmitter<DateRange>();

  readonly from = signal<string | null>(this.initialFrom);
  readonly to = signal<string | null>(this.initialTo);

  onFromChange(value: string): void {
    // Convert empty string to null
    const newValue = value && value.trim() !== '' ? value : null;
    this.from.set(newValue);
    this.emit();
  }

  onToChange(value: string): void {
    // Convert empty string to null
    const newValue = value && value.trim() !== '' ? value : null;
    this.to.set(newValue);
    this.emit();
  }

  private emit(): void {
    this.rangeChange.emit({ from: this.from(), to: this.to() });
  }
}
