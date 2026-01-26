import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonContent, IonicModule, LoadingController, ModalController, NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  arrowBackOutline,
  arrowForwardOutline,
  banOutline,
  barcodeOutline,
  businessOutline,
  calendarClearOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeCircleOutline,
  closeOutline,
  cloudUploadOutline,
  colorPaletteOutline,
  createOutline,
  documentTextOutline,
  duplicateOutline,
  eyeOffOutline,
  eyeOutline,
  filterOutline,
  homeOutline,
  imageOutline,
  informationCircleOutline,
  keyOutline,
  locationOutline,
  mailOutline,
  mapOutline,
  pencilOutline,
  peopleOutline,
  personOutline,
  phonePortraitOutline,
  pricetagOutline,
  readerOutline,
  removeCircleOutline,
  saveOutline,
  searchOutline,
  sendOutline,
  starOutline,
  swapHorizontalOutline,
  trashOutline,
  uploadOutline,
  warningOutline,
} from 'ionicons/icons';
import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { CarPublishFormComponent } from './components/car-publish-form/car-publish-form.component';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { CarService } from '@core/services/car.service';
import { UiCar } from '@core/models/UI/ui-car.model';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { Car, CarImage, CarLocation, CarModel, CarOptions, CarReview, CarSpecification, RiskSnapshot } from '../../../core/models';
import { Category } from '../../../core/models/category.model';
import { City } from '../../../core/models/city.model';
import { FuelType } from '../../../core/models/fuel-type.model';
import { GearBoxType } from '../../../core/models/gear-box-type.model';
import { Province } from '../../../core/models/province.model';
import { Review } from '../../../core/models/review.model';
import { Segment } from '../../../core/models/segment.model';
import { Security } from '../../../core/models/security.model';
import { environment } from 'src/environments/environment';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    CarPublishFormComponent,
    VisualSelectorComponent,
    AiPhotoGeneratorComponent,
    HoverLiftDirective,
  ],
})
export class PublishCarV2Page implements OnInit {
  @ViewChild(IonContent) content: IonContent | undefined;

  env = environment;

  isReady = signal(false);

  categories: Category[] = [];
  cities: City[] = [];
  provinces: Province[] = [];
  fuelTypes: FuelType[] = [];
  gearBoxTypes: GearBoxType[] = [];
  segments: Segment[] = [];
  securities: Security[] = [];

  car: Car = {};
  carImages: CarImage[] = [];
  carLocation: CarLocation = {};
  carModel: CarModel = {};
  carOptions: CarOptions = {};
  carSpecification: CarSpecification = {};
  carReview: CarReview = {};
  riskSnapshot: RiskSnapshot = {};
  review: Review = {};

  uiCar: UiCar = {
    images: [],
    mainImage: '',
  };

  isNewCar = true;
  carId: string | null = null;

  publishCarForm: FormGroup;
  images: string[] = [];
  mainImage: string = '';

  constructor(
    private _router: Router,
    private _route: ActivatedRoute,
    private fb: FormBuilder,
    private carService: CarService,
    private loadingCtrl: LoadingController,
    private alertController: AlertController,
    private navCtrl: NavController,
    private modalController: ModalController
  ) {
    addIcons({
      'home-outline': homeOutline,
      'reader-outline': readerOutline,
      'business-outline': businessOutline,
      'location-outline': locationOutline,
      'key-outline': keyOutline,
      'pricetag-outline': pricetagOutline,
      'swap-horizontal-outline': swapHorizontalOutline,
      'people-outline': peopleOutline,
      'document-text-outline': documentTextOutline,
      'image-outline': imageOutline,
      'color-palette-outline': colorPaletteOutline,
      'cloud-upload-outline': cloudUploadOutline,
      'save-outline': saveOutline,
      'trash-outline': trashOutline,
      'create-outline': createOutline,
      'pencil-outline': pencilOutline,
      'remove-circle-outline': removeCircleOutline,
      'close-outline': closeOutline,
      'close-circle-outline': closeCircleOutline,
      'checkmark-outline': checkmarkOutline,
      'checkmark-circle-outline': checkmarkCircleOutline,
      'add-outline': addOutline,
      'search-outline': searchOutline,
      'filter-outline': filterOutline,
      'chevron-back-outline': chevronBackOutline,
      'chevron-forward-outline': chevronForwardOutline,
      'arrow-back-outline': arrowBackOutline,
      'arrow-forward-outline': arrowForwardOutline,
      'mail-outline': mailOutline,
      'phone-portrait-outline': phonePortraitOutline,
      'barcode-outline': barcodeOutline,
      'map-outline': mapOutline,
      'person-outline': personOutline,
      'eye-outline': eyeOutline,
      'eye-off-outline': eyeOffOutline,
      'duplicate-outline': duplicateOutline,
      'send-outline': sendOutline,
      'warning-outline': warningOutline,
      'ban-outline': banOutline,
      'calendar-clear-outline': calendarClearOutline,
      'information-circle-outline': informationCircleOutline,
      'star-outline': starOutline,
      'upload-outline': uploadOutline,
    });

    this.publishCarForm = this.fb.group({
      category: ['', Validators.required],
      city: ['', Validators.required],
      province: ['', Validators.required],
      fuelType: ['', Validators.required],
      gearBoxType: ['', Validators.required],
      segment: ['', Validators.required],
      security: ['', Validators.required],
    });
  }

  async ngOnInit() {
    this.loadData();
    this._route.paramMap.subscribe(async (params) => {
      this.carId = params.get('carId');
      if (this.carId) {
        this.isNewCar = false;
        await this.loadCar(this.carId);
      } else {
        this.isNewCar = true;
      }
    });
  }

  async loadCar(carId: string) {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando coche...',
    });
    await loading.present();

    this.carService.getCarById(carId).subscribe((car) => {
      this.car = car;

      this.publishCarForm.patchValue({
        category: car.category?.id,
        city: car.city?.id,
        province: car.province?.id,
        fuelType: car.fuelType?.id,
        gearBoxType: car.gearBoxType?.id,
        segment: car.segment?.id,
        security: car.security?.id,
      });

      this.uiCar.images = car.images?.map((image) => image.url) || [];
      this.uiCar.mainImage = car.images?.find((image) => image.isMain)?.url || '';

      loading.dismiss();
    });
  }

  async loadData() {
    const loading = await this.loadingCtrl.create({
      message: 'Cargando datos...',
    });
    await loading.present();

    Promise.all([
      this.carService.getCategories(),
      this.carService.getCities(),
      this.carService.getProvinces(),
      this.carService.getFuelTypes(),
      this.carService.getGearBoxTypes(),
      this.carService.getSegments(),
      this.carService.getSecurities(),
    ])
      .then((responses) => {
        this.categories = responses[0];
        this.cities = responses[1];
        this.provinces = responses[2];
        this.fuelTypes = responses[3];
        this.gearBoxTypes = responses[4];
        this.segments = responses[5];
        this.securities = responses[6];
        this.isReady.set(true);
      })
      .finally(() => {
        loading.dismiss();
      });
  }

  async publishCar() {
    if (this.publishCarForm.invalid) {
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Publicando coche...',
    });
    await loading.present();

    const car: Car = {
      ...this.car,
      category: this.categories.find((category) => category.id === this.publishCarForm.value.category),
      city: this.cities.find((city) => city.id === this.publishCarForm.value.city),
      province: this.provinces.find((province) => province.id === this.publishCarForm.value.province),
      fuelType: this.fuelTypes.find((fuelType) => fuelType.id === this.publishCarForm.value.fuelType),
      gearBoxType: this.gearBoxTypes.find((gearBoxType) => gearBoxType.id === this.publishCarForm.value.gearBoxType),
      segment: this.segments.find((segment) => segment.id === this.publishCarForm.value.segment),
      security: this.securities.find((security) => security.id === this.publishCarForm.value.security),
      images: this.uiCar.images.map((image) => ({
        url: image,
        isMain: image === this.uiCar.mainImage,
      })),
    };

    if (this.isNewCar) {
      this.carService.createCar(car).subscribe({
        next: (res) => {
          loading.dismiss();
          this.presentAlert('Coche publicado', 'El coche se ha publicado correctamente.');
        },
        error: (err) => {
          loading.dismiss();
          this.presentAlert('Error', 'Ha ocurrido un error al publicar el coche.');
        },
      });
    } else {
      car.id = this.carId!;
      this.carService.updateCar(car).subscribe({
        next: (res) => {
          loading.dismiss();
          this.presentAlert('Coche actualizado', 'El coche se ha actualizado correctamente.');
        },
        error: (err) => {
          loading.dismiss();
          this.presentAlert('Error', 'Ha ocurrido un error al actualizar el coche.');
        },
      });
    }
  }

  async presentAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header: header,
      message: message,
      buttons: [
        {
          text: 'Ok',
          handler: () => {
            this.navCtrl.back();
          },
        },
      ],
    });

    await alert.present();
  }

  async openAiPhotoGenerator() {
    const modal = await this.modalController.create({
      component: AiPhotoGeneratorComponent,
      componentProps: {
        images: this.uiCar.images,
      },
    });
    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.uiCar.images = data.images;
      this.uiCar.mainImage = data.mainImage;
    }
  }
}
