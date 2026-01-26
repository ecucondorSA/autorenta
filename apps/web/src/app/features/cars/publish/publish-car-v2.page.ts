import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicSlides, ModalController, NavController } from '@ionic/angular';
import { Store } from '@ngrx/store';
import { Observable, Subscription, combineLatest, map, of, switchMap, take, tap } from 'rxjs';

import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { CarPublishDetails } from '@core/models/car-publish-details.model';
import { CarService } from '@core/services/car.service';
import { CategoryService } from '@core/services/category.service';
import { UiService } from '@core/services/ui/ui.service';
import { environment } from 'src/environments/environment';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { setPublishedCar } from '@store/car-publish/car-publish.actions';
import { AsyncPipe } from '@angular/common';
import { CarPublishState } from '@store/car-publish/car-publish.reducer';
import { selectCarPublish } from '@store/car-publish/car-publish.selectors';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { ImageUploadComponent } from '../../../shared/components/image-upload/image-upload.component';
import { MainHeaderComponent } from '../../../shared/components/main-header/main-header.component';
import { MileagePipe } from '../../../shared/pipes/mileage.pipe';
import { PhotoSliderComponent } from '../../../shared/components/photo-slider/photo-slider.component';
import { PlausibleService } from '@core/services/plausible.service';
import { PricePipe } from '../../../shared/pipes/price.pipe';
import { routes } from 'src/app/app.routes';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { CarPublishEffects } from '@store/car-publish/car-publish.effects';
import { carPublishReducer } from '@store/car-publish/car-publish.reducer';
import { GeolocationService } from '@core/services/geolocation.service';
import { addIcons } from 'ionicons';
import { camera, close, cloudUpload, location, warning } from 'ionicons/icons';
import { IonicModule } from '@ionic/angular/standalone';


import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { BookingProcessService } from '@core/services/booking-process.service';
import { CoreModule } from '@core/core.module';
import { MapComponent } from '../../../shared/components/map/map.component';
import { MapModalComponent } from '../../../shared/components/map-modal/map-modal.component';
import { RouterLink } from '@angular/router';
import { routes as appRoutes } from 'src/app/app.routes';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule, ReactiveFormsModule, MainHeaderComponent, ImageUploadComponent, HoverLiftDirective, VisualSelectorComponent, PhotoSliderComponent, MileagePipe, PricePipe, AsyncPipe, RouterLink, MapComponent, TranslateModule],
})
export class PublishCarV2Page implements OnInit {
  // carForm: FormGroup;
  @ViewChild('slider') slider: IonicSlides;
  public environment = environment;
  public routes = routes;
  public appRoutes = appRoutes;

  constructor(
    private fb: FormBuilder,
    private carService: CarService,
    private categoryService: CategoryService,
    private uiService: UiService,
    private store: Store<CarPublishState>,
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    private modalController: ModalController,
    private plausibleService: PlausibleService,
    private bookingProcessService: BookingProcessService,
    private alertController: AlertController,    
    private translate: TranslateService
  ) {
    addIcons({
      close,
      camera,
      cloudUpload,
      location,
      warning,
    });
  }

  ngOnInit() {
   
  }
}
