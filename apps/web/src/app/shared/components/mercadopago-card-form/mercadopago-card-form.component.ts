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

      @if (isInitializing()) {
        <div class="flex items-center justify-center py-8">
          <svg class="animate-spin h-8 w-8 text-primary-600 mr-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span class="text-gray-600">Cargando sistema de pagos...</span>
        </div>
      }

      <form id="form-checkout" [class.hidden]="isInitializing() || errorMessage()">
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

        <div class="hidden">
          <select id="form-checkout__installments" name="installments"></select>
          <select id="form-checkout__issuer" name="issuer"></select>
        </div>

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

      @if (errorMessage()) {
        <div class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-start gap-3">
            @if (configurationError()) {
              <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            } @else {
              <svg class="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
            }
            <div class="flex-1 min-w-0">
              <h4 class="text-sm font-medium text-red-800 mb-1">
                @if (configurationError()) {
                  Error de Configuración
                } @else {
                  Error al Cargar Mercado Pago
                }
              </h4>
              <p class="text-sm text-red-700 whitespace-pre-line">{{ errorMessage() }}</p>

              @if (canRetry() && retryCount() < 2) {
                <button
                  type="button"
                  (click)="retryInitialization()"
                  class="mt-3 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800 underline focus:outline-none"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                  </svg>
                  Reintentar (Intentos restantes: {{ 2 - retryCount() }})
                </button>
              }

              @if (retryCount() >= 2) {
                <p class="mt-2 text-xs text-red-600">
                  Si el problema persiste, por favor recarga la página o contacta a soporte.
                </p>
              }

              @if (!configurationError() && !environment.production) {
                <div class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p class="text-xs text-blue-700">
                    💡 <strong>Tip de desarrollo:</strong> Verifica que el archivo .env.development.local esté correctamente configurado y el servidor reiniciado.
                  </p>
                </div>
              }
            </div>
          </div>
        </div>
      }

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
  @Output() cardTokenGenerated = new EventEmitter<{ cardToken: string; last4: string }>();
  @Output() cardError = new EventEmitter<string>();

  readonly isSubmitting = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly isInitializing = signal(false);
  readonly canRetry = signal(false);
  readonly retryCount = signal(0);
  readonly configurationError = signal(false);

  // Expose environment for template
  protected readonly environment = environment;

  private readonly MAX_RETRIES = 2;
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

  retryInitialization(): void {
    if (this.retryCount() >= this.MAX_RETRIES) {
      this.errorMessage.set(
        'Se alcanzó el límite de reintentos. Por favor, recarga la página o contacta a soporte.',
      );
      this.canRetry.set(false);
      return;
    }

    console.log(`🔄 Reintentando inicialización de Mercado Pago (intento ${this.retryCount() + 1}/${this.MAX_RETRIES})`);
    this.retryCount.set(this.retryCount() + 1);
    this.errorMessage.set(null);
    this.canRetry.set(false);
    this.configurationError.set(false);
    this.initializeMercadoPago();
  }

  private async initializeMercadoPago(): Promise<void> {
    this.isInitializing.set(true);
    console.log('🚀 Iniciando proceso de inicialización de Mercado Pago...');

    try {
      // Step 1: Resolve public key from runtime or build-time environment
      console.log('📋 Paso 1: Resolviendo clave pública de Mercado Pago...');
      const globalEnv = (globalThis as Record<string, unknown>).__env as
        | Record<string, unknown>
        | undefined;
      const windowEnvKey = String(globalEnv?.NG_APP_MERCADOPAGO_PUBLIC_KEY ?? '').trim();

      const envRecord = environment as Record<string, unknown>;
      const buildEnvKey = String(
        envRecord.mercadopagoPublicKey ?? envRecord.mercadoPagoPublicKey ?? '',
      ).trim();
      const runtimeEnvKey = windowEnvKey || buildEnvKey;

      // Step 2: Validate public key exists
      if (!runtimeEnvKey.length) {
        console.error('❌ Mercado Pago Public Key no encontrada:', {
          checkedSources: ['globalThis.__env.NG_APP_MERCADOPAGO_PUBLIC_KEY', 'environment.mercadopagoPublicKey'],
          environment: environment.production ? 'production' : 'development',
          timestamp: new Date().toISOString(),
        });

        this.configurationError.set(true);
        this.canRetry.set(false);

        const errorMsg = environment.production
          ? 'No pudimos inicializar Mercado Pago. Por favor, contacta a soporte.'
          : 'Mercado Pago no está configurado correctamente.\n\nPara desarrollo local:\n1. Crea un archivo .env.development.local en la raíz del proyecto\n2. Agrega: NG_APP_MERCADOPAGO_PUBLIC_KEY=tu_clave_publica\n3. Reinicia el servidor (npm run dev)';

        this.errorMessage.set(errorMsg);
        this.cardError.emit(errorMsg);
        this.isInitializing.set(false);
        return;
      }

      console.log('✅ Clave pública encontrada (masked):', `${runtimeEnvKey.slice(0, 12)}...${runtimeEnvKey.slice(-4)}`);

      // Step 3: Load Mercado Pago SDK script
      console.log('📦 Paso 2: Cargando SDK de Mercado Pago...');
      const mpInstance = await this.mpScriptService.getMercadoPago(runtimeEnvKey);
      this.mp = mpInstance as unknown as MercadoPagoSDK;
      console.log('✅ SDK de Mercado Pago cargado exitosamente');

      // Step 4: Initialize CardForm
      const normalizedAmount = this.amountArs > 0 ? Math.ceil(this.amountArs) : 1;
      console.log('💳 Paso 3: Inicializando CardForm con amount:', normalizedAmount);

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
              this.errorMessage.set('Error al cargar el formulario de pago. Intenta nuevamente.');
              this.cardError.emit('Error al cargar el formulario');
              this.canRetry.set(true);
              this.isInitializing.set(false);
            } else {
              console.log('✅ CardForm montado correctamente');
              this.isInitializing.set(false);
              // Reset retry count on success
              if (this.retryCount() > 0) {
                console.log('✅ Inicialización exitosa después de', this.retryCount(), 'reintentos');
              }
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
      this.isInitializing.set(false);

      console.error('❌ Error fatal inicializando Mercado Pago:', {
        error: _error,
        retryCount: this.retryCount(),
        timestamp: new Date().toISOString(),
      });

      // Determine if error is retryable (network/script errors) or configuration error
      const errorMessage = _error instanceof Error ? _error.message : String(_error);
      const isNetworkError = errorMessage.includes('Failed to load') ||
                            errorMessage.includes('network') ||
                            errorMessage.includes('script');

      if (isNetworkError) {
        const msg = 'No pudimos cargar el sistema de pagos. Verifica tu conexión a internet.';
        this.errorMessage.set(msg);
        this.cardError.emit(msg);
        this.canRetry.set(this.retryCount() < this.MAX_RETRIES);
      } else {
        const msg = environment.production
          ? 'No pudimos inicializar el sistema de pagos. Por favor, contacta a soporte.'
          : `Error al inicializar Mercado Pago: ${errorMessage}`;
        this.errorMessage.set(msg);
        this.cardError.emit('Error al inicializar Mercado Pago');
        this.canRetry.set(this.retryCount() < this.MAX_RETRIES);
      }
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
