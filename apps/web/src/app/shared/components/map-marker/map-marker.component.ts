
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/car-locations.service';

@Component({
  selector: 'app-map-marker',
  templateUrl: './map-marker.component.html',
  styleUrls: ['./map-marker.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class MapMarkerComponent {
  @Input() car!: CarMapLocation;
  @Input() isSelected: boolean = false;
}
