// browse.store.ts
// Replace any with unknown.  More specific types would be better, but require more context.

import { Injectable } from '@angular/core';
import { ComponentStore } from '@ngrx/component-store';
import { exhaustMap, Observable, tap } from 'rxjs';
import { Car } from '../../../../core/models';
import { CarsService } from '../../../../core/services/cars.service';

export interface BrowseState {
  cars: Car[];
  loading: boolean;
}

@Injectable({ providedIn: 'root' })
export class BrowseStore extends ComponentStore<BrowseState> {
  constructor(private carsService: CarsService) {
    super({
      cars: [],
      loading: false,
    });
  }

  readonly cars$ = this.select((state) => state.cars);
  readonly loading$ = this.select((state) => state.loading);

  readonly loadCars = this.effect((params$: Observable<unknown>) => {
    return params$.pipe(
      tap(() => this.patchState({ loading: true })), // Set loading to true
      exhaustMap(() =>
        this.carsService.getCars().pipe(
          tap((cars) => {
            this.patchState({ cars, loading: false }); // Set loading to false
          })
        )
      )
    );
  });
}
