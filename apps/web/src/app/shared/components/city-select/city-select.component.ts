import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-city-select',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './city-select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CitySelectComponent {
  @Input() label = 'Ciudad';
  @Input() placeholder = 'Montevideo';
  @Input() value: string | null = null;
  @Output() readonly valueChange = new EventEmitter<string>();

  onChange(value: string): void {
    this.valueChange.emit(value);
  }
}
