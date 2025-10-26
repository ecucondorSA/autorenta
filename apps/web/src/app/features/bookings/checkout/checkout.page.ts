import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PaymentMethodSelectorComponent } from '../../../shared/components/payment-method-selector/payment-method-selector.component';
import { InsuranceSelectorComponent } from '../insurance-selector/insurance-selector.component';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { BookingPaymentMethod } from '../../../core/models/wallet.model';
import { CheckoutStateService } from './state/checkout-state.service';
import { CheckoutPaymentService } from './services/checkout-payment.service';
import { FranchiseInfo } from './support/franchise-table.service';
import { GuaranteeCopy } from './support/guarantee-copy.builder';
import { GuaranteeBreakdown } from './support/risk-calculator';
import { BookingsService } from '../../../core/services/bookings.service';

interface PaymentMethodChangeEvent {
  method: BookingPaymentMethod;
  walletAmount: number;
  cardAmount: number;
}

interface WaterfallStep {
  label: string;
  description: string;
}

@Component({
  standalone: true,
  selector: 'app-checkout-page',
  imports: [CommonModule, MoneyPipe, PaymentMethodSelectorComponent, InsuranceSelectorComponent, TranslateModule],
  templateUrl: './checkout.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CheckoutStateService, CheckoutPaymentService],
})
export class CheckoutPage implements OnInit {
  private readonly state = inject(CheckoutStateService);
  private readonly payments = inject(CheckoutPaymentService);
  private readonly bookingsService = inject(BookingsService);

  private readonly processing = signal(false);
  private readonly formatCache = new Map<string, Intl.NumberFormat>();

  // ✅ INSURANCE: Signals para gestionar seguros
  readonly selectedInsuranceAddons = signal<string[]>([]);
  readonly insuranceTotalCost = signal<number>(0);
  readonly securityDeposit = signal<number>(0);

  readonly booking = () => this.state.bookingSignal();
  readonly bookingId = () => this.state.getBookingId();
  readonly status = () => this.state.statusSignal();
  readonly message = () => this.state.messageSignal();
  readonly selectedPaymentMethod = () => this.state.paymentMethodSignal();
  readonly loading = () => this.processing() || this.state.loadingSignal();

  ngOnInit(): void {
    void this.state.initialize();
  }

  onPaymentMethodChange(event: PaymentMethodChangeEvent): void {
    this.state.setPaymentSelection(event.method, event.walletAmount, event.cardAmount);
  }

  async processPayment(): Promise<void> {
    if (!this.bookingId()) return;
    if (this.processing()) return;

    this.processing.set(true);
    this.state.setMessage(null);

    try {
      // ✅ INSURANCE: Activar add-ons seleccionados antes de procesar pago
      const addonIds = this.selectedInsuranceAddons();
      if (addonIds.length > 0 && this.bookingId()) {
        console.log('Activando add-ons de seguro:', addonIds);
        await this.bookingsService.activateInsuranceCoverage(
          this.bookingId()!,
          addonIds
        );
      }

      const outcome = await this.payments.processPayment();
      if (outcome.kind === 'redirect_to_mercadopago') {
        window.location.href = outcome.initPoint;
      }
    } catch (error) {
      console.error('Error procesando el pago', error);
      const message =
        error instanceof Error ? error.message : 'No pudimos completar el pago. Intentá nuevamente.';
      this.state.setMessage(message);
    } finally {
      this.processing.set(false);
    }
  }

  // ✅ INSURANCE: Event handlers
  onAddonsSelected(addonIds: string[]): void {
    this.selectedInsuranceAddons.set(addonIds);
    console.log('Add-ons seleccionados:', addonIds);
  }

  onInsuranceCostChange(totalCost: number): void {
    this.insuranceTotalCost.set(totalCost);
    console.log('Costo total seguro:', totalCost);
    // Aquí podrías actualizar el total general si es necesario
  }

  onDepositCalculated(deposit: number): void {
    this.securityDeposit.set(deposit);
    console.log('Depósito de seguridad:', deposit);
  }

  // Getter para el car_id del booking
  getCarId(): string | undefined {
    return this.booking()?.car_id;
  }

  // Getter para los días de alquiler
  getRentalDays(): number {
    const booking = this.booking();
    if (!booking) return 1;
    return booking.days_count || 1;
  }

  // ---------------------------------------------------------------------------
  // UI Helpers
  // ---------------------------------------------------------------------------

  depositAmountUsdDisplay(): string {
    return this.formatUsd(this.state.getDepositUsd());
  }

  depositAmountLocalDisplay(): string | null {
    const booking = this.state.getBooking();
    if (!booking || booking.currency === 'USD') return null;
    return this.formatCurrency(this.state.getDepositArs(), booking.currency);
  }

  fgoEventCapUsdDisplay(): string {
    return this.formatUsd(this.eventCapUsd());
  }

  fgoEventCapLocalDisplay(): string | null {
    const booking = this.state.getBooking();
    if (!booking || booking.currency === 'USD') return null;
    const eventCapLocal = this.eventCapUsd() * this.state.getFxSnapshot();
    return this.formatCurrency(eventCapLocal, booking.currency);
  }

  securitySourceLabel(): string {
    const source = this.securitySource();
    if (source === 'card') return 'Hold en tarjeta';
    if (source === 'wallet') return 'Crédito de seguridad';
    if (source === 'mixed') return 'Hold + Wallet';
    return 'Garantía configurada';
  }

  securitySourceDescription(): string {
    const source = this.securitySource();
    const guarantee = this.getGuarantee();

    if (source === 'card') {
      if (guarantee) {
        return `Preautorizamos ${this.formatArs(guarantee.holdArs)} (≈ ${this.formatUsd(guarantee.holdUsd)}) y capturamos sólo lo necesario.`;
      }
      return 'Reservamos un hold en tu tarjeta y liberamos el resto al cierre.';
    }

    if (source === 'wallet') {
      if (guarantee) {
        return `Bloqueamos ${this.formatUsd(guarantee.creditSecurityUsd)} en tu wallet (no retirable) como primera cobertura.`;
      }
      return 'Bloqueamos el crédito no retirable de tu wallet para cubrir incidentes.';
    }

    if (source === 'mixed') {
      return 'Usamos la combinación de hold y crédito wallet según tu selección.';
    }

    return 'Asignamos automáticamente la mejor combinación disponible para cubrir la franquicia.';
  }

  guaranteeWaterfallSteps(): WaterfallStep[] {
    const steps: WaterfallStep[] = [];
    const source = this.securitySource();
    const guarantee = this.getGuarantee();
    const franchise = this.getFranchise();
    const eventCapDisplay = this.formatUsd(this.eventCapUsd());
    const rolloverDisplay = franchise
      ? this.formatUsd(franchise.rolloverDeductibleUsd)
      : this.formatUsd(this.eventCapUsd() * 2);

    if (source === 'card' || source === 'mixed') {
      steps.push({
        label: '1. Hold / preautorización',
        description: guarantee
          ? `Reservamos ${this.formatArs(guarantee.holdArs)} (≈ ${this.formatUsd(guarantee.holdUsd)}) y reautorizamos alquileres >7 días.`
          : 'Reservamos un hold en tu tarjeta y lo revalidamos en reservas largas.',
      });
    } else {
      steps.push({
        label: '1. Crédito de seguridad',
        description: guarantee
          ? `Bloqueamos ${this.formatUsd(guarantee.creditSecurityUsd)} en tu wallet (no retirable).`
          : 'Bloqueamos el crédito de seguridad en tu wallet como primera cobertura.',
      });
    }

    steps.push({
      label: '2. Cobros adicionales',
      description:
        'Capturamos combustible, limpieza o daños al cierre. Si falta cobertura, solicitamos top-up o transferencia en 72 h.',
    });

    steps.push({
      label: `3. FGO (hasta ${eventCapDisplay})`,
      description: `El fondo cubre el remanente solo con evidencia completa y RC ≥ 1.0. Franquicia por vuelco: ${rolloverDisplay}.`,
    });

    steps.push({
      label: '4. Recupero y devolución',
      description:
        'Todo pago del FGO pasa a recupero. Lo cobrado vuelve al fondo y actualiza tu score de riesgo.',
    });

    return steps;
  }

  guaranteeCopy(): GuaranteeCopy | null {
    return this.state.getGuaranteeCopy();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private securitySource(): 'card' | 'wallet' | 'mixed' | 'none' {
    const method = this.selectedPaymentMethod();
    if (method === 'credit_card') return 'card';
    if (method === 'wallet') return 'wallet';
    if (method === 'partial_wallet') return 'mixed';
    return 'none';
  }

  private getFranchise(): FranchiseInfo | null {
    return this.state.getFranchiseInfo();
  }

  private getGuarantee(): GuaranteeBreakdown | null {
    return this.state.getGuarantee();
  }

  private eventCapUsd(): number {
    const params = this.state.getFgoParameters();
    return params?.eventCapUsd ?? 800;
  }

  private formatUsd(amount: number): string {
    const formatter = this.currencyFormatter('USD', amount % 1 === 0 ? 0 : 2);
    return formatter.format(amount);
  }

  private formatArs(amount: number): string {
    const formatter = this.currencyFormatter('ARS', 0);
    return formatter.format(amount);
  }

  private formatCurrency(amount: number, currency: string): string {
    const formatter = this.currencyFormatter(currency, 0);
    return formatter.format(amount);
  }

  private currencyFormatter(currency: string, fractionDigits: number): Intl.NumberFormat {
    const key = `${currency}-${fractionDigits}`;
    if (this.formatCache.has(key)) {
      return this.formatCache.get(key)!;
    }
    const formatter = new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    this.formatCache.set(key, formatter);
    return formatter;
  }
}
