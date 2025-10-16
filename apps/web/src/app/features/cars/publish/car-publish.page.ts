import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarsService } from '../../../core/services/cars.service';
import { UploadImageComponent } from '../../../shared/components/upload-image/upload-image.component';

@Component({
  standalone: true,
  selector: 'app-car-publish-page',
  imports: [CommonModule, UploadImageComponent],
  templateUrl: './car-publish.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarPublishPage {
  readonly title = signal('');
  readonly description = signal('');
  readonly city = signal('');
  readonly state = signal('');
  readonly price = signal(0);
  readonly transmission = signal<'manual' | 'automatic'>('manual');
  readonly seats = signal(4);
  readonly loading = signal(false);
  readonly message = signal<string | null>(null);

  constructor(private readonly carsService: CarsService) {}

  async submit(): Promise<void> {
    this.loading.set(true);
    this.message.set(null);
    try {
      const car = await this.carsService.createCar({
        title: this.title(),
        description: this.description(),
        location_city: this.city(),
        location_state: this.state(),
        daily_price: this.price(),
        transmission: this.transmission(),
        seats: this.seats(),
        status: 'pending',
      } as any);
      this.message.set('Auto enviado para revisión. ID: ' + car.id);
    } catch (err) {
      console.error(err);
      this.message.set('No pudimos publicar el auto.');
    } finally {
      this.loading.set(false);
    }
  }

  async onFilesSelected(files: FileList): Promise<void> {
    const carId = this.message()?.split('ID: ')[1];
    if (!carId) return;
    for (const file of Array.from(files)) {
      await this.carsService.uploadPhoto(file, carId);
    }
  }
}
