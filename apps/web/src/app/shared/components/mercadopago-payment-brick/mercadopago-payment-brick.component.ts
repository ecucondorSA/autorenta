import {
  Component,
  OnInit,
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
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '@environment';
import { MercadoPagoScriptService } from '../../../core/services/mercado-pago-script.service';
import { injectSupabase } from '../../../core/services/supabase-client.service';

/**
 * Payment Brick callback data from MercadoPago SDK
 */
interface PaymentBrickFormData {
  selectedPaymentMethod: string;
  formData: {
    token?: string;
    issuer_id?: string;
    payment_method_id: string;
    transaction_amount: number;
    installments?: number;
    payer: {
      email: string;
      identification?: {
        type: string;
        number: string;
      };
    };
  };
}

/**
 * Payment result returned from backend
 */
export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status?: 'approved' | 'pending' | 'rejected' | 'in_process';
  message?: string;
  statusDetail?: string;
}

/**
 * MercadoPago Bricks SDK interface
 */
interface MercadoPagoBricksSDK {
  bricks: () => BricksBuilder;
}

interface BricksBuilder {
  create: (
    brick: string,
    container: string,
    settings: PaymentBrickSettings,
  ) => Promise<BrickController>;
}

interface BrickController {
  unmount: () => void;
}

interface PaymentBrickSettings {
  initialization: {
    amount: number;
    preferenceId?: string;
    payer?: {
      email?: string;
    };
  };
  customization?: {
    visual?: {
      style?: {
        theme?: 'default' | 'dark' | 'bootstrap' | 'flat';
        customVariables?: Record<string, string>;
      };
      hideFormTitle?: boolean;
      hidePaymentButton?: boolean;
    };
    paymentMethods?: {
      creditCard?: string | string[];
      debitCard?: string | string[];
      mercadoPago?: string[];
      ticket?: string[];
      bankTransfer?: string[];
      maxInstallments?: number;
    };
  };
  callbacks: {
    onReady?: () => void;
    onSubmit?: (formData: PaymentBrickFormData) => Promise<void>;
    onError?: (error: unknown) => void;
  };
}

/**
 * MercadoPago Payment Brick Component
 *
 * Componente wrapper para el Payment Brick de MercadoPago.
 * Permite pagos in-site sin redirección, soportando múltiples métodos de pago.
 *
 * @example
 * <app-mercadopago-payment-brick
 *   [amount]="10000"
 *   [description]="'Depósito a wallet'"
 *   [depositId]="'deposit-123'"
 *   (paymentSuccess)="handleSuccess($event)"
 *   (paymentError)="handleError($event)"
 *   (paymentPending)="handlePending($event)"
 * />
 */
@Component({
  selector: 'app-mercadopago-payment-brick',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="payment-brick-container">
      @if (isInitializing()) {
        <div class="flex flex-col items-center justify-center py-12">
          <svg class="animate-spin h-10 w-10 text-primary-500 mb-4" fill="none" viewBox="0 0 24 24">
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
          <p class="text-sm text-text-secondary">Cargando opciones de pago...</p>
        </div>
      }

      @if (errorMessage()) {
        <div class="bg-error-bg border border-error-border rounded-lg p-4 mb-4">
          <div class="flex items-start">
            <svg
              class="w-5 h-5 text-error-strong mt-0.5 flex-shrink-0"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            <div class="ml-3">
              <p class="text-sm font-medium text-error-strong">{{ errorMessage() }}</p>
              <button
                (click)="retryInitialization()"
                class="mt-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Payment Brick Container -->
      <div
        #paymentBrickContainer
        id="paymentBrick_container"
        [class.hidden]="isInitializing() || errorMessage()"
        class="payment-brick-wrapper"
      ></div>

      @if (isProcessingPayment()) {
        <div
          class="absolute inset-0 bg-surface-base/80 flex items-center justify-center rounded-xl"
        >
          <div class="flex flex-col items-center">
            <svg class="animate-spin h-8 w-8 text-primary-500 mb-3" fill="none" viewBox="0 0 24 24">
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
            <p class="text-sm text-text-secondary font-medium">Procesando pago...</p>
          </div>
        </div>
      }

      <!-- Security Info -->
      <div
        class="mt-4 p-3 bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-400/30 rounded-lg"
      >
        <div class="flex items-center">
          <svg
            class="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fill-rule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clip-rule="evenodd"
            />
          </svg>
          <p class="ml-2 text-xs text-primary-700 dark:text-primary-300">
            Pago seguro procesado por MercadoPago. Tus datos están protegidos.
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .payment-brick-container {
        position: relative;
        min-height: 200px;
      }

      .payment-brick-wrapper {
        min-height: 350px;
      }

      /* MercadoPago Brick styling overrides */
      :host ::ng-deep .mercadopago-button {
        border-radius: 0.75rem !important;
        font-weight: 600 !important;
      }
    `,
  ],
})
export class MercadopagoPaymentBrickComponent implements OnInit, AfterViewInit, OnDestroy {
  /**
   * Amount in ARS cents to charge
   */
  @Input({ required: true }) amount!: number;

  /**
   * Payment description
   */
  @Input() description = 'Depósito a wallet AutoRentar';

  /**
   * Deposit ID for tracking
   */
  @Input() depositId?: string;

  /**
   * Payer email (optional, pre-fills the form)
   */
  @Input() payerEmail?: string;

  /**
   * MercadoPago preference ID (optional, for Checkout Pro fallback)
   */
  @Input() preferenceId?: string;

  /**
   * Emitted when payment is approved
   */
  @Output() paymentSuccess = new EventEmitter<PaymentResult>();

  /**
   * Emitted when payment is rejected or fails
   */
  @Output() paymentError = new EventEmitter<PaymentResult>();

  /**
   * Emitted when payment is pending (offline methods)
   */
  @Output() paymentPending = new EventEmitter<PaymentResult>();

  @ViewChild('paymentBrickContainer', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  readonly isInitializing = signal(true);
  readonly isProcessingPayment = signal(false);
  readonly errorMessage = signal<string | null>(null);

  private brickController: BrickController | null = null;
  private mp: MercadoPagoBricksSDK | null = null;
  private mpScriptService = inject(MercadoPagoScriptService);
  private ngZone = inject(NgZone);
  private supabase = injectSupabase();
  private initAttempts = 0;
  private maxInitAttempts = 5;
  private baseRetryDelay = 200; // Base delay for exponential backoff

  ngOnInit(): void {
    // Preload SDK script early
    this.mpScriptService.preloadSDK().catch((err) => {
      console.warn('⚠️ MercadoPago SDK preload failed:', err);
    });
  }

  ngAfterViewInit(): void {
    // Wait for DOM to be ready, then initialize
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          void this.initializePaymentBrick();
        });
      }, 300);
    });
  }

  ngOnDestroy(): void {
    this.unmountBrick();
  }

  /**
   * Retry initialization after error
   */
  retryInitialization(): void {
    this.errorMessage.set(null);
    this.initAttempts = 0;
    void this.initializePaymentBrick();
  }

  /**
   * Unmount the brick instance
   */
  private unmountBrick(): void {
    if (this.brickController) {
      try {
        this.brickController.unmount();
      } catch (e) {
        console.warn('Error unmounting Payment Brick:', e);
      }
      this.brickController = null;
    }
  }

  /**
   * Get public key from environment
   */
  private getPublicKey(): string {
    const globalEnv = (globalThis as Record<string, unknown>).__env as
      | Record<string, unknown>
      | undefined;
    const windowEnvKey = String(globalEnv?.NG_APP_MERCADOPAGO_PUBLIC_KEY ?? '').trim();

    const envRecord = environment as Record<string, unknown>;
    const buildEnvKey = String(
      envRecord.mercadopagoPublicKey ?? envRecord.mercadoPagoPublicKey ?? '',
    ).trim();

    return windowEnvKey || buildEnvKey;
  }

  /**
   * Initialize the Payment Brick
   */
  private async initializePaymentBrick(): Promise<void> {
    this.initAttempts++;
    console.log(`🔄 Payment Brick init attempt ${this.initAttempts}/${this.maxInitAttempts}`);

    try {
      const publicKey = this.getPublicKey();

      if (!publicKey) {
        throw new Error('MercadoPago public key not configured');
      }

      console.log('🔑 MercadoPago public key:', `${publicKey.slice(0, 20)}...`);

      // Check if container exists using ViewChild (more reliable than getElementById)
      const container = this.containerRef?.nativeElement;
      if (!container) {
        if (this.initAttempts < this.maxInitAttempts) {
          // Exponential backoff: 200ms, 400ms, 800ms, 1600ms, 3200ms
          const delay = this.baseRetryDelay * Math.pow(2, this.initAttempts - 1);
          console.warn(`⚠️ Container not found, retrying in ${delay}ms (attempt ${this.initAttempts}/${this.maxInitAttempts})...`);
          setTimeout(() => this.initializePaymentBrick(), delay);
          return;
        }
        throw new Error('Payment Brick container not found after maximum retries');
      }

      // Load MercadoPago SDK
      const mpInstance = await this.mpScriptService.getMercadoPago(publicKey);
      this.mp = mpInstance as unknown as MercadoPagoBricksSDK;

      if (!this.mp || typeof this.mp.bricks !== 'function') {
        throw new Error('MercadoPago bricks method not available');
      }

      console.log('✅ MercadoPago SDK loaded, creating Payment Brick...');

      // Convert amount from cents to ARS (MP expects ARS, not cents)
      const amountArs = this.amount / 100;
      console.log(`💰 Initializing Payment Brick with amount: ${amountArs} ARS`);

      // Create Payment Brick
      const bricksBuilder = this.mp.bricks();

      this.brickController = await bricksBuilder.create('payment', 'paymentBrick_container', {
        initialization: {
          amount: amountArs,
          preferenceId: this.preferenceId,
          payer: this.payerEmail ? { email: this.payerEmail } : undefined,
        },
        customization: {
          visual: {
            style: {
              theme: 'default',
            },
            hideFormTitle: false,
            hidePaymentButton: false,
          },
          paymentMethods: {
            creditCard: 'all',
            debitCard: 'all',
            mercadoPago: ['wallet_purchase', 'account_money', 'consumer_credits'],
            ticket: ['rapipago', 'pagofacil'],
            maxInstallments: 12,
          },
        },
        callbacks: {
          onReady: () => {
            console.log('✅ Payment Brick ready');
            this.ngZone.run(() => {
              this.isInitializing.set(false);
            });
          },
          onSubmit: async (formData: PaymentBrickFormData) => {
            console.log('📤 Payment Brick submit:', formData.selectedPaymentMethod);
            await this.processPayment(formData);
          },
          onError: (error: unknown) => {
            console.error('❌ Payment Brick error:', error);
            this.ngZone.run(() => {
              this.handleBrickError(error);
            });
          },
        },
      });

      console.log('✅ Payment Brick created successfully');
    } catch (error) {
      console.error('❌ Payment Brick initialization error:', error);
      this.ngZone.run(() => {
        this.isInitializing.set(false);
        const errorDetails = error instanceof Error ? error.message : String(error);
        this.errorMessage.set(`Error al cargar opciones de pago: ${errorDetails}`);
      });
    }
  }

  /**
   * Process the payment after form submission
   */
  private async processPayment(formData: PaymentBrickFormData): Promise<void> {
    this.ngZone.run(() => {
      this.isProcessingPayment.set(true);
      this.errorMessage.set(null);
    });

    try {
      console.log('📤 Calling Edge Function mercadopago-process-brick-payment...');

      // Call the Edge Function to process the payment using Supabase functions.invoke
      const { data, error } = await this.supabase.functions.invoke<PaymentResult>(
        'mercadopago-process-brick-payment',
        {
          body: {
            formData: formData.formData,
            depositId: this.depositId,
            description: this.description,
          },
        },
      );

      if (error) {
        console.error('❌ Edge Function error:', error);
        throw new Error(error.message || 'Error al procesar el pago');
      }

      if (!data) {
        throw new Error('No se recibió respuesta del servidor');
      }

      const result = data;
      console.log('✅ Payment result:', result);

      this.ngZone.run(() => {
        this.isProcessingPayment.set(false);

        if (result.success && result.status === 'approved') {
          this.paymentSuccess.emit(result);
        } else if (result.status === 'pending' || result.status === 'in_process') {
          this.paymentPending.emit(result);
        } else {
          this.paymentError.emit(result);
          this.errorMessage.set(result.message || 'El pago fue rechazado');
        }
      });
    } catch (error) {
      console.error('❌ Payment processing error:', error);
      this.ngZone.run(() => {
        this.isProcessingPayment.set(false);
        const errorMessage = error instanceof Error ? error.message : 'Error al procesar el pago';
        this.errorMessage.set(errorMessage);
        this.paymentError.emit({
          success: false,
          message: errorMessage,
        });
      });
    }
  }

  /**
   * Handle Brick errors
   */
  private handleBrickError(error: unknown): void {
    let message = 'Error en el formulario de pago';

    if (typeof error === 'string') {
      message = error;
    } else if (error && typeof error === 'object') {
      const errorObj = error as Record<string, unknown>;
      message = String(errorObj.message || errorObj.description || message);
    }

    this.errorMessage.set(message);
    this.paymentError.emit({
      success: false,
      message,
    });
  }
}
