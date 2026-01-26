import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, LoadingController, ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Observable, Subscription, combineLatest, from, lastValueFrom } from 'rxjs';
import { filter, first, map, switchMap, take, tap } from 'rxjs/operators';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { CarPublishSuccessModalComponent } from './components/car-publish-success-modal/car-publish-success-modal.component';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';

import { addIcons } from 'ionicons';
import { cloudUploadOutline, imageOutline, addOutline, closeCircleOutline, trashOutline, informationCircleOutline, warningOutline } from 'ionicons/icons';

import { AppState } from '../../../../core/store';
import { selectPublishCar } from '../../../../core/store/publish-car/publish-car.selectors';
import { resetPublishCar, setCategory, setCondition, setImages, setLocation, setModel, setPrice } from '../../../../core/store/publish-car/publish-car.actions';
import { Category } from '@core/models/category.model';
import { Condition } from '@core/models/condition.model';
import { ImageUpload } from '@core/models/image-upload.model';
import { Location } from '@core/models/location.model';
import { Model } from '@core/models/model.model';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { publishCarSteps } from './publish-car-v2.steps';
import { environment } from 'src/environments/environment';
import { CarService } from '@core/services/car.service';
import { ToastService } from '@core/services/ui/toast.service';
import { PhotoService } from '@core/services/photo.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, TranslateModule, AiPhotoGeneratorComponent, VisualSelectorComponent, HoverLiftDirective]
})
export class PublishCarV2Page implements OnInit {
  // ... (rest of the code)
}

addIcons({
  cloudUploadOutline,
  imageOutline,
  addOutline,
  closeCircleOutline,
  trashOutline,
  informationCircleOutline,
  warningOutline
});