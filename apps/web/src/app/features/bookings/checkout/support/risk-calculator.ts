import { Injectable } from '@angular/core';
import { BookingPaymentMethod } from '@core/models/wallet.model';
import { Booking } from '../../../../core/models';
import { FranchiseInfo } from './booking-franchise.service';

export interface GuaranteeBreakdown {
  paymentMethod: BookingPaymentMethod;
  fxSnapshot: number;
  holdArs: number;
  holdUsd: number;
  creditSecurityUsd: number;
  creditSecurityArs: number;
  franchiseStandardUsd: number;
  franchiseRolloverUsd: number;
  walletContributionUsd: number;
  cardContributionUsd: number;
}

interface GuaranteeCalculationInput {
  booking: Booking;
  franchise: FranchiseInfo;
  fxSnapshot: number;
  paymentMethod: BookingPaymentMethod;
  walletSplit: { wallet: number; card: number };
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutRiskCalculator {
  calculateGuarantee(input: GuaranteeCalculationInput): GuaranteeBreakdown {
    const { booking, franchise, fxSnapshot, paymentMethod, walletSplit } = input;
    const hasCard = paymentMethod === 'credit_card' || paymentMethod === 'partial_wallet';

    const rolloverUsd = franchise.rolloverDeductibleUsd;
    const holdUsd = hasCard ? this.calculateHoldUsd(rolloverUsd) : 0;
    const holdArs = hasCard
      ? this.calculateHoldArs(holdUsd, franchise.holdMinimumArs, fxSnapshot)
      : 0;

    const needsWalletSecurity = !hasCard;
    const creditSecurityUsd = needsWalletSecurity ? franchise.walletCreditUsd : 0;
    const creditSecurityArs = creditSecurityUsd * fxSnapshot;

    const walletContributionUsd = this.toUsd(walletSplit.wallet, booking.currency, fxSnapshot);
    const cardContributionUsd = this.toUsd(walletSplit.card, booking.currency, fxSnapshot);

    return {
      paymentMethod,
      fxSnapshot,
      holdArs,
      holdUsd,
      creditSecurityUsd,
      creditSecurityArs,
      franchiseStandardUsd: franchise.standardDeductibleUsd,
      franchiseRolloverUsd: franchise.rolloverDeductibleUsd,
      walletContributionUsd,
      cardContributionUsd,
    };
  }

  private calculateHoldUsd(rolloverUsd: number): number {
    return 0.35 * rolloverUsd;
  }

  private calculateHoldArs(holdUsd: number, minimumArs: number, fxSnapshot: number): number {
    const holdArs = holdUsd * fxSnapshot;
    return Math.max(minimumArs, Math.round(holdArs));
  }

  private toUsd(amount: number, currency: Booking['currency'], fxSnapshot: number): number {
    if (!amount) return 0;
    if (currency === 'USD') return amount;
    return amount / fxSnapshot;
  }
}
