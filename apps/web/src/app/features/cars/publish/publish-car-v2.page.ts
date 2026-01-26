import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, map, of, switchMap, take, tap } from 'rxjs';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { AppState } from '../../../../app.state';
import { CarPublishFormV2Component } from './components/car-publish-form-v2/car-publish-form-v2.component';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { selectPublishCar } from '../../../../core/store/publish-car/publish-car.selector';
import { updatePublishCar } from '../../../../core/store/publish-car/publish-car.actions';
import { PublishCarRequest } from '../../../../core/interfaces/publish-car-request';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, imageOutline } from 'ionicons/icons';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { Car } from '@core/models';
import { environment } from '../../../../../environments/environment';
import { CoreModule } from '../../../../core/core.module';
import { DomSanitizer } from '@angular/platform-browser';
import { CarService } from '@core/services/car.service';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, CarPublishFormV2Component, VisualSelectorComponent, HoverLiftDirective, AiPhotoGeneratorComponent, CoreModule],
})
export class PublishCarV2Page implements OnInit {
  @ViewChild(CarPublishFormV2Component) carPublishForm!: CarPublishFormV2Component;

  isModalOpen = false;
  images: string[] = [];
  environment = environment;
  carId: string | null = null;
  loading$: Observable<boolean> = of(false);

  constructor(
    private store: Store<AppState>,
    private router: Router,
    private route: ActivatedRoute,
    private alertController: AlertController,
    private sanitizer: DomSanitizer,
    private carService: CarService
  ) {
    addIcons({
      imageOutline,
      cloudUploadOutline,
    });
  }

  ngOnInit() {
    this.carId = this.route.snapshot.paramMap.get('carId');

    if (this.carId) {
      this.loading$ = of(true);
      this.carService.getCar(this.carId).pipe(
        take(1),
        tap((car: Car) => {
          this.store.dispatch(updatePublishCar({ publishCar: car as PublishCarRequest }));
          this.loading$ = of(false);
        })
      ).subscribe();
    }
  }

  setOpen(isOpen: boolean) {
    this.isModalOpen = isOpen;
  }

  async publishCar() {
    if (this.carPublishForm.form.invalid) {
      this.carPublishForm.form.markAllAsTouched();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Confirm!',
      message: 'Are you sure you want to publish this car?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          cssClass: 'secondary',
          id: 'cancel-button',
          handler: () => {
            console.log('Confirm Cancel');
          }
        },
        {
          text: 'Okay',
          id: 'confirm-button',
          handler: () => {
            this.store.select(selectPublishCar).pipe(
              take(1),
              switchMap((publishCar) => {
                if (!publishCar) {
                  return of(null);
                }

                const images = this.images.map((image) => {
                  return image.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
                });

                const request: PublishCarRequest = {
                  ...publishCar,
                  images: images,
                };

                if (this.carId) {
                  return this.carService.updateCar(this.carId, request).pipe(
                    tap(() => {
                      this.router.navigate(['/cars', this.carId]);
                    })
                  );
                }

                return this.carService.publishCar(request).pipe(
                  tap((car) => {
                    this.router.navigate(['/cars', car.id]);
                  })
                );
              })
            ).subscribe();
          }
        }
      ]
    });

    await alert.present();
  }

  getBase64Image(img: any): Observable<string> {
    return new Observable((observer) => {
      const reader = new FileReader();
      reader.onload = () => {
        observer.next(reader.result as string);
        observer.complete();
      };
      reader.onerror = (error) => {
        observer.error(error);
      };
      reader.readAsDataURL(img);
    });
  }

  onFilesSelected(event: any): void {
    const files: FileList = event.target.files;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      this.getBase64Image(file).pipe(
        take(1),
        tap((base64Image) => {
          this.images = [...this.images, base64Image];
        })
      ).subscribe();
    }
  }

  removeImage(image: string) {
    this.images = this.images.filter((img) => img !== image);
  }

  trustSrc(image: string) {
    return this.sanitizer.bypassSecurityTrustResourceUrl(image);
  }
}
