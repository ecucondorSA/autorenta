import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TrafficInfractionsService } from '../../../core/services/traffic-infractions.service';
import { TrafficInfraction } from '../../../features/admin/traffic-infractions/admin-traffic-infractions.page'; // Re-use the interface
import { Booking } from '../../../core/models'; // To get owner_id, renter_id, booking_id
// TODO: Create a generic EvidenceUploader component that can be reused
// import { EvidenceUploaderComponent } from '../../../features/disputes/components/evidence-uploader/evidence-uploader.component';

@Component({
  selector: 'app-report-traffic-fine',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './report-traffic-fine.component.html',
  styleUrls: ['./report-traffic-fine.component.scss'],
})
export class ReportTrafficFineComponent implements OnInit {
  @Input({ required: true }) isOpen!: boolean;
  @Input({ required: true }) booking!: Booking;
  @Output() closeModal = new EventEmitter<void>();
  @Output() fineReported = new EventEmitter<TrafficInfraction>();

  private readonly trafficInfractionsService = inject(TrafficInfractionsService);

  readonly loading = signal(false);
  readonly formError = signal<string | null>(null);

  // Form fields
  infractionDate = signal<string>('');
  amount = signal<number | null>(null);
  description = signal<string>('');
  evidenceUrls = signal<string[]>([]); // To be populated by EvidenceUploader

  ngOnInit(): void {
    // Set default infraction date to today
    this.infractionDate.set(new Date().toISOString().split('T')[0]);
  }

  onEvidenceUploaded(urls: string[]): void {
    this.evidenceUrls.set(urls);
  }

  async onSubmit(): Promise<void> {
    this.formError.set(null);
    if (!this.infractionDate() || !this.amount() || !this.description()) {
      this.formError.set('Todos los campos obligatorios deben ser completados.');
      return;
    }
    if (this.amount()! <= 0) {
      this.formError.set('El monto de la multa debe ser mayor a cero.');
      return;
    }

    this.loading.set(true);
    try {
      const newFine: Partial<TrafficInfraction> = {
        booking_id: this.booking.id,
        owner_id: this.booking.owner_id, // Assuming booking has owner_id
        renter_id: this.booking.renter_id,
        infraction_date: this.infractionDate(),
        amount_cents: Math.round(this.amount()! * 100), // Store in cents
        currency: this.booking.currency || 'ARS', // Use booking currency or default
        description: this.description(),
        evidence_urls: this.evidenceUrls(),
      };

      const reportedFine = await this.trafficInfractionsService.createInfraction(newFine);
      this.fineReported.emit(reportedFine);
      this.closeModal.emit();
    } catch (error) {
      console.error('Error reporting traffic fine:', error);
      this.formError.set(error instanceof Error ? error.message : 'Error al reportar multa.');
    } finally {
      this.loading.set(false);
    }
  }

  onCancel(): void {
    this.closeModal.emit();
  }
}
