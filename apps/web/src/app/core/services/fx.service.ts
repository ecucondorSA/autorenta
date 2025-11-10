import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, of } from 'rxjs';
import {
  FxSnapshot,
  CurrencyCode,
  isFxExpired,
  isFxVariationExceeded,
} from '../models/booking-detail-payment.model';
import { SupabaseClientService } from './supabase-client.service';
import { ExchangeRateService } from './exchange-rate.service';

/**
 * Servicio para gestionar tipos de cambio (FX)
 * Maneja snapshots, validación de expiración y revalidación
 * USA: ExchangeRateService (Binance con margen del 20%)
 */
@Injectable({
  providedIn: 'root',
})
export class FxService {
  private supabaseClient = inject(SupabaseClientService).getClient();
  private exchangeRateService = inject(ExchangeRateService);

  /**
   * Obtiene el snapshot actual de FX para USD_ARS desde Binance
   * Usa exchange_rates table (con margen del 20%)
   */
  getFxSnapshot(
    _fromCurrency: CurrencyCode = 'USD',
    toCurrency: CurrencyCode = 'ARS',
  ): Observable<FxSnapshot | null> {
    const pair = `USDT${toCurrency}`;

    return from(
      this.supabaseClient
        .from('exchange_rates')
        .select('*')
        .eq('pair', pair)
        .eq('is_active', true)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single(),
    ).pipe(
      map((response) => {
        if (response.error || !response.data) {
          return null;
        }

        const data = response.data;
        const timestamp = new Date(data.last_updated);
        const expiresAt = new Date(timestamp);
        expiresAt.setDate(expiresAt.getDate() + 7);

        const snapshot: FxSnapshot = {
          rate: data.platform_rate,
          timestamp,
          fromCurrency: 'USD',
          toCurrency: toCurrency as CurrencyCode,
          expiresAt,
          isExpired: new Date() > expiresAt,
          variationThreshold: 0.1,
        };

        console.log(
          `💱 FX Snapshot (Binance): 1 USD = ${snapshot.rate} ARS (Binance: ${data.binance_rate}, Margen: ${data.margin_percent}%)`,
        );

        return snapshot;
      }),
      catchError((error: unknown) => {
        console.error('Error obteniendo FX snapshot:', error);
        return of(null);
      }),
    );
  }

  /**
   * Valida si un FX snapshot necesita revalidación
   */
  needsRevalidation(fxSnapshot: FxSnapshot): { needs: boolean; reason?: string } {
    if (isFxExpired(fxSnapshot)) {
      return {
        needs: true,
        reason: 'El tipo de cambio ha expirado (más de 7 días)',
      };
    }

    return { needs: false };
  }

  /**
   * Revalida un FX snapshot obteniendo la tasa actual
   * y comparando con el snapshot anterior
   */
  revalidateFxSnapshot(oldSnapshot: FxSnapshot): Observable<{
    needsUpdate: boolean;
    newSnapshot?: FxSnapshot;
    reason?: string;
  }> {
    return this.getFxSnapshot(oldSnapshot.fromCurrency, oldSnapshot.toCurrency).pipe(
      map((newSnapshot) => {
        if (!newSnapshot) {
          return {
            needsUpdate: false,
            reason: 'No se pudo obtener nueva tasa',
          };
        }

        const variationExceeded = isFxVariationExceeded(
          oldSnapshot.rate,
          newSnapshot.rate,
          oldSnapshot.variationThreshold,
        );

        if (variationExceeded) {
          return {
            needsUpdate: true,
            newSnapshot,
            reason: `La tasa ha variado más del ${oldSnapshot.variationThreshold * 100}%`,
          };
        }

        if (isFxExpired(oldSnapshot)) {
          return {
            needsUpdate: true,
            newSnapshot,
            reason: 'El snapshot ha expirado',
          };
        }

        return {
          needsUpdate: false,
          newSnapshot,
        };
      }),
    );
  }

  /**
   * Convierte monto de una moneda a otra usando el snapshot
   */
  convert(amount: number, fxSnapshot: FxSnapshot): number {
    return amount * fxSnapshot.rate;
  }

  /**
   * Convierte monto inverso (de moneda destino a origen)
   */
  convertReverse(amount: number, fxSnapshot: FxSnapshot): number {
    return amount / fxSnapshot.rate;
  }

  /**
   * Mapea FxSnapshotDb (de DB) a FxSnapshot (para componentes)
   */
  private mapFxSnapshotFromDb(db: Record<string, unknown>): FxSnapshot {
    const timestamp = new Date(String(db.timestamp || db.created_at));
    const expiresAt = new Date(timestamp);
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      rate: Number(db.rate),
      timestamp,
      fromCurrency: db.from_currency as CurrencyCode,
      toCurrency: db.to_currency as CurrencyCode,
      expiresAt,
      isExpired: new Date() > expiresAt,
      variationThreshold: 0.1,
    };
  }

  /**
   * Obtiene la tasa actual de forma asíncrona
   * USA: ExchangeRateService (Binance)
   */
  async getCurrentRateAsync(
    _fromCurrency: CurrencyCode = 'USD',
    _toCurrency: CurrencyCode = 'ARS',
  ): Promise<number> {
    try {
      const rate = await this.exchangeRateService.getPlatformRate('USDTARS');
      return rate;
    } catch (error) {
      console.error('Error obteniendo tasa desde exchange_rates:', error);

      try {
        const binanceRate = await this.exchangeRateService.getBinanceRate();
        return binanceRate * 1.2;
      } catch (binanceError) {
        console.error('Error obteniendo tasa de Binance:', binanceError);
        throw new Error('No se pudo obtener tasa de cambio de ninguna fuente');
      }
    }
  }
}
