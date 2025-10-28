import { Injectable } from '@angular/core';
import { Observable, from, interval, throwError, of } from 'rxjs';
import { map, catchError, switchMap, filter, take } from 'rxjs/operators';
import { SupabaseClientService } from './supabase-client.service';

export interface PayoutRequest {
  splitId: string;
  userId: string;
  amount: number;
  currency: string;
}

export interface Payout {
  id: string;
  splitId: string;
  userId: string;
  bankAccountId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  provider: string;
  providerPayoutId?: string;
  providerResponse?: Record<string, any>;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
}

export interface BankAccount {
  id: string;
  userId: string;
  accountNumber: string;
  bankCode: string;
  accountHolder: string;
  accountType: 'checking' | 'savings';
  isDefault: boolean;
  status: 'verified' | 'unverified' | 'invalid';
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PayoutService {
  private readonly PAYOUT_MIN_AMOUNT = 1000; // ARS 1000 minimum
  private readonly PAYOUT_MAX_AMOUNT = 1000000; // ARS 1,000,000 maximum
  private readonly PROCESSING_TIMEOUT = 300000; // 5 minutes

  constructor(private supabase: SupabaseClientService) {}

  /**
   * Initiate a payout to a collector's bank account
   */
  initiatePayout(request: PayoutRequest): Observable<Payout> {
    return from(this.validateAndInitiatePayout(request));
  }

  /**
   * Get all payouts for a user
   */
  getUserPayouts(userId: string): Observable<Payout[]> {
    return from(
      this.supabase.getClient()
        .from('payouts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data }) => data as Payout[]),
      catchError(error => {
        return throwError(() => new Error('Failed to fetch payouts'));
      })
    );
  }

  /**
   * Get payout status
   */
  getPayoutStatus(payoutId: string): Observable<Payout> {
    return from(
      this.supabase.getClient()
        .from('payouts')
        .select('*')
        .eq('id', payoutId)
        .single()
    ).pipe(
      map(({ data }) => data as Payout),
      catchError(error => {
        return throwError(() => new Error('Failed to fetch payout status'));
      })
    );
  }

  /**
   * Get user's default bank account
   */
  getDefaultBankAccount(userId: string): Observable<BankAccount | null> {
    return from(
      this.supabase.getClient()
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single()
    ).pipe(
      map(({ data }) => (data as BankAccount) || null),
      catchError(error => {
        if (error.code === 'PGRST116') {
          return of(null); // No default account found
        }
        return throwError(() => new Error('Failed to fetch bank account'));
      })
    );
  }

  /**
   * Get all bank accounts for a user
   */
  getUserBankAccounts(userId: string): Observable<BankAccount[]> {
    return from(
      this.supabase.getClient()
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
    ).pipe(
      map(({ data }) => data as BankAccount[]),
      catchError(error => {
        return throwError(() => new Error('Failed to fetch bank accounts'));
      })
    );
  }

  /**
   * Add a new bank account
   */
  addBankAccount(
    userId: string,
    account: Omit<BankAccount, 'id' | 'userId' | 'createdAt' | 'status'>
  ): Observable<BankAccount> {
    return from(
      this.supabase.getClient()
        .from('bank_accounts')
        .insert({
          user_id: userId,
          ...account,
          status: 'unverified',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()
    ).pipe(
      map(({ data }) => data as BankAccount),
      catchError(error => {
        return throwError(() => new Error('Failed to add bank account'));
      })
    );
  }

  /**
   * Set default bank account
   */
  setDefaultBankAccount(
    userId: string,
    accountId: string
  ): Observable<BankAccount> {
    return from(
      this.supabase.getClient().rpc('set_default_bank_account', {
        user_id: userId,
        account_id: accountId,
      })
    ).pipe(
      switchMap(() =>
        this.supabase.getClient()
          .from('bank_accounts')
          .select('*')
          .eq('id', accountId)
          .single()
      ),
      map(({ data }) => data as BankAccount),
      catchError(error => {
        return throwError(() => new Error('Failed to set default bank account'));
      })
    );
  }

  /**
   * Monitor payout processing status
   */
  monitorPayoutStatus(payoutId: string): Observable<Payout> {
    return interval(5000).pipe(
      switchMap(() => this.getPayoutStatus(payoutId)),
      filter(payout => payout.status !== 'processing'),
      take(1),
      catchError(error => {
        return throwError(() => new Error('Failed to monitor payout status'));
      })
    );
  }

  /**
   * Get payout statistics for a user
   */
  getPayoutStats(userId: string): Observable<{
    totalPayouts: number;
    totalAmount: number;
    pendingPayouts: number;
    pendingAmount: number;
    completedPayouts: number;
    completedAmount: number;
    averagePayoutAmount: number;
  }> {
    return this.getUserPayouts(userId).pipe(
      map(payouts => {
        const completed = payouts.filter(p => p.status === 'completed');
        const pending = payouts.filter(p => p.status === 'pending' || p.status === 'processing');

        return {
          totalPayouts: payouts.length,
          totalAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
          pendingPayouts: pending.length,
          pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
          completedPayouts: completed.length,
          completedAmount: completed.reduce((sum, p) => sum + p.amount, 0),
          averagePayoutAmount:
            completed.length > 0
              ? completed.reduce((sum, p) => sum + p.amount, 0) / completed.length
              : 0,
        };
      }),
      catchError(error => {
        return throwError(() => new Error('Failed to calculate payout statistics'));
      })
    );
  }

  /**
   * Request a manual payout
   */
  requestPayout(userId: string, amount: number): Observable<Payout> {
    return this.getDefaultBankAccount(userId).pipe(
      switchMap(bankAccount => {
        if (!bankAccount) {
          return throwError(() => new Error('No default bank account configured'));
        }

        if (bankAccount.status !== 'verified') {
          return throwError(() => new Error('Bank account not verified'));
        }

        return this.initiatePayout({
          splitId: `manual_${Date.now()}`,
          userId,
          amount,
          currency: 'ARS',
        });
      }),
      catchError(error => {
        return throwError(() => error);
      })
    );
  }

  /**
   * Private: Validate and initiate payout
   */
  private async validateAndInitiatePayout(
    request: PayoutRequest
  ): Promise<Payout> {
    // Validar monto
    if (request.amount < this.PAYOUT_MIN_AMOUNT) {
      throw new Error(
        `Minimum payout amount is ${this.PAYOUT_MIN_AMOUNT} ${request.currency}`
      );
    }

    if (request.amount > this.PAYOUT_MAX_AMOUNT) {
      throw new Error(
        `Maximum payout amount is ${this.PAYOUT_MAX_AMOUNT} ${request.currency}`
      );
    }

    // Obtener cuenta bancaria default
    const { data: bankAccount, error: baError } = await this.supabase.getClient()
      .from('bank_accounts')
      .select('*')
      .eq('user_id', request.userId)
      .eq('is_default', true)
      .single();

    if (baError || !bankAccount) {
      throw new Error('No default bank account configured');
    }

    if ((bankAccount as any).status !== 'verified') {
      throw new Error('Bank account not verified');
    }

    // Validar que el usuario tenga suficiente balance
    const { data: wallet } = await this.supabase.getClient()
      .from('user_wallets')
      .select('available_balance')
      .eq('user_id', request.userId)
      .single();

    if (!wallet || (wallet as any).available_balance < request.amount) {
      throw new Error('Insufficient balance for payout');
    }

    // Crear registro de payout
    const payoutId = `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payout: Payout = {
      id: payoutId,
      splitId: request.splitId,
      userId: request.userId,
      bankAccountId: (bankAccount as any).id,
      amount: request.amount,
      currency: request.currency,
      status: 'pending',
      provider: 'mercadopago',
      createdAt: new Date().toISOString(),
    };

    const { error: insertError } = await this.supabase.getClient()
      .from('payouts')
      .insert(payout);

    if (insertError) {
      throw new Error(`Failed to create payout: ${insertError.message}`);
    }

    // Descontar del balance del usuario
    const { error: updateError } = await this.supabase.getClient()
      .from('user_wallets')
      .update({
        available_balance: (wallet as any).available_balance - request.amount,
      })
      .eq('user_id', request.userId);

    if (updateError) {
      // Si falla, revertir
      await this.supabase.getClient().from('payouts').delete().eq('id', payoutId);
      throw new Error(`Failed to update wallet: ${updateError.message}`);
    }

    // Crear transacción de auditoría
    await this.supabase.getClient().from('wallet_transactions').insert({
      user_id: request.userId,
      type: 'withdrawal',
      status: 'pending',
      amount: request.amount,
      currency: request.currency,
      reference_type: 'payout',
      reference_id: payoutId,
      provider: 'mercadopago',
      provider_transaction_id: payoutId,
      created_at: new Date().toISOString(),
    });

    return payout;
  }
}
