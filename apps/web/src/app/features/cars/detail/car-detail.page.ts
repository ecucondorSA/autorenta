import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, map, switchMap, take } from 'rxjs';

import {
  CarDetailActions,
  CarDetailSelectors,
} from '@app/features/cars/detail/store';
import { AppCoreService } from '@core/services/app-core.service';
import { BookingDetailPaymentModel } from '@core/models/booking-detail-payment.model';
import { CarModel } from '@core/models';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-car-detail',
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.scss'],
})
export class CarDetailPage implements OnInit {
  carId: string | null = null;
  car$: Observable<CarModel | undefined> = this.store.select(
    CarDetailSelectors.selectCar
  );
  imagesBaseUrl = environment.apiBaseUrl;
  paymentMethods$: Observable<BookingDetailPaymentModel[]> = this.store.select(
    CarDetailSelectors.selectPaymentMethods
  );
  isPaymentMethodsLoading$: Observable<boolean> = this.store.select(
    CarDetailSelectors.selectPaymentMethodsLoading
  );
  isCarLoading$: Observable<boolean> = this.store.select(
    CarDetailSelectors.selectCarLoading
  );
  vm$: Observable<{
    car: CarModel | undefined;
    paymentMethods: BookingDetailPaymentModel[];
    isPaymentMethodsLoading: boolean;
    isCarLoading: boolean;
  }>;

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private navCtrl: NavController,
    private appCoreService: AppCoreService
  ) {
    this.vm$ = combineLatest({
      car: this.car$,
      paymentMethods: this.paymentMethods$,
      isPaymentMethodsLoading: this.isPaymentMethodsLoading$,
      isCarLoading: this.isCarLoading$,
    });
  }

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('carId');
    if (this.carId) {
      this.store.dispatch(CarDetailActions.loadCar({ carId: this.carId }));
      this.store.dispatch(CarDetailActions.loadPaymentMethods());
    }
  }

  onGoBack() {
    this.navCtrl.back();
  }

  onPaymentMethodSelected(paymentMethod: BookingDetailPaymentModel) {
    this.car$
      .pipe(
        take(1),
        switchMap((car) => {
          return this.appCoreService.startBooking(car!.id, paymentMethod.id);
        })
      )
      .subscribe((response) => {
        window.location.href = response.redirect_url;
      });
  }
}
