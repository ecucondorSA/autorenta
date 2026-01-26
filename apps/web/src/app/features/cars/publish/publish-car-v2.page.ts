/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController, ModalController, ToastController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ActionSheetController } from '@ionic/angular';
import { Geolocation } from '@capacitor/geolocation';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { TranslateService } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';

import { addIcons } from 'ionicons';
import { cloudUploadOutline, locationOutline, addCircleOutline, closeCircleOutline } from 'ionicons/icons';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { CarService } from '../../services/car.service';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';

import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { AppState } from '../../../../core/store/app.state';
import { selectCurrentUser } from '../../../../core/store/user/user.selector';
import * as CarActions from '../../../../core/store/car/car.actions';
import { Car } from '../../../../core/models/car.model';
import { Booking } from '../../../../core/models/booking.model';
import { RiskSnapshot } from '../../../../core/models/risk-snapshot.model';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
})
export class PublishCarV2Page implements OnInit {
  publishCarForm: FormGroup;
  currentImage: SafeUrl;
  user$: Observable<any>; // Replace any with the actual type of the user object

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private alertController: AlertController,
    private toastController: ToastController,
    private modalController: ModalController,
    private carService: CarService,
    private actionSheetController: ActionSheetController,
    private sanitizer: DomSanitizer,
    private translate: TranslateService,
    private store: Store<AppState>
  ) {
    addIcons({
      cloudUploadOutline,
      locationOutline,
      addCircleOutline,
      closeCircleOutline,
    });
  }

  ngOnInit() {
    this.user$ = this.store.select(selectCurrentUser);

    this.publishCarForm = this.fb.group({
      make: ['', Validators.required],
      model: ['', Validators.required],
      year: ['', Validators.required],
      price: ['', Validators.required],
      location: ['', Validators.required],
      description: [''],
    });
  }

  async openAiPhotoGenerator() {
    const modal = await this.modalController.create({
      component: AiPhotoGeneratorComponent,
      componentProps: {
        // any props you want to pass to the component
      },
    });
    return await modal.present();
  }

  async selectImage() {
    const actionSheet = await this.actionSheetController.create({
      header: this.translate.instant('APP.PUBLISH_CAR.SELECT_SOURCE'),
      buttons: [{
        text: this.translate.instant('APP.PUBLISH_CAR.LOAD_FROM_LIBRARY'),
        handler: () => {
          this.takePicture(CameraSource.Photos);
        }
      },
      {
        text: this.translate.instant('APP.PUBLISH_CAR.USE_CAMERA'),
        handler: () => {
          this.takePicture(CameraSource.Camera);
        }
      },
      {
        text: this.translate.instant('APP.CANCEL'),
        role: 'cancel'
      }
      ]
    });
    await actionSheet.present();
  }

  async takePicture(source: CameraSource) {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      source: source,
      correctOrientation: true,
      resultType: CameraResultType.DataUrl
    });

    this.currentImage = this.sanitizer.bypassSecurityTrustResourceUrl(image && (image.dataUrl));
  }

  async getLocation() {
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      console.log('Current position:', coordinates);
    } catch (error) {
      console.error('Error getting location:', error);
      const alert = await this.alertController.create({
        header: this.translate.instant('ERROR'),
        message: this.translate.instant('APP.PUBLISH_CAR.LOCATION_ERROR'),
        buttons: [this.translate.instant('OK')],
      });

      await alert.present();
    }
  }

  async presentToast() {
    const toast = await this.toastController.create({
      message: this.translate.instant('APP.PUBLISH_CAR.CAR_PUBLISHED'),
      duration: 2000,
      color: 'success',
    });
    toast.present();
  }

  publishCar() {
    if (this.publishCarForm.valid) {
      const car: Car = this.publishCarForm.value;

      this.store.dispatch(CarActions.createCar({ car }));

      this.presentToast();
      this.router.navigate(['/home']);
    } else {
      this.showAlert();
    }
  }

  async showAlert() {
    const alert = await this.alertController.create({
      header: this.translate.instant('ERROR'),
      message: this.translate.instant('APP.PUBLISH_CAR.FORM_ERROR'),
      buttons: [this.translate.instant('OK')],
    });

    await alert.present();
  }

  async openVisualSelector(field: string) {
    const modal = await this.modalController.create({
      component: VisualSelectorComponent,
      componentProps: {
        field: field
      }
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data) {
      this.publishCarForm.get(field).setValue(data);
    }
  }
}
