import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular/standalone';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

import { Car } from '@core/models/car.model';
import { CarsService } from '@core/services/cars.service';
import { UiService } from '@core/services/ui/ui.service';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { Booking } from '@core/models/booking.model';
import { RiskSnapshot } from '@core/models/risk-snapshot.model';

@Component({
  selector: 'app-car-detail',
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.scss'],
})
export class CarDetailPage implements OnInit {
  car$: Observable<Car | undefined> = of(undefined);
  bookingDetailPayment$: Observable<BookingDetailPayment | undefined> = of(undefined);
  carId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private carsService: CarsService,
    private navController: NavController,
    private uiService: UiService
  ) {}

  ngOnInit() {
    this.car$ = this.route.paramMap.pipe(
      map(params => params.get('id')),
      switchMap(id => {
        if (id) {
          this.carId = id;
          return this.carsService.getCar(id);
        } else {
          return of(undefined);
        }
      })
    );
  }

  goBack() {
    this.navController.back();
  }

  async rentCar(car: Car) {
    if (!car) {
      return;
    }

    this.uiService.showToast({
      message: 'Redirecting to payment...', //this.translate.instant('cars.detail.payment_redirect'),
      duration: 1500,
    });

    setTimeout(() => {
      window.location.href = `/cars/${car.id}/rent`;
    }, 1500);
  }

  getPaymentDetails(paymentDetails: unknown) {
    console.log('paymentDetails', paymentDetails);
  }
}
