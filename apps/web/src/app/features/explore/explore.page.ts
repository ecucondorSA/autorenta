import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnDestroy,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Geolocation } from '@capacitor/geolocation';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonIcon,
  IonFab,
  IonFabButton,
  IonSearchbar,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { optionsOutline, locateOutline } from 'ionicons/icons';
import { CarsMapComponent } from '../../shared/components/cars-map/cars-map.component';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import {
  MapFiltersComponent,
  FilterState,
} from '../../shared/components/map-filters/map-filters.component';
import { MapDrawerComponent } from '../../shared/components/map-drawer/map-drawer.component';
import { CarsService } from '../../core/services/cars.service';
import { Car } from '../../core/models';
import type { CarMapLocation } from '../../core/services/car-locations.service';

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
    IonIcon,
    IonFab,
    IonFabButton,
    IonSearchbar,
    CarsMapComponent,
    CarCardComponent,
    MapFiltersComponent,
    MapDrawerComponent,
  ],
})
export class ExplorePage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('carouselContainer') carouselContainer?: ElementRef<HTMLDivElement>;
  @ViewChild(CarsMapComponent) carsMap?: CarsMapComponent;

  // Data
  cars: Car[] = [];
  filteredCars: Car[] = [];
  loading = true;
  searchQuery = '';

  // State signals
  readonly selectedCarId = signal<string | null>(null);
  readonly isDrawerOpen = signal(false);
  readonly isMobileView = signal(false);
  readonly currentFilters = signal<FilterState | null>(null);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);

  // Computed
  readonly selectedCar = computed<CarMapLocation | undefined>(() => {
    const id = this.selectedCarId();
    return id ? this.carMapLocations().find((c) => c.carId === id) : undefined;
  });

  readonly carMapLocations = computed(() => {
    return this.filteredCars.map((car) => {
      const gallery = this.extractPhotoGallery(car);
      return {
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
        photoUrl: gallery[0] ?? null,
        photoGallery: gallery,
        description: car.description,
      };
    });
  });

  private carouselHovered = false;

  constructor(
    private carsService: CarsService,
    private router: Router,
  ) {
    addIcons({ optionsOutline, locateOutline });
  }

  ngOnInit() {
    this.detectMobileView();
    window.addEventListener('resize', () => this.detectMobileView());
    this.loadCars();
    this.getUserLocation();
  }

  ngAfterViewInit() {
    if (this.mapContainer?.nativeElement) {
      // Initialize map after view is ready
    }
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.detectMobileView());
  }

  /**
   * Detect mobile screen size
   */
  private detectMobileView(): void {
    this.isMobileView.set(window.innerWidth < 768);
  }

  async loadCars() {
    this.loading = true;
    try {
      const cars = await this.carsService.listActiveCars({});
      this.cars = cars;
      this.filteredCars = this.cars;
    } catch {
      /* Silenced */
    } finally {
      this.loading = false;
    }
  }

  async getUserLocation() {
    try {
      const position = await Geolocation.getCurrentPosition();
      this.userLocation.set({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      /* Silenced */
    }
  }

  /**
   * 🎯 Handle map marker click
   */
  onMapCarSelected(carId: string) {
    const previousCarId = this.selectedCarId();
    this.selectedCarId.set(carId);

    // Si es el mismo auto (doble click), navegar al detalle
    if (previousCarId === carId) {
      this.router.navigate(['/cars/detail', carId]);
      return;
    }

    // Abrir drawer en desktop/mobile
    this.isDrawerOpen.set(true);

    // Scroll carousel en desktop si aplica
    if (!this.isMobileView()) {
      this.scrollToCarInCarousel(carId);
    }
  }

  /**
   * 🎯 Handle carousel card click
   */
  onCarouselCardSelected(carId: string) {
    const previousCarId = this.selectedCarId();
    this.selectedCarId.set(carId);

    // Si es el mismo auto (doble click), navegar al detalle
    if (previousCarId === carId) {
      this.router.navigate(['/cars/detail', carId]);
      return;
    }

    // Fly-to en mapa
    if (this.carsMap) {
      this.carsMap.flyToCarLocation(carId);
    }
  }

  /**
   * 🎯 Handle filter change from map-filters
   */
  onFilterChange(filters: FilterState) {
    this.currentFilters.set(filters);
    // TODO: Aplicar filtros a los coches visibles
    // Por ahora, mantener todos los autos. En producción:
    // this.filteredCars = applyFilters(this.cars, filters);
  }

  /**
   * 🎯 Close drawer
   */
  onCloseDrawer() {
    this.isDrawerOpen.set(false);
  }

  /**
   * 🎯 Handle reserve click from drawer
   */
  onReserveClick(data: {
    carId: string;
    paymentMethod: string;
    dates?: { start: Date; end: Date };
  }) {
    // Navigate to booking checkout with car ID and payment method
    this.router.navigate(['/bookings/checkout'], {
      queryParams: {
        carId: data.carId,
        paymentMethod: data.paymentMethod,
      },
    });
  }

  /**
   * 🎯 Handle chat click from drawer
   */
  onChatClick(carId: string) {
    // TODO: Abrir chat con anfitrión
    console.log('Chat requested for car:', carId);
  }

  /**
   * 🎯 Handle sticky CTA click on mobile
   */
  onStickyCtaClick() {
    this.isDrawerOpen.set(true);
  }

  onCarouselHover(isHovered: boolean) {
    this.carouselHovered = isHovered;
  }

  onUserLocationChange(location: { lat: number; lng: number }) {
    this.userLocation.set(location);
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
    const scrollPosition = cardLeft - scrollWidth / 2 + cardWidth / 2;

    scrollContainer.scrollTo({
      left: Math.max(0, scrollPosition),
      behavior: 'smooth',
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
    const loc = this.userLocation();
    if (!loc) {
      // Intentar obtener la ubicación nuevamente
      this.getUserLocation().then(() => {
        const newLoc = this.userLocation();
        if (newLoc && this.carsMap) {
          this.carsMap.flyToLocation(newLoc.lat, newLoc.lng);
        }
      });
      return;
    }

    if (this.carsMap) {
      this.carsMap.flyToLocation(loc.lat, loc.lng);
    }
  }

  private extractPhotoGallery(car: Car): string[] {
    const rawPhotos = car.photos ?? car.car_photos ?? [];
    if (!Array.isArray(rawPhotos)) {
      return [];
    }
    return rawPhotos
      .map((photo) => (typeof photo === 'string' ? photo : (photo?.url ?? null)))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }
}
