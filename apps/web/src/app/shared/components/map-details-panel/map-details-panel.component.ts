import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarMapLocation } from '@core/services/car-locations.service';
import { RouterModule } from '@angular/router';
import { NavigationService } from '../../../core/services/navigation.service';

@Component({
  selector: 'app-map-details-panel',
  templateUrl: './map-details-panel.component.html',
  styleUrls: ['./map-details-panel.component.css'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class MapDetailsPanelComponent {
  @Input() carLocation: CarMapLocation | null = null;
  @Output() closePanel = new EventEmitter<void>();

  private readonly navigationService = inject(NavigationService);

  onClose() {
    this.closePanel.emit();
  }

  /**
   * Navigate to car location using Waze
   */
  navigateWithWaze(): void {
    if (!this.carLocation) {
      return;
    }

    this.navigationService.navigateWithWaze({
      lat: this.carLocation.lat,
      lng: this.carLocation.lng,
      destinationName: this.carLocation.title || 'Auto en ' + (this.carLocation.locationLabel || 'AutoRenta'),
    });
  }

  /**
   * Navigate to car location using Google Maps
   */
  navigateWithGoogleMaps(): void {
    if (!this.carLocation) {
      return;
    }

    this.navigationService.navigateWithGoogleMaps({
      lat: this.carLocation.lat,
      lng: this.carLocation.lng,
      destinationName: this.carLocation.title || 'Auto en ' + (this.carLocation.locationLabel || 'AutoRenta'),
    });
  }
}
