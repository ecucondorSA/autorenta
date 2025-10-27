import {
  Component,
  OnInit,
  OnDestroy,
  Output,
  EventEmitter,
  signal,
  inject,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '@environment';
import { MercadoPagoScriptService } from '../../../core/services/mercado-pago-script.service';

type MercadoPagoCardFormData = {
  token?: string;
  cardNumber?: string;
  lastFourDigits?: string;
  [key: string]: unknown;
};

/**
 * Componente para capturar datos de tarjeta usando Mercado Pago CardForm
 *
 * Este componente usa el SDK oficial de Mercado Pago que:
 * - Valida automáticamente los datos de la tarjeta
 * - Genera un cardToken sin exponer datos sensibles
 * - Es PCI compliant (cumple con estándares de seguridad)
 * - Tiene estilos personalizables
 *
 * Uso:
 * <app-mercadopago-card-form
 *   (cardTokenGenerated)="onCardToken($event)"
 *   (cardError)="onError($event)">
 * </app-mercadopago-card-form>
 */
@Component({
  selector: 'app-mercadopago-card-form',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mp-card-form-container">
      <!-- Título -->
      <h3 class="text-lg font-semibold mb-4">Información de Pago</h3>

      <!-- Formulario de Mercado Pago (se renderiza aquí) -->
      <form id="form-checkout">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Número de Tarjeta</label>
          <div id="form-checkout__cardNumber" class="mp-input"></div>
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Vencimiento</label>
            <div id="form-checkout__expirationDate" class="mp-input"></div>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">CVV</label>
            <div id="form-checkout__securityCode" class="mp-input"></div>
          </div>
        </div>

        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Titular de la Tarjeta</label>
          <input
            id="form-checkout__cardholderName"
            name="cardholderName"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md"
            placeholder="NOMBRE APELLIDO"
          />
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Tipo de Documento</label>
            <select
              id="form-checkout__identificationType"
              name="identificationType"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Seleccionar...</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Número de Documento</label>
            <input
              id="form-checkout__identificationNumber"
              name="identificationNumber"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="12345678"
            />
          </div>
        </div>

        <!-- Hidden fields required by MercadoPago SDK -->
        <div class="hidden">
          <select id="form-checkout__installments" name="installments"></select>
          <select id="form-checkout__issuer" name="issuer"></select>
        </div>

        <!-- Botón de Submit -->
        <button
          type="submit"
          [disabled]="isSubmitting()"
          class="w-full bg-primary-600 text-white py-3 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          @if (isSubmitting()) {
            <span class="flex items-center justify-center">
              <svg class="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Autorizando...
            </span>
          } @else {
            Autorizar Tarjeta
          }
        </button>
      </form>

      <!-- Mensaje de error -->
      @if (errorMessage()) {
        <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p class="text-sm text-red-700">{{ errorMessage() }}</p>
        </div>
      }

      <!-- Información de seguridad -->
      <div class="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
        <p class="text-xs text-blue-700">
          🔒 Tus datos están protegidos por Mercado Pago. No guardamos información sensible de tu
          tarjeta.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .mp-card-form-container {
        max-width: 500px;
        margin: 0 auto;
      }

      .mp-input {
        height: 42px;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        padding: 0.5rem 0.75rem;
      }

      .mp-input:focus {
        outline: none;
        border-color: #3b82f6;
        ring: 2px;
        ring-color: #3b82f64d;
      }
    `,
  ],
})
export class MercadopagoCardFormComponent implements OnInit, OnDestroy {
  @Input() amountArs = 0;
  // Eventos
  @Output() cardTokenGenerated = new EventEmitter<{ cardToken: string; last4: string }>();
  @Output() cardError = new EventEmitter<string>();

  // State
  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private cardForm: any;
  private mp: any;
  private mpScriptService = inject(MercadoPagoScriptService);

  ngOnInit(): void {
    this.initializeMercadoPago();
  }

  ngOnDestroy(): void {
    // Cleanup si es necesario
    if (this.cardForm) {
      this.cardForm.unmount();
    }
  }

  /**
   * Inicializa el SDK de Mercado Pago y el CardForm
   */
  private async initializeMercadoPago(): Promise<void> {
    console.log('Initializing Mercado Pago CardForm...'); // Added log
    try {
      const windowEnvKey = String(
        (globalThis as any)?.__env?.NG_APP_MERCADOPAGO_PUBLIC_KEY ?? '',
      ).trim();
      const buildEnvKey = String(
        (environment as any)?.mercadopagoPublicKey ??
          (environment as any)?.mercadoPagoPublicKey ??
          '',
      ).trim();
      const runtimeEnvKey = windowEnvKey || buildEnvKey;

      if (!runtimeEnvKey.length) {
        console.error('Mercado Pago public key is not configured in the environment.');
        this.errorMessage.set('No pudimos inicializar Mercado Pago. Intenta nuevamente más tarde.');
        return;
      }

      console.log(
        'Mercado Pago public key resolved (masked):',
        runtimeEnvKey ? `${runtimeEnvKey.slice(0, 8)}…` : '(empty)',
      );

      this.mp = await this.mpScriptService.getMercadoPago(runtimeEnvKey);

      // Crear CardForm
      const normalizedAmount = this.amountArs > 0 ? Math.ceil(this.amountArs) : 1;

      console.log('MercadopagoCardForm amountArs', this.amountArs, 'normalized', normalizedAmount);

      this.cardForm = this.mp.cardForm({
        amount: normalizedAmount.toString(),
        iframe: true,
        autoMount: true,
        form: {
          id: 'form-checkout',
          cardNumber: {
            id: 'form-checkout__cardNumber',
            placeholder: '0000 0000 0000 0000',
          },
          expirationDate: {
            id: 'form-checkout__expirationDate',
            placeholder: 'MM/YY',
          },
          securityCode: {
            id: 'form-checkout__securityCode',
            placeholder: '123',
          },
          cardholderName: {
            id: 'form-checkout__cardholderName',
            placeholder: 'TITULAR DE LA TARJETA',
          },
          identificationType: {
            id: 'form-checkout__identificationType',
            placeholder: 'Tipo de documento',
          },
          identificationNumber: {
            id: 'form-checkout__identificationNumber',
            placeholder: 'Número de documento',
          },
          installments: {
            id: 'form-checkout__installments',
            placeholder: 'Cuotas',
          },
          issuer: {
            id: 'form-checkout__issuer',
            placeholder: 'Banco emisor',
          },
        },
        callbacks: {
          onFormMounted: (error: any) => {
            console.log('onFormMounted callback triggered. Error:', error); // Added log
            if (error) {
              console.error('Error mounting form:', error);
              this.errorMessage.set('Error al cargar el formulario');
              this.cardError.emit('Error al cargar el formulario');
            } else {
              console.log('Form mounted successfully');
            }
          },
          onSubmit: (event: Event) => {
            event.preventDefault();
            this.isSubmitting.set(true);
            this.cardForm.createCardToken();
          },
          onFetching: (resource: string) => {
            console.log('Fetching resource:', resource);
            this.isSubmitting.set(true);
          },
          onError: (errors: unknown) => {
            console.error('Mercado Pago form error:', errors);
            console.error('Full error details:', JSON.stringify(errors, null, 2));
            this.isSubmitting.set(false);

            let message = 'Error desconocido con Mercado Pago';

            if (Array.isArray(errors)) {
              // Log each error for debugging
              errors.forEach((err: any, idx: number) => {
                console.error(`Error ${idx + 1}:`, {
                  message: err?.message,
                  description: err?.description,
                  cause: err?.cause,
                  code: err?.code,
                  field: err?.field,
                });
              });

              message = errors
                .map((err: any) => {
                  const field = err?.field || '';
                  const msg = err?.message || err?.description || err?.cause || '';
                  return field ? `${field}: ${msg}` : msg;
                })
                .filter(Boolean)
                .join('\n');
            } else if (typeof errors === 'string') {
              message = errors;
            } else if (errors && typeof errors === 'object') {
              message = JSON.stringify(errors);
            }

            this.errorMessage.set(message || 'Error desconocido con Mercado Pago');
            this.cardError.emit(message);
          },
          onCardTokenReceived: (error: any, token: any) => {
            this.isSubmitting.set(false);
            if (error) {
              console.error('Card token error:', error);
              this.handleMercadoPagoErrors(error);
              return;
            }

            if (!token?.id) {
              console.error('Token payload missing id:', token);
              this.handleMercadoPagoErrors('Token no generado');
              return;
            }

            const last4 = token?.last_four_digits ?? token?.first_six_digits?.slice(-4) ?? '****';
            console.log('Card token received via callback:', token.id);
            this.cardTokenGenerated.emit({
              cardToken: token.id,
              last4,
            });
          },
        },
      });
    } catch (err) {
      console.error('MP initialization error:', err);
      console.error('MP error type:', typeof err);
      console.error('MP error stringified:', JSON.stringify(err, null, 2));

      let message = 'Error al inicializar Mercado Pago';

      if (Array.isArray(err)) {
        console.error('MP Error is an array with', err.length, 'items:');
        err.forEach((e, i) => {
          console.error(`Error ${i}:`, e);
        });
        message = err.map((e: any) => e?.message || e?.description || JSON.stringify(e)).join('; ');
      } else if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }

      this.errorMessage.set(message);
      this.cardError.emit(message);
    }
  }

  /**
   * Normaliza los errores provenientes del SDK de Mercado Pago y los comunica al UI.
   */
  private handleMercadoPagoErrors(error: unknown): void {
    console.error('Handle MercadoPago error:', error);

    let message = 'No pudimos procesar tu tarjeta. Intenta nuevamente.';

    if (typeof error === 'string') {
      message = error.trim() || message;
    } else if (Array.isArray(error)) {
      const extracted = error
        .map((err: any) => err?.message || err?.description || err?.cause || '')
        .filter(Boolean)
        .join(' | ');
      message = extracted || message;
    } else if (error && typeof error === 'object') {
      const maybeMessage =
        (error as { message?: string }).message ||
        (error as { description?: string }).description ||
        (error as { cause?: string | string[] }).cause;

      if (Array.isArray(maybeMessage)) {
        message = maybeMessage.filter(Boolean).join(' | ') || message;
      } else if (typeof maybeMessage === 'string' && maybeMessage.trim()) {
        message = maybeMessage.trim();
      } else {
        try {
          message = JSON.stringify(error);
        } catch {
          // message se mantiene con el fallback
        }
      }
    }

    this.errorMessage.set(message);
    this.cardError.emit(message);
  }
}
