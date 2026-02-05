import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GeocodingResult, GeocodingService } from '@core/services/geo/geocoding.service';
import { LocationService } from '@core/services/geo/location.service';
import { DateRange } from '@core/models/marketplace.model';
import { DateRangePickerComponent } from '../date-range-picker/date-range-picker.component';

@Component({
  selector: 'app-smart-search-bar',
  standalone: true,
  imports: [CommonModule, FormsModule, DateRangePickerComponent],
  templateUrl: './smart-search-bar.component.html',
  styleUrls: ['./smart-search-bar.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SmartSearchBarComponent {
  private readonly geocodingService = inject(GeocodingService);
  private readonly locationService = inject(LocationService);

  @Output() searchSubmit = new EventEmitter<{ location: { lat: number; lng: number } | null; dates: DateRange }>();

  readonly locationQuery = signal('');
  readonly locationSuggestions = signal<GeocodingResult[]>([]);
  readonly showSuggestions = signal(false);
  readonly selectedLocation = signal<{ lat: number; lng: number } | null>(null);
  
  readonly dateRange = signal<DateRange>({ from: null, to: null });

  private searchTimeout?: ReturnType<typeof setTimeout>;

  async onLocationInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.locationQuery.set(query);
    this.selectedLocation.set(null); // Reset selection on type

    if (this.searchTimeout) clearTimeout(this.searchTimeout);

    if (query.length < 3) {
      this.locationSuggestions.set([]);
      this.showSuggestions.set(false);
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      try {
        const results = await this.geocodingService.getLocationSuggestions(query, 'AR,UY,BR');
        this.locationSuggestions.set(results);
        this.showSuggestions.set(true);
      } catch (error) {
        console.error('Geocoding error', error);
      }
    }, 300);
  }

  selectLocation(result: GeocodingResult) {
    this.locationQuery.set(result.placeName);
    this.selectedLocation.set({ lat: result.latitude, lng: result.longitude });
    this.showSuggestions.set(false);
  }

  useCurrentLocation() {
    this.locationService.getCurrentPosition().then(pos => {
      if (pos) {
        // Reverse geocode could be nice here to set the text
        this.locationQuery.set('Mi ubicación actual');
        this.selectedLocation.set({ lat: pos.lat, lng: pos.lng });
        this.showSuggestions.set(false);
      }
    });
  }

  onDateRangeChange(range: DateRange) {
    this.dateRange.set(range);
  }

  submitSearch() {
    this.searchSubmit.emit({
      location: this.selectedLocation(),
      dates: this.dateRange()
    });
  }
}
