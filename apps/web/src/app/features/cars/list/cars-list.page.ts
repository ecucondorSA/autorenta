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
import { CarsService } from '../../../core/services/cars.service';
import { CarsCompareService } from '../../../core/services/cars-compare.service';
import { Car } from '../../../core/models';
import { CitySelectComponent } from '../../../shared/components/city-select/city-select.component';
import {
  DateRangePickerComponent,
  DateRange,
} from '../../../shared/components/date-range-picker/date-range-picker.component';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { CarsMapComponent } from '../../../shared/components/cars-map/cars-map.component';

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
    CitySelectComponent,
    DateRangePickerComponent,
    CarCardComponent,
    CarsMapComponent,
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

  // Autos ordenados por distancia con información de distancia
  readonly carsWithDistance = computed(() => {
    const carsList = this.cars();
    const userLoc = this.userLocation();

    console.log('[CarsListPage] carsWithDistance computed - userLoc:', userLoc, 'cars count:', carsList.length);

    if (!userLoc || !carsList.length) {
      console.log('[CarsListPage] No userLoc or no cars - returning original list');
      return carsList as CarWithDistance[];
    }

    // Calcular distancias y ordenar
    const carsWithDist: CarWithDistance[] = carsList.map((car) => {
      if (!car.location_lat || !car.location_lng) {
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

    console.log('[CarsListPage] Calculated distances for', carsWithDist.length, 'cars');
    console.log('[CarsListPage] Sample car with distance:', carsWithDist[0]?.title, carsWithDist[0]?.distanceText);

    // Ordenar por distancia (más cercano primero)
    const sorted = carsWithDist.sort((a, b) => {
      if (a.distance === undefined) return 1;
      if (b.distance === undefined) return -1;
      return a.distance - b.distance;
    });

    console.log('[CarsListPage] Sorted cars - first:', sorted[0]?.title, sorted[0]?.distanceText);
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
    } catch (err) {
      console.error('listActiveCars error', err);
    } finally {
      this.loading.set(false);
    }
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

    // Hacer scroll automático al card seleccionado
    // Usar setTimeout para asegurar que Angular haya actualizado el DOM
    setTimeout(() => {
      const cardElement = document.getElementById(`car-card-${carId}`);
      if (cardElement) {
        cardElement.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest', // 'nearest' evita scroll innecesario si ya está visible
          inline: 'nearest',
        });
        console.log(`[CarsListPage] Scrolled to card ${carId}`);
      } else {
        console.warn(`[CarsListPage] Card element not found for ID: car-card-${carId}`);
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
}
