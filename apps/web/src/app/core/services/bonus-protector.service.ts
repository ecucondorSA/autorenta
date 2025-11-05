import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { from, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { SupabaseClientService } from './supabase-client.service';
import { LoggerService } from './logger.service';

export interface BonusProtector {
  has_active_protector: boolean;
  addon_id: string | null;
  protection_level: number;
  max_protected_claims: number;
  claims_used: number;
  remaining_uses: number;
  purchase_date: string | null;
  expires_at: string | null;
  days_until_expiration: number | null;
  is_expired: boolean;
}

export interface PurchaseProtectorResult {
  success: boolean;
  message: string;
  addon_id: string;
  protection_level: number;
  max_protected_claims: number;
  expires_at: string;
  price_paid_cents: number;
}

@Injectable({
  providedIn: 'root',
})
export class BonusProtectorService {
  private readonly supabase: SupabaseClient = inject(SupabaseClientService).getClient();
  private readonly logger = inject(LoggerService);

  readonly protector = signal<BonusProtector | null>(null);
  readonly loading = signal(false);
  readonly error = signal<{ message: string } | null>(null);

  readonly hasActiveProtector = computed(() => this.protector()?.has_active_protector ?? false);
  readonly remainingUses = computed(() => this.protector()?.remaining_uses ?? 0);
  readonly protectionLevel = computed(() => this.protector()?.protection_level ?? 0);

  constructor() {
    this.getActiveProtector().subscribe();
  }

  getActiveProtector(userId?: string): Observable<BonusProtector> {
    this.loading.set(true);
    this.error.set(null);

    return from(
      this.supabase.rpc('get_active_bonus_protector', userId ? { p_user_id: userId } : {})
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const protector = data[0] as BonusProtector;
        this.protector.set(protector);
        return protector;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al obtener Protector de Bonus');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  purchaseProtector(userId: string, protectionLevel: number = 1): Observable<PurchaseProtectorResult> {
    this.loading.set(true);
    this.error.set(null);

    const prices = { 1: 1500, 2: 3000, 3: 4500 }; // $15, $30, $45

    return from(
      this.supabase.rpc('purchase_bonus_protector', {
        p_user_id: userId,
        p_protection_level: protectionLevel,
        p_price_cents: prices[protectionLevel as keyof typeof prices],
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;
        const result = data[0] as PurchaseProtectorResult;

        if (result.success) {
          this.getActiveProtector(userId).subscribe();
        }

        return result;
      }),
      catchError((err) => {
        this.handleError(err, 'Error al comprar Protector de Bonus');
        return throwError(() => err);
      }),
      tap(() => this.loading.set(false))
    );
  }

  refresh(): void {
    this.getActiveProtector().subscribe();
  }

  private handleError(error: any, defaultMessage: string): void {
    const message = error?.message || defaultMessage;
    this.error.set({ message });
    this.loading.set(false);
    this.logger.error(defaultMessage, error);
  }
}
