import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { ContractsService, BookingContract } from '../../../core/services/contracts.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-booking-contract',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-lg border border-border-default bg-surface-raised p-6 shadow-sm">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-lg font-semibold text-text-primary">Contrato de Alquiler</h3>
        @if (contract(); as c) {
          <span
            class="rounded-full px-3 py-1 text-sm font-medium"
            [class.bg-success-light/20]="c.accepted_by_renter"
            [class.text-success-light]="c.accepted_by_renter"
            [class.bg-warning-bg-hover]="!c.accepted_by_renter"
            [class.text-warning-strong]="!c.accepted_by_renter"
          >
            {{ c.accepted_by_renter ? 'Aceptado' : 'Pendiente' }}
          </span>
        }
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <div
            class="h-8 w-8 animate-spin rounded-full border-4 border-cta-default border-t-transparent"
          ></div>
        </div>
      } @else if (error()) {
        <div class="rounded-lg bg-error-bg p-4 text-error-strong">
          <p class="font-medium">Error al cargar el contrato</p>
          <p class="text-sm">{{ error() }}</p>
        </div>
      } @else if (contract(); as c) {
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <p class="text-sm font-medium text-text-secondary">Versión de Términos</p>
              <p class="text-base text-text-primary">{{ c.terms_version }}</p>
            </div>
            <div>
              <p class="text-sm font-medium text-text-secondary">Fecha de Creación</p>
              <p class="text-base text-text-primary">{{ c.created_at | date: 'short' }}</p>
            </div>
            @if (c.accepted_at) {
              <div>
                <p class="text-sm font-medium text-text-secondary">Fecha de Aceptación</p>
                <p class="text-base text-text-primary">{{ c.accepted_at | date: 'short' }}</p>
              </div>
            }
          </div>

          @if (c.pdf_url) {
            <div>
              <a
                [href]="c.pdf_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-2 rounded-lg bg-cta-default text-cta-text hover:bg-cta-default"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Ver Contrato PDF
              </a>
            </div>
          }

          @if (!c.accepted_by_renter) {
            <div class="rounded-lg bg-warning-bg p-4">
              <p class="mb-3 text-sm text-warning-strong">
                Por favor, lee y acepta el contrato para continuar con la reserva.
              </p>
              <button
                (click)="acceptContract()"
                [disabled]="accepting()"
                class="rounded-lg bg-warning-600 px-4 py-2 text-sm font-medium text-text-inverse hover:bg-warning-700 disabled:opacity-50"
              >
                @if (accepting()) {
                  <span class="flex items-center gap-2">
                    <span
                      class="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                    ></span>
                    Aceptando...
                  </span>
                } @else {
                  Aceptar Contrato
                }
              </button>
            </div>
          }
        </div>
      } @else {
        <div class="rounded-lg bg-surface-base p-4 text-center text-text-secondary">
          <p>No hay contrato disponible para esta reserva.</p>
        </div>
      }
    </div>
  `,
})
export class BookingContractComponent implements OnInit {
  @Input({ required: true }) bookingId!: string;

  private readonly contractsService = inject(ContractsService);
  private readonly toastService = inject(ToastService);

  readonly contract = signal<BookingContract | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly accepting = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadContract();
  }

  async loadContract(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const contract = await this.contractsService.getContractByBooking(this.bookingId);
      this.contract.set(contract);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      this.loading.set(false);
    }
  }

  async acceptContract(): Promise<void> {
    const contract = this.contract();
    if (!contract) return;

    this.accepting.set(true);

    try {
      await this.contractsService.acceptContract(contract.id);
      await this.loadContract();
      this.toastService.success('Éxito', 'Contrato aceptado correctamente');
    } catch (err) {
      this.toastService.error(
        'Error',
        err instanceof Error ? err.message : 'Error al aceptar el contrato',
      );
    } finally {
      this.accepting.set(false);
    }
  }
}
