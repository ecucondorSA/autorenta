import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, map, of, switchMap, tap } from 'rxjs';

import { CarMiniCardComponent } from '../../../shared/components/car-mini-card/car-mini-card.component';
import { FilterEvent } from '../components/cars-filter/cars-filter.component';
import { selectFilters } from '../components/cars-filter/cars-filter.store';
import { BrowseStore } from './browse.store';

@Component({
  selector: 'app-browse-cars',
  templateUrl: './browse-cars.page.html',
  styleUrls: ['./browse-cars.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, CarMiniCardComponent, RouterLink],
  providers: [BrowseStore],
})
export class BrowseCarsPage implements OnInit {
  vm$ = this.browseStore.vm$;
  filters$ = this.store.select(selectFilters);
  routeParams$: Observable<any>;

  constructor(
    private browseStore: BrowseStore,
    private store: Store,
    private route: ActivatedRoute
  ) {
    this.routeParams$ = this.route.queryParams;
  }

  ngOnInit() {
    combineLatest({
      filters: this.filters$,
      route: this.routeParams$,
    })
      .pipe(
        tap(({ filters, route }) => {
          this.browseStore.setFilters(filters);
          this.browseStore.setRouteParams(route);
        }),
        switchMap(() => this.browseStore.getCars$)
      )
      .subscribe();
  }

  handleFilters(event: FilterEvent) {
    this.browseStore.setFilters(event.filters);
  }
}
