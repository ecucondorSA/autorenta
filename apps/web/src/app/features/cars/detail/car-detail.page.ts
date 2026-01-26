import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IonicModule, NavController } from '@ionic/angular/standalone';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, map, of, switchMap, take } from 'rxjs';

import { Car } from '@core/models/car.model';
import { selectCar } from '@store/car/car.selectors';
import { loadCar } from '@store/car/car.actions';
import {
  selectBookingDetailPayment,
  selectBookingDetail,
} from '@store/booking-detail/booking-detail.selectors';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { BookingDetail } from '@core/models/booking-detail.model';
import { loadBookingDetailPayment } from '@store/booking-detail/booking-detail.actions';
import { loadBookingDetail } from '@store/booking-detail/booking-detail.actions';
import {
  RiskSnapshot,
  selectRiskSnapshot,
} from '@store/risk-snapshot/risk-snapshot.selectors';
import { loadRiskSnapshot } from '@store/risk-snapshot/risk-snapshot.actions';
import {
  selectUser,
  selectUserLoading,
  selectUserError,
} from '@store/user/user.selectors';
import { loadUser } from '@store/user/user.actions';
import { User } from '@core/models';

@Component({
  selector: 'app-car-detail',
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule],
})
export class CarDetailPage implements OnInit {
  car$: Observable<Car | undefined>;
  bookingDetailPayment$: Observable<BookingDetailPayment | undefined>;
  bookingDetail$: Observable<BookingDetail | undefined>;
  riskSnapshot$: Observable<RiskSnapshot | undefined>;
  user$: Observable<User | undefined>;
  userLoading$: Observable<boolean>;
  userError$: Observable<any>;

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private navController: NavController
  ) {}

  ngOnInit() {
    const carId = this.route.snapshot.paramMap.get('id');

    if (carId) {
      this.store.dispatch(loadCar({ id: carId }));
      this.store.dispatch(loadBookingDetailPayment({ carId }));
      this.store.dispatch(loadBookingDetail({ carId }));
      this.store.dispatch(loadRiskSnapshot({ carId }));
      this.store.dispatch(loadUser());

      this.car$ = this.store.select(selectCar);
      this.bookingDetailPayment$ = this.store.select(selectBookingDetailPayment);
      this.bookingDetail$ = this.store.select(selectBookingDetail);
      this.riskSnapshot$ = this.store.select(selectRiskSnapshot);
      this.user$ = this.store.select(selectUser);
      this.userLoading$ = this.store.select(selectUserLoading);
      this.userError$ = this.store.select(selectUserError);
    } else {
      console.error('Car ID not found in route parameters.');
      this.navController.back();
    }
  }
}
