
import {Component, inject, OnInit, signal,
  ChangeDetectionStrategy} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Booking } from '../../../core/models';
import { BookingsService } from '@core/services/bookings/bookings.service';
import { BookingContract, ContractsService } from '@core/services/bookings/contracts.service';

@Component({
  selector: 'app-contracts-management',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonicModule, RouterModule],
  templateUrl: './contracts-management.page.html',
  styleUrls: ['./contracts-management.page.scss'],
})
export class ContractsManagementPage implements OnInit {
  private readonly contractsService = inject(ContractsService);
  private readonly bookingsService = inject(BookingsService);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly contracts = signal<Array<BookingContract & { booking?: Booking }>>([]);
  readonly selectedBookingId = signal<string | null>(null);
  readonly showCreateModal = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);

  readonly newContract = signal({
    bookingId: '',
    termsVersion: '1.0',
    pdfUrl: '',
  });

  async ngOnInit(): Promise<void> {
    const bookingId = this.route.snapshot.queryParams['bookingId'];
    if (bookingId) {
      this.selectedBookingId.set(bookingId);
      await this.loadContractForBooking(bookingId);
    } else {
      await this.loadAllContracts();
    }
  }

  async loadAllContracts(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Obtener todos los bookings con contratos
      const { bookings } = await this.bookingsService.getMyBookings();
      if (!bookings) {
        this.contracts.set([]);
        return;
      }

      const contractsWithBookings = await Promise.all(
        bookings.map(async (booking: Booking) => {
          try {
            const contract = await this.contractsService.getContractByBooking(booking.id);
            return contract ? { ...contract, booking: booking || undefined } : null;
          } catch {
            return null;
          }
        }),
      );

      this.contracts.set(
        contractsWithBookings.filter((c) => c !== null) as Array<
          BookingContract & { booking?: Booking }
        >,
      );
    } catch (err) {
      console.error('Error loading contracts:', err);
      this.error.set('Error al cargar contratos');
    } finally {
      this.loading.set(false);
    }
  }

  async loadContractForBooking(bookingId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const contract = await this.contractsService.getContractByBooking(bookingId);
      if (contract) {
        const booking = await this.bookingsService.getBookingById(bookingId);
        this.contracts.set([{ ...contract, booking: booking || undefined }]);
      } else {
        this.contracts.set([]);
      }
    } catch (err) {
      console.error('Error loading contract:', err);
      this.error.set('Error al cargar contrato');
    } finally {
      this.loading.set(false);
    }
  }

  openCreateModal(): void {
    this.showCreateModal.set(true);
    this.newContract.set({
      bookingId: this.selectedBookingId() || '',
      termsVersion: '1.0',
      pdfUrl: '',
    });
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.newContract.set({
      bookingId: '',
      termsVersion: '1.0',
      pdfUrl: '',
    });
  }

  async createContract(): Promise<void> {
    if (!this.newContract().bookingId) {
      this.error.set('ID de booking es requerido');
      return;
    }

    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      const contract = await this.contractsService.prepareContract({
        bookingId: this.newContract().bookingId,
        termsVersion: this.newContract().termsVersion,
        pdfUrl: this.newContract().pdfUrl || undefined,
      });

      this.success.set(`Contrato creado exitosamente: ${contract.id}`);
      this.closeCreateModal();
      await this.loadContractForBooking(contract.booking_id);
    } catch (err) {
      console.error('Error creating contract:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al crear contrato');
    } finally {
      this.loading.set(false);
    }
  }

  async acceptContract(contractId: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.success.set(null);

    try {
      await this.contractsService.acceptContract(contractId);
      this.success.set('Contrato aceptado exitosamente');
      await this.loadAllContracts();
    } catch (err) {
      console.error('Error accepting contract:', err);
      this.error.set(err instanceof Error ? err.message : 'Error al aceptar contrato');
    } finally {
      this.loading.set(false);
    }
  }

  getStatusBadgeColor(status: boolean): string {
    return status ? 'success' : 'warning';
  }

  formatDate(date: string | null): string {
    if (!date) return 'No aceptado';
    return new Date(date).toLocaleDateString('es-AR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
