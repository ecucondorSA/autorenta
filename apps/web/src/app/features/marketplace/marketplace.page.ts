import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  signal,
  computed,
  inject,
  PLATFORM_ID,
  ViewChild,
  ElementRef,
  effect,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { CarsService } from '../../core/services/cars.service';
import { LocationService } from '../../core/services/location.service';
import { UrgentRentalService } from '../../core/services/urgent-rental.service';
import { DistanceCalculatorService } from '../../core/services/distance-calculator.service';
import { injectSupabase } from '../../core/services/supabase-client.service';
import { Car } from '../../core/models';
import { CarsMapComponent } from '../../shared/components/cars-map/cars-map.component';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { SocialProofIndicatorsComponent } from '../../shared/components/social-proof-indicators/social-proof-indicators.component';
import { MapFiltersComponent, FilterState } from '../../shared/components/map-filters/map-filters.component';
import { StickyCtaMobileComponent } from '../../shared/components/sticky-cta-mobile/sticky-cta-mobile.component';
import { UrgentRentalBannerComponent } from '../../shared/components/urgent-rental-banner/urgent-rental-banner.component';
import { WhatsappFabComponent } from '../../shared/components/whatsapp-fab/whatsapp-fab.component';
import { PwaTitlebarComponent } from '../../shared/components/pwa-titlebar/pwa-titlebar.component';
import { MobileBottomNavComponent } from '../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { AppHeaderComponent } from '../../shared/components/app-header/app-header.component';
import { UtilityBarComponent, QuickFilter } from '../../shared/components/utility-bar/utility-bar.component';
import { FloatingActionFabComponent, FabAction } from '../../shared/components/floating-action-fab/floating-action-fab.component';
import { PersonalizedLocationComponent } from '../../shared/components/personalized-location/personalized-location.component';
import { NotificationToastComponent } from '../../shared/components/notification-toast/notification-toast.component';
import { StatsStripComponent } from '../../shared/components/stats-strip/stats-strip.component';
import { DateRange } from '../../shared/components/date-range-picker/date-range-picker.component';
import {
  QuickBookingModalComponent,
  QuickBookingData,
} from '../../shared/components/quick-booking-modal/quick-booking-modal.component';
import { BookingsService } from '../../core/services/bookings.service';
import { AnalyticsService } from '../../core/services/analytics.service';

export interface CarWithDistance extends Car {
  distance?: number;
  distanceText?: string;
}

@Component({
  selector: 'app-marketplace-page',
  standalone: true,
  imports: [
    CommonModule,
    CarsMapComponent,
    CarCardComponent,
    SocialProofIndicatorsComponent,
    MapFiltersComponent,
    StickyCtaMobileComponent,
    UrgentRentalBannerComponent,
    WhatsappFabComponent,
    PwaTitlebarComponent,
    MobileBottomNavComponent,
    QuickBookingModalComponent,
    AppHeaderComponent,
    UtilityBarComponent,
    FloatingActionFabComponent,
    PersonalizedLocationComponent,
    NotificationToastComponent,
    StatsStripComponent,
  ],
  templateUrl: './marketplace.page.html',
  styleUrls: ['./marketplace.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplacePage implements OnInit, OnDestroy {
  @ViewChild(CarsMapComponent) carsMapComponent!: CarsMapComponent;
  @ViewChild('drawerContent', { read: ElementRef }) drawerContent?: ElementRef<HTMLDivElement>;

  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly locationService = inject(LocationService);
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly distanceCalculator = inject(DistanceCalculatorService);
  private readonly bookingsService = inject(BookingsService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // State
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly selectedCarId = signal<string | null>(null);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly drawerOpen = signal(false);
  readonly filtersVisible = signal(true);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly mapFilters = signal<FilterState>({
    dateRange: null,
    priceRange: null,
    vehicleTypes: null,
    immediateOnly: false,
    transmission: null,
  });
  readonly urgentAvailability = signal<{
    available: boolean;
    distance?: number;
    eta?: number;
  } | null>(null);
  readonly expressMode = signal(true);
  readonly quickBookingModalOpen = signal(false);
  readonly quickBookingCar = signal<Car | null>(null);
  readonly searchValue = signal('');
  readonly showFilters = signal(false);
  readonly radiusKm = signal(5);
  readonly toastVisible = signal(false);
  readonly toastMessage = signal('');

  // Computed
  readonly isMobile = computed(() => {
    if (!this.isBrowser) return false;
    return window.innerWidth < 1024;
  });

  readonly selectedCar = computed(() => {
    const carId = this.selectedCarId();
    if (!carId) return null;
    return this.cars().find((c) => c.id === carId) || null;
  });

  readonly quickFilters: QuickFilter[] = [
    { id: 'immediate', label: 'Entrega inmediata', icon: '⚡' },
    { id: 'verified', label: 'Dueño verificado', icon: '✓' },
    { id: 'no-card', label: 'Sin tarjeta', icon: '💳' },
  ];

  readonly fabActions: FabAction[] = [
    { id: 'filter', label: 'Filtros', icon: '🔍', color: 'primary' },
    { id: 'quick-rent', label: 'Reserva rápida', icon: '⚡', color: 'accent' },
    { id: 'location', label: 'Mi ubicación', icon: '📍', color: 'secondary' },
  ];

  readonly carsWithDistance = computed<CarWithDistance[]>(() => {
    const carsList = this.cars();
    const userLoc = this.userLocation();

    if (!carsList.length || !userLoc) {
      return carsList.map((car) => ({ ...car }));
    }

    return carsList.map((car) => {
      if (!car.location_lat || !car.location_lng) {
        return { ...car };
      }

      const distanceKm = this.distanceCalculator.calculateDistance(
        userLoc.lat,
        userLoc.lng,
        car.location_lat,
        car.location_lng,
      );

      let distanceText: string;
      if (distanceKm < 1) {
        distanceText = `${Math.round(distanceKm * 10) * 100}m`;
      } else if (distanceKm < 10) {
        distanceText = `${distanceKm.toFixed(1)}km`;
      } else {
        distanceText = `${Math.round(distanceKm)}km`;
      }

      return {
        ...car,
        distance: distanceKm,
        distanceText,
      };
    });
  });

  readonly carMapLocations = computed(() =>
    this.carsWithDistance().map((car) => {
      const gallery = this.extractPhotoGallery(car);
      return {
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
        photoUrl: gallery[0] ?? null,
        photoGallery: gallery,
        description: car.description,
      };
    }),
  );

  // Realtime
  private realtimeChannel?: RealtimeChannel;

  // Effects
  private readonly filtersEffect = effect(() => {
    const filters = this.mapFilters();
    if (filters.dateRange) {
      const from = filters.dateRange.start.toISOString().split('T')[0];
      const to = filters.dateRange.end.toISOString().split('T')[0];
      this.dateRange.set({ from, to });
    }
  });

  private readonly dateRangeEffect = effect(() => {
    const range = this.dateRange();
    if (range.from && range.to) {
      void this.loadCars();
    }
  });

  ngOnInit(): void {
    void this.initializeUserLocation();
    void this.loadCars();
    if (this.isBrowser) {
      this.setupRealtimeSubscription();
    }
  }

  ngOnDestroy(): void {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel);
    }
  }

  /**
   * Initialize user location from profile or GPS
   */
  private async initializeUserLocation(): Promise<void> {
    try {
      const locationData = await this.locationService.getUserLocation();
      if (locationData) {
        this.userLocation.set({
          lat: locationData.lat,
          lng: locationData.lng,
        });
      }
    } catch (_error) {
      console.warn('Could not get user location:', _error);
    }
  }

  /**
   * Load available cars with filters
   */
  async loadCars(): Promise<void> {
    this.loading.set(true);
    try {
      const dateRange = this.dateRange();
      const filters = this.mapFilters();

      if (dateRange.from && dateRange.to) {
        const items = await this.carsService.getAvailableCars(dateRange.from, dateRange.to, {
          limit: 100,
        });
        this.cars.set(items);
      } else {
        const items = await this.carsService.listActiveCars({
          from: dateRange.from ?? undefined,
          to: dateRange.to ?? undefined,
        });
        this.cars.set(items);
      }

      // Open drawer if there are cars and user location is set
      if (this.cars().length > 0 && this.userLocation() && !this.drawerOpen()) {
        this.drawerOpen.set(true);
      }
    } catch (err) {
      console.error('Error loading cars:', err);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Setup realtime subscription for car updates
   */
  private setupRealtimeSubscription(): void {
    this.realtimeChannel = this.supabase
      .channel('marketplace-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cars' }, () => {
        void this.loadCars();
      })
      .subscribe();
  }

  /**
   * Handle car selection from map
   */
  onCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
    this.drawerOpen.set(true);

    // Track analytics event
    this.analyticsService.trackEvent('cta_clicked', {
      car_id: carId,
      source: 'map_tooltip',
    });

    // Check urgent availability
    void this.checkUrgentAvailability(carId);
  }

  /**
   * Handle quick booking from map tooltip
   */
  onQuickBook(carId: string): void {
    const car = this.cars().find((c) => c.id === carId);
    if (!car) {
      console.warn('Car not found for quick booking:', carId);
      return;
    }

    this.quickBookingCar.set(car);
    this.quickBookingModalOpen.set(true);

    // Track analytics event
    this.analyticsService.trackEvent('cta_clicked', {
      car_id: carId,
      source: 'map_tooltip',
      cta_type: 'quick_book',
    });
  }

  /**
   * Handle quick booking confirmation
   */
  async onQuickBookingConfirm(data: QuickBookingData): Promise<void> {
    try {
      // Track analytics event
      this.analyticsService.trackEvent('booking_initiated', {
        car_id: data.carId,
        payment_method: data.paymentMethod,
        total_amount: data.totalPrice,
      });

      // Create booking
      const booking = await this.bookingsService.requestBooking(
        data.carId,
        data.startDate.toISOString(),
        data.endDate.toISOString(),
      );

      // Track success
      this.analyticsService.trackEvent('booking_completed', {
        car_id: data.carId,
        booking_id: booking.id,
        payment_method: data.paymentMethod,
        total_amount: data.totalPrice,
      });

      // Close modal
      this.quickBookingModalOpen.set(false);
      this.quickBookingCar.set(null);

      // Navigate to booking success page
      await this.router.navigate(['/bookings', booking.id, 'success']);
    } catch (error) {
      console.error('Error creating quick booking:', error);

      // Track error
      this.analyticsService.trackEvent('booking_failed', {
        car_id: data.carId,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      // Show error message (handled by modal component)
    }
  }

  /**
   * Handle quick booking cancellation
   */
  onQuickBookingCancel(): void {
    const carId = this.quickBookingCar()?.id;

    // Track analytics event
    if (carId) {
      this.analyticsService.trackEvent('cta_hovered', {
        car_id: carId,
        cta_type: 'quick_booking_cancelled',
      });
    }

    this.quickBookingModalOpen.set(false);
    this.quickBookingCar.set(null);
  }

  /**
   * Handle map filters change
   */
  onFiltersChange(filters: FilterState): void {
    this.mapFilters.set(filters);
    void this.loadCars();
    // Show toast notification
    this.toastMessage.set('Filtros aplicados');
    this.toastVisible.set(true);
    setTimeout(() => {
      this.toastVisible.set(false);
    }, 3000);
  }

  /**
   * Handle drawer close
   */
  onDrawerClose(): void {
    this.drawerOpen.set(false);
  }

  /**
   * Handle reserve CTA click
   */
  onReserveClick(): void {
    const carId = this.selectedCarId();
    if (carId) {
      this.router.navigate(['/cars', carId]);
    }
  }

  /**
   * Check urgent availability for selected car
   */
  private async checkUrgentAvailability(carId: string): Promise<void> {
    const car = this.cars().find((c) => c.id === carId);
    if (!car || !car.region_id) return;

    try {
      const availability = await this.urgentRentalService.checkImmediateAvailability(carId);
      this.urgentAvailability.set({
        available: availability.available,
        distance: availability.distance,
        eta: availability.eta,
      });
    } catch (_error) {
      console.warn('Could not check urgent availability:', _error);
    }
  }

  /**
   * Handle user location change from map
   */
  onUserLocationChange(location: { lat: number; lng: number }): void {
    this.userLocation.set(location);
    void this.loadCars();
  }

  /**
   * Extract photo gallery from car
   */
  private extractPhotoGallery(car: Car): string[] {
    const rawPhotos = car.photos ?? car.car_photos ?? [];
    if (!Array.isArray(rawPhotos)) {
      return [];
    }
    return rawPhotos
      .map((photo) => (typeof photo === 'string' ? photo : (photo?.url ?? null)))
      .filter((url): url is string => typeof url === 'string' && url.length > 0);
  }

  /**
   * Track by car ID for ngFor
   */
  trackByCarId(_index: number, car: CarWithDistance): string {
    return car.id;
  }

  onSearchChange(value: string): void {
    this.searchValue.set(value);
    // TODO: Filter cars by search value
  }

  onSearchSubmit(value: string): void {
    this.searchValue.set(value);
    // TODO: Navigate to search results
  }

  onQuickFilterClick(filterId: string): void {
    // TODO: Apply quick filter
    console.log('Quick filter clicked:', filterId);
  }

  onFabActionClick(actionId: string): void {
    switch (actionId) {
      case 'filter':
        this.showFilters.set(!this.showFilters());
        break;
      case 'quick-rent':
        // Open quick rent modal if car selected
        if (this.selectedCarId()) {
          const car = this.cars().find((c) => c.id === this.selectedCarId());
          if (car) {
            this.quickBookingCar.set(car);
            this.quickBookingModalOpen.set(true);
          }
        }
        break;
      case 'location':
        // Trigger location permission request
        void this.initializeUserLocation();
        break;
    }
  }
}
