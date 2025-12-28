import { Injectable, inject } from '@angular/core';
import {
  CurrencyCode,
  FxSnapshot,
  isFxExpired,
  isFxVariationExceeded,
} from '@core/models/booking-detail-payment.model';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { injectSupabase } from '@core/services/infrastructure/supabase-client.service';
import { ExchangeRateService } from '@core/services/payments/exchange-rate.service';
import { Observable, catchError, from, map, of } from 'rxjs';

/**
 * Servicio para gestionar tipos de cambio (FX)
 * Maneja snapshots, validación de expiración y revalidación
 *
 * IMPORTANTE: Ahora obtiene precio EN TIEMPO REAL de Binance API.
 * El ExchangeRateService aplica margen del 10% automáticamente.
 *
 * Flujo:
 * - Frontend → ExchangeRateService → Binance API (tiempo real)
 * - Cache en memoria: 30 segundos
 * - Margen del 10% aplicado automáticamente
 */
@Injectable({
  providedIn: 'root',
})
export class FxService {
  private readonly logger = inject(LoggerService);
  private supabaseClient = injectSupabase();
  private exchangeRateService = inject(ExchangeRateService);

  /**
   * Obtiene el snapshot actual de FX para USD_ARS desde la base de datos
   * Usa exchange_rates table con el campo 'rate' (ya incluye margen aplicado)
   *
   * NOTA: data.rate YA incluye el margen, no multiplicar nuevamente
   */
  getFxSnapshot(
    _fromCurrency: CurrencyCode = 'USD',
    toCurrency: CurrencyCode = 'ARS',
  ): Observable<FxSnapshot | null> {
    const pair = `${_fromCurrency}${toCurrency}`;

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
        if (response['error'] || !response.data) {
          return null;
        }

        const data = response.data;
        const timestamp = new Date(data.last_updated);
        const expiresAt = new Date(timestamp);
        expiresAt.setDate(expiresAt.getDate() + 7);

        const snapshot: FxSnapshot = {
          rate: data.rate, // ✅ Usar 'rate' directamente (ya incluye margen)
          timestamp,
          fromCurrency: 'USD',
          toCurrency: toCurrency as CurrencyCode,
          expiresAt,
          isExpired: new Date() > expiresAt,
          variationThreshold: 0.1,
        };

        this.logger.debug(
          `💱 FX Snapshot - Tasa: ${snapshot.rate} ARS/USD (fuente: ${data.source}, actualizada: ${data.last_updated})`,
        );

        return snapshot;
      }),
      catchError((error: unknown) => {
        this.logger.error('Error obteniendo FX snapshot', error);
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
    const timestamp = new Date(String(db['timestamp'] || db['created_at']));
    const expiresAt = new Date(timestamp);
    expiresAt.setDate(expiresAt.getDate() + 7);

    return {
      rate: Number(db['rate']),
      timestamp,
      fromCurrency: db['from_currency'] as CurrencyCode,
      toCurrency: db['to_currency'] as CurrencyCode,
      expiresAt,
      isExpired: new Date() > expiresAt,
      variationThreshold: 0.1,
    };
  }

  /**
   * Obtiene la tasa actual de forma asíncrona
   * NOTA: Retorna platform_rate (CON margen 10%) para garantías
   * Para precios, usar exchangeRateService.getBinanceRate() directamente
   */
  async getCurrentRateAsync(
    _fromCurrency: CurrencyCode = 'USD',
    _toCurrency: CurrencyCode = 'ARS',
  ): Promise<number> {
    try {
      const rate = await this.exchangeRateService.getPlatformRate('USDARS');
      return rate;
    } catch (error) {
      this.logger.error('Error obteniendo tasa desde exchange_rates', error);
      throw new Error('No se pudo obtener tasa de cambio de ninguna fuente');
    }
  }

  /**
   * Obtiene la tasa Binance SIN margen para conversiones de precio
   */
  async getBinanceRateAsync(): Promise<number> {
    try {
      return await this.exchangeRateService.getBinanceRate('USDARS');
    } catch (error) {
      this.logger.error('Error obteniendo tasa Binance', error);
      throw new Error('No se pudo obtener tasa de Binance');
    }
  }
}
