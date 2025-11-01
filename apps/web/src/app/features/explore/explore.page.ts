import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { optionsOutline, locateOutline } from 'ionicons/icons';
import { CarsMapComponent } from '../../shared/components/cars-map/cars-map.component';
import {
  MapFiltersComponent,
  MapFilters,
} from '../../shared/components/map-filters/map-filters.component';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { CarsService } from '../../core/services/cars.service';
import { Car } from '../../core/models';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.page.html',
  styleUrls: ['./explore.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonSearchbar,
    CarsMapComponent,
    MapFiltersComponent,
    CarCardComponent,
  ],
})
export class ExplorePage implements OnInit, AfterViewInit {
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild(CarsMapComponent) carsMap?: CarsMapComponent;

  cars: Car[] = [];
  filteredCars: Car[] = [];
  loading = true;
  selectedCarId: string | null = null;

  get carMapLocations() {
    return this.filteredCars.map((car) => ({
      carId: car.id,
      title: `${car.brand_text_backup || ''} ${car.model_text_backup || ''}`.trim(),
      pricePerDay: car.price_per_day,
      currency: car.currency || 'ARS',
      lat: car.location_lat || 0,
      lng: car.location_lng || 0,
      updatedAt: car.updated_at || new Date().toISOString(),
      city: car.location_city,
      state: car.location_state,
      country: car.location_country,
      locationLabel: car.location_city || 'Sin ubicación',
      photoUrl:
        car.photos && car.photos[0]
          ? typeof car.photos[0] === 'string'
            ? car.photos[0]
            : car.photos[0].url
          : null,
      description: car.description,
    }));
  }
  showFilters = false;
  searchQuery = '';

  filters: MapFilters = {
    minPrice: 5000,
    maxPrice: 50000,
    transmission: 'all',
    fuelType: 'all',
    minSeats: 2,
    features: {
      ac: false,
      gps: false,
      bluetooth: false,
      backup_camera: false,
    },
  };

  userLocation: { lat: number; lng: number } | null = null;

  constructor(private carsService: CarsService) {
    addIcons({ optionsOutline, locateOutline });
  }

  ngOnInit() {
    this.loadCars();
    this.getUserLocation();
  }

  ngAfterViewInit() {
    if (this.mapContainer?.nativeElement) {
      // Initialize map after view is ready
    }
  }

  async loadCars() {
    this.loading = true;
    try {
      const cars = await this.carsService.listActiveCars({});
      this.cars = cars;
      this.filteredCars = this.cars;
    } catch (error) {
    } finally {
      this.loading = false;
    }
  }

  async getUserLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.userLocation = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (error) {}
  }

  toggleFilters() {
    this.showFilters = !this.showFilters;
  }

  onFiltersChange(filters: MapFilters) {
    this.filters = filters;
    this.applyFilters();
  }

  applyFilters() {
    this.filteredCars = this.cars.filter((car) => {
      // Price filter
      const priceMatch =
        car.price_per_day >= this.filters.minPrice && car.price_per_day <= this.filters.maxPrice;
      
      // Transmission filter
      const transmissionMatch =
        this.filters.transmission === 'all' || car.transmission === this.filters.transmission;
      
      // Fuel type filter
      const fuelMatch =
        this.filters.fuelType === 'all' || car.fuel_type === this.filters.fuelType;
      
      // Seats filter
      const seatsMatch = car.seats >= this.filters.minSeats;
      
      // Features filter (features are stored in Record<string, boolean>)
      const featuresMatch =
        (!this.filters.features.ac || car.features?.['ac']) &&
        (!this.filters.features.gps || car.features?.['gps']) &&
        (!this.filters.features.bluetooth || car.features?.['bluetooth']) &&
        (!this.filters.features.backup_camera || car.features?.['backup_camera']);

      return priceMatch && transmissionMatch && fuelMatch && seatsMatch && featuresMatch;
    });
  }

  onCarSelected(carId: string) {
    this.selectedCarId = carId;
    // Scroll to the selected car in carousel
    const carElement = document.querySelector(`[aria-label*="${carId}"]`);
    if (carElement) {
      carElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  onSearch() {
    if (!this.searchQuery) {
      this.filteredCars = this.cars;
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredCars = this.cars.filter(
      (car) =>
        car.brand?.toLowerCase().includes(query) ||
        car.model?.toLowerCase().includes(query) ||
        car.location_city?.toLowerCase().includes(query),
    );
  }

  centerOnUser() {
    if (this.userLocation && this.carsMap) {
      // Emit event to map component to center on user location
      this.carsMap.flyToLocation(this.userLocation.lat, this.userLocation.lng);
    }
  }
  
  onFiltersReset() {
    // Reset filters to initial values
    this.filters = {
      minPrice: 5000,
      maxPrice: 50000,
      transmission: 'all',
      fuelType: 'all',
      minSeats: 2,
      features: {
        ac: false,
        gps: false,
        bluetooth: false,
        backup_camera: false,
      },
    };
    this.applyFilters();
  }
}
