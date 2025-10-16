import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-city-select',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './city-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitySelectComponent {
  @Input() label = 'Ciudad';
  @Input() placeholder = 'Buenos Aires';
  @Input() value: string | null = null;
  @Output() readonly valueChange = new EventEmitter<string>();

  onChange(value: string): void {
    this.valueChange.emit(value);
  }
}
