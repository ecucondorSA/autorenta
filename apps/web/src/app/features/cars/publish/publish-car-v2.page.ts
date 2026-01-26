import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, LoadingController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, combineLatest, map, of, switchMap, take, tap } from 'rxjs';
import { addIcons } from 'ionicons';
import { camera, close, cloudUpload, image, trash } from 'ionicons/icons';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { CarPublishForm } from '@core/models/car-publish-form.model';
import { CarService } from '@core/services/car.service';
import { Category } from '@core/models/category.model';
import { CategoryService } from '@core/services/category.service';
import { City } from '@core/models/city.model';
import { CityService } from '@core/services/city.service';
import { Color } from '@core/models/color.model';
import { ColorService } from '@core/services/color.service';
import { Feature } from '@core/models/feature.model';
import { FeatureService } from '@core/services/feature.service';
import { FileUploadService } from '@core/services/file-upload.service';
import { Model } from '@core/models/model.model';
import { ModelService } from '@core/services/model.service';
import { Region } from '@core/models/region.model';
import { RegionService } from '@core/services/region.service';
import { ToastService } from '@core/services/toast.service';
import { VisualCarService } from '@core/services/visual-car.service';
import { AppState } from '@store/app.state';
import { selectPublishCar } from '@store/publish-car/publish-car.selector';
import { setPublishCar } from '@store/publish-car/publish-car.actions';
import { environment } from 'src/environments/environment';
import { UploadImageResponse } from '@core/models/upload-image-response.model';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { BookingDetail } from '@core/models/booking-detail.model';
import { Booking } from '@core/models/booking.model';
import { RiskSnapshot } from '@core/models/risk-snapshot.model';
import { CoreModule } from 'src/app/core/core.module';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, VisualSelectorComponent, HoverLiftDirective, AiPhotoGeneratorComponent, CoreModule],
})
export class PublishCarV2Page implements OnInit {
  // ... component logic
}
