import { CommonModule } from '@angular/common';
import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ContractsService, BookingContract } from '@core/services/bookings/contracts.service';
import { NotificationManagerService } from '@core/services/infrastructure/notification-manager.service';

@Component({
  selector: 'app-booking-contract',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="space-y-4">
      @if (loading()) {
        <div class="flex items-center justify-center py-6">
          <div class="w-6 h-6 border-2 border-cta-default border-t-transparent rounded-full animate-spin"></div>
        </div>
      } @else if (error()) {
        <div class="p-4 rounded-lg bg-error-bg text-error-strong">
          <p class="text-sm font-medium">Error al cargar contrato</p>
          <p class="text-xs mt-1">{{ error() }}</p>
        </div>
      } @else if (contract(); as c) {
        <!-- Contrato existente -->
        <div class="flex items-center justify-between p-3 rounded-lg bg-surface-secondary">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center"
                 [class.bg-success-light/20]="c.accepted_by_renter"
                 [class.bg-warning-bg]="!c.accepted_by_renter">
              <svg class="w-5 h-5"
                   [class.text-success-strong]="c.accepted_by_renter"
                   [class.text-warning-strong]="!c.accepted_by_renter"
                   fill="none" stroke="currentColor" viewBox="0 0 24 24">
                @if (c.accepted_by_renter) {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                } @else {
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                }
              </svg>
            </div>
            <div>
              <p class="text-sm font-medium text-text-primary">
                {{ c.accepted_by_renter ? 'Contrato Firmado' : 'Pendiente de Firma' }}
              </p>
              <p class="text-xs text-text-secondary">
                v{{ c.terms_version }} · {{ c.created_at | date: 'dd/MM/yyyy' }}
              </p>
            </div>
          </div>
          <span
            class="px-2.5 py-1 rounded-full text-xs font-medium"
            [class.bg-success-light/20]="c.accepted_by_renter"
            [class.text-success-strong]="c.accepted_by_renter"
            [class.bg-warning-bg]="!c.accepted_by_renter"
            [class.text-warning-strong]="!c.accepted_by_renter">
            {{ c.accepted_by_renter ? 'Vigente' : 'Pendiente' }}
          </span>
        </div>

        @if (!c.accepted_by_renter) {
          <button
            (click)="acceptContract()"
            [disabled]="accepting()"
            class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cta-default hover:bg-cta-hover text-cta-text rounded-xl transition-colors text-sm font-medium disabled:opacity-50">
            @if (accepting()) {
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Confirmando...</span>
            } @else {
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Firmar Contrato</span>
            }
          </button>
        }
      } @else {
        <!-- Sin contrato - Aviso legal importante -->
        <div class="p-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
              <svg class="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="flex-1">
              <p class="text-sm font-semibold text-slate-800">Contrato de Comodato</p>
              <p class="text-xs text-slate-600 mt-0.5">Préstamo de uso gratuito (Art. 1533 CCyC)</p>
            </div>
          </div>

          <div class="mt-3 pt-3 border-t border-slate-200 space-y-2">
            <p class="text-xs text-slate-700 leading-relaxed">
              Al firmar este contrato, <strong>ambas partes declaran y aceptan</strong> que:
            </p>
            <ul class="text-xs text-slate-600 space-y-1.5 ml-1">
              <li class="flex items-start gap-2">
                <span class="text-slate-400 mt-0.5">•</span>
                <span>Esta es una relación de <strong>préstamo de uso gratuito</strong> entre particulares, NO un servicio comercial de alquiler.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-slate-400 mt-0.5">•</span>
                <span>Conforme al <strong>Art. 1536 CCyC</strong>, el comodatario asume los <strong>gastos ordinarios</strong> derivados del uso (desgaste, mantenimiento, combustible).</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-slate-400 mt-0.5">•</span>
                <span>Los montos abonados constituyen <strong>reembolso de gastos</strong>, NO un precio por el derecho de uso.</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-slate-400 mt-0.5">•</span>
                <span>Cada parte es responsable de verificar y mantener vigente su propia cobertura de seguro.</span>
              </li>
            </ul>
          </div>

          <div class="mt-3 p-2.5 rounded-lg bg-blue-50 border border-blue-200">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs text-blue-800 leading-relaxed">
                <strong>Base Legal:</strong> El comodato es gratuito en cuanto al derecho de uso (Art. 1533 CCyC). Los gastos ordinarios son obligación del comodatario (Art. 1536 CCyC) y no alteran la naturaleza gratuita del contrato.
              </p>
            </div>
          </div>

          <div class="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
            <div class="flex items-start gap-2">
              <svg class="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p class="text-xs text-amber-800 leading-relaxed">
                <strong>Aviso:</strong> El uso incorrecto de terminología ("alquiler comercial") en pólizas de "uso particular" puede resultar en rechazo de cobertura ante siniestros.
              </p>
            </div>
          </div>
        </div>
      }

      <!-- Botón de descarga siempre visible -->
      <button
        (click)="downloadPdf()"
        [disabled]="downloading()"
        class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface-secondary hover:bg-surface-hover text-text-primary rounded-xl transition-colors text-sm font-medium disabled:opacity-50">
        @if (downloading()) {
          <div class="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin"></div>
          <span>Generando PDF...</span>
        } @else {
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Descargar Contrato PDF</span>
        }
      </button>
    </div>
  `,
})
export class BookingContractComponent implements OnInit {
  @Input({ required: true }) bookingId!: string;
  @Output() downloadRequested = new EventEmitter<void>();

  private readonly contractsService = inject(ContractsService);
  private readonly toastService = inject(NotificationManagerService);

  readonly contract = signal<BookingContract | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly accepting = signal(false);
  readonly downloading = signal(false);

  async ngOnInit(): Promise<void> {
    await this.loadContract();
  }

  async loadContract(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const contract = await this.contractsService.getContractByBooking(this.bookingId);
      this.contract.set(contract);
    } catch {
      // Sin contrato es estado válido, no es error
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
      this.toastService.success('Contrato Firmado', 'El contrato ha sido aceptado correctamente');
    } catch (err) {
      this.toastService.error(
        'Error',
        err instanceof Error ? err.message : 'Error al aceptar el contrato',
      );
    } finally {
      this.accepting.set(false);
    }
  }

  downloadPdf(): void {
    this.downloadRequested.emit();
  }

  setDownloading(value: boolean): void {
    this.downloading.set(value);
  }
}
