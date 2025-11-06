import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  @ViewChild('carouselContainer') carouselContainer?: ElementRef<HTMLDivElement>;
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
      regionId: car.region_id,
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
  private carouselHovered = false;

  constructor(
    private carsService: CarsService,
    private router: Router
  ) {
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
      
      // Features filter
      const featuresMatch =
        (!this.filters.features.ac || car.features?.['ac']) &&
        (!this.filters.features.gps || car.features?.['gps']) &&
        (!this.filters.features.bluetooth || car.features?.['bluetooth']) &&
        (!this.filters.features.backup_camera || car.features?.['backup_camera']);

      return priceMatch && transmissionMatch && fuelMatch && seatsMatch && featuresMatch;
    });
  }

  // 🎯 Click en marker del mapa
  onMapCarSelected(carId: string) {
    const previousCarId = this.selectedCarId;
    this.selectedCarId = carId;
    
    // Si es el mismo auto (doble click), navegar al detalle
    if (previousCarId === carId) {
      this.router.navigate(['/cars/detail', carId]);
      return;
    }
    
    // Primera selección: scroll + highlight en carousel
    this.scrollToCarInCarousel(carId);
  }

  // 🎯 Click en card del carousel
  onCarouselCardSelected(carId: string) {
    const previousCarId = this.selectedCarId;
    this.selectedCarId = carId;
    
    // Si es el mismo auto (doble click), navegar al detalle
    if (previousCarId === carId) {
      this.router.navigate(['/cars/detail', carId]);
      return;
    }
    
    // Primera selección: fly-to en mapa
    if (this.carsMap) {
      this.carsMap.flyToCarLocation(carId);
    }
  }

  // Deprecated - usar onMapCarSelected o onCarouselCardSelected
  onCarSelected(carId: string) {
    this.selectedCarId = carId;
  }

  onCarouselHover(isHovered: boolean) {
    this.carouselHovered = isHovered;
  }

  onUserLocationChange(location: { lat: number; lng: number }) {
    this.userLocation = location;
  }

  private scrollToCarInCarousel(carId: string) {
    if (!this.carouselContainer) {
      return;
    }

    const carousel = this.carouselContainer.nativeElement;
    const scrollContainer = carousel.querySelector('.map-carousel-scroll') as HTMLElement;
    
    if (!scrollContainer) {
      return;
    }

    const card = scrollContainer.querySelector(`[data-car-id="${carId}"]`) as HTMLElement;
    
    if (!card) {
      console.warn('⚠️ Car card not found in carousel:', carId);
      return;
    }

    // Scroll horizontal suave al card
    const cardLeft = card.offsetLeft;
    const cardWidth = card.offsetWidth;
    const scrollWidth = scrollContainer.offsetWidth;
    const scrollPosition = cardLeft - (scrollWidth / 2) + (cardWidth / 2);

    scrollContainer.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth'
    });

    // Highlight temporal
    card.classList.add('pulse-highlight');
    setTimeout(() => {
      card.classList.remove('pulse-highlight');
    }, 1500);
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
    if (!this.userLocation) {
      // Intentar obtener la ubicación nuevamente
      this.getUserLocation().then(() => {
        if (this.userLocation && this.carsMap) {
          this.carsMap.flyToLocation(this.userLocation.lat, this.userLocation.lng);
        }
      });
      return;
    }
    
    if (this.carsMap) {
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
