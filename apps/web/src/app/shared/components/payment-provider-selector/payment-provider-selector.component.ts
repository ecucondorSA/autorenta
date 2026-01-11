import {
  Component,
  OnInit,
  Input,
  Output,
  EventEmitter,
  signal,
  inject,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentProvider } from '@core/interfaces/payment-gateway.interface';
import { PaymentGatewayFactory } from '@core/services/payments/payment-gateway.factory';
import { FxService } from '@core/services/payments/fx.service';

/**
 * Payment Provider Selector Component
 *
 * Permite al usuario seleccionar el proveedor de pago: MercadoPago o PayPal.
 *
 * Características:
 * - Muestra opciones con logos y descripciones
 * - Indica la moneda de cada proveedor (ARS vs USD)
 * - Muestra conversión de moneda en tiempo real
 * - Valida disponibilidad de cada proveedor
 *
 * Uso:
 * ```html
 * <app-payment-provider-selector
 *   [amount]="bookingTotal"
 *   [currency]="'ARS'"
 *   (providerChange)="handleProviderChange($event)">
 * </app-payment-provider-selector>
 * ```
 */
@Component({
  selector: 'app-payment-provider-selector',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-provider-selector.component.html',
  styleUrls: ['./payment-provider-selector.component.css'],
})
export class PaymentProviderSelectorComponent implements OnInit {
  private readonly gatewayFactory = inject(PaymentGatewayFactory);
  private readonly fxService = inject(FxService);

  // ==================== INPUTS & OUTPUTS ====================

  /**
   * Monto a pagar (en la moneda original del booking)
   */
  @Input({ required: true }) amount!: number;

  /**
   * Moneda original del booking (USD o ARS)
   */
  @Input() currency: 'USD' | 'ARS' = 'USD';

  /**
   * Provider preseleccionado (opcional)
   */
  @Input() defaultProvider: PaymentProvider = 'mercadopago';

  /**
   * Evento emitido cuando cambia el proveedor seleccionado
   */
  @Output() providerChange = new EventEmitter<{
    provider: PaymentProvider;
    amountInProviderCurrency: number;
    providerCurrency: string;
  }>();

  // ==================== SIGNALS ====================

  /**
   * Proveedor seleccionado
   */
  selectedProvider = signal<PaymentProvider>('mercadopago');

  /**
   * Tasa de cambio USD/ARS
   */
  exchangeRate = signal<number>(0);

  /**
   * Estado de carga
   */
  isLoading = signal(false);

  // ==================== COMPUTED SIGNALS ====================

  /**
   * Proveedores disponibles
   */
  readonly availableProviders = computed(() => {
    return this.gatewayFactory.getAvailableBookingProviders();
  });

  /**
   * Monto en ARS (para MercadoPago)
   */
  readonly amountARS = computed(() => {
    if (this.currency === 'ARS') {
      return this.amount;
    }
    // Convertir USD a ARS
    return this.amount * this.exchangeRate();
  });

  /**
   * Monto en USD (para PayPal)
   */
  readonly amountUSD = computed(() => {
    if (this.currency === 'USD') {
      return this.amount;
    }
    // Convertir ARS a USD
    const rate = this.exchangeRate();
    return rate > 0 ? this.amount / rate : 0;
  });

  // ==================== LIFECYCLE ====================

  async ngOnInit(): Promise<void> {
    this.selectedProvider.set(this.defaultProvider);
    await this.loadExchangeRate();
    this.emitChange();
  }

  // ==================== PUBLIC METHODS ====================

  /**
   * Carga la tasa de cambio USD/ARS
   */
  async loadExchangeRate(): Promise<void> {
    this.isLoading.set(true);
    try {
      const snapshot = await this.fxService.getFxSnapshot().toPromise();
      if (snapshot) {
        this.exchangeRate.set(snapshot.rate);
      } else {
        // Fallback rate if snapshot is null
        this.exchangeRate.set(1015.0);
      }
    } catch (_error) {
      console.error('Error loading exchange rate:', _error);
      // Fallback rate
      this.exchangeRate.set(1015.0);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Selecciona un proveedor
   */
  selectProvider(provider: PaymentProvider): void {
    if (!this.isProviderAvailable(provider)) {
      return;
    }

    this.selectedProvider.set(provider);
    this.emitChange();
  }

  /**
   * Verifica si un proveedor está disponible
   */
  isProviderAvailable(provider: PaymentProvider): boolean {
    return this.gatewayFactory.isBookingProviderAvailable(provider);
  }

  /**
   * Emite el evento de cambio de proveedor
   */
  private emitChange(): void {
    const provider = this.selectedProvider();
    let amountInProviderCurrency: number;
    let providerCurrency: string;

    if (provider === 'paypal') {
      amountInProviderCurrency = this.amountUSD();
      providerCurrency = 'USD';
    } else {
      // MercadoPago
      amountInProviderCurrency = this.amountARS();
      providerCurrency = 'ARS';
    }

    this.providerChange.emit({
      provider,
      amountInProviderCurrency,
      providerCurrency,
    });
  }

  /**
   * Formatea un número como moneda
   */
  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat(currency === 'ARS' ? 'es-AR' : 'en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Obtiene el nombre de visualización del proveedor
   */
  getProviderDisplayName(provider: PaymentProvider): string {
    switch (provider) {
      case 'mercadopago':
        return 'MercadoPago';
      case 'paypal':
        return 'PayPal';
      default:
        return provider;
    }
  }

  /**
   * Obtiene la descripción del proveedor
   */
  getProviderDescription(provider: PaymentProvider): string {
    switch (provider) {
      case 'mercadopago':
        return 'Tarjetas, efectivo, saldo MP';
      case 'paypal':
        return 'Tarjetas internacionales';
      default:
        return '';
    }
  }
}
