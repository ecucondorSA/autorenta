import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CarsCompareService } from '../../../core/services/cars-compare.service';
import { ComparisonRow } from '../../../core/models';

@Component({
  standalone: true,
  selector: 'app-compare-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './compare.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparePage implements OnInit {
  private readonly compareService = inject(CarsCompareService);
  private readonly router = inject(Router);

  readonly cars = this.compareService.comparedCars;
  readonly count = this.compareService.count;
  readonly rows = computed(() => this.compareService.generateComparisonRows());

  // Agrupar filas por categoría
  readonly basicRows = computed(() =>
    this.rows().filter(r => r.category === 'basic')
  );
  readonly specsRows = computed(() =>
    this.rows().filter(r => r.category === 'specs')
  );
  readonly pricingRows = computed(() =>
    this.rows().filter(r => r.category === 'pricing')
  );
  readonly locationRows = computed(() =>
    this.rows().filter(r => r.category === 'location')
  );
  readonly ownerRows = computed(() =>
    this.rows().filter(r => r.category === 'owner')
  );

  ngOnInit(): void {
    // Si no hay autos para comparar, redirigir
    if (this.count() === 0) {
      void this.router.navigate(['/cars']);
    }
  }

  removeCar(carId: string): void {
    this.compareService.removeCar(carId);

    // Si se queda sin autos, redirigir
    if (this.count() === 0) {
      void this.router.navigate(['/cars']);
    }
  }

  clearAll(): void {
    this.compareService.clearAll();
    void this.router.navigate(['/cars']);
  }

  /**
   * Determinar si un valor es el "mejor" en la fila
   */
  isBestValue(row: ComparisonRow, index: number): boolean {
    if (!row.highlightBest) return false;

    const values = row.values;

    // Para precios y kilometraje: menor es mejor
    if (row.label.includes('Precio') || row.label.includes('Kilometraje')) {
      const numericValues = values.map(v => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          // Extraer números del string
          const match = v.replace(/[^\d]/g, '');
          return parseInt(match, 10) || Infinity;
        }
        return Infinity;
      });
      const minValue = Math.min(...numericValues);
      return numericValues[index] === minValue;
    }

    // Para rating: mayor es mejor
    if (row.label.includes('Rating')) {
      const numericValues = values.map(v => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
          // Extraer rating del formato "⭐ 4.5 (10)"
          const match = v.match(/[\d.]+/);
          return match ? parseFloat(match[0]) : 0;
        }
        return 0;
      });
      const maxValue = Math.max(...numericValues);
      return numericValues[index] === maxValue;
    }

    return false;
  }

  goToCarDetail(carId: string): void {
    void this.router.navigate(['/cars', carId]);
  }
}
