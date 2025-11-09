
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/car-locations.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-map-details-panel',
  templateUrl: './map-details-panel.component.html',
  styleUrls: ['./map-details-panel.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class MapDetailsPanelComponent {
  @Input() carLocation: CarMapLocation | null = null;
  @Output() close = new EventEmitter<void>();

  onClose() {
    this.close.emit();
  }
}
