import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
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
import { FormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { Router, RouterModule } from '@angular/router';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  filterOutline,
  locationOutline,
  carSportOutline,
  flashOutline,
  shieldCheckmarkOutline,
  walletOutline,
  trendingUpOutline,
  chevronForwardOutline,
  star,
  heartOutline,
  shareOutline,
  calculatorOutline,
  gridOutline,
  listOutline,
  addOutline,
  closeOutline,
  calendarOutline,
  settingsOutline,
} from 'ionicons/icons';
import { UrgentRentalService } from '@core/services/bookings/urgent-rental.service';
import { CarsService } from '@core/services/cars/cars.service';
import { DistanceCalculatorService } from '@core/services/geo/distance-calculator.service';
import { GeocodingService } from '@core/services/geo/geocoding.service';
import { LocationService } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { environment } from '@environment';
import { AnalyticsService } from '@core/services/infrastructure/analytics.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';
import { BreakpointService } from '@core/services/ui/breakpoint.service';
import { CarLocationService } from '@core/services/geo/car-location.service';
import { MapboxPreloaderService } from '@core/services/geo/mapbox-preloader.service';
import { SeoSchemaService } from '@core/services/ui/seo-schema.service';
import { Car } from '../../core/models';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { SmartSearchBarComponent } from '../../shared/components/smart-search-bar/smart-search-bar.component';
import { HdriBackgroundComponent } from '../../shared/components/hdri-background/hdri-background.component';
import { PressScaleDirective } from '@shared/directives/press-scale.directive';
import { MoneyPipe } from '@shared/pipes/money.pipe';

@Component({
  selector: 'app-marketplace-v2-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    NgOptimizedImage,
    IonIcon,
    CarCardComponent,
    SmartSearchBarComponent,
    HdriBackgroundComponent,
    PressScaleDirective,
    MoneyPipe
  ],
  templateUrl: './marketplace-v2.page.html',
  styleUrls: ['./marketplace-v2.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketplaceV2Page implements OnInit, OnDestroy {
  private readonly logger = inject(LoggerService);
  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);
  private readonly locationService = inject(LocationService);
  private readonly geocodingService = inject(GeocodingService);
  private readonly analytics = inject(AnalyticsService);
  private readonly breakpoint = inject(BreakpointService);
  private readonly supabase = injectSupabase();
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  // State
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly isScrolled = signal(false);
  
  // Calculator State
  readonly calculatorCarValue = signal(15000);
  readonly calculatorDays = signal(12);

  private scrollHandler = () => this.isScrolled.set(window.scrollY > 50);

  constructor() {
    addIcons({
      searchOutline, filterOutline, locationOutline, carSportOutline,
      flashOutline, shieldCheckmarkOutline, walletOutline, trendingUpOutline,
      chevronForwardOutline, star, heartOutline, shareOutline,
      calculatorOutline, gridOutline, listOutline, addOutline, closeOutline,
      calendarOutline, settingsOutline
    });

    if (this.isBrowser) {
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
  }

  readonly earningsEstimate = computed(() => {
    const val = this.calculatorCarValue();
    const days = this.calculatorDays();
    // Simplified logic for UI V3
    const dailyRate = Math.min(val * 0.0035, 120);
    return dailyRate * days * 0.85; // Net after fees
  });

  readonly categories = [
    { id: 'all', label: 'Todos', icon: 'grid-outline' },
    { id: 'electric', label: 'Eléctricos', icon: 'flash-outline' },
    { id: 'luxury', label: 'Premium', icon: 'shield-checkmark-outline' },
    { id: 'suv', label: 'SUVs', icon: 'car-sport-outline' },
  ];

  async ngOnInit() {
    await this.loadCars();
    if (this.isBrowser) {
      this.initializeUserLocation();
    }
  }

  async loadCars() {
    this.loading.set(true);
    try {
      const items = await this.carsService.listActiveCars({});
      this.cars.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  private async initializeUserLocation() {
    const loc = await this.locationService.getUserLocation();
    if (loc) this.userLocation.set({ lat: loc.lat, lng: loc.lng });
  }

  onSmartSearch(event: any) {
    this.logger.debug('Search', event);
    // Smooth scroll to results
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }

  onPublishClick() {
    this.router.navigate(['/cars/publish']);
  }

  onDateRangeChange(event: { start: Date; end: Date }): void {
    this.logger.debug('Date range changed', 'MarketplaceV2Page', event);
  }

  scrollToHowItWorks(): void {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  }

  onLogoClick(): void {
    this.router.navigate(['/']);
  }

  clearQuickFilters(): void {
    this.loadCars();
  }

  closeDatePicker(): void {
    // Date picker close handler
  }

  nextPage(): void {
    // Pagination - next page
  }

  previousPage(): void {
    // Pagination - previous page
  }

  onSortOrderChange(_event: Event): void {
    // Sort order change handler
  }

  onHdriLoaded(): void {
    this.logger.debug('HDRI loaded', 'MarketplaceV2Page');
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }
}