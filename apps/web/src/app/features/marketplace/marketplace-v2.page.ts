import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Car } from '../../core/models';
import { CarMapLocation } from '../../core/services/car-locations.service';
import { CarsService } from '../../core/services/cars.service';
import { DistanceCalculatorService } from '../../core/services/distance-calculator.service';
import { GeocodingResult, GeocodingService } from '../../core/services/geocoding.service';
import { LocationService } from '../../core/services/location.service';
import { injectSupabase } from '../../core/services/supabase-client.service';
import { UrgentRentalService } from '../../core/services/urgent-rental.service';
import { CarsMapComponent } from '../../shared/components/cars-map/cars-map.component';
import {
  FabAction,
  FloatingActionFabComponent,
} from '../../shared/components/floating-action-fab/floating-action-fab.component';
import { FilterState } from '../../shared/components/map-filters/map-filters.component';

import { QuickFilter } from '../../shared/components/utility-bar/utility-bar.component';
import { WhatsappFabComponent } from '../../shared/components/whatsapp-fab/whatsapp-fab.component';

import { AnalyticsService } from '../../core/services/analytics.service';
import { BookingsService } from '../../core/services/bookings.service';
import { BreakpointService } from '../../core/services/breakpoint.service';
import { NotificationManagerService } from '../../core/services/notification-manager.service';
import { TikTokEventsService } from '../../core/services/tiktok-events.service';
import { Car3dViewerComponent } from '../../shared/components/car-3d-viewer/car-3d-viewer.component';
import {
  DateRange,
  DateRangePickerComponent,
} from '../../shared/components/date-range-picker/date-range-picker.component';
import { DynamicPricingBadgeComponent } from '../../shared/components/dynamic-pricing-badge/dynamic-pricing-badge.component';
import {
  MapControlsComponent,
  MapControlsEvent,
} from '../../shared/components/map-controls/map-controls.component';
import { PriceTransparencyModalComponent } from '../../shared/components/price-transparency-modal/price-transparency-modal.component';
import {
  QuickBookingData,
  QuickBookingModalComponent,
} from '../../shared/components/quick-booking-modal/quick-booking-modal.component';
import { TooltipComponent } from '../../shared/components/tooltip/tooltip.component';
import { SkeletonComponent } from './components/ui/skeleton.component';

export interface CarWithDistance extends Car {
  distance?: number;
  distanceText?: string;
}

export type ViewMode = 'grid' | 'list' | 'map';

// Type alias for backward compatibility
type ToastType = 'success' | 'info' | 'warning' | 'error';

export interface Stat {
  label: string;
  value: string | number;
  icon: string;
}

@Component({
  selector: 'app-marketplace-v2-page',
  standalone: true,
  imports: [
    CommonModule,
    CarsMapComponent,

    WhatsappFabComponent,
    QuickBookingModalComponent,
    FloatingActionFabComponent,
    // NotificationToastComponent, // REMOVED: Using PrimeNG Toast now

    TooltipComponent,
    DateRangePickerComponent,
    DynamicPricingBadgeComponent,
    // FiltersDrawerComponent,
    MapControlsComponent,
    PriceTransparencyModalComponent,
    SkeletonComponent,
    Car3dViewerComponent,
  ],
  templateUrl: './marketplace-v2.page.html',
  styleUrls: ['./marketplace-v2.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceV2Page implements OnInit, OnDestroy {
  @ViewChild(CarsMapComponent) carsMapComponent!: CarsMapComponent;
  @ViewChild('drawerContent', { read: ElementRef }) drawerContent?: ElementRef<HTMLDivElement>;

  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly notificationManager = inject(NotificationManagerService);
  private readonly tiktokEvents = inject(TikTokEventsService);
  private readonly distanceCalculator = inject(DistanceCalculatorService);
  private readonly bookingsService = inject(BookingsService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly breakpoint = inject(BreakpointService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private locationSearchTimeout?: ReturnType<typeof setTimeout>;

  // State
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
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
  readonly viewMode = signal<ViewMode>('list');
  readonly toastMessage = signal('');
  readonly toastType = signal<ToastType>('info');
  readonly toastVisible = signal(false);
  readonly radiusKm = signal(5); // Search radius in kilometers
  readonly showDatePicker = signal(false); // Modal de selector de fechas
  readonly showLocationPicker = signal(false); // Modal de selector de ubicación
  readonly selectedLocation = signal<string>(''); // Ubicación seleccionada
  readonly locationSuggestions = signal<GeocodingResult[]>([]); // Sugerencias de ubicación
  readonly showLocationSuggestions = signal(false); // Mostrar dropdown de sugerencias
  readonly locationSearchLoading = signal(false); // Cargando sugerencias
  readonly googleCalendarId = signal<string | null>(environment.googleCalendarId || null); // ID del calendario de Google desde environment
  readonly showPriceTransparencyModal = signal(false); // Modal de transparencia de precios
  readonly mapBounds = signal<{ north: number; south: number; east: number; west: number } | null>(
    null,
  );
  readonly showSearchAreaButton = signal(false); // Botón "Buscar en esta zona"

  // Computed - Ahora usa BreakpointService
  readonly isMobile = this.breakpoint.isMobile;
  readonly isTablet = this.breakpoint.isTablet;
  readonly isDesktop = this.breakpoint.isDesktop;

  readonly selectedCar = computed(() => {
    const carId = this.selectedCarId();
    if (!carId) return null;
    return this.cars().find((c) => c.id === carId) || null;
  });

  readonly quickFilters: QuickFilter[] = [
    { id: 'immediate', label: 'Entrega inmediata', icon: '⚡' },
    { id: 'verified', label: 'Dueño verificado', icon: '✓' },
    { id: 'no-card', label: 'Sin tarjeta', icon: '💳' },
    { id: 'near-me', label: 'Cerca de mí', icon: '📍' },
    { id: 'electric', label: 'Eléctrico', icon: '🔋' },
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

  readonly statsStripData = computed<Stat[]>(() => {
    const totalCars = this.carsWithDistance().length;
    const availableNow = this.carsWithDistance().filter((c) => c.distance && c.distance < 5).length;
    const avgPrice = this.calculateAveragePrice();
    return [
      { label: 'Autos disponibles', value: totalCars, icon: '🚗' },
      { label: 'Cerca de ti', value: availableNow, icon: '📍' },
      { label: 'Desde', value: `$${avgPrice}/día`, icon: '💰' },
    ];
  });

  readonly availableNowCount = computed(() => {
    return this.carsWithDistance().filter((c) => c.distance && c.distance < 5).length;
  });

  readonly activeQuickFilters = signal<Set<string>>(new Set());

  readonly visibleCars = computed(() => {
    // Return cars that match current filters and apply sorting
    let cars = [...this.carsWithDistance()];
    const filters = this.mapFilters();
    const quickFilters = this.activeQuickFilters();

    // 1. Filter by Map Filters
    if (filters.priceRange) {
      cars = cars.filter(
        (c) => c.price_per_day >= filters.priceRange!.min && c.price_per_day <= filters.priceRange!.max,
      );
    }

    if (filters.transmission && filters.transmission.length > 0) {
      cars = cars.filter((c) => filters.transmission!.includes(c.transmission));
    }

    if (filters.immediateOnly) {
      cars = cars.filter((c) => c.auto_approval);
    }

    // 2. Filter by Quick Filters
    if (quickFilters.has('verified')) {
      // Filter by verified owner (email + phone verified)
      cars = cars.filter((c) => c.owner?.is_email_verified && c.owner?.is_phone_verified);
    }

    if (quickFilters.has('electric')) {
      cars = cars.filter((c) => c.fuel_type === 'electric' || c.fuel === 'electric');
    }

    if (quickFilters.has('no-card')) {
      // Filter cars that accept other payment methods or don't require credit card
      // Assuming 'debit_card', 'cash', 'transfer' in payment_methods
      cars = cars.filter((c) =>
        c.payment_methods?.some(pm => ['debit_card', 'cash', 'transfer', 'wallet'].includes(pm)) ||
        !c.payment_methods?.includes('credit_card')
      );
    }

    // 'near-me' is handled by sorting/radius, but we can enforce radius filter if needed
    // 'immediate' is handled by mapFilters sync

    const sort = this.sortOrder();

    // Apply sorting based on selected order
    switch (sort) {
      case 'distance':
        // Sort by distance (closest first)
        cars = cars.sort((a, b) => {
          const distA = a.distance ?? Number.MAX_VALUE;
          const distB = b.distance ?? Number.MAX_VALUE;
          return distA - distB;
        });
        break;

      case 'price_asc':
        // Sort by price (lowest first)
        cars = cars.sort((a, b) => a.price_per_day - b.price_per_day);
        break;

      case 'price_desc':
        // Sort by price (highest first)
        cars = cars.sort((a, b) => b.price_per_day - a.price_per_day);
        break;

      case 'rating':
        // Sort by rating (highest first)
        cars = cars.sort((a, b) => {
          const ratingA = a.avg_rating ?? 0;
          const ratingB = b.avg_rating ?? 0;
          return ratingB - ratingA;
        });
        break;

      case 'score':
      case 'relevance':
      default:
        // Keep default order (relevance/score from backend)
        break;
    }

    return cars;
  });

  readonly sortOrder = signal<string>('relevance');

  /**
   * Contextual marker variant:
   * - 'photo' for browsing/exploration (default for marketplace - more visual)
   * - 'price' when user is actively comparing prices (has filters or date range)
   */
  readonly contextualMarkerVariant = computed<'photo' | 'price'>(() => {
    // Default to 'photo' for marketplace - more visual and marketplace-like
    // Only switch to 'price' when user is actively filtering/comparing
    const filters = this.mapFilters();
    const dateRange = this.dateRange();

    // Switch to 'price' mode ONLY when:
    // 1. User has active price filters AND date range (serious comparison)
    const hasPriceFilter = filters.priceRange !== null;
    const hasDateRange = dateRange.from !== null && dateRange.to !== null;

    // Only use price mode when both price filter AND date range are active
    if (hasPriceFilter && hasDateRange) {
      return 'price'; // Price comparison mode
    }

    // Default to photo mode for better marketplace experience
    return 'photo'; // Browsing/exploration mode (default - more visual)
  });

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
      this.checkPriceTransparencyModal();
    }

    // Show welcome toast
    setTimeout(() => {
      this.showToast('¡Bienvenido! Encuentra tu auto ideal 🚗', 'success');
    }, 500);
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
    this.error.set(null);
    try {
      const dateRange = this.dateRange();
      // const filters = this.mapFilters();

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

      // Hide search button after loading
      this.showSearchAreaButton.set(false);

      // Open drawer if there are cars and user location is set
      if (this.cars().length > 0 && this.userLocation() && !this.drawerOpen()) {
        this.drawerOpen.set(true);
      }
    } catch (err) {
      console.error('Error loading cars:', err);
      this.error.set('No se pudieron cargar los autos. Por favor, intenta de nuevo más tarde.');
      this.showToast('Error al cargar los autos. Por favor intenta de nuevo.', 'error');
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
   * Handle logo click - switch to map view and request current location
   */
  async onLogoClick(): Promise<void> {
    // Cambiar al modo mapa
    this.viewMode.set('map');

    // Solicitar ubicación actual del navegador
    try {
      const currentPosition = await this.locationService.getCurrentPosition();
      if (currentPosition) {
        this.userLocation.set({
          lat: currentPosition.lat,
          lng: currentPosition.lng,
        });
        // Recargar autos con la nueva ubicación
        await this.loadCars();
        this.showToast('Ubicación actualizada', 'success');
      } else {
        this.showToast(
          'No se pudo obtener tu ubicación. Verifica los permisos del navegador.',
          'warning',
        );
      }
    } catch (error) {
      console.warn('Error obteniendo ubicación:', error);
      this.showToast('Error al obtener tu ubicación', 'error');
    }

    // Scroll suave al mapa después de cambiar el modo
    if (this.isBrowser) {
      setTimeout(() => {
        const mapElement = document.querySelector('app-cars-map');
        if (mapElement) {
          mapElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  onCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
    this.drawerOpen.set(true);

    // Track analytics event
    this.analyticsService.trackEvent('cta_clicked', {
      car_id: carId,
      source: 'car_card',
    });

    // Scroll to car in list view
    if (this.viewMode() === 'list' && this.isBrowser) {
      setTimeout(() => {
        const element = document.querySelector(`[data-car-id="${carId}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
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
      source: 'quick_book_button',
      cta_type: 'quick_book',
    });
  }

  /**
   * Handle quick booking confirmation
   */
  async onQuickBookingConfirm(data: QuickBookingData): Promise<void> {
    try {
      this.showToast('Procesando tu reserva...', 'info');

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

      this.showToast('¡Reserva confirmada! 🎉', 'success');

      // Navigate to booking success page
      await this.router.navigate(['/bookings', booking.id, 'success']);
    } catch (error) {
      console.error('Error creating quick booking:', error);

      // Track error
      this.analyticsService.trackEvent('booking_failed', {
        car_id: data.carId,
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });

      this.showToast('Error al crear la reserva. Por favor intenta de nuevo.', 'error');
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

    // Sync quick filters if needed
    const quick = new Set(this.activeQuickFilters());
    if (filters.immediateOnly) quick.add('immediate');
    else quick.delete('immediate');
    this.activeQuickFilters.set(quick);

    void this.loadCars();
    this.showToast('Filtros aplicados', 'success');
    this.closeFiltersPanel();
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
   * Handle user location change from map
   */
  onUserLocationChange(location: { lat: number; lng: number }): void {
    this.userLocation.set(location);
    void this.loadCars();
    this.showToast('Ubicación actualizada', 'success');
  }

  /**
   * Handle map bounds change
   */
  onBoundsChange(bounds: google.maps.LatLngBoundsLiteral): void {
    // Don't update immediately, just show the button
    // Only update if bounds are significantly different to avoid jitter
    this.mapBounds.set(bounds);
    this.showSearchAreaButton.set(true);
  }

  /**
   * Trigger search in current area
   */
  searchInArea(): void {
    void this.loadCars();
  }

  /**
   * Handle map controls events
   */
  onMapControlEvent(event: MapControlsEvent): void {
    if (!this.carsMapComponent) {
      console.warn('Map component not initialized');
      return;
    }

    switch (event.type) {
      case 'center':
        if (this.userLocation()) {
          this.carsMapComponent.flyTo(this.userLocation()!);
          this.showToast('Centrando en tu ubicación...', 'info');
        } else {
          this.showToast('Ubicación no disponible', 'warning');
          void this.onLogoClick(); // Try to get location
        }
        break;
      case 'fullscreen':
        this.toggleFullscreen();
        break;
      case '3d-toggle':
        // TODO: Implement 3D view toggle
        break;
      case 'search-area':
        void this.loadCars();
        this.showToast('Buscando en esta área...', 'info');
        break;
    }
  }

  /**
   * Toggle fullscreen mode for map
   */
  private toggleFullscreen(): void {
    const elem = document.documentElement;
    if (!document.fullscreenElement) {
      elem.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
        this.showToast('No se pudo activar pantalla completa', 'error');
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * Extract photo gallery from car
   */
  extractPhotoGallery(car: Car): string[] {
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

  trackBySuggestion(_index: number, suggestion: GeocodingResult): string {
    return `${suggestion.latitude}-${suggestion.longitude}`;
  }

  onSearchChange(value: string): void {
    this.searchValue.set(value);
  }

  onSearchSubmit(value: string): void {
    this.searchValue.set(value);
    this.showToast(`Buscando autos en "${value}"...`, 'info');

    // 🎯 TikTok Events: Track Search
    void this.tiktokEvents.trackSearch({
      searchString: value,
    });

    void this.loadCars();
  }

  onQuickFilterClick(filterId: string): void {
    const current = new Set(this.activeQuickFilters());
    let active = false;

    if (current.has(filterId)) {
      current.delete(filterId);
      active = false;
    } else {
      current.add(filterId);
      active = true;
    }
    this.activeQuickFilters.set(current);

    // Sync specific filters with mapFilters
    if (filterId === 'immediate') {
      const filters = this.mapFilters();
      this.mapFilters.set({ ...filters, immediateOnly: active });
    }

    if (filterId === 'near-me' && active) {
      this.sortOrder.set('distance');
    }

    this.showToast(`Filtro "${filterId}" ${active ? 'activado' : 'desactivado'}`, 'info');
  }

  private openQuickBooking(): void {
    const selectedCar = this.selectedCar();
    const carToBook = selectedCar ?? this.cars()[0] ?? null;

    if (!carToBook) {
      this.showToast('No hay autos disponibles para reservar en este momento.', 'warning');
      return;
    }

    this.selectedCarId.set(carToBook.id);
    this.quickBookingCar.set(carToBook);
    this.quickBookingModalOpen.set(true);

    this.analyticsService.trackEvent('cta_clicked', {
      car_id: carToBook.id,
      source: 'fab_quick_booking',
    });
  }

  private async handleLocationAction(): Promise<void> {
    await this.onLogoClick();
    this.analyticsService.trackEvent('cta_clicked', {
      source: 'fab_location',
    });
  }

  private openFiltersPanel(): void {
    this.showFilters.set(true);
    this.analyticsService.trackEvent('filters_opened', {
      source: 'fab',
    });
  }

  closeFiltersPanel(): void {
    this.showFilters.set(false);
  }

  /**
   * Abre el selector de fechas
   */
  openDatePicker(): void {
    this.showDatePicker.set(true);
  }

  /**
   * Cierra el selector de fechas
   */
  closeDatePicker(): void {
    this.showDatePicker.set(false);
  }

  /**
   * Maneja el cambio de rango de fechas
   */
  onDateRangeChange(range: DateRange): void {
    this.dateRange.set(range);

    if (range.from && range.to) {
      this.showToast(`Fechas: ${range.from} - ${range.to}`, 'success');
      void this.loadCars();
      this.closeDatePicker(); // Cerrar el modal al seleccionar fechas
    }
  }

  /**
   * Abre el selector de ubicación
   */
  openLocationPicker(): void {
    this.showLocationPicker.set(true);
  }

  /**
   * Cierra el selector de ubicación
   */
  closeLocationPicker(): void {
    this.showLocationPicker.set(false);
  }

  /**
   * Maneja la selección de ubicación
   */
  onLocationSelect(location: string): void {
    this.selectedLocation.set(location);
    this.searchValue.set(location);
    this.closeLocationPicker();
    this.showToast(`Ubicación: ${location}`, 'success');
    void this.loadCars();
  }

  /**
   * Maneja el cambio en el input de ubicación - busca sugerencias dinámicamente
   */
  onLocationInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();

    this.selectedLocation.set(query);
    this.searchValue.set(query);

    // Limpiar timeout anterior
    if (this.locationSearchTimeout) {
      clearTimeout(this.locationSearchTimeout);
    }

    // Si el query es muy corto, ocultar sugerencias
    if (query.length < 2) {
      this.locationSuggestions.set([]);
      this.showLocationSuggestions.set(false);
      return;
    }

    // Mostrar sugerencias
    this.showLocationSuggestions.set(true);
    this.locationSearchLoading.set(true);

    // Debounce: esperar 300ms después de que el usuario deje de escribir
    this.locationSearchTimeout = setTimeout(async () => {
      try {
        // Buscar en Argentina, Uruguay y Brasil
        const suggestions = await this.geocodingService.getLocationSuggestions(
          query,
          'AR,UY,BR',
          8,
        );
        this.locationSuggestions.set(suggestions);
      } catch (error) {
        console.warn('Error buscando sugerencias:', error);
        this.locationSuggestions.set([]);
      } finally {
        this.locationSearchLoading.set(false);
      }
    }, 300);
  }

  /**
   * Selecciona una sugerencia de ubicación
   */
  onLocationSuggestionSelect(suggestion: GeocodingResult): void {
    this.selectedLocation.set(suggestion.fullAddress);
    this.searchValue.set(suggestion.fullAddress);
    this.showLocationSuggestions.set(false);
    this.locationSuggestions.set([]);

    // Actualizar ubicación del usuario en el mapa
    this.userLocation.set({
      lat: suggestion.latitude,
      lng: suggestion.longitude,
    });

    // Recargar autos con la nueva ubicación
    void this.loadCars();
    this.showToast(`Ubicación: ${suggestion.placeName}`, 'success');
  }

  /**
   * Cierra el dropdown de sugerencias
   */
  closeLocationSuggestions(): void {
    this.showLocationSuggestions.set(false);
  }

  /**
   * Maneja el blur del input de ubicación con delay para permitir clicks en sugerencias
   */
  onLocationInputBlur(): void {
    setTimeout(() => {
      this.closeLocationSuggestions();
    }, 200);
  }

  onFabActionClick(actionId: string): void {
    switch (actionId) {
      case 'filter':
        this.openFiltersPanel();
        break;
      case 'quick-rent':
        this.openQuickBooking();
        break;
      case 'location':
        void this.handleLocationAction();
        break;
    }
  }

  calculateAveragePrice(): number {
    const cars = this.carsWithDistance();
    if (cars.length === 0) return 0;
    const sum = cars.reduce((acc, car) => acc + car.price_per_day, 0);
    return Math.round(sum / cars.length);
  }

  getCarInstantBooking(car: CarWithDistance): boolean {
    // Check if car has auto_approval enabled (closest equivalent to instant booking)
    return car.auto_approval === true;
  }

  showToast(message: string, type: ToastType = 'info'): void {
    // Using NotificationManagerService instead of inline toast
    const title =
      type === 'success'
        ? 'Éxito'
        : type === 'error'
          ? 'Error'
          : type === 'warning'
            ? 'Advertencia'
            : 'Información';

    if (type === 'success') {
      this.notificationManager.success(title, message);
    } else if (type === 'error') {
      this.notificationManager.error(title, message);
    } else if (type === 'warning') {
      this.notificationManager.warning(title, message);
    } else {
      this.notificationManager.info(title, message);
    }
  }

  /**
   * Handle search radius change from map
   */
  onSearchRadiusChange(radiusKm: number): void {
    this.radiusKm.set(radiusKm);
    // Reload cars with new radius filter
    void this.loadCars();
  }

  /**
   * Check if user has seen price transparency modal
   * Show it on first visit with a 1.5s delay
   */
  private checkPriceTransparencyModal(): void {
    if (!this.isBrowser) return;

    const hasSeenModal = localStorage.getItem('hasSeenPriceTransparencyModal');

    if (!hasSeenModal) {
      // Show modal after 1.5 seconds (after welcome toast)
      setTimeout(() => {
        this.showPriceTransparencyModal.set(true);
      }, 1500);
    }
  }

  /**
   * Handle price transparency modal close
   */
  onPriceTransparencyModalClose(): void {
    this.showPriceTransparencyModal.set(false);

    if (this.isBrowser) {
      localStorage.setItem('hasSeenPriceTransparencyModal', 'true');
    }

    // Track analytics event
    this.analyticsService.trackEvent('price_transparency_modal_viewed', {
      context: 'marketplace_first_visit',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle quick book from hero section
   */
  handleHeroQuickBook(): void {
    const firstCar = this.visibleCars()[0];
    if (firstCar) {
      this.onQuickBook(firstCar.id);
    } else {
      this.showToast('No hay autos disponibles para reservar', 'warning');
    }
  }

  /**
   * Check if a quick filter is active
   */
  isQuickFilterActive(filterId: string): boolean {
    return this.activeQuickFilters().has(filterId);
  }

  /**
   * Handle sort order change
   */
  onSortOrderChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const value = select.value;
    this.sortOrder.set(value);

    // Show user-friendly toast message
    const messages: Record<string, string> = {
      'distance': 'Mostrando autos más cercanos primero',
      'price_asc': 'Ordenado por precio: menor a mayor',
      'price_desc': 'Ordenado por precio: mayor a menor',
      'rating': 'Mostrando mejor valorados primero',
      'score': 'Ordenado por relevancia',
      'relevance': 'Ordenado por relevancia'
    };

    const message = messages[value] || `Ordenado por: ${value}`;
    this.showToast(message, 'info');
  }

  /**
   * Clear all quick filters
   */
  clearQuickFilters(): void {
    // Reset filters to default
    this.mapFilters.set({
      dateRange: null,
      priceRange: null,
      vehicleTypes: null,
      immediateOnly: false,
      transmission: null,
    });
    this.activeQuickFilters.set(new Set());
    void this.loadCars();
    this.showToast('Filtros limpiados', 'success');
  }

  /**
   * Map filter source locations for the map component
   */
  mapFilterSourceLocations(): CarMapLocation[] {
    return this.carMapLocations();
  }
}
