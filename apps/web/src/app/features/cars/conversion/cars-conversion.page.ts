import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { CarsService } from '@core/services/cars/cars.service';
import { DateRange } from '@core/models/marketplace.model';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { SmartSearchBarComponent } from '../../../shared/components/smart-search-bar/smart-search-bar.component';
import { Car } from '../../../core/models';

@Component({
  selector: 'app-cars-conversion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, FormsModule, CarCardComponent, SmartSearchBarComponent],
  templateUrl: './cars-conversion.page.html',
  styleUrls: ['./cars-conversion.page.css'],
})
export class CarsConversionPage implements OnInit {
  private readonly router = inject(Router);
  private readonly carsService = inject(CarsService);

  searchQuery = signal('');
  readonly featuredCars = signal<Car[]>([]);
  readonly loading = signal(true);

  async ngOnInit(): Promise<void> {
    await this.loadFeaturedCars();
  }

  private async loadFeaturedCars(): Promise<void> {
    try {
      const cars = await this.carsService.listActiveCars({});
      // Ordenar por rating y tomar los 6 mejores
      const sorted = cars
        .filter(
          (car) => (car.photos?.length || car.car_photos?.length) && (car.price_per_day ?? 0) > 0,
        )
        .sort((a, b) => (b.rating_avg || 0) - (a.rating_avg || 0))
        .slice(0, 6);
      this.featuredCars.set(sorted);
    } catch (error) {
      console.error('Error loading featured cars:', error);
    } finally {
      this.loading.set(false);
    }
  }

  onSearchSubmit(): void {
    const query = this.searchQuery().trim();
    if (query) {
      void this.router.navigate(['/cars/list'], { queryParams: { q: query } });
    } else {
      void this.router.navigate(['/cars/list']);
    }
  }

  onSmartSearch(event: { location: { lat: number; lng: number } | null; dates: DateRange }): void {
    const queryParams: Record<string, string | number> = {};
    
    if (event.location) {
      queryParams['lat'] = event.location.lat;
      queryParams['lng'] = event.location.lng;
    }
    
    if (event.dates.from) {
      queryParams['from'] = String(event.dates.from);
    }
    
    if (event.dates.to) {
      queryParams['to'] = String(event.dates.to);
    }

    void this.router.navigate(['/cars/list'], { queryParams });
  }

  navigateToList(): void {
    void this.router.navigate(['/cars/list']);
  }

  searchByBrand(brand: string): void {
    void this.router.navigate(['/cars/list'], { queryParams: { q: brand } });
  }
}
