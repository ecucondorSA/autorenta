import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '../../../../store/app.state';
import { PublishCarActions } from '../../../../store/publish-car/publish-car.actions';
import { Observable, Subject, takeUntil } from 'rxjs';
import { PublishCar } from '../../../../core/interfaces/publish-car.interface';
import { publishCarSelector } from '../../../../store/publish-car/publish-car.selector';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { distinctUntilChanged } from 'rxjs/operators';
import { CarService } from '../../services/car.service';
import { VisualSelectorComponent } from './components/visual-selector/visual-selector.component';
import { HoverLiftDirective } from '../../../../shared/directives/hover-lift.directive';
import { AiPhotoGeneratorComponent } from '../../../../shared/components/ai-photo-generator/ai-photo-generator.component';
import { BookingDetailPayment } from '@core/models/booking-detail-payment.model';
import { RiskSnapshot } from '../../../../core/models/risk-snapshot.model';
import { CoreActions } from '../../../../core/store/core.actions';

@Component({
  selector: 'app-publish-car-v2',
  templateUrl: './publish-car-v2.page.html',
  styleUrls: ['./publish-car-v2.page.scss'],
  providers: [MessageService],
})
export class PublishCarV2Page implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  @ViewChild(VisualSelectorComponent) visualSelector!: VisualSelectorComponent;

  private destroy$ = new Subject<void>();
  publishCarForm: FormGroup;
  publishCarData$: Observable<PublishCar | null>;
  isLoading$: Observable<boolean>;
  isPublishing$: Observable<boolean>;
  isAiLoading = false;
  isMobile = false;
  images: string[] = [];
  currentImageIndex = 0;
  showModal = false;
  generatedImage = '';

  constructor(
    private fb: FormBuilder,
    private store: Store<AppState>,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
    private carService: CarService
  ) {
    this.publishCarData$ = this.store.select(publishCarSelector.selectPublishCar);
    this.isLoading$ = this.store.select(publishCarSelector.selectIsLoading);
    this.isPublishing$ = this.store.select(publishCarSelector.selectIsPublishing);

    this.publishCarForm = this.fb.group({
      description: ['', Validators.required],
      price: [null, [Validators.required, Validators.min(1)]],
      kilometers: [null, [Validators.required, Validators.min(0)]],
      year: [null, [Validators.required, Validators.min(1900)]],
      fuelType: ['', Validators.required],
      transmission: ['', Validators.required],
      bodyType: ['', Validators.required],
      // Add more fields as needed
    });
  }

  ngOnInit(): void {
    this.store.dispatch(PublishCarActions.loadPublishCar());

    this.publishCarData$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
      if (data) {
        this.publishCarForm.patchValue({
          description: data.description,
          price: data.price,
          kilometers: data.kilometers,
          year: data.year,
          fuelType: data.fuelType,
          transmission: data.transmission,
          bodyType: data.bodyType,
        });
        this.images = data.images;
      }
    });

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      if (params['success'] === 'true') {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Car published successfully',
        });
      }
    });

    this.carService.isMobile.pipe(takeUntil(this.destroy$)).subscribe((isMobile) => {
      this.isMobile = isMobile;
    });
  }

  ngAfterViewInit(): void {
    this.route.fragment.pipe(distinctUntilChanged()).subscribe((fragment) => {
      if (fragment) {
        document.querySelector('#' + fragment)?.scrollIntoView();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.publishCarForm.valid) {
      const publishCar: PublishCar = {
        ...this.publishCarForm.value,
        images: this.images,
      };

      this.store.dispatch(PublishCarActions.publishCar({ publishCar }));

      this.isPublishing$.pipe(takeUntil(this.destroy$)).subscribe((isPublishing) => {
        if (!isPublishing) {
          this.router.navigate(['/']).then(() => {
            this.store.dispatch(CoreActions.displayToast({ severity: 'success', summary: 'Success', detail: 'Car published successfully' }));
          });
        }
      });
    } else {
      this.publishCarForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill all required fields',
      });
    }
  }

  onImageChange(images: string[]): void {
    this.images = images;
  }

  scrollToSection(sectionId: string): void {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  generateAiImage(prompt: string): void {
    this.isAiLoading = true;
    this.carService
      .generateImage(prompt)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (image) => {
          this.isAiLoading = false;
          this.generatedImage = image.data;
          this.showModal = true;
        },
        error: () => {
          this.isAiLoading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error generating image. Please try again.',
          });
        },
      });
  }

  addImageToList(): void {
    this.images = [...this.images, this.generatedImage];
    this.showModal = false;
  }
}
