import { Injectable, signal, inject } from '@angular/core';
import { Car, CarComparison, ComparisonRow } from '../models';
import { CarsService } from './cars.service';
import { ToastService } from './toast.service';

const STORAGE_KEY = 'autorenta_comparison';
const MAX_COMPARE = 3;

@Injectable({
  providedIn: 'root',
})
export class CarsCompareService {
  private readonly comparedCarIds = signal<string[]>([]);
  readonly comparedCars = signal<Car[]>([]);
  readonly count = signal<number>(0);
  private readonly toastService = inject(ToastService);

  constructor(private readonly carsService: CarsService) {
    this.loadFromStorage();
  }

  /**
   * Agregar auto a la comparación
   * @returns true si se agregó exitosamente, false si no se pudo agregar
   */
  addCar(carId: string): boolean {
    const current = this.comparedCarIds();

    // Validar si ya existe
    if (current.includes(carId)) {
      this.toastService.info('Auto ya agregado', 'Este vehículo ya está en tu comparación', 3000);
      return false;
    }

    // Validar máximo
    if (current.length >= MAX_COMPARE) {
      this.toastService.warning(
        'Límite alcanzado',
        `Solo puedes comparar hasta ${MAX_COMPARE} vehículos a la vez. Elimina uno para agregar otro.`,
        4000,
      );
      return false;
    }

    // Agregar
    const updated = [...current, carId];
    this.comparedCarIds.set(updated);
    this.count.set(updated.length);
    this.saveToStorage(updated);
    void this.loadCars();

    // Mostrar feedback de éxito
    this.toastService.success(
      'Auto agregado',
      `Vehículo agregado a la comparación (${updated.length}/${MAX_COMPARE})`,
      3000,
    );

    return true;
  }

  /**
   * Remover auto de la comparación
   */
  removeCar(carId: string): void {
    const updated = this.comparedCarIds().filter((id) => id !== carId);
    this.comparedCarIds.set(updated);
    this.count.set(updated.length);
    this.saveToStorage(updated);
    void this.loadCars();
  }

  /**
   * Limpiar toda la comparación
   */
  clearAll(): void {
    this.comparedCarIds.set([]);
    this.comparedCars.set([]);
    this.count.set(0);
    sessionStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Verificar si un auto está en la comparación
   */
  isComparing(carId: string): boolean {
    return this.comparedCarIds().includes(carId);
  }

  /**
   * Cargar autos completos desde el servicio
   */
  private async loadCars(): Promise<void> {
    const ids = this.comparedCarIds();
    if (ids.length === 0) {
      this.comparedCars.set([]);
      return;
    }

    try {
      // Cargar todos los autos en paralelo
      const cars = await Promise.all(ids.map((id) => this.carsService.getCarById(id)));

      // Filtrar nulls por si algún auto no existe
      const validCars = cars.filter((car) => car !== null) as Car[];
      this.comparedCars.set(validCars);
    } catch {
      this.comparedCars.set([]);
    }
  }

  /**
   * Generar filas de comparación estructuradas
   */
  generateComparisonRows(): ComparisonRow[] {
    const cars = this.comparedCars();
    if (cars.length === 0) return [];

    const rows: ComparisonRow[] = [];

    // BASIC INFO
    rows.push({
      label: 'Marca',
      category: 'basic',
      values: cars.map((c) => c.brand || c.brand_name || '-'),
    });
    rows.push({
      label: 'Modelo',
      category: 'basic',
      values: cars.map((c) => c.model || c.model_name || '-'),
    });
    rows.push({
      label: 'Año',
      category: 'basic',
      values: cars.map((c) => c.year),
    });
    rows.push({
      label: 'Color',
      category: 'basic',
      values: cars.map((c) => c.color),
    });

    // SPECS
    rows.push({
      label: 'Transmisión',
      category: 'specs',
      values: cars.map((c) => (c.transmission === 'automatic' ? 'Automática' : 'Manual')),
    });
    rows.push({
      label: 'Combustible',
      category: 'specs',
      values: cars.map((c) => {
        const fuelType = String(c.fuel);
        switch (fuelType) {
          case 'gasoline':
            return 'Nafta';
          case 'diesel':
            return 'Diesel';
          case 'electric':
            return 'Eléctrico';
          case 'hybrid':
            return 'Híbrido';
          default:
            return fuelType;
        }
      }),
    });
    rows.push({
      label: 'Asientos',
      category: 'specs',
      values: cars.map((c) => c.seats),
    });
    rows.push({
      label: 'Puertas',
      category: 'specs',
      values: cars.map((c) => c.doors),
    });
    rows.push({
      label: 'Kilometraje',
      category: 'specs',
      values: cars.map((c) => `${c.mileage.toLocaleString()} km`),
      highlightBest: true, // Menor kilometraje es mejor
    });

    // PRICING
    rows.push({
      label: 'Precio por día',
      category: 'pricing',
      values: cars.map((c) => `${c.currency} ${c.price_per_day.toLocaleString()}`),
      highlightBest: true, // Menor precio es mejor
    });
    rows.push({
      label: 'Rating',
      category: 'pricing',
      values: cars.map((c) => `⭐ ${c.rating_avg.toFixed(1)} (${c.rating_count})`),
      highlightBest: true, // Mayor rating es mejor
    });

    // LOCATION
    rows.push({
      label: 'Ciudad',
      category: 'location',
      values: cars.map((c) => c.location_city),
    });
    rows.push({
      label: 'Provincia',
      category: 'location',
      values: cars.map((c) => c.location_province || c.location_state || '-'),
    });

    // OWNER
    if (cars.every((c) => c.owner)) {
      rows.push({
        label: 'Propietario',
        category: 'owner',
        values: cars.map((c) => c.owner?.full_name || '-'),
      });
      rows.push({
        label: 'Rating propietario',
        category: 'owner',
        values: cars.map((c) => (c.owner ? `⭐ ${c.owner.rating_avg.toFixed(1)}` : '-')),
      });
    }

    return rows;
  }

  /**
   * Persistir en sessionStorage
   */
  private saveToStorage(carIds: string[]): void {
    const comparison: CarComparison = {
      carIds,
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(comparison));
  }

  /**
   * Cargar desde sessionStorage
   */
  private loadFromStorage(): void {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const comparison: CarComparison = JSON.parse(stored);

      // Validar que no sea muy antigua (1 hora)
      const timestamp = new Date(comparison.timestamp);
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

      if (timestamp > hourAgo && comparison.carIds.length > 0) {
        this.comparedCarIds.set(comparison.carIds);
        this.count.set(comparison.carIds.length);
        void this.loadCars();
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }
}
