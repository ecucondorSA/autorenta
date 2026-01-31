import {
  Component,
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
  ChangeDetectionStrategy,
} from '@angular/core';

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
    <div class="vault-container relative overflow-hidden rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl">
      <!-- Glow Effect -->
      <div class="absolute top-0 right-0 w-64 h-64 bg-brand-primary/5 blur-3xl pointer-events-none rounded-full -mr-32 -mt-32"></div>
      
      <!-- Security Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-zinc-900/50">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10B981]"></div>
          <span class="text-xs font-bold text-zinc-400 uppercase tracking-wider">Secure Vault</span>
        </div>
        <div class="flex gap-2 opacity-50">
          <svg class="h-4 w-auto" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="2" fill="white"/><path d="M12 12H24" stroke="black" stroke-width="2"/></svg>
          <svg class="h-4 w-auto" viewBox="0 0 36 24" fill="none"><rect width="36" height="24" rx="2" fill="white"/><circle cx="12" cy="12" r="6" fill="#EB001B"/><circle cx="24" cy="12" r="6" fill="#F79E1B"/></svg>
        </div>
      </div>

      <div class="p-6 relative z-10">
        @if (isInitializing()) {
          <div class="flex flex-col items-center justify-center py-12 space-y-4">
            <div class="relative">
              <div class="w-12 h-12 border-4 border-zinc-800 border-t-brand-primary rounded-full animate-spin"></div>
              <div class="absolute inset-0 flex items-center justify-center">
                <svg class="w-4 h-4 text-brand-primary" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              </div>
            </div>
            <p class="text-sm font-mono text-zinc-500 animate-pulse">ESTABLISHING SECURE CONNECTION...</p>
          </div>
        }

        <!-- Payment Brick Container (Real SDK) -->
        <div
          #paymentBrickContainer
          id="paymentBrick_container"
          [class.hidden]="isInitializing() || errorMessage()"
          class="payment-brick-wrapper"
        ></div>

        <!-- Fallback / Mock Form (Visible on Error or Mock Mode) -->
        @if (errorMessage()) {
          <div class="animate-fade-in">
            <!-- Mock Inputs for Visual Preview (Since Real SDK Failed) -->
            <div class="space-y-5 opacity-50 pointer-events-none select-none grayscale" aria-hidden="true">
              <div>
                <label class="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Número de Tarjeta</label>
                <div class="relative">
                  <input type="text" value="•••• •••• •••• ••••" class="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 font-mono" disabled>
                  <svg class="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-600" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Vencimiento</label>
                  <input type="text" value="MM/AA" class="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 font-mono" disabled>
                </div>
                <div>
                  <label class="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">CVC</label>
                  <div class="relative">
                    <input type="text" value="•••" class="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 font-mono" disabled>
                    <svg class="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label class="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wide">Titular</label>
                <input type="text" value="NOMBRE COMO FIGURA EN LA TARJETA" class="w-full bg-zinc-900 border border-white/10 rounded-lg px-4 py-3 text-zinc-400 font-mono" disabled>
              </div>
            </div>

            <!-- Error Notification Overlay -->
            <div class="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
              <div class="p-2 bg-red-500/20 rounded-full text-red-500 shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
              </div>
              <div class="flex-1">
                <h4 class="text-red-400 font-bold text-sm mb-1">Error de conexión con la bóveda</h4>
                <p class="text-xs text-red-400/80 mb-3">{{ errorMessage() }}</p>
                <button (click)="retryInitialization()" class="text-xs font-bold text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg transition-colors">Reintentar conexión</button>
              </div>
            </div>
          </div>
        }

        <!-- Footer -->
        <div class="mt-6 flex items-center justify-center gap-2 text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
          <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
          <span>End-to-End Encrypted via MercadoPago</span>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .vault-container {
        /* Premium aesthetics */
        background-image: linear-gradient(to bottom right, rgba(24, 24, 27, 1), rgba(9, 9, 11, 1));
      }

      .mp-payment-brick-container {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
      }

      /* ... (Existing styles remain, but updated for dark mode integration) ... */
      :host ::ng-deep .mp-payment-brick-container {
        /* Force brick transparency to blend with vault */
        background: transparent !important; 
      }
      
      /* ... (Rest of styles) ... */
      
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

      :host ::ng-deep [data-testid='payment-form'] {
        padding: 0 !important;
      }

      :host ::ng-deep [data-testid='payment-form'] label {
        white-space: normal !important;
        line-height: 1.2 !important;
        color: #a1a1aa !important; /* zinc-400 */
        font-family: 'Satoshi', sans-serif !important;
        font-size: 0.75rem !important; /* text-xs */
        font-weight: 700 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.05em !important;
      }

      :host ::ng-deep [data-testid='payment-form'] input,
      :host ::ng-deep [data-testid='payment-form'] select,
      :host ::ng-deep [data-testid='payment-form'] textarea {
        width: 100% !important;
        max-width: 100% !important;
        background-color: #18181b !important; /* zinc-900 */
        border-color: rgba(255, 255, 255, 0.1) !important;
        color: white !important;
        border-radius: 0.5rem !important;
        padding: 0.75rem 1rem !important;
        font-family: 'JetBrains Mono', monospace !important;
      }
      
      :host ::ng-deep [data-testid='payment-form'] input:focus {
        border-color: #39FF14 !important; /* Brand primary */
        outline: none !important;
        box-shadow: 0 0 0 2px rgba(57, 255, 20, 0.2) !important;
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
  @ViewChild('paymentBrickContainer', { static: true })
  brickContainerRef!: ElementRef<HTMLDivElement>;

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
        throw new Error(
          'MercadoPago public key no configurada. Verifica NG_APP_MERCADOPAGO_PUBLIC_KEY.',
        );
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
              theme: 'dark', // Use native dark theme
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
            const errorMsg = error instanceof Error ? error['message'] : String(error);
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
        throw new Error(
          'No se generó el token de la tarjeta. Verifica los datos e intenta nuevamente.',
        );
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
        const errorMsg = error instanceof Error ? error['message'] : 'Error al procesar la tarjeta';
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
      invalid_card_number: 'El número de tarjeta no es válido.',
      invalid_expiration_date: 'La fecha de vencimiento no es válida.',
      invalid_security_code: 'El código de seguridad no es válido.',
      empty_card_holder_name: 'Ingresa el nombre del titular de la tarjeta.',
      invalid_identification_number: 'El número de documento no es válido.',
    };

    if (error?.type && errorTypeMessages[error.type]) {
      message = errorTypeMessages[error.type];
    }

    this.errorMessage.set(message);
    this.cardError.emit(message);
  }
}
