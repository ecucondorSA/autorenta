import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import {
  IonContent,
  IonHeader,
  IonIcon,
  IonToolbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  listOutline,
  locateOutline,
  mapOutline,
  optionsOutline,
} from 'ionicons/icons';
import { Car } from '../../core/models';
import { BreakpointService } from '../../core/services/breakpoint.service';
import type { CarMapLocation } from '../../core/services/car-locations.service';
import { CarsService } from '../../core/services/cars.service';
import { CarsMapComponent } from '../../shared/components/cars-map/cars-map.component';
import { MapDrawerComponent } from '../../shared/components/map-drawer/map-drawer.component';
import {
  FilterState,
  MapFiltersComponent,
} from '../../shared/components/map-filters/map-filters.component';
import { WazeLiveMapComponent } from '../../shared/components/waze-live-map/waze-live-map.component';

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
    CarsMapComponent,
    WazeLiveMapComponent,
    MapFiltersComponent,
    MapDrawerComponent,
  ],
})
export class ExplorePage implements OnInit, AfterViewInit {
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
  readonly isMobileView;
  readonly currentFilters = signal<FilterState | null>(null);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly viewMode = signal<'map' | 'grid' | 'list'>('map'); // Default to map, can change based on device
  readonly mapProvider = signal<'mapbox' | 'waze'>('mapbox'); // Map provider toggle

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

  constructor(
    private carsService: CarsService,
    private router: Router,
    private breakpoint: BreakpointService,
    private toastController: ToastController,
  ) {
    addIcons({ optionsOutline, locateOutline, gridOutline, listOutline, mapOutline });
    // Usar BreakpointService en lugar de window.innerWidth
    this.isMobileView = this.breakpoint.isMobile;

    // Set default view mode based on device
    if (!this.isMobileView()) {
      this.viewMode.set('grid');
    }
  }

  ngOnInit(): void {
    this.loadCars();
    this.getUserLocation();
  }

  ngAfterViewInit(): void {
    if (this.mapContainer?.nativeElement) {
      // Aquí podría inicializarse lógica adicional de mapa si se requiere.
    }
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
    } catch (error) {
      console.error('Error getting location:', error);
      const toast = await this.toastController.create({
        message: 'No pudimos obtener tu ubicación. Por favor verifica los permisos.',
        duration: 3000,
        position: 'bottom',
        color: 'warning',
        icon: 'location-outline',
      });
      await toast.present();
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

  extractPhotoGallery(car: Car): string[] {
    const rawPhotos = car.photos ?? car.car_photos ?? [];
    if (!Array.isArray(rawPhotos)) {
      return [];
    }
    return rawPhotos
      .map((photo) => (typeof photo === 'string' ? photo : (photo?.url ?? null)))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }
}
