import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { AppState } from '../../../../app.state';
import { publishCar } from '../../../../core/store/car/car.actions';
import { selectPublishCarLoading } from '../../../../core/store/car/car.selectors';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { Booking } from '@core/models';
import { RiskSnapshot } from '../../../risks/models';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
})
export class PublishCarV2Page implements OnInit {
  publishCarForm: FormGroup;
  loading$: Observable<boolean>;

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private router: Router
  ) {
    this.publishCarForm = this.fb.group({
      brand: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', Validators.required],
      price: ['', Validators.required],
    });
    this.loading$ = this.store.select(selectPublishCarLoading);
  }

  ngOnInit() {}

  publishCar() {
    if (this.publishCarForm.valid) {
      this.store.dispatch(publishCar({ car: this.publishCarForm.value }));
      this.router.navigate(['/cars']);
    }
  }
}
