import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicSlides, LoadingController, ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subject, takeUntil } from 'rxjs';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { ImageSelectorComponent } from '../../../shared/components/image-selector/image-selector.component';
import { PhotoSource } from '../../../shared/components/image-selector/photo-source.enum';
import { ImageViewerComponent } from '../../../shared/components/image-viewer/image-viewer.component';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { AppState } from '../../../../core/store';
import { publishCarActions } from '../../../../core/store/publish-car';
import { environment } from '../../../../../environments/environment';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { CarFeaturesComponent } from './components/car-features/car-features.component';
import { CarLocationComponent } from './components/car-location/car-location.component';
import { CarDescriptionComponent } from './components/car-description/car-description.component';
import { CarPricingComponent } from './components/car-pricing/car-pricing.component';
import { CarDetailsComponent } from './components/car-details/car-details.component';
import { CarMediaComponent } from './components/car-media/car-media.component';
import { scrollToTop } from '../../../../shared/utils/scroll-to-top';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { addIcons } from 'ionicons';
import { camera, close, cloudUpload, colorPalette, create, image, locate, pricetag, ribbon, speedometer, trash, warning } from 'ionicons/icons';
import { IonContent, IonHeader, IonSlides } from '@ionic/angular/standalone';





@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    IonHeader,
    IonContent,
    ImageSelectorComponent,
    AiPhotoGeneratorComponent,
    ImageViewerComponent,
    VisualSelectorComponent,
    CarFeaturesComponent,
    CarLocationComponent,
    CarDescriptionComponent,
    CarPricingComponent,
    CarDetailsComponent,
    CarMediaComponent,
    HoverLiftDirective
  ],
})
export class PublishCarV2Page implements OnInit {
  @ViewChild('slider', { static: false }) slider: IonSlides;
  public publishCarForm: FormGroup;
  public env = environment;
  public photoSource = PhotoSource;
  public currentSlideIndex = 0;
  public slidesOptions = {
    slidesPerView: 1,
    allowTouchMove: false,
  };

  public car$: Observable<any>;
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private loadingCtrl: LoadingController,
    private alertCtrl: AlertController,
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private modalCtrl: ModalController
  ) {
    addIcons({
      close,
      warning,
      camera,
      image,
      cloudUpload,
      locate,
      create,
      colorPalette,
      speedometer,
      ribbon,
      pricetag,
      trash,
    });
  }

  ngOnInit() {
    scrollToTop();

    this.publishCarForm = this.fb.group({
      details: this.fb.group({
        make: ['', Validators.required],
        model: ['', Validators.required],
        year: ['', Validators.required],
        kilometers: ['', Validators.required],
        engineDisplacement: ['', Validators.required],
        fuelType: ['', Validators.required],
        transmission: ['', Validators.required],
        bodyType: ['', Validators.required],
        doors: ['', Validators.required],
        seats: ['', Validators.required],
        color: ['', Validators.required],
      }),
      features: this.fb.group({
        airConditioning: [false],
        alloyWheels: [false],
        bluetooth: [false],
        cdPlayer: [false],
        centralLocking: [false],
        cruiseControl: [false],
        electricMirrors: [false],
        electricWindows: [false],
        navigationSystem: [false],
        parkingSensors: [false],
        powerSteering: [false],
        sunroof: [false],
      }),
      media: this.fb.group({
        images: [[], Validators.required],
        exterior360: [''],
        interior360: [''],
        video: [''],
      }),
      location: this.fb.group({
        country: ['', Validators.required],
        city: ['', Validators.required],
        address: ['', Validators.required],
        latitude: ['', Validators.required],
        longitude: ['', Validators.required],
      }),
      description: this.fb.group({
        title: ['', Validators.required],
        description: ['', Validators.required],
      }),
      pricing: this.fb.group({
        price: ['', Validators.required],
        discount: [''],
      }),
    });

    this.car$ = this.store.select((state) => state.publishCar.car);

    this.car$.pipe(takeUntil(this.destroy$)).subscribe((car) => {
      if (car) {
        this.publishCarForm.patchValue(car);
      }
    });

    this.route.queryParams.subscribe((params) => {
      if (params['edit']) {
        this.store.dispatch(publishCarActions.loadCar({ id: params['edit'] }));
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  public async nextSlide() {
    await this.slider.lockSwipeToNext(false);
    this.slider.slideNext();
    this.currentSlideIndex = await this.slider.getActiveIndex();
    await this.slider.lockSwipeToNext(true);
    scrollToTop();
  }

  public async prevSlide() {
    await this.slider.lockSwipeToPrev(false);
    this.slider.slidePrev();
    this.currentSlideIndex = await this.slider.getActiveIndex();
    await this.slider.lockSwipeToPrev(true);
    scrollToTop();
  }

  public async submit() {
    if (this.publishCarForm.valid) {
      const loading = await this.loadingCtrl.create({
        message: 'Publicando tu auto...', // TODO: translate
      });
      await loading.present();

      this.store.dispatch(publishCarActions.publishCar(this.publishCarForm.value));

      this.car$.pipe(takeUntil(this.destroy$)).subscribe(async (car) => {
        if (car?.id) {
          await loading.dismiss();

          const alert = await this.alertCtrl.create({
            header: 'Auto publicado', // TODO: translate
            message: 'Tu auto ha sido publicado con éxito.', // TODO: translate
            buttons: [
              {
                text: 'Ok',
                handler: () => {
                  this.router.navigate(['/app/cars', car.id]);
                },
              },
            ],
          });

          await alert.present();
        }
      });
    } else {
      console.log('invalid form', this.publishCarForm);
      this.publishCarForm.markAllAsTouched();

      const alert = await this.alertCtrl.create({
        header: 'Error', // TODO: translate
        message: 'Por favor, completa todos los campos requeridos.', // TODO: translate
        buttons: ['Ok'],
      });

      await alert.present();
    }
  }

  public async openImageSelector(formControl: FormControl) {
    const modal = await this.modalCtrl.create({
      component: ImageSelectorComponent,
    });

    modal.onDidDismiss().then((data) => {
      if (data.data) {
        formControl.setValue(data.data);
      }
    });

    return await modal.present();
  }
}
