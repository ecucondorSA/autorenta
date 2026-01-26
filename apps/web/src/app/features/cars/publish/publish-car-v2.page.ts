import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, NavController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { camera, car, close, cloudUploadOutline, location, trashOutline } from 'ionicons/icons';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subscription, take } from 'rxjs';

import { AiPhotoGeneratorComponent } from '../../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { AppState } from '../../../../core/store';
import { selectPublishCar } from '../../../../core/store/publish-car/publish-car.selectors';
import { updatePublishCar } from '../../../../core/store/publish-car/publish-car.actions';
import { CarService } from '../../../../core/services/car.service';
import { ImageUploadService } from '../../../../core/services/image-upload.service';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { HoverLiftDirective } from '../../../../shared/directives/hover-lift.directive';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { Booking } from '@core/models';
import { RiskSnapshot } from '@core/models';


@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, TranslateModule, AiPhotoGeneratorComponent, VisualSelectorComponent, HoverLiftDirective],
})
export class PublishCarV2Page implements OnInit {
  @ViewChild(VisualSelectorComponent) visualSelector: VisualSelectorComponent | undefined;

  formGroup: FormGroup;
  publishCarData$: Observable<any>;
  private publishCarSubscription: Subscription | undefined;
  isModalOpen = false;
  currentImageIndex: number | null = null;
  imageToDelete: string | null = null;

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private carService: CarService,
    private imageUploadService: ImageUploadService,
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private alertController: AlertController,
    private translate: TranslateService
  ) {
    addIcons({
      'location': location,
      'car': car,
      'camera': camera,
      'close': close,
      'trash-outline': trashOutline,
      'cloud-upload-outline': cloudUploadOutline
    });

    this.formGroup = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      category: ['', Validators.required],
      year: ['', Validators.required],
      kilometers: ['', Validators.required],
      price: ['', Validators.required],
    });

    this.publishCarData$ = this.store.select(selectPublishCar);
  }

  ngOnInit() {
    this.publishCarSubscription = this.publishCarData$.subscribe(data => {
      if (data) {
        this.formGroup.patchValue({
          name: data.name,
          description: data.description,
          category: data.category,
          year: data.year,
          kilometers: data.kilometers,
          price: data.price,
        });
      }
    });

    this.route.queryParams.subscribe(params => {
      if (params['reset']) {
        this.resetForm();
      }
    });
  }

  ngOnDestroy() {
    if (this.publishCarSubscription) {
      this.publishCarSubscription.unsubscribe();
    }
  }

  resetForm() {
    this.formGroup.reset();
    this.store.dispatch(updatePublishCar({ data: this.formGroup.value }));
    if (this.visualSelector) {
      this.visualSelector.resetImages();
    }
  }

  async onSubmit() {
    if (this.formGroup.valid) {
      const formData = this.formGroup.value;
      this.store.dispatch(updatePublishCar({ data: formData }));

      this.router.navigate(['/features/cars/publish/step-2']);
    }
  }

  get images(): string[] {
    return this.visualSelector ? this.visualSelector.images : [];
  }

  setModalOpen(isOpen: boolean, imageIndex: number | null = null): void {
    this.isModalOpen = isOpen;
    this.currentImageIndex = imageIndex;
    this.imageToDelete = imageIndex !== null ? this.images[imageIndex] : null;
  }

  async deleteImage(): Promise<void> {
    if (this.currentImageIndex !== null) {
      const alert = await this.alertController.create({
        header: this.translate.instant('publish_car.delete_image_confirmation.header'),
        message: this.translate.instant('publish_car.delete_image_confirmation.message'),
        buttons: [
          {
            text: this.translate.instant('common.cancel'),
            role: 'cancel',
            cssClass: 'secondary',
            handler: () => {
              this.setModalOpen(false);
            }
          },
          {
            text: this.translate.instant('common.delete'),
            handler: () => {
              if (this.imageToDelete) {
                this.visualSelector?.removeImage(this.imageToDelete);
              }
              this.setModalOpen(false);
            }
          }
        ]
      });

      await alert.present();
    }
  }

  async uploadNewImage(event: any): Promise<void> {
    const file = event.target.files[0];
    if (file) {
      try {
        const imageUrl = await this.imageUploadService.uploadImage(file);
        this.visualSelector?.addImage(imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
      }
    }
  }

  async generateImageWithAI(): Promise<void> {
    this.visualSelector?.generateImageWithAI();
  }
}
