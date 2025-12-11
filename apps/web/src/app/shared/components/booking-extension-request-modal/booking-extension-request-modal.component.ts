import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Booking } from '../../../core/models'; // Assuming Booking model is available
import { BookingsService } from '../../../core/services/bookings.service'; // To get estimated cost

@Component({
  selector: 'app-booking-extension-request-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './booking-extension-request-modal.component.html',
  styleUrls: ['./booking-extension-request-modal.component.scss'],
})
export class BookingExtensionRequestModalComponent implements OnInit {
  @Input({ required: true }) isOpen!: boolean;
  @Input({ required: true }) booking!: Booking;
  @Output() closeModal = new EventEmitter<void>();
  @Output() requestExtension = new EventEmitter<{ newEndDate: Date; estimatedCost: number }>();

  private readonly bookingsService = inject(BookingsService);

  newEndDateStr = signal('');
  minDate = signal('');
  maxDate = signal('');
  estimatedCost = signal<number | null>(null);
  loadingCost = signal(false);
  error = signal<string | null>(null);

  ngOnInit(): void {
    // Set minDate to one day after current booking end date
    const currentEndDate = new Date(this.booking.end_at);
    currentEndDate.setDate(currentEndDate.getDate() + 1);
    this.minDate.set(currentEndDate.toISOString().split('T')[0]);

    // Set maxDate (e.g., 30 days from minDate, or based on car availability)
    const maxPossibleDate = new Date(currentEndDate);
    maxPossibleDate.setDate(maxPossibleDate.getDate() + 30); // Allow up to 30 days extension
    this.maxDate.set(maxPossibleDate.toISOString().split('T')[0]);

    this.newEndDateStr.set(this.minDate()); // Default to minDate
    void this.getEstimatedCost(); // Calculate initial estimated cost
  }

  async onDateChange(event: any): Promise<void> {
    const selectedDate = event.detail.value;
    this.newEndDateStr.set(selectedDate.split('T')[0]);
    await this.getEstimatedCost();
  }

  async getEstimatedCost(): Promise<void> {
    const newEndDate = new Date(this.newEndDateStr());
    if (isNaN(newEndDate.getTime()) || newEndDate <= new Date(this.booking.end_at)) {
      this.estimatedCost.set(null);
      this.error.set('La fecha debe ser posterior a la actual.');
      return;
    }

    this.loadingCost.set(true);
    this.error.set(null);
    try {
      // Assuming a service method exists to estimate cost
      // This will need to be implemented or adjusted based on backend capabilities
      const cost = await this.bookingsService.estimateExtensionCost(
        this.booking.id,
        newEndDate
      );
      this.estimatedCost.set(cost.amount); // Assuming result has an amount
      if (cost.error) {
          this.error.set(cost.error);
      }
    } catch (err) {
      this.error.set('Error al calcular el costo estimado.');
      console.error('Error estimating extension cost:', err);
      this.estimatedCost.set(null);
    } finally {
      this.loadingCost.set(false);
    }
  }

  request(): void {
    const newEndDate = new Date(this.newEndDateStr());
    if (isNaN(newEndDate.getTime()) || !this.estimatedCost()) {
      this.error.set('Por favor, selecciona una fecha válida y espera el cálculo del costo.');
      return;
    }
    this.requestExtension.emit({ newEndDate, estimatedCost: this.estimatedCost()! });
  }
}
