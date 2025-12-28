import {Component,
  OnDestroy,
  AfterViewInit,
  Output,
  EventEmitter,
  signal,
  inject,
  Input,
  NgZone,
  ElementRef,
  ViewChild,
  ChangeDetectionStrategy} from '@angular/core';

import { environment } from '@environment';
import { MercadoPagoScriptService } from '@core/services/payments/mercado-pago-script.service';

/**
 * MercadoPago Payment Brick SDK interfaces
 * Using the recommended Checkout Bricks API (not legacy cardForm)
 */
interface MercadoPagoSDK {
  bricks: () => BricksBuilder;
}

interface BricksBuilder {
  create: (
    brick: 'payment' | 'cardPayment' | 'wallet' | 'statusScreen',
    containerId: string,
    settings: PaymentBrickSettings,
  ) => Promise<BrickController>;
}

interface BrickController {
  unmount: () => Promise<void>;
}

interface PaymentBrickSettings {
  initialization: {
    amount: number;
    preferenceId?: string;
    payer?: {
      email?: string;
      firstName?: string;
      lastName?: string;
      identification?: {
        type: string;
        number: string;
      };
    };
  };
  customization?: {
    paymentMethods?: {
      creditCard?: string;
      debitCard?: string;
      ticket?: string;
      bankTransfer?: string;
      atm?: string;
      mercadoPago?: string;
      maxInstallments?: number;
    };
    visual?: {
      style?: {
        theme?: 'default' | 'dark' | 'bootstrap' | 'flat';
        customVariables?: Record<string, string>;
      };
      hideFormTitle?: boolean;
      hidePaymentButton?: boolean;
    };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit: (formData: CardPaymentFormData) => Promise<void>;
    onError?: (error: BrickError) => void;
  };
}

/**
 * Card Payment Brick returns data directly at root level:
 * {
 *   token: "abc123...",
 *   issuer_id: "123",
 *   payment_method_id: "visa",
 *   transaction_amount: 1000,
 *   installments: 1,
 *   payer: { email, identification: { type, number } }
 * }
 */
interface CardPaymentFormData {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  transaction_amount: number;
  installments: number;
  payer: {
    email: string;
    identification: {
      type: string;
      number: string;
    };
  };
}

interface BrickError {
  type: string;
  cause: string;
  message: string;
}

export interface MercadoPagoCardTokenGeneratedEvent {
  cardToken: string;
  last4: string;
  payer?: {
    email?: string;
    identification?: {
      type: string;
      number: string;
    };
  };
}

@Component({
  selector: 'app-mercadopago-card-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <div class="mp-payment-brick-container">
      @if (isInitializing()) {
        <div class="flex flex-col items-center justify-center py-8">
          <svg class="animate-spin h-8 w-8 text-cta-default mb-3" fill="none" viewBox="0 0 24 24">
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
          <p class="text-sm text-text-secondary">Cargando formulario de pago seguro...</p>
          @if (initAttempt() > 1) {
            <p class="text-xs text-text-secondary mt-1">Intento {{ initAttempt() }} de {{ maxInitAttempts }}</p>
          }
        </div>
      }

      <!-- Payment Brick Container -->
      <div
        #paymentBrickContainer
        id="paymentBrick_container"
        [class.hidden]="isInitializing()"
        class="payment-brick-wrapper"
      ></div>

      @if (errorMessage()) {
        <div class="mt-4 p-4 bg-error-bg border border-error-border rounded-lg">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-error-strong flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p class="text-sm font-medium text-error-strong">{{ errorMessage() }}</p>
              <button
                (click)="retryInitialization()"
                class="mt-2 text-xs text-cta-default hover:underline"
              >
                Intentar nuevamente
              </button>
            </div>
          </div>
        </div>
      }

      <div class="mt-4 p-3 bg-cta-default/10 border border-cta-default/40 rounded-lg flex items-center gap-2">
        <svg class="w-4 h-4 text-cta-default flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p class="text-xs text-cta-default">
          Tus datos están protegidos por Mercado Pago. No guardamos información sensible de tu tarjeta.
        </p>
      </div>
    </div>
  `,
  styles: [
    `
      .mp-payment-brick-container {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
      }

      @media (min-width: 640px) {
        .mp-payment-brick-container {
          max-width: 500px;
        }
      }

      .payment-brick-wrapper {
        min-height: 300px;
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
      }

      /* Override MercadoPago Brick styles for better integration */
      :host ::ng-deep .mp-bricks-container {
        font-family: inherit !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      :host ::ng-deep [data-testid="payment-form"] {
        padding: 0 !important;
      }

      :host ::ng-deep [data-testid="payment-form"] label {
        white-space: normal !important;
        line-height: 1.2 !important;
      }

      :host ::ng-deep [data-testid="payment-form"] input,
      :host ::ng-deep [data-testid="payment-form"] select,
      :host ::ng-deep [data-testid="payment-form"] textarea {
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Mobile overflow guardrails for Brick internals */
      :host ::ng-deep .mp-payment-brick-container * {
        max-width: 100% !important;
        box-sizing: border-box;
      }

      :host ::ng-deep .mp-payment-brick-container iframe {
        width: 100% !important;
        max-width: 100% !important;
      }

      /* MercadoPago uses Andes UI internally; stack columns on very small screens */
      @media (max-width: 420px) {
        :host ::ng-deep .mp-payment-brick-container .andes-form__row {
          flex-direction: column !important;
          align-items: stretch !important;
        }

        :host ::ng-deep .mp-payment-brick-container .andes-form__column {
          width: 100% !important;
          flex: 1 1 100% !important;
        }
      }
    `,
  ],
})
export class MercadopagoCardFormComponent implements AfterViewInit, OnDestroy {
  @Input() amountArs = 0;
  @Output() cardTokenGenerated = new EventEmitter<MercadoPagoCardTokenGeneratedEvent>();
  @Output() cardError = new EventEmitter<string>();

  // SECURITY: Use @ViewChild for DOM references instead of getElementById
  @ViewChild('paymentBrickContainer', { static: true }) brickContainerRef!: ElementRef<HTMLDivElement>;

  readonly isInitializing = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly initAttempt = signal(0);

  // Exponential backoff configuration
  readonly maxInitAttempts = 5;
  private readonly baseDelayMs = 200; // Starting delay: 200ms, then 400, 800, 1600, 3200

  private brickController: BrickController | null = null;
  private mp: MercadoPagoSDK | null = null;
  private isDestroyed = false;
  private mpScriptService = inject(MercadoPagoScriptService);
  private ngZone = inject(NgZone);

  ngAfterViewInit(): void {
    // Start initialization with exponential backoff
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          this.initializePaymentBrick();
        });
      }, this.baseDelayMs);
    });
  }

  ngOnDestroy(): void {
    this.isDestroyed = true;
    this.unmountBrick();
  }

  /**
   * Retry initialization manually (called from error UI)
   */
  retryInitialization(): void {
    this.initAttempt.set(0);
    this.errorMessage.set(null);
    this.isInitializing.set(true);
    this.initializePaymentBrick();
  }

  /**
   * Unmount the Payment Brick safely
   */
  private async unmountBrick(): Promise<void> {
    if (this.brickController) {
      try {
        await this.brickController.unmount();
        this.brickController = null;
      } catch {
        // Silently catch unmount errors - component is being destroyed anyway
      }
    }
  }

  /**
   * Calculate delay for exponential backoff
   * Delays: 200ms, 400ms, 800ms, 1600ms, 3200ms
   */
  private getRetryDelay(attempt: number): number {
    return this.baseDelayMs * Math.pow(2, attempt);
  }

  /**
   * Initialize MercadoPago Payment Brick with exponential backoff retry
   */
  private async initializePaymentBrick(): Promise<void> {
    // Guard: Don't initialize if component was destroyed
    if (this.isDestroyed) {
      return;
    }

    const currentAttempt = this.initAttempt() + 1;
    this.initAttempt.set(currentAttempt);

    try {
      // 1. Get and validate public key
      const publicKey = this.getPublicKey();
      if (!publicKey) {
        throw new Error('MercadoPago public key no configurada. Verifica NG_APP_MERCADOPAGO_PUBLIC_KEY.');
      }

      // 2. Verify container element exists
      const container = this.brickContainerRef?.nativeElement;
      if (!container) {
        throw new Error('Container element not found');
      }

      // 3. Load MercadoPago SDK
      const mpInstance = await this.mpScriptService.getMercadoPago(publicKey);
      if (!mpInstance) {
        throw new Error('MercadoPago SDK instance is null');
      }

      // Validate mpInstance is the expected SDK type
      if (typeof (mpInstance as MercadoPagoSDK).bricks !== 'function') {
        throw new Error('MercadoPago bricks() method not available. SDK may not be V2.');
      }

      this.mp = mpInstance as MercadoPagoSDK;

      // 4. Calculate amount (minimum 1 ARS for MercadoPago)
      const amount = Math.max(1, Math.ceil(this.amountArs));

      // 5. Create Payment Brick
      const bricksBuilder = this.mp.bricks();

      this.brickController = await bricksBuilder.create('cardPayment', 'paymentBrick_container', {
        initialization: {
          amount: amount,
        },
        customization: {
          visual: {
            style: {
              theme: 'default',
            },
            hideFormTitle: true,
          },
        },
        callbacks: {
          onReady: () => {
            if (this.isDestroyed) return;
            this.ngZone.run(() => {
              this.isInitializing.set(false);
              this.errorMessage.set(null);
            });
          },
          onSubmit: async (cardFormData: CardPaymentFormData) => {
            if (this.isDestroyed) return;
            await this.handleBrickSubmit(cardFormData);
          },
          onError: (error: BrickError) => {
            if (this.isDestroyed) return;
            this.ngZone.run(() => {
              this.handleBrickError(error);
            });
          },
        },
      });

    } catch (error) {
      // Don't continue if component was destroyed
      if (this.isDestroyed) {
        return;
      }

      // Retry with exponential backoff if under max attempts
      if (currentAttempt < this.maxInitAttempts) {
        const delay = this.getRetryDelay(currentAttempt);

        this.ngZone.runOutsideAngular(() => {
          setTimeout(() => {
            // Check again before retrying
            if (!this.isDestroyed) {
              this.ngZone.run(() => {
                this.initializePaymentBrick();
              });
            }
          }, delay);
        });
      } else {
        // Max attempts reached - show error to user
        this.ngZone.run(() => {
          if (!this.isDestroyed) {
            this.isInitializing.set(false);
            const errorMsg = error instanceof Error ? error.message : String(error);
            this.errorMessage.set(`No pudimos cargar el formulario de pago: ${errorMsg}`);
            this.cardError.emit('Error al inicializar Mercado Pago');
          }
        });
      }
    }
  }

  /**
   * Get MercadoPago public key from environment
   */
  private getPublicKey(): string {
    // 1. Try runtime env (window.__env from env.js)
    const globalEnv = (globalThis as Record<string, unknown>)['__env'] as
      | Record<string, string | undefined>
      | undefined;
    const runtimeKey = globalEnv?.['NG_APP_MERCADOPAGO_PUBLIC_KEY']?.trim();

    if (runtimeKey && runtimeKey.length > 0) {
      return runtimeKey;
    }

    // 2. Try build-time environment
    const envRecord = environment as Record<string, unknown>;
    const buildKey = String(
      envRecord['mercadopagoPublicKey'] ?? envRecord['mercadoPagoPublicKey'] ?? '',
    ).trim();

    return buildKey;
  }

  /**
   * Handle Card Payment Brick form submission
   * The cardPayment brick sends data directly at root level:
   * {
   *   token: "abc123...",
   *   issuer_id: "123",
   *   payment_method_id: "visa",
   *   transaction_amount: 1000,
   *   installments: 1,
   *   payer: { email, identification }
   * }
   */
  private async handleBrickSubmit(cardFormData: CardPaymentFormData): Promise<void> {
    try {
      // Card Payment Brick returns token directly at root level
      const token = cardFormData?.token;
      const payer = cardFormData?.payer;

      if (!token || typeof token !== 'string' || token.length === 0) {
        throw new Error('No se generó el token de la tarjeta. Verifica los datos e intenta nuevamente.');
      }

      // Emit token to parent component
      this.ngZone.run(() => {
        this.cardTokenGenerated.emit({
          cardToken: token,
          last4: 'XXXX', // Card Payment Brick doesn't expose last4 directly
          payer: payer
            ? {
              email: payer.email,
              identification: payer.identification,
            }
            : undefined,
        });
      });

    } catch (error) {
      this.ngZone.run(() => {
        const errorMsg = error instanceof Error ? error.message : 'Error al procesar la tarjeta';
        this.errorMessage.set(errorMsg);
        this.cardError.emit(errorMsg);
      });
    }
  }

  /**
   * Handle Payment Brick errors
   */
  private handleBrickError(error: BrickError): void {
    let message = 'No pudimos procesar tu tarjeta. Intenta nuevamente.';

    if (error?.['message']) {
      message = error['message'];
    } else if (error?.cause) {
      message = error.cause;
    }

    // Map common error types to user-friendly messages
    const errorTypeMessages: Record<string, string> = {
      'invalid_card_number': 'El número de tarjeta no es válido.',
      'invalid_expiration_date': 'La fecha de vencimiento no es válida.',
      'invalid_security_code': 'El código de seguridad no es válido.',
      'empty_card_holder_name': 'Ingresa el nombre del titular de la tarjeta.',
      'invalid_identification_number': 'El número de documento no es válido.',
    };

    if (error?.type && errorTypeMessages[error.type]) {
      message = errorTypeMessages[error.type];
    }

    this.errorMessage.set(message);
    this.cardError.emit(message);
  }
}
