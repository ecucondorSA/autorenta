import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Booking } from '../../../core/models';
import { EvidenceUploaderComponent } from '../evidence-uploader/evidence-uploader.component';

@Component({
  selector: 'app-report-renter-no-show',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, IonicModule, EvidenceUploaderComponent],
  templateUrl: './report-renter-no-show.component.html',
  styleUrls: ['./report-renter-no-show.component.scss'],
})
export class ReportRenterNoShowComponent {
  @Input({ required: true }) isOpen!: boolean;
  @Input({ required: true }) booking!: Booking;
  @Output() closeModal = new EventEmitter<void>();
  @Output() noShowReported = new EventEmitter<{ success: boolean; message?: string }>();

  private readonly bookingsService = inject(BookingsService);
  private readonly logger = inject(LoggerService);

  readonly loading = signal(false);
  readonly formError = signal<string | null>(null);

  // Form fields
  details = signal<string>('');
  evidenceUrls = signal<string[]>([]); // To be populated by EvidenceUploader

  onEvidenceUploaded(urls: string[]): void {
    this.evidenceUrls.set(urls);
  }

  async onSubmit(): Promise<void> {
    this.formError.set(null);
    if (!this.details().trim()) {
      this.formError.set('Por favor, describe los detalles de la no-presentación.');
      return;
    }

    this.loading.set(true);
    try {
      const result = await this.bookingsService.reportRenterNoShow(
        this.booking.id,
        this.details(),
        this.evidenceUrls(),
      );
      this.noShowReported.emit(result);
      this.closeModal.emit();
    } catch (error) {
      this.logger.error('Error reporting renter no-show', 'ReportRenterNoShowComponent', error);
      this.formError.set(error instanceof Error ? error.message : 'Error al reportar no-show.');
    } finally {
      this.loading.set(false);
    }
  }

  onCancel(): void {
    this.closeModal.emit();
  }
}
