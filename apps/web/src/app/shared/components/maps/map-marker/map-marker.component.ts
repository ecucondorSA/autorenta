import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/cars/car-locations.service';

@Component({
  selector: 'app-map-marker',
  templateUrl: './map-marker.component.html',
  styleUrls: ['./map-marker.component.css'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapMarkerComponent {
  @Input() car!: CarMapLocation;
  @Input() isSelected: boolean = false;

  get isOwnerVerified(): boolean {
    return this.car?.ownerVerified !== false;
  }
}
