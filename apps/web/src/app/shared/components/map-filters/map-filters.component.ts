import { Component, Output, EventEmitter, signal, ChangeDetectionStrategy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, map } from 'rxjs/operators';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

export interface MapFilters {
  minPrice: number;
  maxPrice: number;
  transmission: 'all' | 'manual' | 'automatic';
  fuelType: 'all' | 'nafta' | 'gasoil' | 'electrico' | 'hibrido';
  minSeats: number;
  features: {
    ac: boolean;
    gps: boolean;
    bluetooth: boolean;
    backup_camera: boolean;
  };
}

@Component({
  standalone: true,
  selector: 'app-map-filters',
  imports: [CommonModule, FormsModule, TranslateModule],
  templateUrl: './map-filters.component.html',
  styleUrls: ['./map-filters.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapFiltersComponent {
  @Output() filtersChange = new EventEmitter<MapFilters>();
  @Output() filtersReset = new EventEmitter<void>();

  readonly expanded = signal(false);
  readonly minPrice = signal(5000); // ARS prices start at ~5000
  readonly maxPrice = signal(50000); // ARS prices up to ~50000
  readonly transmission = signal<'all' | 'manual' | 'automatic'>('all');
  readonly fuelType = signal<'all' | 'nafta' | 'gasoil' | 'electrico' | 'hibrido'>('all');
  readonly minSeats = signal(2);
  readonly features = signal({
    ac: false,
    gps: false,
    bluetooth: false,
    backup_camera: false,
  });

  private readonly filtersSubject = new Subject<MapFilters>();

  constructor() {
    this.filtersSubject
      .pipe(
        debounceTime(300),
        map((f) => JSON.stringify(f)),
        distinctUntilChanged(),
        map((s) => JSON.parse(s) as MapFilters),
      )
      .subscribe((filters) => this.filtersChange.emit(filters));
  }

  toggleExpanded(): void {
    this.expanded.update((v) => !v);
  }

  onMinPriceChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.minPrice.set(value);
    this.emitFilters();
  }

  onMaxPriceChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.maxPrice.set(value);
    this.emitFilters();
  }

  onTransmissionChange(value: 'all' | 'manual' | 'automatic'): void {
    this.transmission.set(value);
    this.emitFilters();
  }

  onFuelTypeChange(value: 'all' | 'nafta' | 'gasoil' | 'electrico' | 'hibrido'): void {
    this.fuelType.set(value);
    this.emitFilters();
  }

  onSeatsChange(event: Event): void {
    const value = parseInt((event.target as HTMLInputElement).value);
    this.minSeats.set(value);
    this.emitFilters();
  }

  onFeatureToggle(feature: keyof MapFilters['features']): void {
    this.features.update((current) => ({
      ...current,
      [feature]: !current[feature],
    }));
    this.emitFilters();
  }

  resetFilters(): void {
    this.minPrice.set(5000);
    this.maxPrice.set(50000);
    this.transmission.set('all');
    this.fuelType.set('all');
    this.minSeats.set(2);
    this.features.set({
      ac: false,
      gps: false,
      bluetooth: false,
      backup_camera: false,
    });
    this.filtersReset.emit();
    this.emitFilters(); // Emit filters after reset
  }

  private emitFilters(): void {
    const value: MapFilters = {
      minPrice: this.minPrice(),
      maxPrice: this.maxPrice(),
      transmission: this.transmission(),
      fuelType: this.fuelType(),
      minSeats: this.minSeats(),
      features: this.features(),
    };
    this.filtersSubject.next(value);
  }
}
