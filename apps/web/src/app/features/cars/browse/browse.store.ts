import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { CarFilter } from '@shared/models/car-filter.model';
import { Observable } from 'rxjs';

export interface BrowseState {
  filters: CarFilter;
  loading: boolean;
  error: string | null;
  cars: any[]; // Replace any with a more specific type if possible, otherwise use unknown
  total: number;
}

const initialState: BrowseState = {
  filters: {
    page: 1,
    pageSize: 24,
  },
  loading: false,
  error: null,
  cars: [],
  total: 0,
};

@Injectable({
  providedIn: 'root',
})
export class BrowseStore extends ComponentStore<BrowseState> {
  constructor() {
    super(initialState);
  }

  readonly filters$: Observable<CarFilter> = this.select((state) => state.filters);
  readonly loading$: Observable<boolean> = this.select((state) => state.loading);
  readonly error$: Observable<string | null> = this.select((state) => state.error);
  readonly cars$: Observable<any[]> = this.select((state) => state.cars); // Replace any with a more specific type if possible, otherwise use unknown
  readonly total$: Observable<number> = this.select((state) => state.total);

  readonly setFilters = this.updater((state, filters: CarFilter) => ({
    ...state,
    filters: { ...state.filters, ...filters },
  }));

  readonly setLoading = this.updater((state, loading: boolean) => ({
    ...state,
    loading,
  }));

  readonly setError = this.updater((state, error: string | null) => ({
    ...state,
    error,
  }));

  readonly setCars = this.updater((state, cars: any[]) => ({
    ...state,
    cars,
  }));

  readonly setTotal = this.updater((state, total: number) => ({
    ...state,
    total,
  }));

  readonly loadCars = this.effect((filters$: Observable<CarFilter>) =>
    filters$.subscribe((filters) => {
      this.setLoading(true);
      // Simulate loading data
      setTimeout(() => {
        const cars = [
          { id: 1, name: 'Car 1' },
          { id: 2, name: 'Car 2' },
        ];
        this.setCars(cars);
        this.setTotal(cars.length);
        this.setLoading(false);
      }, 1000);
    })
  );
}
