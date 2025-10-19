import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewChild,
  computed,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CarsService } from '../../../core/services/cars.service';
import { CarsCompareService } from '../../../core/services/cars-compare.service';
import { Car } from '../../../core/models';
import {
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { CarsMapComponent } from '../../../shared/components/cars-map/cars-map.component';
import { MapFiltersComponent, MapFilters } from '../../../shared/components/map-filters/map-filters.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';

// Interface para auto con distancia
export interface CarWithDistance extends Car {
  distance?: number;
  distanceText?: string;
}

@Component({
  standalone: true,
  selector: 'app-cars-list-page',
  imports: [
    CommonModule,
    RouterLink,
    CarsMapComponent,
    MapFiltersComponent,
    MoneyPipe,
  ],
  templateUrl: './cars-list.page.html',
  styleUrls: ['./cars-list.page.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarsListPage implements OnInit {
  @ViewChild(CarsMapComponent) carsMapComponent!: CarsMapComponent;

  private readonly carsService = inject(CarsService);
  private readonly compareService = inject(CarsCompareService);

  readonly city = signal<string | null>(null);
  readonly dateRange = signal<DateRange>({ from: null, to: null });
  readonly loading = signal(false);
  readonly cars = signal<Car[]>([]);
  readonly userLocation = signal<{ lat: number; lng: number } | null>(null);
  readonly hasFilters = computed(() => !!this.city() || !!this.dateRange().from);
  readonly selectedCarId = signal<string | null>(null);
  readonly searchExpanded = signal(false);
  readonly activeCarouselIndex = signal(0);

  // Filtros y ordenamiento
  readonly mapFilters = signal<MapFilters | null>(null);
  readonly sortBy = signal<'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'>('distance');

  // Autos ordenados por distancia con información de distancia
  readonly carsWithDistance = computed(() => {
    let carsList = this.cars();
    const userLoc = this.userLocation();
    const filters = this.mapFilters();
    const sort = this.sortBy();

    console.log('[CarsListPage] carsWithDistance computed - userLoc:', userLoc, 'cars count:', carsList.length);

    // Aplicar filtros
    if (filters) {
      carsList = carsList.filter(car => {
        // Filtro de precio
        if (car.price_per_day < filters.minPrice || car.price_per_day > filters.maxPrice) {
          return false;
        }

        // Filtro de transmisión
        if (filters.transmission !== 'all' && car.transmission !== filters.transmission) {
          return false;
        }

        // Filtro de combustible
        if (filters.fuelType !== 'all' && car.fuel_type !== filters.fuelType) {
          return false;
        }

        // Filtro de asientos
        if (car.seats < filters.minSeats) {
          return false;
        }

        // Filtro de características
        if (filters.features.ac && !car.features?.['ac']) return false;
        if (filters.features.gps && !car.features?.['gps']) return false;
        if (filters.features.bluetooth && !car.features?.['bluetooth']) return false;
        if (filters.features.backup_camera && !car.features?.['backup_camera']) return false;

        return true;
      });
    }

    if (!carsList.length) {
      console.log('[CarsListPage] No cars after filtering');
      return [] as CarWithDistance[];
    }

    // Calcular distancias
    const carsWithDist: CarWithDistance[] = carsList.map((car) => {
      if (!userLoc || !car.location_lat || !car.location_lng) {
        return { ...car, distance: undefined, distanceText: undefined };
      }

      const distanceKm = this.calculateDistance(
        userLoc.lat,
        userLoc.lng,
        car.location_lat,
        car.location_lng
      );

      // Formatear texto de distancia
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

    // Aplicar ordenamiento
    let sorted = [...carsWithDist];

    switch (sort) {
      case 'distance':
        sorted.sort((a, b) => {
          if (a.distance === undefined) return 1;
          if (b.distance === undefined) return -1;
          return a.distance - b.distance;
        });
        break;

      case 'price_asc':
        sorted.sort((a, b) => a.price_per_day - b.price_per_day);
        break;

      case 'price_desc':
        sorted.sort((a, b) => b.price_per_day - a.price_per_day);
        break;

      case 'rating':
        sorted.sort((a, b) => {
          const ratingA = a.owner?.rating_avg || 0;
          const ratingB = b.owner?.rating_avg || 0;
          return ratingB - ratingA;
        });
        break;

      case 'newest':
        sorted.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime();
          const dateB = new Date(b.created_at || 0).getTime();
          return dateB - dateA;
        });
        break;
    }

    console.log('[CarsListPage] Final sorted cars:', sorted.length, 'sort:', sort);
    return sorted;
  });

  // Comparación
  readonly compareCount = this.compareService.count;
  readonly maxCompareReached = computed(() => this.compareCount() >= 3);

  ngOnInit(): void {
    void this.loadCars();
  }

  onUserLocationChange(location: { lat: number; lng: number }): void {
    console.log('[CarsListPage] Received userLocation from map:', location);
    this.userLocation.set(location);
  }

  async loadCars(): Promise<void> {
    this.loading.set(true);
    try {
      const items = await this.carsService.listActiveCars({
        city: this.city() ?? undefined,
        from: this.dateRange().from ?? undefined,
        to: this.dateRange().to ?? undefined,
      });
      this.cars.set(items);
      // Collapse search form on mobile after search
      this.searchExpanded.set(false);
    } catch (err) {
      console.error('listActiveCars error', err);
    } finally {
      this.loading.set(false);
    }
  }

  toggleSearch(): void {
    this.searchExpanded.update((expanded) => !expanded);
  }

  onCityChange(value: string): void {
    this.city.set(value || null);
    void this.loadCars();
  }

  onRangeChange(range: DateRange): void {
    this.dateRange.set(range);
  }


  onCarSelected(carId: string): void {
    this.selectedCarId.set(carId);
  }

  onMapCarSelected(carId: string): void {
    this.selectedCarId.set(carId);

    // Buscar el índice del card en el carousel
    const carIndex = this.carsWithDistance().findIndex(car => car.id === carId);
    if (carIndex !== -1) {
      this.activeCarouselIndex.set(carIndex);
      this.scrollToCarouselCard(carIndex);
    }
  }

  /**
   * Detecta cuando el usuario desliza el carousel y sincroniza con el mapa
   */
  onCarouselScroll(event: Event): void {
    const container = event.target as HTMLElement;
    const cardWidth = container.querySelector('.carousel-card')?.clientWidth || 0;

    if (cardWidth === 0) return;

    // Calcular índice del card visible basado en la posición del scroll
    const scrollLeft = container.scrollLeft;
    const newIndex = Math.round(scrollLeft / cardWidth);

    // Solo actualizar si cambió el índice
    if (newIndex !== this.activeCarouselIndex()) {
      this.activeCarouselIndex.set(newIndex);

      // Obtener el auto correspondiente
      const cars = this.carsWithDistance();
      if (cars[newIndex]) {
        const carId = cars[newIndex].id;
        this.selectedCarId.set(carId);

        // Centrar el mapa en el auto
        if (this.carsMapComponent) {
          this.carsMapComponent.flyToCarLocation(carId);
        }
      }
    }
  }

  /**
   * Hace scroll del carousel a un card específico
   */
  private scrollToCarouselCard(index: number): void {
    setTimeout(() => {
      const carousel = document.querySelector('.carousel-container') as HTMLElement;
      if (carousel) {
        const cardWidth = carousel.querySelector('.carousel-card')?.clientWidth || 0;
        carousel.scrollTo({
          left: index * cardWidth,
          behavior: 'smooth'
        });
      }
    }, 100);
  }

  // Comparación
  isCarComparing(carId: string): boolean {
    return this.compareService.isComparing(carId);
  }

  onCompareToggle(carId: string): void {
    if (this.compareService.isComparing(carId)) {
      this.compareService.removeCar(carId);
    } else {
      const added = this.compareService.addCar(carId);
      if (!added) {
        // Máximo alcanzado, se podría mostrar un mensaje
        console.log('Máximo de 3 autos alcanzado');
      }
    }
  }

  // Cálculo de distancia usando Haversine Formula
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Filtros y ordenamiento
  onFiltersChange(filters: MapFilters): void {
    this.mapFilters.set(filters);
  }

  onFiltersReset(): void {
    this.mapFilters.set(null);
  }

  onSortChange(sortBy: 'distance' | 'price_asc' | 'price_desc' | 'rating' | 'newest'): void {
    this.sortBy.set(sortBy);
  }
}
