import {Component, inject, signal, OnInit,
  ChangeDetectionStrategy} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IconComponent } from '../../../shared/components/icon/icon.component';
import { CarCardComponent } from '../../../shared/components/car-card/car-card.component';
import { CarsService } from '../../../core/services/cars.service';
import { Car } from '../../../core/models';

@Component({
  selector: 'app-cars-conversion',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, IconComponent, FormsModule, CarCardComponent],
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
        .filter(car => (car.photos?.length || car.car_photos?.length) && (car.price_per_day ?? 0) > 0)
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

  navigateToList(): void {
    void this.router.navigate(['/cars/list']);
  }
}
