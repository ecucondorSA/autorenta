import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, AnimationController, IonModal, IonicModule, LoadingController, ModalController, NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, close, cloudUploadOutline, colorPaletteOutline, informationCircleOutline, locationOutline, pricetagOutline, trashOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CarService } from '../../../../core/services/car.service';
import { UiService } from '../../../../core/services/ui/ui.service';
import { Category } from '../../../../core/models/category.model';
import { Color } from '../../../../core/models/color.model';
import { Model } from '../../../../core/models/model.model';
import { Brand } from '../../../../core/models/brand.model';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { RiskSnapshot } from '../../../../core/models';
import { CarPublish } from '../../../../core/models/car-publish.model';
import { CarPublishData } from '../../../../core/models/car-publish-data.model';
import { Car } from '../../../../core/models/car.model';
import { ImageService } from '../../../../core/services/image.service';
import { VisualCarDetailSelectorComponent } from './components/visual-selector/visual-selector.component';
import { AiPhotoGeneratorComponent } from '../../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { HoverLiftDirective } from '../../../../shared/directives/hover-lift.directive';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, AiPhotoGeneratorComponent, VisualCarDetailSelectorComponent, HoverLiftDirective],
  standalone: true
})
export class PublishCarV2Page implements OnInit {
  @ViewChild(IonModal) modal: IonModal;

  environment = environment;

  isModalOpen = false;

  categories: Category[] = [];
  colors: Color[] = [];
  models: Model[] = [];
  brands: Brand[] = [];

  // car: Car = {
  carForm: FormGroup = this.fb.group({
    id: [null],
    category_id: [null, [Validators.required]],
    model_id: [null, [Validators.required]],
    brand_id: [null, [Validators.required]],
    year: [null, [Validators.required]],
    kilometers: [null, [Validators.required]],
    color_id: [null, [Validators.required]],
    engine: [null, [Validators.required]],
    fuel: [null, [Validators.required]],
    gearbox: [null, [Validators.required]],
    price: [null, [Validators.required]],
    location: [null, [Validators.required]],
    description: [null, [Validators.required]],
    is_active: [true],
    images: [[]],
    features: [[]],
    visual_details: [[]],
    license_plate: [null, [Validators.required]],
    license_plate_state: [null, [Validators.required]],
    air_conditioning: [false],
    electric_windows: [false],
    central_locking: [false],
    power_steering: [false],
    abs: [false],
    airbags: [false],
    navigation_system: [false],
    sunroof: [false],
    alloy_wheels: [false],
    leather_seats: [false],
    parking_sensors: [false],
    cruise_control: [false],
    bluetooth: [false],
    usb_port: [false],
    aux_input: [false],
    cd_player: [false],
    mp3_player: [false],
    radio: [false],
    climate_control: [false],
    automatic_transmission: [false],
    four_wheel_drive: [false],
     Sport_package: [false],
  });

  get images() {
    return this.carForm.get('images') as FormControl;
  }

  is_active = false;
  carId: any;
  isEdit = false;
  loading = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private carService: CarService,
    private fb: FormBuilder,
    private imageService: ImageService,
    private loadingCtrl: LoadingController,
    private alertController: AlertController,
    private animationCtrl: AnimationController,
    private uiService: UiService,
    private modalCtrl: ModalController,
    private navCtrl: NavController
  ) {
    addIcons({
      'arrowBack': arrowBack,
      'close': close,
      'locationOutline': locationOutline,
      'pricetagOutline': pricetagOutline,
      'colorPaletteOutline': colorPaletteOutline,
      'cloudUploadOutline': cloudUploadOutline,
      'trashOutline': trashOutline,
      'informationCircleOutline': informationCircleOutline
    });
  }

  ngOnInit() {
    this.getCategories();
    this.getColors();
    this.getModels();
    this.getBrands();

    this.route.params.subscribe(params => {
      this.carId = params['id'];
      if (this.carId) {
        this.isEdit = true;
        this.getCar(this.carId);
      }
    });
  }

  async getCar(id: string) {
    this.loading = true;
    (await this.carService.getCar(id)).subscribe(async res => {
      this.carForm.patchValue(res);
      this.is_active = res.is_active;
      this.loading = false;
    });
  }

  async getCategories() {
    (await this.carService.getCategories()).subscribe(res => {
      this.categories = res;
    });
  }

  async getColors() {
    (await this.carService.getColors()).subscribe(res => {
      this.colors = res;
    });
  }

  async getModels() {
    (await this.carService.getModels()).subscribe(res => {
      this.models = res;
    });
  }

  async getBrands() {
    (await this.carService.getBrands()).subscribe(res => {
      this.brands = res;
    });
  }

  async publishCar() {
    if (this.carForm.invalid) {
      this.carForm.markAllAsTouched();
      return;
    }

    const loading = await this.loadingCtrl.create({
      message: 'Publicando auto...'
    });
    await loading.present();

    let car: Car = this.carForm.value;

    if (this.isEdit) {
      this.carService.updateCar(car).pipe(
        finalize(() => {
          loading.dismiss();
        })
      ).subscribe({
        next: (res) => {
          this.uiService.presentToast('Auto actualizado correctamente', 'success');
          this.router.navigate(['/cars']);
        },
        error: (err) => {
          this.uiService.presentToast('Error al actualizar auto', 'error');
        }
      });
    } else {
      this.carService.publishCar(car).pipe(
        finalize(() => {
          loading.dismiss();
        })
      ).subscribe({
        next: (res) => {
          this.uiService.presentToast('Auto publicado correctamente', 'success');
          this.router.navigate(['/cars']);
        },
        error: (err) => {
          this.uiService.presentToast('Error al publicar auto', 'error');
        }
      });
    }
  }

  async deleteCar() {
    const alert = await this.alertController.create({
      header: '¿Estás seguro?',
      message: '¿Estás seguro que deseas eliminar este auto?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            console.log('Confirm Cancel: blah');
          }
        },
        {
          text: 'Eliminar',
          handler: () => {
            this.carService.deleteCar(this.carId).subscribe(() => {
              this.uiService.presentToast('Auto eliminado correctamente', 'success');
              this.router.navigate(['/cars']);
            });
          }
        }
      ]
    });

    await alert.present();
  }

  async addImage() {
    this.isModalOpen = true;
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }

  async onFileSelected(event: any): Promise<void> {
    this.loading = true;
    if (event.target.files && event.target.files[0]) {
      const file: File = event.target.files[0];

      const loading = await this.loadingCtrl.create({
        message: 'Subiendo imagen...'
      });
      await loading.present();

      this.imageService.uploadImage(file).pipe(
        finalize(() => {
          loading.dismiss();
        })
      ).subscribe(async (res: any) => {
        if (res) {
          this.images.setValue([...this.images.value, res.url]);
          this.uiService.presentToast('Imagen subida correctamente', 'success');
          this.loading = false;
        } else {
          this.uiService.presentToast('Error al subir imagen', 'error');
          this.loading = false;
        }
      });
    }
  }

  removeImage(image: string) {
    this.images.setValue(this.images.value.filter(i => i !== image));
  }

  async openVisualSelectorModal() {
    const modal = await this.modalCtrl.create({
      component: VisualCarDetailSelectorComponent,
      componentProps: {
        visualDetails: this.carForm.value.visual_details
      },
      cssClass: 'visual-selector-modal',
      enterAnimation: this.enterAnimation,
      leaveAnimation: this.leaveAnimation
    });
    modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === 'confirm') {
      this.carForm.patchValue({
        visual_details: data
      });
    }
  }

  enterAnimation = (baseEl: HTMLElement) => {
    const baseAnimation = this.animationCtrl.create();

    const backdropAnimation = this.animationCtrl.create()
      .addElement(baseEl.querySelector('ion-backdrop')!)
      .fromTo('opacity', '0.01', 'var(--backdrop-opacity)');

    const wrapperAnimation = this.animationCtrl.create()
      .addElement(baseEl.querySelector('.modal-wrapper')!)
      .keyframes([
        { offset: 0, opacity: '0', transform: 'scale(0)' },
        { offset: 1, opacity: '0.99', transform: 'scale(1)' }
      ]);

    return baseAnimation
      .addElement(baseEl)
      .easing('ease-out')
      .duration(300)
      .addAnimation([backdropAnimation, wrapperAnimation]);
  }

  leaveAnimation = (baseEl: HTMLElement) => {
    return this.enterAnimation(baseEl).direction('reverse');
  }

  closeModal() {
    this.modal.dismiss(null, 'cancel');
  }

  confirm() {
    this.modal.dismiss(this.carForm.value.location, 'confirm');
  }
}