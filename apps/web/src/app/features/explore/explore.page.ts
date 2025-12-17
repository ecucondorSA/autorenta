import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
import { LocationService } from '../../core/services/location.service';
import { Car } from '../../core/models';
import { BreakpointService } from '../../core/services/breakpoint.service';
import type { CarMapLocation } from '../../core/services/car-locations.service';
import { CarsService } from '../../core/services/cars.service';
import { CarAvailabilityService } from '../../core/services/car-availability.service';
import { CarsMapComponent } from '../../shared/components/cars-map/cars-map.component';
import { MapDrawerComponent } from '../../shared/components/map-drawer/map-drawer.component';
import {
  FilterState,
  MapFiltersComponent,
} from '../../shared/components/map-filters/map-filters.component';
import { SORT_OPTIONS, SortOption } from '../../core/models/marketplace.model';
import { WazeLiveMapComponent } from '../../shared/components/waze-live-map/waze-live-map.component';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.page.html',
  styleUrls: ['./explore.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
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
  readonly viewMode = signal<'map' | 'grid' | 'list'>('list'); // Mobile-first: lista por defecto
  readonly mapProvider = signal<'mapbox' | 'waze'>('mapbox'); // Map provider toggle

  readonly sortOptions = SORT_OPTIONS;
  readonly sortOrder = signal<SortOption>('distance');

  // Computed
  readonly selectedCar = computed<CarMapLocation | undefined>(() => {
    const id = this.selectedCarId();
    return id ? this.carMapLocations().find((c) => c['carId'] === id) : undefined;
  });

  readonly carMapLocations = computed(() => {
    return this.filteredCars.map((car) => {
      const gallery = this.extractPhotoGallery(car);
      return {
        carId: car['id'],
        title: `${car.brand_text_backup || ''} ${car.model_text_backup || ''}`.trim(),
        pricePerDay: car['price_per_day'],
        currency: car['currency'] || 'ARS',
        regionId: car.region_id,
        lat: car['location_lat'] || 0,
        lng: car['location_lng'] || 0,
        updatedAt: car['updated_at'] || new Date().toISOString(),
        city: car['location_city'],
        state: car['location_state'],
        country: car['location_country'],
        locationLabel: car['location_city'] || 'Sin ubicación',
        photoUrl: gallery[0] ?? null,
        photoGallery: gallery,
        description: car['description'],
      };
    });
  });

  constructor(
    private carsService: CarsService,
    private availabilityService: CarAvailabilityService,
    private router: Router,
    private breakpoint: BreakpointService,
    private toastController: ToastController,
    private locationService: LocationService,
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
      await this.applyFiltersAndSort();
    } catch {
      /* Silenced */
    } finally {
      this.loading = false;
    }
  }

  async getUserLocation() {
    try {
      const position = await this.locationService.getCurrentPosition();
      if (position) {
        this.userLocation.set({
          lat: position.lat,
          lng: position.lng,
        });
      }
    } catch (error) {
      console['error']('Error getting location:', error);
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
    void this.applyFiltersAndSort();
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
        carId: data['carId'],
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

  onSortChange(sort: SortOption) {
    this.sortOrder.set(sort);
    this.applyFiltersAndSort();
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
    void this.applyFiltersAndSort();
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
      .map((photo) => (typeof photo === 'string' ? photo : (photo?.['url'] ?? null)))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }

  private async applyFiltersAndSort() {
    const filters = this.currentFilters() ?? {
      dateRange: null,
      priceRange: null,
      vehicleTypes: null,
      immediateOnly: false,
      transmission: null,
    };

    const query = this.searchQuery?.toLowerCase().trim();

    let result = [...this.cars];

    // Texto libre
    if (query) {
      result = result.filter((car) => {
        const city = car['location_city']?.toLowerCase() || '';
        const brand = car['brand']?.toLowerCase() || car.brand_text_backup?.toLowerCase() || '';
        const model = car['model']?.toLowerCase() || car.model_text_backup?.toLowerCase() || '';
        return brand.includes(query) || model.includes(query) || city.includes(query);
      });
    }

    // Rango de precio
    if (filters.priceRange) {
      result = result.filter((car) => {
        const price = car['price_per_day'] || 0;
        return price >= filters.priceRange!.min && price <= filters.priceRange!.max;
      });
    }

    // Tipo de vehículo
    if (filters.vehicleTypes && filters.vehicleTypes.length > 0) {
      result = result.filter((car) =>
        filters.vehicleTypes!.includes((car.vehicle_type as string | undefined) ?? ''),
      );
    }

    // Transmisión
    if (filters['transmission'] && filters['transmission'].length > 0) {
      result = result.filter((car) =>
        filters['transmission']!.includes((car['transmission'] as string | undefined) ?? ''),
      );
    }

    // Entrega inmediata (instant booking flag)
    if (filters.immediateOnly) {
      result = result.filter((car) => {
        const instant = (car as { instant_booking?: boolean }).instant_booking;
        return instant === true;
      });
    }

    // Fecha: filtrar por disponibilidad vía RPC (costoso pero necesario para consistencia)
    if (filters.dateRange) {
      const from = filters.dateRange.start.toISOString().slice(0, 10);
      const to = filters.dateRange.end.toISOString().slice(0, 10);
      const availabilityResults = await Promise.all(
        result.map(async (car) => {
          try {
            const available = await this.availabilityService.checkAvailability(car['id'], from, to);
            return available ? car : null;
          } catch {
            return null;
          }
        }),
      );
      result = availabilityResults.filter((c): c is Car => Boolean(c));
    }

    // Ordenamiento
    const sortOrder = this.sortOrder();
    result.sort((a, b) => {
      const priceA = a['price_per_day'] || 0;
      const priceB = b['price_per_day'] || 0;
      const ratingA = a.rating_avg || 0;
      const ratingB = b.rating_avg || 0;
      switch (sortOrder) {
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'rating':
          return ratingB - ratingA;
        default:
          return 0; // relevance/distance keep API order
      }
    });

    this.filteredCars = result;
  }
}
