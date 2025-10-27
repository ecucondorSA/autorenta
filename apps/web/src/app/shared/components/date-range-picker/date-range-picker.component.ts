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
    console.log('🔍 [DateRangePicker] onFromChange called:', {
      rawValue: value,
      valueType: typeof value,
      valueLength: value?.length,
      isEmpty: value === '',
      isNull: value === null,
      isUndefined: value === undefined
    });
    
    // Convert empty string to null
    const newValue = value && value.trim() !== '' ? value : null;
    console.log('🔍 [DateRangePicker] From value converted:', {
      oldValue: this.from(),
      newValue: newValue
    });
    
    this.from.set(newValue);
    this.emit();
  }

  onToChange(value: string): void {
    console.log('🔍 [DateRangePicker] onToChange called:', {
      rawValue: value,
      valueType: typeof value,
      valueLength: value?.length,
      isEmpty: value === '',
      isNull: value === null,
      isUndefined: value === undefined
    });
    
    // Convert empty string to null
    const newValue = value && value.trim() !== '' ? value : null;
    console.log('🔍 [DateRangePicker] To value converted:', {
      oldValue: this.to(),
      newValue: newValue
    });
    
    this.to.set(newValue);
    this.emit();
  }

  private emit(): void {
    const range = { from: this.from(), to: this.to() };
    console.log('🔍 [DateRangePicker] Emitting range:', range);
    this.rangeChange.emit(range);
  }
}
