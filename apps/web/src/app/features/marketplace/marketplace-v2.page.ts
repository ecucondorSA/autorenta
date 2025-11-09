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
import { WhatsappFabComponent } from '../../shared/components/whatsapp-fab/whatsapp-fab.component';
import { MobileBottomNavComponent } from '../../shared/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { UtilityBarComponent, QuickFilter } from '../../shared/components/utility-bar/utility-bar.component';
import { FloatingActionFabComponent, FabAction } from '../../shared/components/floating-action-fab/floating-action-fab.component';
import { NotificationToastComponent, ToastType } from '../../shared/components/notification-toast/notification-toast.component';
import { DateRange } from '../../shared/components/date-range-picker/date-range-picker.component';
import {
  QuickBookingModalComponent,
  QuickBookingData,
} from '../../shared/components/quick-booking-modal/quick-booking-modal.component';
import { BookingsService } from '../../core/services/bookings.service';
import { AnalyticsService } from '../../core/services/analytics.service';
import { IconGeneratorService } from '../../core/services/icon-generator.service';
import { PaymentAuthorizationService } from '../../core/services/payment-authorization.service';
import { AuthService } from '../../core/services/auth.service';
import { FxService } from '../../core/services/fx.service';

export interface CarWithDistance extends Car {
  distance?: number;
  distanceText?: string;
}

export type ViewMode = 'grid' | 'list' | 'map';

@Component({
  selector: 'app-marketplace-v2-page',
  standalone: true,
  imports: [
    CommonModule,
    CarsMapComponent,
    CarCardComponent,
    SocialProofIndicatorsComponent,
    MapFiltersComponent,
    WhatsappFabComponent,
    MobileBottomNavComponent,
    QuickBookingModalComponent,
    FloatingActionFabComponent,
    NotificationToastComponent,
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
  private readonly urgentRentalService = inject(UrgentRentalService);
  private readonly distanceCalculator = inject(DistanceCalculatorService);
  private readonly bookingsService = inject(BookingsService);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly iconGenerator = inject(IconGeneratorService);
  private readonly paymentAuthService = inject(PaymentAuthorizationService);
  private readonly authService = inject(AuthService);
  private readonly fxService = inject(FxService);
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
  readonly viewMode = signal<ViewMode>('grid');
  readonly toastMessage = signal('');
  readonly toastType = signal<ToastType>('info');
  readonly toastVisible = signal(false);

  // Iconos generados con IA
  readonly generatedIcons = signal<Map<string, string>>(new Map());
  readonly iconsLoading = signal(false);

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
    { id: 'near-me', label: 'Cerca de mí', icon: '📍' },
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

  readonly marketplaceStats = computed(() => {
    const cars = this.carsWithDistance();
    const availableNow = cars.filter(c => c.distance != null && c.distance < 5).length;
    const avgPrice = this.calculateAveragePrice();

    return [
      { label: 'Autos disponibles', value: cars.length, icon: '🚗' },
      { label: 'Disponibles ahora', value: availableNow, icon: '⚡' },
      { label: 'Precio promedio', value: `$${avgPrice.toLocaleString()}`, icon: '💰' },
    ];
  });

  readonly nearbyCarsCount = computed(() => {
    return this.carsWithDistance().filter(c => c.distance != null && c.distance < 5).length;
  });

  readonly selectedCarDistance = computed(() => {
    const carId = this.selectedCarId();
    if (!carId) return undefined;
    const car = this.carsWithDistance().find(c => c.id === carId);
    return car?.distanceText ?? undefined;
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
        ownerAvatarUrl: this.getOwnerAvatarUrl(car),
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
      // Pre-cargar iconos generados con IA
      void this.preloadIcons();
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
   * ✅ NEW: Automatically centers map on user location when obtained
   */
  private async initializeUserLocation(): Promise<void> {
    try {
      const locationData = await this.locationService.getUserLocation();
      if (locationData) {
        this.userLocation.set({
          lat: locationData.lat,
          lng: locationData.lng,
        });

        // ✅ NEW: Automatically center map on user location
        this.centerMapOnUserLocationWhenReady(locationData.lat, locationData.lng);
      } else {
        // Si no se puede obtener ubicación, usar ubicación por defecto (Buenos Aires)
        console.warn('No se pudo obtener ubicación, usando ubicación por defecto');
        this.userLocation.set({
          lat: -34.6037,
          lng: -58.3816,
        });
      }
    } catch (_error) {
      console.warn('Could not get user location:', _error);
      // Fallback a Buenos Aires
      this.userLocation.set({
        lat: -34.6037,
        lng: -58.3816,
      });
    }
  }

  /**
   * ✅ NEW: Center map on user location when map is ready
   */
  private centerMapOnUserLocationWhenReady(lat: number, lng: number): void {
    // Intentar centrar inmediatamente si el mapa ya está listo
    if (this.carsMapComponent?.mapInstance) {
      this.carsMapComponent.flyToLocation(lat, lng, 14);
      return;
    }

    // Si el mapa no está listo, esperar y reintentar
    let attempts = 0;
    const maxAttempts = 20; // 10 segundos máximo (20 * 500ms)
    
    const checkAndCenter = setInterval(() => {
      attempts++;
      
      if (this.carsMapComponent?.mapInstance) {
        this.carsMapComponent.flyToLocation(lat, lng, 14);
        clearInterval(checkAndCenter);
      } else if (attempts >= maxAttempts) {
        // Silenciosamente omitir - el mapa se centrará cuando esté listo
        clearInterval(checkAndCenter);
      }
    }, 500);
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
   * Handle car selection from map
   */
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
   * ✅ NEW: Integrates preauthorization for credit card payments
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

      let preauthIntentId: string | undefined;

      // ✅ NEW: If payment method is credit card (transfer), create preauthorization first
      if (data.paymentMethod === 'transfer') {
        try {
          this.showToast('Preautorizando tu tarjeta...', 'info');

          // Get user info
          const user = await this.authService.getCurrentUser();
          if (!user) {
            throw new Error('Usuario no autenticado');
          }

          // Get user email
          const { data: profile } = await this.supabase
            .from('profiles')
            .select('email')
            .eq('id', user.id)
            .single();

          const payerEmail = profile?.email || user.email || '';

          // Get FX rate
          const fxRate = await this.fxService.getCurrentRateAsync('USD', 'ARS');
          const amountUsd = data.currency === 'USD' ? data.totalPrice : data.totalPrice / fxRate;
          const amountArs = data.currency === 'ARS' ? data.totalPrice : data.totalPrice * fxRate;

          // Check if card token is provided (from QuickBookingModal)
          const cardToken = data.cardToken;
          if (!cardToken) {
            throw new Error('Token de tarjeta requerido para preautorización');
          }

          // Create preauthorization
          const preauthResult = await this.paymentAuthService
            .authorizePayment({
              userId: user.id,
              amountUsd: Number(amountUsd.toFixed(2)),
              amountArs: Number(amountArs.toFixed(2)),
              fxRate: fxRate,
              cardToken: cardToken,
              payerEmail: payerEmail,
              description: `Preautorización de reserva - ${data.carId.substring(0, 8)}`,
            })
            .toPromise();

          if (!preauthResult?.ok || !preauthResult.authorizedPaymentId) {
            throw new Error(
              preauthResult?.error || 'Error al preautorizar la tarjeta. Por favor intenta de nuevo.',
            );
          }

          preauthIntentId = preauthResult.authorizedPaymentId;
          this.showToast('Preautorización exitosa. Creando reserva...', 'success');
        } catch (preauthError) {
          console.error('Error creating preauthorization:', preauthError);
          const errorMessage =
            preauthError instanceof Error
              ? preauthError.message
              : 'Error al preautorizar la tarjeta. Por favor intenta de nuevo.';

          this.analyticsService.trackEvent('preauth_failed', {
            car_id: data.carId,
            error_message: errorMessage,
          });

          this.showToast(errorMessage, 'error');
          return; // Stop booking creation if preauth fails
        }
      }

      // Create booking with all parameters to avoid RPC overload ambiguity
      const booking = await this.bookingsService.requestBooking(
        data.carId,
        data.startDate.toISOString(),
        data.endDate.toISOString(),
        {
          totalPrice: data.totalPrice,
          driverAge: data.driverAge ?? null,
          paymentMethod: data.paymentMethod,
          preauthIntentId: preauthIntentId, // ✅ NEW: Pass preauth intent ID
          // Location fields: null for quick booking (no delivery)
          pickupLat: null,
          pickupLng: null,
          dropoffLat: null,
          dropoffLng: null,
          deliveryRequired: false,
          deliveryDistanceKm: null,
          deliveryFeeCents: 0,
          distanceRiskTier: null,
        },
      );

      // Track success
      this.analyticsService.trackEvent('booking_completed', {
        car_id: data.carId,
        booking_id: booking.id,
        payment_method: data.paymentMethod,
        total_amount: data.totalPrice,
        preauth_intent_id: preauthIntentId,
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
    void this.loadCars();
    this.showToast('Filtros aplicados', 'success');
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
   * Obtener URL del avatar del dueño del auto
   */
  getOwnerAvatarUrl(car: Car): string | null {
    if (!car.owner?.avatar_url) {
      return null;
    }

    // Si ya es una URL completa, retornarla
    if (car.owner.avatar_url.startsWith('http')) {
      return car.owner.avatar_url;
    }

    // Si es un path relativo, construir la URL de Supabase Storage
    // El path debería ser: {user_id}/{filename} (sin bucket name)
    try {
      const { data } = this.supabase.storage.from('avatars').getPublicUrl(car.owner.avatar_url);
      return data.publicUrl;
    } catch {
      return null;
    }
  }

  /**
   * Track by car ID for ngFor
   */
  trackByCarId(_index: number, car: CarWithDistance): string {
    return car.id;
  }

  onSearchChange(value: string): void {
    this.searchValue.set(value);
  }

  onSearchSubmit(value: string): void {
    this.searchValue.set(value);
    this.showToast(`Buscando autos en "${value}"...`, 'info');
    void this.loadCars();
  }

  onQuickFilterClick(filterId: string): void {
    console.log('Quick filter clicked:', filterId);
    this.showToast(`Filtro "${filterId}" aplicado`, 'info');
    // TODO: Apply quick filter
  }

  onFabActionClick(actionId: string): void {
    switch (actionId) {
      case 'filter':
        const isOpening = !this.showFilters();
        this.showFilters.set(isOpening);
        if (isOpening) {
          this.showToast('Abre los filtros para refinar tu búsqueda 🔍', 'info');
        }
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
        // Centrar mapa en ubicación del usuario
        void this.centerMapOnUserLocation();
        break;
    }
  }

  /**
   * Centrar mapa en la ubicación del usuario
   */
  private async centerMapOnUserLocation(): Promise<void> {
    try {
      // Si ya tenemos ubicación, centrar el mapa
      if (this.userLocation()) {
        if (this.carsMapComponent?.mapInstance) {
          this.carsMapComponent.flyToLocation(
            this.userLocation()!.lat,
            this.userLocation()!.lng,
            14
          );
          this.showToast('Mapa centrado en tu ubicación 📍', 'success');
        } else {
          this.showToast('Cargando mapa...', 'info');
        }
        return;
      }

      // Si no tenemos ubicación, solicitarla
      this.showToast('Obteniendo tu ubicación...', 'info');
      
      const locationData = await this.locationService.getUserLocation();
      if (locationData) {
        this.userLocation.set({
          lat: locationData.lat,
          lng: locationData.lng,
        });

        // Centrar el mapa en la nueva ubicación
        if (this.carsMapComponent?.mapInstance) {
          this.carsMapComponent.flyToLocation(
            locationData.lat,
            locationData.lng,
            14
          );
          this.showToast('Mapa centrado en tu ubicación 📍', 'success');
        } else {
          // Si el mapa aún no está listo, esperar un poco
          setTimeout(() => {
            if (this.carsMapComponent?.mapInstance) {
              this.carsMapComponent.flyToLocation(
                locationData.lat,
                locationData.lng,
                14
              );
              this.showToast('Mapa centrado en tu ubicación 📍', 'success');
            }
          }, 500);
        }

        // Recargar autos con la nueva ubicación
        void this.loadCars();
      } else {
        this.showToast('No se pudo obtener tu ubicación. Verifica los permisos.', 'error');
      }
    } catch (error) {
      console.error('Error centering map on user location:', error);
      this.showToast('Error al obtener tu ubicación', 'error');
    }
  }

  calculateAveragePrice(): number {
    const cars = this.carsWithDistance();
    if (cars.length === 0) return 0;
    const sum = cars.reduce((acc, car) => acc + car.price_per_day, 0);
    return Math.round(sum / cars.length);
  }

  showToast(message: string, type: ToastType = 'info'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    this.toastVisible.set(true);

    setTimeout(() => {
      this.toastVisible.set(false);
    }, 3000);
  }

  /**
   * Pre-carga iconos comunes generados con IA
   */
  private async preloadIcons(): Promise<void> {
    if (this.iconsLoading()) return; // Ya está cargando

    this.iconsLoading.set(true);
    try {
      const icons = await this.iconGenerator.preloadMarketplaceIcons();
      this.generatedIcons.set(icons);
      console.log('[Marketplace] Iconos pre-cargados:', icons.size);
    } catch (error) {
      console.warn('[Marketplace] Error pre-cargando iconos:', error);
      // No es crítico, los emojis seguirán funcionando como fallback
    } finally {
      this.iconsLoading.set(false);
    }
  }

  /**
   * Obtiene la URL de un icono generado o retorna null si no está disponible
   */
  getIconUrl(iconType: string): string | null {
    const icons = this.generatedIcons();
    return icons.get(`${iconType}-flat`) || null;
  }

  /**
   * Genera un icono bajo demanda si no está en caché
   */
  async generateIconOnDemand(iconType: string): Promise<string | null> {
    try {
      const iconMap: Record<string, 'calendar' | 'check' | 'car' | 'lightning' | 'shield' | 'credit-card' | 'location' | 'star' | 'verified' | 'instant'> = {
        'calendar': 'calendar',
        'check': 'check',
        'car': 'car',
        'lightning': 'lightning',
        'shield': 'shield',
        'credit-card': 'credit-card',
        'location': 'location',
        'star': 'star',
        'verified': 'verified',
        'instant': 'instant',
      };

      const mappedType = iconMap[iconType];
      if (!mappedType) return null;

      const dataUrl = await this.iconGenerator.getIcon(mappedType, 'flat', undefined, 128);
      
      if (dataUrl !== null && dataUrl !== undefined) {
        // Actualizar caché solo si se generó exitosamente
        const currentIcons = new Map(this.generatedIcons());
        currentIcons.set(`${iconType}-flat`, dataUrl);
        this.generatedIcons.set(currentIcons);
        return dataUrl;
      }

      return null;
    } catch (error) {
      console.error(`[Marketplace] Error generating icon ${iconType}:`, error);
      return null;
    }
  }
}
