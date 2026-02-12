import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { CarMapLocation } from '@core/services/cars/car-locations.service';
import { NavigationService } from '@core/services/ui/navigation.service';

@Component({
  selector: 'app-map-details-panel',
  templateUrl: './map-details-panel.component.html',
  styleUrls: ['./map-details-panel.component.css'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterModule],
})
export class MapDetailsPanelComponent {
  @Input() carLocation: CarMapLocation | null = null;
  @Output() closePanel = new EventEmitter<void>();
  @Output() quickBook = new EventEmitter<string>();

  private readonly navigationService = inject(NavigationService);

  onClose() {
    this.closePanel.emit();
  }

  onQuickBook(): void {
    if (!this.carLocation) {
      return;
    }

    this.quickBook.emit(this.carLocation.carId);
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
      destinationName:
        this.carLocation.title || 'Auto en ' + (this.carLocation.locationLabel || 'AutoRenta'),
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
      destinationName:
        this.carLocation.title || 'Auto en ' + (this.carLocation.locationLabel || 'AutoRenta'),
    });
  }
}
