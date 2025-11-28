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

interface MercadoPagoSDK {
  cardForm: (options: CardFormOptions) => CardFormInstance;
}

interface CardFormInstance {
  unmount: () => void;
  createCardToken: () => void;
}

interface CardFormOptions {
  amount: string;
  iframe: boolean;
  autoMount: boolean;
  form: {
    id: string;
    cardNumber: { id: string; placeholder: string };
    expirationDate: { id: string; placeholder: string };
    securityCode: { id: string; placeholder: string };
    cardholderName: { id: string; placeholder: string };
    identificationType: { id: string; placeholder: string };
    identificationNumber: { id: string; placeholder: string };
    installments: { id: string; placeholder: string };
    issuer: { id: string; placeholder: string };
  };
  callbacks: {
    onFormMounted: (error: unknown) => void;
    onSubmit: (event: Event) => void;
    onFetching: (resource: string) => void;
    onError: (errors: unknown) => void;
    onCardTokenReceived: (error: unknown, token: CardToken | null) => void;
  };
}

interface CardToken {
  id: string;
  last_four_digits?: string;
  first_six_digits?: string;
}

@Component({
  selector: 'app-mercadopago-card-form',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="mp-card-form-container">
      <h3 class="text-lg font-semibold mb-4">Información de Pago</h3>

      <form id="form-checkout">
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2">Número de Tarjeta</label>
          <div id="form-checkout__cardNumber" class="mp-input"></div>
        </div>

        <div class="grid grid-cols-1 xs:grid-cols-2 gap-4 mb-4">
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
            class="w-full px-3 py-2 border border-border-muted rounded-md text-base"
            placeholder="NOMBRE APELLIDO"
          />
        </div>

        <div class="grid grid-cols-1 xs:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Tipo de Documento</label>
            <select
              id="form-checkout__identificationType"
              name="identificationType"
              class="w-full px-3 py-2 border border-border-muted rounded-md text-base"
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
              class="w-full px-3 py-2 border border-border-muted rounded-md text-base"
              placeholder="12345678"
            />
          </div>
        </div>

        <div class="hidden">
          <select id="form-checkout__installments" name="installments"></select>
          <select id="form-checkout__issuer" name="issuer"></select>
        </div>

        <button
          type="submit"
          [disabled]="isSubmitting()"
          class="w-full bg-primary-600 text-text-inverse py-3 rounded-md font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
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

      @if (errorMessage()) {
        <div class="mt-4 p-3 bg-error-bg border border-error-border rounded-md">
          <p class="text-sm text-error-strong">{{ errorMessage() }}</p>
        </div>
      }

      <div class="mt-4 p-3 bg-cta-default/10 border border-cta-default/40 rounded-md">
        <p class="text-xs text-cta-default">
          🔒 Tus datos están protegidos por Mercado Pago. No guardamos información sensible de tu
          tarjeta.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .mp-card-form-container {
        max-width: min(500px, 100%);
        margin: 0 auto;
        padding: 0 1rem;
      }

      @media (min-width: 640px) {
        .mp-card-form-container {
          padding: 0;
        }
      }

      .mp-input {
        height: 48px;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        padding: 0.5rem 0.75rem;
        font-size: 16px; /* Prevent iOS zoom */
      }

      .mp-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
      }

      /* Ensure MercadoPago iframes are responsive */
      .mp-input iframe {
        width: 100% !important;
        min-height: 100% !important;
      }
    `,
  ],
})
export class MercadopagoCardFormComponent implements OnInit, OnDestroy {
  @Input() amountArs = 0;
  @Output() cardTokenGenerated = new EventEmitter<{ cardToken: string; last4: string }>();
  @Output() cardError = new EventEmitter<string>();

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private cardForm: CardFormInstance | null = null;
  private mp: MercadoPagoSDK | null = null;
  private mpScriptService = inject(MercadoPagoScriptService);

  ngOnInit(): void {
    // Ensure DOM is ready before initializing
    if (typeof document !== 'undefined' && document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.initializeMercadoPago();
      });
    } else {
      // DOM is already ready
      setTimeout(() => {
        this.initializeMercadoPago();
      }, 0);
    }
  }

  ngOnDestroy(): void {
    if (this.cardForm) {
      this.cardForm.unmount();
    }
  }

  private async initializeMercadoPago(): Promise<void> {
    try {
      const globalEnv = (globalThis as Record<string, unknown>).__env as
        | Record<string, unknown>
        | undefined;
      const windowEnvKey = String(globalEnv?.NG_APP_MERCADOPAGO_PUBLIC_KEY ?? '').trim();

      const envRecord = environment as Record<string, unknown>;
      const buildEnvKey = String(
        envRecord.mercadopagoPublicKey ?? envRecord.mercadoPagoPublicKey ?? '',
      ).trim();
      const runtimeEnvKey = windowEnvKey || buildEnvKey;

      if (!runtimeEnvKey.length) {
        this.errorMessage.set('No pudimos inicializar Mercado Pago. Intenta nuevamente más tarde.');
        return;
      }

      // Wait a bit to ensure DOM is ready
      await new Promise((resolve) => setTimeout(resolve, 100));

      const mpInstance = await this.mpScriptService.getMercadoPago(runtimeEnvKey);

      if (!mpInstance) {
        throw new Error('MercadoPago instance is null or undefined');
      }

      this.mp = mpInstance as unknown as MercadoPagoSDK;

      // Validate that cardForm method exists
      if (!this.mp || typeof this.mp.cardForm !== 'function') {
        throw new Error('MercadoPago cardForm method is not available');
      }

      const normalizedAmount = this.amountArs > 0 ? Math.ceil(this.amountArs) : 1;

      // Ensure form element exists before creating CardForm
      const formElement = document.getElementById('form-checkout');
      if (!formElement) {
        throw new Error('Form element with id "form-checkout" not found in DOM');
      }

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
          onFormMounted: (error: unknown) => {
            if (error) {
              const errorMsg = this.extractErrorMessage(error) || 'Error al cargar el formulario';
              this.errorMessage.set(errorMsg);
              this.cardError.emit(errorMsg);
            }
          },
          onSubmit: (event: Event) => {
            try {
              event.preventDefault();
              if (!this.cardForm || typeof this.cardForm.createCardToken !== 'function') {
                throw new Error('CardForm no está inicializado correctamente');
              }
              this.isSubmitting.set(true);
              this.cardForm.createCardToken();
            } catch (err) {
              this.isSubmitting.set(false);
              const errorMsg =
                err instanceof Error ? err.message : 'Error al procesar el formulario';
              this.errorMessage.set(errorMsg);
              this.cardError.emit(errorMsg);
            }
          },
          onFetching: (_resource: string) => {
            this.isSubmitting.set(true);
          },
          onError: (errors: unknown) => {
            this.isSubmitting.set(false);
            this.handleMercadoPagoErrors(errors);
          },
          onCardTokenReceived: (error: unknown, token: CardToken | null) => {
            this.isSubmitting.set(false);

            if (error) {
              this.handleMercadoPagoErrors(error);
              return;
            }

            if (!token?.id) {
              const errorMsg = 'No se pudo generar el token de la tarjeta';
              this.errorMessage.set(errorMsg);
              this.cardError.emit(errorMsg);
              return;
            }

            this.cardTokenGenerated.emit({
              cardToken: token.id,
              last4: token.last_four_digits ?? 'XXXX',
            });
          },
        },
      });

      if (!this.cardForm) {
        throw new Error('CardForm no se creó correctamente');
      }
    } catch (error) {
      const errorDetails = error instanceof Error ? error.message : String(error);
      const userMessage = `No pudimos cargar Mercado Pago: ${errorDetails}. Intenta recargar la página.`;
      this.errorMessage.set(userMessage);
      this.cardError.emit('Error al inicializar Mercado Pago');
    }
  }

  private extractErrorMessage(error: unknown): string | null {
    if (typeof error === 'string') {
      return error.trim() || null;
    }
    if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      return (
        (errorObj.message as string) ||
        (errorObj.description as string) ||
        (errorObj.error as string) ||
        null
      );
    }
    return null;
  }

  private handleMercadoPagoErrors(error: unknown): void {
    let message = 'No pudimos procesar tu tarjeta. Intenta nuevamente.';

    if (typeof error === 'string') {
      message = error.trim() || message;
    } else if (Array.isArray(error)) {
      const extracted = error
        .map((err: unknown) => {
          const errorRecord = err as Record<string, unknown>;
          return String(
            errorRecord?.message || errorRecord?.description || errorRecord?.cause || '',
          );
        })
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
