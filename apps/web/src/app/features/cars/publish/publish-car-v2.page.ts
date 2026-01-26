import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, LoadingController, ModalController, NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, close, cloudUploadOutline, informationCircleOutline, locationOutline, pricetagOutline, trashOutline } from 'ionicons/icons';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AiPhotoGeneratorComponent } from '../../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { environment } from '../../../../../environments/environment';
import { HoverLiftDirective } from '../../../../shared/directives/hover-lift.directive';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { bookingDetailPaymentModel } from '@core/models/booking-detail-payment.model';
import { CarPublishService } from '@core/services/car-publish/car-publish.service';
import { CoreService } from '@core/services/core.service';
import { ImageService } from '@core/services/image/image.service';
import { ToastService } from '@core/services/toast.service';
import { UiKitsService } from '@core/services/ui-kits.service';
import { UserService } from '@core/services/user.service';
import { AppState } from '@store/app.state';
import { selectUser } from '@store/user/user.selector';
import { Device } from '@capacitor/device';
import { Geolocation } from '@capacitor/geolocation';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { DomSanitizer } from '@angular/platform-browser';
import { BookingDetail } from '@core/models';
import { RiskSnapshot } from '@core/models';
import { Car, Category, City, FuelType, GearBox, Kilometrage, Location, Model, Province } from '@core/models';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, TranslateModule, ReactiveFormsModule, AiPhotoGeneratorComponent, VisualSelectorComponent, HoverLiftDirective]
})
export class PublishCarV2Page implements OnInit {

  user$ = this.store.select(selectUser);
  formPublish: FormGroup;
  categories: Category[] = [];
  models: Model[] = [];
  fuelTypes: FuelType[] = [];
  gearBoxes: GearBox[] = [];
  cities: City[] = [];
  provinces: Province[] = [];
  kilometrages: Kilometrage[] = [];
  locations: Location[] = [];
  images: any[] = [];
  isWebPlatform: boolean = false;
  currentLocation: any;
  isModalOpen = false;
  loading: any;

  constructor(
    private fb: FormBuilder,
    private coreService: CoreService,
    private imageService: ImageService,
    private toastService: ToastService,
    private store: Store<AppState>,
    private loadingCtrl: LoadingController,
    private translate: TranslateService,
    private route: ActivatedRoute,
    private router: Router,
    private uiKitsService: UiKitsService,
    private modalCtrl: ModalController,
    private userService: UserService,
    private navController: NavController,
    private alertController: AlertController,
    private sanitizer: DomSanitizer
  ) {
    addIcons({
      'arrow-back': arrowBack,
      'close': close,
      'location-outline': locationOutline,
      'pricetag-outline': pricetagOutline,
      'information-circle-outline': informationCircleOutline,
      'trash-outline': trashOutline,
      'cloud-upload-outline': cloudUploadOutline
    });

    this.formPublish = this.fb.group({
      category_id: ['', [Validators.required]],
      model_id: ['', [Validators.required]],
      fuel_type_id: ['', [Validators.required]],
      gearbox_id: ['', [Validators.required]],
      city_id: ['', [Validators.required]],
      province_id: ['', [Validators.required]],
      kilometrage_id: ['', [Validators.required]],
      location_id: ['', [Validators.required]],
      year: ['', [Validators.required]],
      price: ['', [Validators.required]],
      description: ['', [Validators.required]],
      license_plate: ['', [Validators.required]],
      is_active: [true, []],
      latitude: ['', []],
      longitude: ['', []],
      address: ['', []],
    });
  }

  async ngOnInit() {
    this.isWebPlatform = environment.isWeb;

    this.categories = await this.coreService.getCategories();
    this.fuelTypes = await this.coreService.getFuelTypes();
    this.gearBoxes = await this.coreService.getGearBoxes();
    this.cities = await this.coreService.getCities();
    this.provinces = await this.coreService.getProvinces();
    this.kilometrages = await this.coreService.getKilometrages();

    this.user$.subscribe(async (user) => {
      if (user) {
        this.locations = await this.coreService.getLocations(user.id);
      }
    });

    this.getCarToEdit();
    this.getCurrentPosition();
  }

  async getCarToEdit() {
    this.route.queryParams.subscribe(async params => {
      if (params['car_id']) {
        await this.presentLoading();
        this.coreService.getCar(params['car_id']).subscribe({
          next: (res: Car) => {
            this.formPublish.patchValue(res);
            this.models = this.categories.find(c => c.id === res.category_id)?.models || [];
            this.images = res.images.map(i => i.url);
            this.dismissLoading();
          },
          error: (err) => {
            this.dismissLoading();
          },
        });
      }
    });
  }

  async publishCar() {
    if (this.formPublish.invalid) {
      this.formPublish.markAllAsTouched();
      return;
    }

    if (this.images.length === 0) {
      this.toastService.presentToast(this.translate.instant('IMAGE.NO_IMAGE'), 'danger');
      return;
    }

    await this.presentLoading();

    const car = this.formPublish.value;
    car.images = this.images;

    this.user$.subscribe(async (user) => {
      if (user) {
        car.user_id = user.id;
        this.coreService.publishCar(car).subscribe({
          next: (res) => {
            this.dismissLoading();
            this.toastService.presentToast(this.translate.instant('CARS.PUBLISH_OK'), 'success');
            this.navController.back();
          },
          error: (err) => {
            this.dismissLoading();
            this.toastService.presentToast(this.translate.instant('CARS.PUBLISH_ERROR'), 'danger');
          },
        });
      }
    });
  }

  async getCurrentPosition() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      this.currentLocation = coordinates.coords;
      this.formPublish.controls['latitude'].setValue(coordinates.coords.latitude);
      this.formPublish.controls['longitude'].setValue(coordinates.coords.longitude);
    } catch (error) {
      console.log('Error getting location', error);
    }
  }

  async selectImage() {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera // Camera, Photos or Prompt!
    });

    if (image) {
      this.images.push(image.dataUrl);
    }
  }

  async uploadImage(event: any) {
    await this.presentLoading();
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.images.push(reader.result);
      this.dismissLoading();
    };
    reader.onerror = (error) => {
      console.log('Error: ', error);
      this.dismissLoading();
    };
  }

  async deleteImage(index: number) {
    const alert = await this.alertController.create({
      header: this.translate.instant('IMAGE.DELETE_IMAGE'),
      buttons: [
        {
          text: this.translate.instant('GENERIC.CANCEL'),
          role: 'cancel',
          handler: () => {
            console.log('Cancel clicked');
          }
        },
        {
          text: this.translate.instant('GENERIC.DELETE'),
          handler: () => {
            this.images.splice(index, 1);
          }
        }
      ]
    });

    await alert.present();
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }

  async generateImage(prompt: string) {
    await this.presentLoading();

    this.imageService.getImageByPrompt(prompt).subscribe({
      next: (res: any) => {
        this.images.push(`data:image/png;base64,${res.b64_json}`);
        this.dismissLoading();
      },
      error: (err: any) => {
        this.dismissLoading();
        this.toastService.presentToast(this.translate.instant('IMAGE.GENERATE_ERROR'), 'danger');
      },
    });
  }

  async presentLoading() {
    this.loading = await this.loadingCtrl.create({
      spinner: 'crescent',
      translucent: true,
      cssClass: 'loading-custom-class',
      message: this.translate.instant('GENERIC.LOADING'),
    });
    return await this.loading.present();
  }

  async dismissLoading() {
    if (this.loading) {
      await this.loading.dismiss();
    }
  }

  onCategoryChange(event: any) {
    this.models = this.categories.find(c => c.id === event.target.value)?.models || [];
    this.formPublish.controls['model_id'].setValue('');
  }

  sanitizeImage(imageUrl: string) {
    return this.sanitizer.bypassSecurityTrustUrl(imageUrl);
  }
}