import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { BookingsService } from '../../../core/services/bookings.service';
import { Booking } from '../../../core/models';

@Component({
  selector: 'app-booking-success',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './booking-success.page.html',
  styleUrls: ['./booking-success.page.scss']
})
export class BookingSuccessPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bookingsService = inject(BookingsService);

  readonly bookingId = signal<string>('');
  readonly booking = signal<Booking | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      console.error('No booking ID provided');
      this.router.navigate(['/']);
      return;
    }

    this.bookingId.set(id);
    this.loadBooking(id);
  }

  private async loadBooking(id: string): Promise<void> {
    try {
      const booking = await this.bookingsService.getBookingById(id);
      if (!booking) {
        throw new Error('Reserva no encontrada');
      }
      this.booking.set(booking);
    } catch (err: any) {
      console.error('Error loading booking:', err);
      this.error.set(err.message || 'Error al cargar la reserva');
    } finally {
      this.loading.set(false);
    }
  }

  getCarName(): string {
    const booking = this.booking();
    if (!booking) return 'Vehículo';
    
    // Booking no tiene car directamente, solo car_id
    // Se necesitaría cargar el car por separado
    return 'Vehículo';
  }

  getCarImage(): string {
    // Booking no tiene car directamente
    return '/assets/images/car-placeholder.png';
  }
}
