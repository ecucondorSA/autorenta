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
            class="w-full px-3 py-2 border border-border-subtle rounded-md"
            placeholder="NOMBRE APELLIDO"
          />
        </div>

        <div class="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium mb-2">Tipo de Documento</label>
            <select
              id="form-checkout__identificationType"
              name="identificationType"
              class="w-full px-3 py-2 border border-border-subtle rounded-md"
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
              class="w-full px-3 py-2 border border-border-subtle rounded-md"
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
        <div class="mt-4 p-3 bg-error-50 border border-error-200 rounded-md">
          <p class="text-sm text-error-700">{{ errorMessage() }}</p>
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
  @Output() cardTokenGenerated = new EventEmitter<{ cardToken: string; last4: string }>();
  @Output() cardError = new EventEmitter<string>();

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private cardForm: CardFormInstance | null = null;
  private mp: MercadoPagoSDK | null = null;
  private mpScriptService = inject(MercadoPagoScriptService);

  ngOnInit(): void {
    this.initializeMercadoPago();
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

      console.log(
        'Mercado Pago public key resolved (masked):',
        runtimeEnvKey ? `${runtimeEnvKey.slice(0, 8)}…` : '(empty)',
      );

      const mpInstance = await this.mpScriptService.getMercadoPago(runtimeEnvKey);
      this.mp = mpInstance as unknown as MercadoPagoSDK;

      const normalizedAmount = this.amountArs > 0 ? Math.ceil(this.amountArs) : 1;

      console.log('💳 Inicializando CardForm con amount:', normalizedAmount);

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
              console.error('❌ Error al montar CardForm:', error);
              this.errorMessage.set('Error al cargar el formulario');
              this.cardError.emit('Error al cargar el formulario');
            } else {
              console.log('✅ CardForm montado correctamente');
            }
          },
          onSubmit: (event: Event) => {
            event.preventDefault();
            this.isSubmitting.set(true);
            this.cardForm?.createCardToken();
          },
          onFetching: (resource: string) => {
            console.log('🔄 Fetching resource:', resource);
            this.isSubmitting.set(true);
          },
          onError: (errors: unknown) => {
            console.error('❌ CardForm onError:', errors);
            this.isSubmitting.set(false);
            this.handleMercadoPagoErrors(errors);
          },
          onCardTokenReceived: (error: unknown, token: CardToken | null) => {
            this.isSubmitting.set(false);

            if (error) {
              console.error('❌ Error recibiendo card token:', error);
              this.handleMercadoPagoErrors(error);
              return;
            }

            if (!token?.id) {
              this.errorMessage.set('No se pudo generar el token de la tarjeta');
              this.cardError.emit('No se pudo generar el token de la tarjeta');
              return;
            }

            console.log('✅ Card token recibido:', {
              id: token.id,
              last4: token.last_four_digits,
            });

            this.cardTokenGenerated.emit({
              cardToken: token.id,
              last4: token.last_four_digits ?? 'XXXX',
            });
          },
        },
      });
    } catch (_error) {
      console.error('❌ Error fatal inicializando Mercado Pago:', _error);
      this.errorMessage.set('No pudimos cargar Mercado Pago. Intenta recargar la página.');
      this.cardError.emit('Error al inicializar Mercado Pago');
    }
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
