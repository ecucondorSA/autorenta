import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable, combineLatest, map, of, switchMap, tap } from 'rxjs';
import { Store } from '@ngrx/store';
import { carActions } from '@app/store/car/car.actions';
import { selectCar } from '@app/store/car/car.selectors';
import { Car } from '@core/models/car.model';
import { Marker } from '@shared/components/map/map.component';
import { environment } from 'src/environments/environment';
import { FormControl, FormGroup } from '@angular/forms';
import { bookingActions } from '@app/store/booking/booking.actions';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { selectBookingDetailPayment } from '@app/store/booking/booking.selectors';
import { AlertController } from '@ionic/angular/standalone';
import { TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { Booking } from '../../../core/models';
import { RiskSnapshot } from '@core/models';

@Component({
  selector: 'app-car-detail',
  templateUrl: './car-detail.page.html',
  styleUrls: ['./car-detail.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarDetailPage implements OnInit {
  carId: string = '';
  car$: Observable<Car | undefined> = of(undefined);
  bookingDetailPayment$: Observable<BookingDetailPayment | undefined> = of(undefined);
  mapMarkers$: Observable<Marker[]> = of([]);
  environment = environment;
  isBooked: boolean = false;

  range = new FormGroup({
    start: new FormControl<Date | null>(null),
    end: new FormControl<Date | null>(null),
  });

  constructor(
    private route: ActivatedRoute,
    private store: Store,
    private alertController: AlertController,
    private translateService: TranslateService,
    private router: Router
  ) {}

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('id') || '';
    this.store.dispatch(carActions.getCar({ id: this.carId }));
    this.store.dispatch(bookingActions.getBookingDetailPayment({ carId: this.carId }));

    this.car$ = this.store.select(selectCar(this.carId)).pipe(
      tap((car) => {
        if (car) {
          this.mapMarkers$ = of([{
            position: {
              lat: car.location.coordinates[1],
              lng: car.location.coordinates[0],
            },
          }])
        }
      })
    );

    this.bookingDetailPayment$ = this.store.select(selectBookingDetailPayment(this.carId));

    combineLatest([this.car$, this.bookingDetailPayment$]).pipe(
      map(([car, bookingDetailPayment]) => {
        if (car && bookingDetailPayment) {
          this.isBooked = bookingDetailPayment.isBooked;
        }
      })
    ).subscribe();
  }

  async presentAlert() {
    const alert = await this.alertController.create({
      header: this.translateService.instant('CAR_DETAIL.BOOKING_ALERT.HEADER'),
      message: this.translateService.instant('CAR_DETAIL.BOOKING_ALERT.MESSAGE'),
      buttons: [
        {
          text: this.translateService.instant('CAR_DETAIL.BOOKING_ALERT.CANCEL'),
          role: 'cancel',
          cssClass: 'secondary',
          id: 'cancel-button',
          handler: () => {
            console.log('Confirm Cancel');
          }
        },
        {
          text: this.translateService.instant('CAR_DETAIL.BOOKING_ALERT.CONFIRM'),
          id: 'confirm-button',
          handler: () => {
            this.booking();
          }
        }
      ]
    });

    await alert.present();
  }

  booking() {
    this.router.navigate([`/cars/booking/${this.carId}`]);
  }

  onDateChange(event: any) {
    console.log(event);
  }
}
