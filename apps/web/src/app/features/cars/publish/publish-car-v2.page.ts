import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicSlides, ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { TranslateService } from '@ngx-translate/core';
import { Observable, Subject, takeUntil } from 'rxjs';

import { addIcons } from 'ionicons';
import { cloudUploadOutline, closeCircle, closeOutline, informationCircleOutline, trashOutline } from 'ionicons/icons';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { CarPublishHeaderComponent } from '../components/car-publish-header/car-publish-header.component';
import { CarLocationFormComponent } from '../components/car-location-form/car-location-form.component';
import { CarDetailsFormComponent } from '../components/car-details-form/car-details-form.component';
import { CarPricingFormComponent } from '../components/car-pricing-form/car-pricing-form.component';
import { CarPhotosFormComponent } from '../components/car-photos-form/car-photos-form.component';
import { CarFeaturesFormComponent } from '../components/car-features-form/car-features-form.component';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';

import { selectPublishCar } from '../../store/car.selector';
import { updatePublishCar } from '../../store/car.actions';
import { PublishCar } from '../../models/publish-car';
import { AppState } from '../../../core/store';
import { ROUTES } from '../../../core/constants/routes';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { BookingProcessService } from '@core/services/booking-process.service';
import { CarService } from '@core/services/car.service';
import { UiService } from '@core/services/ui/ui.service';
import { PaymentMethodsModalComponent } from '@shared/components/payment-methods-modal/payment-methods-modal.component';
import { AnalyticsService } from '@shared/services/analytics/analytics.service';
import { objectToFormData } from '@shared/utils/object-to-form-data';
import { environment } from 'src/environments/environment';
import { CarPublishSuccessComponent } from '../components/car-publish-success/car-publish-success.component';
import { RiskSnapshot } from 'src/app/core/models';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CarPublishHeaderComponent,
    CarLocationFormComponent,
    CarDetailsFormComponent,
    CarPricingFormComponent,
    CarPhotosFormComponent,
    CarFeaturesFormComponent,
    VisualSelectorComponent,
    HoverLiftDirective
  ],
})
export class PublishCarV2Page implements OnInit {
  @ViewChild('slider', { static: false }) slider: IonicSlides;

  public publishCarForm: FormGroup;
  public currentStep = 1;
  public maxSteps = 5;
  public progress = 0.2;
  public publishCar$: Observable<PublishCar>;
  private destroy$ = new Subject<void>();
  private carId: string | null = null;

  slideOpts = {
    allowSlidePrev: false,
    allowSlideNext: false,
  };

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private router: Router,
    private route: ActivatedRoute,
    private carService: CarService,
    private uiService: UiService,
    private translate: TranslateService,
    private bookingProcessService: BookingProcessService,
    private alertController: AlertController,
    private modalCtrl: ModalController,
    private navCtrl: NavController,
    private analyticsService: AnalyticsService
  ) {
    addIcons({
      'close-outline': closeOutline,
      'close-circle': closeCircle,
      'cloud-upload-outline': cloudUploadOutline,
      'trash-outline': trashOutline,
      'information-circle-outline': informationCircleOutline,
    });
  }

  ngOnInit() {
    this.analyticsService.track('publish_car_start');

    this.publishCar$ = this.store.select(selectPublishCar);

    this.publishCar$.pipe(takeUntil(this.destroy$)).subscribe((publishCar) => {
      this.publishCarForm = this.fb.group({
        location: [publishCar?.location, Validators.required],
        details: [publishCar?.details, Validators.required],
        pricing: [publishCar?.pricing, Validators.required],
        photos: [publishCar?.photos, Validators.required],
        features: [publishCar?.features, Validators.required],
      });
    });

    this.route.paramMap.subscribe((params) => {
      this.carId = params.get('carId');

      if (this.carId) {
        this.carService
          .getCar(this.carId)
          .pipe(takeUntil(this.destroy$))
          .subscribe((car) => {
            this.store.dispatch(updatePublishCar({ publishCar: car }));
          });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async nextSlide() {
    if (this.currentStep < this.maxSteps) {
      if (this.publishCarForm.get(this.getFormGroupName())?.valid) {
        this.analyticsService.track(`publish_car_step_${this.currentStep}_complete`);
        this.currentStep++;
        this.progress = this.currentStep / this.maxSteps;
        await this.slider.slideNext();
      } else {
        this.publishCarForm.get(this.getFormGroupName())?.markAllAsTouched();
        this.uiService.presentToast(this.translate.instant('FORM.FILL_ALL_FIELDS') as string, 'warning');
      }
    }
  }

  async prevSlide() {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.progress = this.currentStep / this.maxSteps;
      await this.slider.slidePrev();
    }
  }

  getFormGroupName(): string {
    switch (this.currentStep) {
      case 1:
        return 'location';
      case 2:
        return 'details';
      case 3:
        return 'pricing';
      case 4:
        return 'photos';
      case 5:
        return 'features';
      default:
        return 'location';
    }
  }

  async publishCar() {
    if (this.publishCarForm.valid) {
      this.analyticsService.track('publish_car_submit');
      const publishCar = { ...this.publishCarForm.value };

      let formData = objectToFormData(publishCar);

      if (this.carId) {
        formData.append('carId', this.carId);
      }

      this.carService.publishCar(formData).subscribe({
        next: (res) => {
          this.analyticsService.track('publish_car_success');
          this.store.dispatch(updatePublishCar({ publishCar: null }));
          this.presentPublishSuccessModal();
        },
        error: (err) => {
          console.log(err);
          this.uiService.presentToast(this.translate.instant('CAR.PUBLISH_ERROR') as string, 'error');
        },
      });
    } else {
      this.uiService.presentToast(this.translate.instant('FORM.FILL_ALL_FIELDS') as string, 'warning');
    }
  }

  async presentPublishSuccessModal() {
    const modal = await this.modalCtrl.create({
      component: CarPublishSuccessComponent,
      cssClass: 'success-modal',
    });
    return await modal.present();
  }

  async deleteCar() {
    const alert = await this.alertController.create({
      header: this.translate.instant('CAR.DELETE_CAR_CONFIRMATION.HEADER') as string,
      message: this.translate.instant('CAR.DELETE_CAR_CONFIRMATION.MESSAGE') as string,
      buttons: [
        {
          text: this.translate.instant('CAR.DELETE_CAR_CONFIRMATION.CANCEL') as string,
          role: 'cancel',
          cssClass: 'secondary',
          id: 'cancel-button',
          handler: () => {
            console.log('Confirm Cancel');
          },
        },
        {
          text: this.translate.instant('CAR.DELETE_CAR_CONFIRMATION.CONFIRM') as string,
          id: 'confirm-button',
          handler: () => {
            this.carService.deleteCar(this.carId).subscribe(() => {
              this.navCtrl.navigateRoot(ROUTES.cars.path);
            });
          },
        },
      ],
    });

    await alert.present();
  }

  paymentMethods() {
    this.modalCtrl
      .create({
        component: PaymentMethodsModalComponent,
      })
      .then((modal) => {
        modal.present();
      });
  }
}
