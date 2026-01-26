import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import {
  CarDetailActions,
  CarDetailSelectors,
} from '@app/features/cars/detail/store';
import { Car } from '@core/models/car.model';
import { AppState } from '@store';
import { environment } from 'src/environments/environment';
import { Booking } from '@core/models';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { selectBookingDetailPayment } from '@core/store/booking';
import {
  RiskSnapshot,
  selectRiskSnapshot,
} from '@core/store/insurance-risk-assessment';

import { CoreModels } from '../../../core/models';

@Component({
  selector: 'app-car-detail',
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.scss'],
})
export class CarDetailPage implements OnInit {
  car$: Observable<Car | undefined> = of(undefined);
  bookingDetailPayment$: Observable<BookingDetailPayment | undefined> = of(
    undefined
  );
  riskSnapshot$: Observable<RiskSnapshot | undefined> = of(undefined);
  environment = environment;

  constructor(
    private route: ActivatedRoute,
    private store: Store<AppState>,
    private navController: NavController
  ) {}

  ngOnInit() {
    this.car$ = this.route.paramMap.pipe(
      switchMap((params) => {
        const carId = params.get('id');
        if (carId) {
          this.store.dispatch(CarDetailActions.loadCarDetail({ id: carId }));
          return this.store.select(CarDetailSelectors.selectCarDetail);
        }
        return of(undefined);
      })
    );

    this.bookingDetailPayment$ = this.store.select(selectBookingDetailPayment);
    this.riskSnapshot$ = this.store.select(selectRiskSnapshot);
  }

  async openPreview(car: unknown) {
    // was any, replaced with unknown
    if (car && car.images && car.images.length > 0) {
      this.navController.navigateForward([car.images[0].url]);
    }
  }
}
