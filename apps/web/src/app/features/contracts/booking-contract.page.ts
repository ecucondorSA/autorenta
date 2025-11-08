import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ContractsService, BookingContract } from '../../core/services/contracts.service';
import { SupabaseClientService } from '../../core/services/supabase-client.service';
import { ContractPdfViewerComponent } from './components/contract-pdf-viewer.component';

interface Booking {
  id: string;
  car_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
}

/**
 * Booking Contract Page
 *
 * Página para ver el contrato de un booking
 * - Muestra información del contrato
 * - Permite ver/descargar PDF si existe
 * - Muestra estado de aceptación
 */
@Component({
  selector: 'app-booking-contract-page',
  standalone: true,
  imports: [CommonModule, RouterLink, ContractPdfViewerComponent],
  templateUrl: './booking-contract.page.html',
  styleUrls: ['./booking-contract.page.css'],
})
export class BookingContractPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly contractsService = inject(ContractsService);
  private readonly supabase = inject(SupabaseClientService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly contract = signal<BookingContract | null>(null);
  readonly booking = signal<Booking | null>(null);
  readonly bookingId = signal<string>('');

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('ID de booking inválido');
      return;
    }

    this.bookingId.set(id);
    await this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load booking
      const { data: bookingData, error: bookingError } = await this.supabase
        .getClient()
        .from('bookings')
        .select('*')
        .eq('id', this.bookingId())
        .single();

      if (bookingError) throw bookingError;
      this.booking.set(bookingData as Booking);

      // Load contract
      const contract = await this.contractsService.getContractByBooking(this.bookingId());

      if (!contract) {
        this.error.set('No se encontró el contrato para este booking');
        return;
      }

      this.contract.set(contract);
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error al cargar el contrato'
      );
    } finally {
      this.loading.set(false);
    }
  }

  getStatusText(accepted: boolean): string {
    return accepted ? 'Aceptado' : 'Pendiente de Firma';
  }

  getStatusClass(accepted: boolean): string {
    return accepted ? 'status-accepted' : 'status-pending';
  }

  async downloadContract(): Promise<void> {
    const contract = this.contract();
    if (!contract?.pdf_url) {
      alert('No hay PDF disponible para descargar');
      return;
    }

    // Open PDF in new tab
    window.open(contract.pdf_url, '_blank');
  }
}
