import { Component, Input, Output, EventEmitter, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ContractsService, BookingContract } from '../../../core/services/contracts.service';
import { SupabaseClientService } from '../../../core/services/supabase-client.service';

/**
 * Contract Sign Modal Component
 *
 * Modal para revisar y firmar (aceptar) el contrato de un booking
 * Muestra:
 * - Términos y condiciones
 * - Checkbox de aceptación
 * - Botón de firma
 */
@Component({
  selector: 'app-contract-sign-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="modal-overlay" (click)="onClose()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <!-- Header -->
        <div class="modal-header">
          <h2 class="modal-title">Contrato de Alquiler</h2>
          <button type="button" class="close-button" (click)="onClose()">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Body -->
        <div class="modal-body">
          <!-- Loading State -->
          <div *ngIf="loading()" class="loading-state">
            <div class="spinner"></div>
            <p>Cargando contrato...</p>
          </div>

          <!-- Error State -->
          <div *ngIf="error()" class="alert alert-error">
            <svg class="alert-icon" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            {{ error() }}
          </div>

          <!-- Contract Content -->
          <div *ngIf="!loading() && !error() && contract()" class="contract-content">
            <!-- Contract Info -->
            <div class="contract-info">
              <div class="info-row">
                <span class="info-label">Booking ID:</span>
                <span class="info-value">{{ bookingId.substring(0, 8) }}...</span>
              </div>
              <div class="info-row">
                <span class="info-label">Versión de Términos:</span>
                <span class="info-value">{{ contract()!.terms_version }}</span>
              </div>
              <div class="info-row" *ngIf="contract()!.accepted_at">
                <span class="info-label">Aceptado el:</span>
                <span class="info-value">{{ contract()!.accepted_at | date:'dd/MM/yyyy HH:mm' }}</span>
              </div>
            </div>

            <!-- Terms Content -->
            <div class="terms-container">
              <h3 class="terms-title">Términos y Condiciones</h3>
              <div class="terms-content">
                <h4>1. Objeto del Contrato</h4>
                <p>
                  El presente contrato tiene por objeto regular el alquiler del vehículo identificado en el booking,
                  estableciendo los derechos y obligaciones de ambas partes.
                </p>

                <h4>2. Responsabilidad del Locatario</h4>
                <p>
                  El locatario se compromete a:
                </p>
                <ul>
                  <li>Usar el vehículo de manera responsable y conforme a su uso habitual</li>
                  <li>Mantener el vehículo en buen estado durante el período de alquiler</li>
                  <li>Devolver el vehículo en las mismas condiciones en que lo recibió</li>
                  <li>Reportar cualquier daño o incidente de manera inmediata</li>
                  <li>No ceder ni transferir el vehículo a terceros sin autorización</li>
                </ul>

                <h4>3. Seguro y Cobertura</h4>
                <p>
                  El vehículo cuenta con cobertura de seguro según lo establecido en las políticas de AutoRenta.
                  El locatario es responsable por:
                </p>
                <ul>
                  <li>Daños intencionales o por negligencia grave</li>
                  <li>Multas y sanciones de tránsito</li>
                  <li>Franquicia en caso de siniestros cubiertos por el Fondo de Garantía</li>
                </ul>

                <h4>4. Inspección del Vehículo</h4>
                <p>
                  Al inicio (check-in) y final (check-out) del alquiler se realizará una inspección completa
                  del vehículo con registro fotográfico. Cualquier daño nuevo será responsabilidad del locatario.
                </p>

                <h4>5. Política de Cancelación</h4>
                <p>
                  Las cancelaciones están sujetas a las políticas publicadas en la plataforma al momento
                  de realizar la reserva. Los reembolsos se procesarán según corresponda.
                </p>

                <h4>6. Resolución de Disputas</h4>
                <p>
                  Cualquier disputa relacionada con este contrato será resuelta según el proceso de
                  mediación establecido por AutoRenta. En caso de no llegar a un acuerdo, las partes
                  podrán recurrir a la justicia ordinaria.
                </p>

                <h4>7. Protección de Datos</h4>
                <p>
                  Los datos personales serán tratados conforme a nuestra Política de Privacidad y
                  la Ley de Protección de Datos Personales vigente.
                </p>

                <h4>8. Aceptación</h4>
                <p>
                  Al firmar este contrato digitalmente, el locatario declara haber leído y aceptado
                  todos los términos y condiciones establecidos.
                </p>
              </div>
            </div>

            <!-- Already Accepted Notice -->
            <div *ngIf="contract()!.accepted_by_renter" class="notice notice-success">
              <svg class="notice-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <span>Ya aceptaste este contrato el {{ contract()!.accepted_at | date:'dd/MM/yyyy HH:mm' }}</span>
            </div>

            <!-- Acceptance Section -->
            <div *ngIf="!contract()!.accepted_by_renter" class="acceptance-section">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  [(ngModel)]="termsAccepted"
                  [disabled]="signing()"
                />
                <span>He leído y acepto todos los términos y condiciones del contrato</span>
              </label>

              <button
                type="button"
                class="btn-primary"
                (click)="signContract()"
                [disabled]="!termsAccepted || signing()"
              >
                <svg *ngIf="!signing()" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div *ngIf="signing()" class="spinner-small"></div>
                {{ signing() ? 'Firmando...' : 'Firmar Contrato' }}
              </button>

              <p class="acceptance-hint">
                Al firmar este contrato, aceptas estar vinculado legalmente por estos términos
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      background: white;
      border-radius: 0.75rem;
      max-width: 800px;
      width: 100%;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .modal-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #111827;
    }

    .close-button {
      padding: 0.5rem;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 0.375rem;
      transition: all 0.2s;
    }

    .close-button:hover {
      background: #f3f4f6;
      color: #111827;
    }

    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 1.5rem;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem;
    }

    .spinner {
      width: 3rem;
      height: 3rem;
      border: 3px solid #e5e7eb;
      border-top-color: #2563eb;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .alert {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 1rem;
    }

    .alert-error {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #991b1b;
    }

    .alert-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .contract-content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .contract-info {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
    }

    .info-label {
      color: #6b7280;
      font-weight: 500;
    }

    .info-value {
      color: #111827;
      font-weight: 600;
    }

    .terms-container {
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
      overflow: hidden;
    }

    .terms-title {
      background: #f9fafb;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      font-size: 1.125rem;
      font-weight: 600;
      color: #111827;
    }

    .terms-content {
      padding: 1.5rem;
      max-height: 400px;
      overflow-y: auto;
      font-size: 0.875rem;
      line-height: 1.6;
      color: #374151;
    }

    .terms-content h4 {
      font-size: 1rem;
      font-weight: 600;
      color: #111827;
      margin-top: 1.5rem;
      margin-bottom: 0.75rem;
    }

    .terms-content h4:first-child {
      margin-top: 0;
    }

    .terms-content p {
      margin-bottom: 0.75rem;
    }

    .terms-content ul {
      list-style: disc;
      padding-left: 1.5rem;
      margin-bottom: 0.75rem;
    }

    .terms-content li {
      margin-bottom: 0.5rem;
    }

    .notice {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      border-radius: 0.5rem;
    }

    .notice-success {
      background: #d1fae5;
      border: 1px solid #a7f3d0;
      color: #065f46;
    }

    .notice-icon {
      width: 1.25rem;
      height: 1.25rem;
      flex-shrink: 0;
    }

    .acceptance-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1.5rem;
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 0.5rem;
    }

    .checkbox-label {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      cursor: pointer;
      font-size: 0.875rem;
      color: #374151;
    }

    .checkbox-label input[type="checkbox"] {
      width: 1.25rem;
      height: 1.25rem;
      margin-top: 0.125rem;
      cursor: pointer;
    }

    .btn-primary {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.875rem 1.5rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      background: #1e40af;
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .spinner-small {
      width: 1.25rem;
      height: 1.25rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .acceptance-hint {
      font-size: 0.75rem;
      color: #6b7280;
      text-align: center;
    }

    @media (max-width: 640px) {
      .modal-overlay {
        padding: 0;
      }

      .modal-content {
        max-width: 100%;
        max-height: 100vh;
        border-radius: 0;
      }

      .terms-content {
        max-height: 300px;
      }
    }
  `],
})
export class ContractSignModalComponent implements OnInit {
  @Input() bookingId!: string;
  @Output() close = new EventEmitter<void>();
  @Output() signed = new EventEmitter<void>();

  private readonly contractsService = inject(ContractsService);
  private readonly supabase = inject(SupabaseClientService);

  readonly loading = signal(false);
  readonly signing = signal(false);
  readonly error = signal<string | null>(null);
  readonly contract = signal<BookingContract | null>(null);
  termsAccepted = false;

  async ngOnInit(): Promise<void> {
    await this.loadContract();
  }

  async loadContract(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const contract = await this.contractsService.getContractByBooking(this.bookingId);

      if (!contract) {
        // Create contract if it doesn't exist
        const newContract = await this.contractsService.prepareContract({
          bookingId: this.bookingId,
          termsVersion: '1.0',
        });
        this.contract.set(newContract);
      } else {
        this.contract.set(contract);
      }
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error al cargar el contrato'
      );
    } finally {
      this.loading.set(false);
    }
  }

  async signContract(): Promise<void> {
    const contract = this.contract();
    if (!contract || !this.termsAccepted) return;

    this.signing.set(true);
    this.error.set(null);

    try {
      await this.contractsService.acceptContract(contract.id);
      this.signed.emit();
      this.onClose();
    } catch (err) {
      this.error.set(
        err instanceof Error ? err.message : 'Error al firmar el contrato'
      );
    } finally {
      this.signing.set(false);
    }
  }

  onClose(): void {
    if (!this.signing()) {
      this.close.emit();
    }
  }
}
