import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { CarsService } from '@core/services/cars.service';
import { AuthService } from '@core/services/auth.service';
import { UploadImageComponent } from '@shared/components/upload-image/upload-image.component';
import type { FuelType, Transmission, CarStatus } from '@core/types/database.types';

@Component({
  selector: 'autorenta-publish-car-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, UploadImageComponent],
  templateUrl: './publish-car.page.html',
  styleUrl: './publish-car.page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublishCarPage {
  private readonly fb = inject(FormBuilder);
  private readonly carsService = inject(CarsService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20)]],
    brand: ['', Validators.required],
    model: ['', Validators.required],
    year: [new Date().getFullYear(), [Validators.required, Validators.min(1990)]],
    price_per_day: [0, [Validators.required, Validators.min(0)]],
    daily_price: [0, [Validators.required, Validators.min(0)]],
    location_city: ['', Validators.required],
    location_state: ['', Validators.required],
    location_province: ['', Validators.required],
    seats: [4, [Validators.required, Validators.min(2)]],
    transmission: ['automatic' as Transmission, Validators.required],
    fuel_type: ['nafta' as FuelType, Validators.required],
    mileage: [0, [Validators.required, Validators.min(0)]],
    status: ['draft' as CarStatus],
  });

  private readonly uploadingSignal = signal(false);
  private readonly selectedFilesSignal = signal<File[]>([]);
  readonly submitting = computed(() => this.uploadingSignal());
  readonly hasFiles = computed(() => this.selectedFilesSignal().length > 0);

  onFilesSelected(fileList: FileList): void {
    this.selectedFilesSignal.set(Array.from(fileList));
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const session = this.authService.session$();
    if (!session?.user) {
      console.error('Usuario no autenticado para publicar auto');
      return;
    }

    this.uploadingSignal.set(true);
    try {
      const car = await this.carsService.createCar(this.form.getRawValue());

      const files = this.selectedFilesSignal();
      for (const file of files) {
        try {
          await this.carsService.uploadPhoto(file, car.id);
        } catch (error) {
          console.error('No se pudo subir una de las fotos', error);
        }
      }

      await this.router.navigate(['/cars/mine'], {
        queryParams: { published: 'true' },
      });
    } catch (error) {
      console.error('No se pudo publicar el auto', error);
    } finally {
      this.uploadingSignal.set(false);
    }
  }
}
