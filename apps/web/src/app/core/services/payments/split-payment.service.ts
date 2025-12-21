import { Injectable } from '@angular/core';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';

export interface SplitPaymentCollector {
  userId: string;
  percentage: number;
  description?: string;
}

export interface SplitPaymentRequest {
  paymentIntentId: string;
  bookingId: string;
  totalAmount: number;
  currency: string;
  collectors: SplitPaymentCollector[];
  platformFeePercentage?: number; // Default: 5%
}

export interface PaymentSplit {
  id: string;
  paymentId: string;
  bookingId: string;
  collectorId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  payoutId?: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface SplitPaymentResponse {
  success: boolean;
  splits: PaymentSplit[];
  totalProcessed: number;
  totalFee: number;
  errors?: string[];
}

type PaymentRecord = Record<string, unknown> & {
  amount?: number | null;
  currency?: string | null;
};

@Injectable({ providedIn: 'root' })
export class SplitPaymentService {
  private readonly DEFAULT_PLATFORM_FEE = 5; // 5% platform fee
  private readonly MIN_SPLIT_AMOUNT = 100; // Minimum ARS

  constructor(private supabase: SupabaseClientService) {}

  /**
   * Process a split payment across multiple collectors
   * Validates percentages, calculates amounts, and creates payment splits
   */
  processSplitPayment(request: SplitPaymentRequest): Observable<SplitPaymentResponse> {
    return from(this.validateAndProcessPayment(request));
  }

  /**
   * Get payment splits for a specific booking
   */
  getBookingSplits(bookingId: string): Observable<PaymentSplit[]> {
    return from(
      this.supabase.getClient().from('payment_splits').select('*').eq('booking_id', bookingId),
    ).pipe(
      map(({ data }) => data as PaymentSplit[]),
      catchError(() => {
        return throwError(() => new Error('Failed to fetch payment splits'));
      }),
    );
  }

  /**
   * Get all splits for a user (as collector)
   */
  getUserSplits(userId: string): Observable<PaymentSplit[]> {
    return from(
      this.supabase
        .getClient()
        .from('payment_splits')
        .select('*')
        .eq('collector_id', userId)
        .order('created_at', { ascending: false }),
    ).pipe(
      map(({ data }) => data as PaymentSplit[]),
      catchError(() => {
        return throwError(() => new Error('Failed to fetch user payment splits'));
      }),
    );
  }

  /**
   * Get split statistics for a user
   */
  getUserSplitStats(userId: string): Observable<{
    totalEarnings: number;
    totalPending: number;
    totalCompleted: number;
    completedPayouts: number;
    averagePayoutAmount: number;
  }> {
    return this.getUserSplits(userId).pipe(
      map((splits) => {
        const completed = splits.filter((s) => s.status === 'completed');
        const pending = splits.filter((s) => s.status === 'pending' || s.status === 'processing');

        return {
          totalEarnings: splits.reduce((sum, s) => sum + (s.netAmount || 0), 0),
          totalPending: pending.reduce((sum, s) => sum + (s.netAmount || 0), 0),
          totalCompleted: completed.reduce((sum, s) => sum + (s.netAmount || 0), 0),
          completedPayouts: completed.length,
          averagePayoutAmount:
            completed.length > 0
              ? completed.reduce((sum, s) => sum + (s.netAmount || 0), 0) / completed.length
              : 0,
        };
      }),
      catchError(() => {
        return throwError(() => new Error('Failed to calculate payment statistics'));
      }),
    );
  }

  /**
   * Mark a split payment as completed (after successful payout)
   */
  completeSplit(splitId: string, payoutId: string): Observable<PaymentSplit> {
    return from(
      this.supabase
        .getClient()
        .from('payment_splits')
        .update({
          status: 'completed',
          payoutId,
          completedAt: new Date().toISOString(),
        })
        .eq('id', splitId)
        .select()
        .single(),
    ).pipe(
      map(({ data }) => data as PaymentSplit),
      switchMap((split) => this.createWalletTransaction(split)),
      catchError(() => {
        return throwError(() => new Error('Failed to complete payment split'));
      }),
    );
  }

  /**
   * Mark a split payment as failed
   */
  failSplit(splitId: string, failureReason: string): Observable<PaymentSplit> {
    return from(
      this.supabase
        .getClient()
        .from('payment_splits')
        .update({
          status: 'failed',
          failureReason,
        })
        .eq('id', splitId)
        .select()
        .single(),
    ).pipe(
      map(({ data }) => data as PaymentSplit),
      catchError(() => {
        return throwError(() => new Error('Failed to mark payment split as failed'));
      }),
    );
  }

  /**
   * Get detailed breakdown for a specific payment
   */
  getPaymentBreakdown(paymentId: string): Observable<{
    payment: unknown;
    splits: PaymentSplit[];
    summary: {
      totalAmount: number;
      totalFees: number;
      netDistributed: number;
    };
  }> {
    return from(
      Promise.all([
        this.supabase.getClient().from('payments').select('*').eq('id', paymentId).single(),
        this.supabase.getClient().from('payment_splits').select('*').eq('payment_id', paymentId),
      ]),
    ).pipe(
      map(([paymentResponse, splitsResponse]) => {
        const payment = (paymentResponse.data as PaymentRecord | null) ?? null;
        const splitsList = (splitsResponse.data || []) as PaymentSplit[];
        return {
          payment,
          splits: splitsList,
          summary: {
            totalAmount: payment?.amount ?? 0,
            totalFees: splitsList.reduce((sum, s) => sum + (s.platformFee || 0), 0),
            netDistributed: splitsList.reduce((sum, s) => sum + (s.netAmount || 0), 0),
          },
        };
      }),
      catchError(() => {
        return throwError(() => new Error('Failed to fetch payment breakdown'));
      }),
    );
  }

  /**
   * Private method: Validate and process payment
   */
  private async validateAndProcessPayment(
    request: SplitPaymentRequest,
  ): Promise<SplitPaymentResponse> {
    const errors: string[] = [];

    // Validación 1: Verificar que los porcentajes sumen 100%
    const totalPercentage = request.collectors.reduce((sum, c) => sum + c.percentage, 0);
    if (Math.abs(totalPercentage - 100) > 0.01) {
      return {
        success: false,
        splits: [],
        totalProcessed: 0,
        totalFee: 0,
        errors: ['Collector percentages must sum to 100%'],
      };
    }

    // Validación 2: Verificar que amount es positivo
    if (request.totalAmount <= 0) {
      return {
        success: false,
        splits: [],
        totalProcessed: 0,
        totalFee: 0,
        errors: ['Total amount must be greater than 0'],
      };
    }

    // Validación 3: Verificar que no haya collectors duplicados
    const uniqueCollectors = new Set(request.collectors.map((c) => c.userId));
    if (uniqueCollectors.size !== request.collectors.length) {
      return {
        success: false,
        splits: [],
        totalProcessed: 0,
        totalFee: 0,
        errors: ['Duplicate collectors found'],
      };
    }

    const platformFeePercentage = request.platformFeePercentage || this.DEFAULT_PLATFORM_FEE;
    const splits: PaymentSplit[] = [];
    let totalFee = 0;

    // Calcular splits para cada collector
    for (const collector of request.collectors) {
      const collectorAmount = (request.totalAmount * collector.percentage) / 100;

      // Validación 4: Verificar monto mínimo
      if (collectorAmount < this.MIN_SPLIT_AMOUNT) {
        errors.push(
          `Collector ${collector.userId}: amount ${collectorAmount} is below minimum of ${this.MIN_SPLIT_AMOUNT}`,
        );
        continue;
      }

      const platformFee = (collectorAmount * platformFeePercentage) / 100;
      const netAmount = collectorAmount - platformFee;
      totalFee += platformFee;

      splits.push({
        id: this.generateId(),
        paymentId: request.paymentIntentId,
        bookingId: request.bookingId,
        collectorId: collector.userId,
        amount: collectorAmount,
        platformFee,
        netAmount,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
    }

    // Si no hay splits válidos, retornar error
    if (splits.length === 0) {
      return {
        success: false,
        splits: [],
        totalProcessed: 0,
        totalFee: 0,
        errors: errors.length > 0 ? errors : ['No valid splits to process'],
      };
    }

    // Insertar splits en la base de datos
    try {
      const { error: insertError } = await this.supabase
        .getClient()
        .from('payment_splits')
        .insert(splits);

      if (insertError) {
        throw insertError;
      }

      // Crear transacciones de billetera para cada collector
      for (const split of splits) {
        await this.createWalletTransaction(split);
      }

      return {
        success: true,
        splits,
        totalProcessed: splits.length,
        totalFee,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (_error) {
      return {
        success: false,
        splits: [],
        totalProcessed: 0,
        totalFee: 0,
        errors: [
          ...(errors || []),
          `Database error: ${_error instanceof Error ? _error.message : 'Unknown error'}`,
        ],
      };
    }
  }

  /**
   * Private method: Create wallet transaction for split
   */
  private async createWalletTransaction(split: PaymentSplit): Promise<PaymentSplit> {
    // Crear transacción de billetera
    const { error: txError } = await this.supabase.getClient().from('wallet_transactions').insert({
      user_id: split.collectorId,
      type: 'payout',
      status: 'pending',
      amount: split.netAmount,
      currency: 'ARS',
      reference_type: 'payment_split',
      reference_id: split.id,
      provider: 'mercadopago_split',
      created_at: new Date().toISOString(),
    });

    if (txError) {
      throw txError;
    }

    // Crear entrada en wallet_ledger para auditoría
    await this.supabase
      .getClient()
      .from('wallet_ledger')
      .insert({
        user_id: split.collectorId,
        kind: 'split_payment',
        amount: split.netAmount,
        currency: 'ARS',
        transaction_id: split.id,
        booking_id: split.bookingId,
        meta: {
          split_id: split.id,
          payment_id: split.paymentId,
          platform_fee: split.platformFee,
        },
        ts: new Date().toISOString(),
      });

    return split;
  }

  /**
   * Private method: Generate unique ID
   */
  private generateId(): string {
    return `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
