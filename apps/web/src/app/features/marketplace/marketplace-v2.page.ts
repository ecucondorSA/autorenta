import { CommonModule, isPlatformBrowser, NgOptimizedImage } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { CarsService } from '@core/services/cars/cars.service';
import { LocationService } from '@core/services/geo/location.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Car } from '../../core/models';
import { CarCardComponent } from '../../shared/components/car-card/car-card.component';
import { SmartSearchBarComponent } from '../../shared/components/smart-search-bar/smart-search-bar.component';
import { HdriBackgroundComponent } from '../../shared/components/hdri-background/hdri-background.component';

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
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  // State
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly cars = signal<Car[]>([]);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly isScrolled = signal(false);

  // Calculator State
  readonly calculatorCarValue = signal(15000);
  readonly calculatorDays = signal(12);

  // Pagination State
  readonly currentPage = signal(1);
  readonly itemsPerPage = 12;
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.cars().length / this.itemsPerPage)),
  );

  // Sort State
  // Keep this aligned with the template options; avoid showing blank selections.
  readonly sortOrder = signal<'newest' | 'price_asc' | 'price_desc' | 'rating'>('newest');

  // Filter State
  readonly selectedCategory = signal<string>('all');

  // Computed: filtered cars based on category
  readonly filteredCars = computed(() => {
    const allCars = this.cars();
    const category = this.selectedCategory();

    if (category === 'all') return allCars;

    return allCars.filter((car) => {
      // Logic for demo/prototype mapping.
      // In a real app, you'd check car.type, car.fuel_type, car.features, etc.
      const searchText = (
        (car.brand || '') +
        (car.model || '') +
        (car.vehicle_type || '') +
        (car.transmission || '')
      ).toLowerCase();

      if (category === 'electric')
        return (
          searchText.includes('electr') ||
          searchText.includes('hibrid') ||
          searchText.includes('hybrid') ||
          car.fuel_type?.toLowerCase() === 'electric'
        );
      if (category === 'luxury')
        return (
          searchText.includes('mercedes') ||
          searchText.includes('bmw') ||
          searchText.includes('audi') ||
          car.price_per_day > 80
        );
      if (category === 'suv')
        return (
          searchText.includes('suv') ||
          searchText.includes('camioneta') ||
          searchText.includes('jeep')
        );

      return true;
    });
  });

  // Computed: visible cars for current page (based on filtered list)
  readonly visibleCars = computed(() => {
    // Sort logic could go here too, but keeping it simple for now
    let cars = [...this.filteredCars()]; // Copy to sort

    // Basic sorting
    switch (this.sortOrder()) {
      case 'price_asc':
        cars.sort((a, b) => a.price_per_day - b.price_per_day);
        break;
      case 'price_desc':
        cars.sort((a, b) => b.price_per_day - a.price_per_day);
        break;
      case 'newest':
        cars.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'rating':
        cars.sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0));
        break;
    }

    const start = (this.currentPage() - 1) * this.itemsPerPage;
    return cars.slice(start, start + this.itemsPerPage);
  });

  readonly isSingleResult = computed(() => this.visibleCars().length === 1);

  // Track function for @for
  trackByCarId = (index: number, car: Car) => car.id;

  private scrollHandler = () => this.isScrolled.set(window.scrollY > 50);

  constructor() {
    addIcons({
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

  // Computed for template usage
  readonly totalCarsCount = computed(() => this.filteredCars().length);

  readonly calculatorEstimate = computed(() => ({
    netResult: this.earningsEstimate(),
  }));

  // Testimonials data
  readonly testimonials = [
    {
      avatar: '/assets/images/avatars/avatar-1.jpg',
      name: 'María García',
      location: 'Buenos Aires',
      quote:
        'Excelente plataforma. Alquilé mi auto mientras viajaba y gané dinero extra sin complicaciones.',
      earnings: 45000,
      rentals: 12,
    },
    {
      avatar: '/assets/images/avatars/avatar-2.jpg',
      name: 'Carlos Rodríguez',
      location: 'Córdoba',
      quote:
        'La verificación de usuarios me da tranquilidad. Mi auto siempre vuelve en perfectas condiciones.',
      earnings: 38000,
      rentals: 8,
    },
    {
      avatar: '/assets/images/avatars/avatar-3.jpg',
      name: 'Ana Martínez',
      location: 'Rosario',
      quote: 'Encontré el auto perfecto para mi viaje familiar. Proceso simple y precios justos.',
      earnings: 0,
      rentals: 5,
    },
  ];

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
      const items = await this.carsService.listMarketplaceCars({});
      this.cars.set(items);
    } finally {
      this.loading.set(false);
    }
  }

  selectCategory(id: string) {
    this.selectedCategory.set(id);
    this.currentPage.set(1);
  }

  private async initializeUserLocation() {
    const loc = await this.locationService.getUserLocation();
    if (loc) this.userLocation.set({ lat: loc.lat, lng: loc.lng });
  }

  onSmartSearch(event: unknown) {
    this.logger.debug('Search', event);
    // Smooth scroll to results
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
  }

  onLogoClick() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onHdriLoaded() {
    this.logger.debug('HDRI background loaded');
  }

  scrollToHowItWorks() {
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  }

  onSortOrderChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value as
      | 'newest'
      | 'price_asc'
      | 'price_desc'
      | 'rating';
    this.sortOrder.set(value);
    this.currentPage.set(1);
  }

  onPublishClick() {
    this.router.navigate(['/cars/publish']);
  }

  previousPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update((p) => p - 1);
    }
  }

  nextPage() {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((p) => p + 1);
    }
  }

  clearQuickFilters() {
    this.currentPage.set(1);
    this.loadCars();
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }
}
