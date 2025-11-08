import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-availability-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './availability-alert.component.html',
  styleUrls: ['./availability-alert.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvailabilityAlertComponent {
  @Input() count = 0;
  @Input() zone = 'tu zona';
  @Output() expandRadius = new EventEmitter<void>();
}


