import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController, IonicModule, LoadingController, ModalController, NavController } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBack, close, helpCircleOutline, locationOutline, pricetagOutline } from 'ionicons/icons';
import { AiPhotoGeneratorComponent } from '../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { CarPublish } from '@core/models/car-publish.model';
import { Car } from '@core/models';
import { Category } from '@core/models/category.model';
import { City } from '@core/models/city.model';
import { Color } from '@core/models/color.model';
import { Model } from '@core/models/model.model';
import { Option } from '@core/models/option.model';
import { Province } from '@core/models/province.model';
import { Transmission } from '@core/models/transmission.model';
import { User } from '@core/models/user.model';
import { VisualCar } from '@core/models/visual-car.model';
import { AuthService } from '@core/services/auth/auth.service';
import { CarService } from '@core/services/car/car.service';
import { CategoryService } from '@core/services/category/category.service';
import { CityService } from '@core/services/city/city.service';
import { ColorService } from '@core/services/color/color.service';
import { ImageService } from '@core/services/image/image.service';
import { ModelService } from '@core/services/model/model.service';
import { OptionService } from '@core/services/option/option.service';
import { ProvinceService } from '@core/services/province/province.service';
import { ToastService } from '@core/services/toast/toast.service';
import { TransmissionService } from '@core/services/transmission/transmission.service';
import { UserService } from '@core/services/user/user.service';
import { VisualCarService } from '@core/services/visual-car/visual-car.service';
import { environment } from 'src/environments/environment';
import { HoverLiftDirective } from '../../../shared/directives/hover-lift.directive';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { Booking } from '@core/models';
import { RiskSnapshot } from '@core/models';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, ReactiveFormsModule, VisualSelectorComponent, HoverLiftDirective, AiPhotoGeneratorComponent],
})
export class PublishCarV2Page implements OnInit {
  //public props
  images: string[] = [];
