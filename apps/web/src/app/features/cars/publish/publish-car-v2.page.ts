import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HotToastService } from '@ngneat/hot-toast';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { CarPublishState } from './store/car-publish.reducer';
import { publishCarActions } from './store/car-publish.actions';
import { selectCar, selectCarLoading } from './store/car-publish.selectors';
import { firstValueFrom, Observable, tap } from 'rxjs';
import { StepperComponent } from '@shared/components/stepper/stepper.component';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { AppConstants } from '../../../../app.constants';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { CarService } from '../../services/car.service';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';

import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { RiskSnapshot } from '@core/models/risk-snapshot.model';
import { Car } from '@core/models';

@UntilDestroy()
@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
})
export class PublishCarV2Page implements OnInit {
  @ViewChild(StepperComponent) stepper!: StepperComponent;
  @ViewChild(VisualSelectorComponent) visualSelector!: VisualSelectorComponent;
  basicInformationFormGroup!: FormGroup;
  pricingFormGroup!: FormGroup;
  photosFormGroup!: FormGroup;
  featuresFormGroup!: FormGroup;
  carId: string | null = null;
  car$: Observable<Car | null>;
  carLoading$: Observable<boolean>;
  isEditMode = false;
  currentStep = 0;
  isSaving = false;
  showAiPhotoGenerator = false;
  aiPhotoGeneratorCarDescription = '';

  constructor(
    private formBuilder: FormBuilder,
    private store: Store<CarPublishState>,
    private route: ActivatedRoute,
    private router: Router,
    private toast: HotToastService,
    private translate: TranslateService,
    private carService: CarService
  ) {
    this.car$ = this.store.select(selectCar);
    this.carLoading$ = this.store.select(selectCarLoading);
  }

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('carId');
    this.isEditMode = !!this.carId;

    this.basicInformationFormGroup = this.formBuilder.group({
      brand: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', Validators.required],
      kilometers: ['', Validators.required],
      fuelType: ['', Validators.required],
      transmission: ['', Validators.required],
      bodyType: ['', Validators.required],
      city: ['', Validators.required],
    });

    this.pricingFormGroup = this.formBuilder.group({
      price: ['', Validators.required],
    });

    this.photosFormGroup = this.formBuilder.group({
      photos: [[], Validators.required],
    });

    this.featuresFormGroup = this.formBuilder.group({
      features: [[]],
    });

    if (this.isEditMode) {
      this.store.dispatch(publishCarActions.loadCar({ carId: this.carId! }));

      this.car$
        .pipe(
          tap((car) => {
            if (car) {
              this.basicInformationFormGroup.patchValue({
                brand: car.brand,
                model: car.model,
                year: car.year,
                kilometers: car.kilometers,
                fuelType: car.fuelType,
                transmission: car.transmission,
                bodyType: car.bodyType,
                city: car.city,
              });

              this.pricingFormGroup.patchValue({
                price: car.price,
              });

              this.photosFormGroup.patchValue({
                photos: car.photos,
              });

              this.featuresFormGroup.patchValue({
                features: car.features,
              });
            }
          }),
          untilDestroyed(this)
        )
        .subscribe();
    }
  }

  async nextStep() {
    if (this.currentStep === 0) {
      if (this.basicInformationFormGroup.valid) {
        this.stepper.next();
        this.currentStep++;
        return;
      }

      this.basicInformationFormGroup.markAllAsTouched();
      return;
    }

    if (this.currentStep === 1) {
      if (this.pricingFormGroup.valid) {
        this.stepper.next();
        this.currentStep++;
        return;
      }

      this.pricingFormGroup.markAllAsTouched();
      return;
    }

    if (this.currentStep === 2) {
      if (this.photosFormGroup.valid) {
        this.stepper.next();
        this.currentStep++;
        return;
      }

      this.photosFormGroup.markAllAsTouched();
      return;
    }

    if (this.currentStep === 3) {
      this.stepper.next();
      this.currentStep++;
      return;
    }
  }

  previousStep() {
    this.stepper.previous();
    this.currentStep--;
  }

  async publishCar() {
    if (this.isSaving) {
      return;
    }

    if (!this.basicInformationFormGroup.valid) {
      this.toast.error(this.translate.instant('car_publish.basic_information_invalid'));
      return;
    }

    if (!this.pricingFormGroup.valid) {
      this.toast.error(this.translate.instant('car_publish.pricing_invalid'));
      return;
    }

    if (!this.photosFormGroup.valid) {
      this.toast.error(this.translate.instant('car_publish.photos_invalid'));
      return;
    }

    this.isSaving = true;

    const basicInformation = this.basicInformationFormGroup.value;
    const pricing = this.pricingFormGroup.value;
    const photos = this.photosFormGroup.value.photos;
    const features = this.featuresFormGroup.value.features;

    const car: Car = {
      ...basicInformation,
      ...pricing,
      photos: photos,
      features: features,
      isPublished: true,
    };

    if (this.isEditMode && this.carId) {
      car.id = this.carId;

      this.store.dispatch(publishCarActions.updateCar({
        carId: this.carId,
        car: car
      }));

      this.store.select(selectCarLoading).pipe(
        tap(async (loading) => {
          if (!loading) {
            this.isSaving = false;
            await this.router.navigate([AppConstants.ROUTES.DASHBOARD]);
          }
        })
      ).subscribe();

      return;
    }

    this.store.dispatch(publishCarActions.publishCar({ car }));

    this.store.select(selectCarLoading).pipe(
      tap(async (loading) => {
        if (!loading) {
          this.isSaving = false;
          await this.router.navigate([AppConstants.ROUTES.DASHBOARD]);
        }
      })
    ).subscribe();
  }

  openAiPhotoGenerator() {
    this.showAiPhotoGenerator = true;
    this.aiPhotoGeneratorCarDescription = `${this.basicInformationFormGroup.value.brand} ${this.basicInformationFormGroup.value.model} ${this.basicInformationFormGroup.value.year}`
  }

  onAiPhotoGenerated(photo: string) {
    const photos = [...this.photosFormGroup.value.photos, photo];
    this.photosFormGroup.patchValue({
      photos: photos
    });

    this.showAiPhotoGenerator = false;
  }

  removePhoto(photo: string) {
    const photos = this.photosFormGroup.value.photos.filter((p: string) => p !== photo);
    this.photosFormGroup.patchValue({
      photos: photos
    });
  }
}
