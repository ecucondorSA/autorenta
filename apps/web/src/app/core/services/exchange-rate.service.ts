import { Injectable, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from './supabase-client.service';

interface ExchangeRate {
  id: string;
  pair: string;
  source: string;
  rate: number; // Tasa de cambio (ya incluye margen del 10% desde Edge Function)
  is_active: boolean;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

/**
 * ExchangeRateService
 *
 * Servicio para obtener tasas de cambio desde la base de datos (actualizada desde Binance cada 30 min).
 *
 * IMPORTANTE: El campo 'rate' en la DB YA incluye el margen aplicado por el Edge Function.
 * NO multiplicar por 1.1 en el frontend - solo usar el valor directo de 'rate'.
 *
 * Características:
 * - Consulta tasas desde exchange_rates table
 * - Cache de 60 segundos para evitar consultas excesivas
 * - Fallback a Binance API si no hay tasas en DB
 * - Conversión bidireccional ARS ↔ USD
 * - Fuente: Binance USDT/ARS (NO es "Dólar Tarjeta" oficial)
 *
 * Uso:
 * ```typescript
 * const rate = await this.exchangeRateService.getRate('USDARS');
 * const usd = await this.exchangeRateService.convertArsToUsd(10000);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ExchangeRateService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';
  private readonly CACHE_TTL_MS = 60000; // 60 segundos

  private lastRate = signal<ExchangeRate | null>(null);
  private lastFetch = signal<number>(0);

  /**
   * Obtiene la tasa de cambio desde la base de datos
   *
   * NOTA: El campo 'rate' en la DB YA contiene el margen aplicado.
   * NO multiplicar por 1.1 en el frontend.
   *
   * El Edge Function actualiza la tasa cada 30 minutos desde Binance API
   * y aplica el margen de protección antes de guardarla en la DB.
   */
  async getRate(pair = 'USDARS'): Promise<number> {
    const now = Date.now();
    const cacheAge = now - this.lastFetch();

    if (this.lastRate() !== null && cacheAge < this.CACHE_TTL_MS) {
      const cached = this.lastRate()!;
      console.log(
        `💱 Usando cotización cacheada: ${cached.rate} ARS/USD (age: ${Math.round(cacheAge / 1000)}s)`,
      );
      return cached.rate;
    }

    try {
      const { data, error } = await this.supabase
        .from('exchange_rates')
        .select('*')
        .eq('pair', pair)
        .eq('is_active', true)
        .order('last_updated', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }

      if (!data) {
        throw new Error(`No exchange rate found for pair: ${pair}`);
      }

      this.lastRate.set(data as ExchangeRate);
      this.lastFetch.set(now);

      console.log(
        `✅ Tasa de cambio: ${data.rate} ARS/USD (fuente: ${data.source}, actualizada: ${data.last_updated})`,
      );

      return data.rate;
    } catch (error) {
      console.error('Error obteniendo tasa de DB:', error);

      try {
        const response = await fetch(`${this.BINANCE_API}?symbol=USDTARS`);

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status}`);
        }

        const binanceData = await response.json();
        const rate = parseFloat(binanceData.price);

        if (isNaN(rate) || rate <= 0) {
          throw new Error(`Invalid rate from Binance: ${binanceData.price}`);
        }

        console.log(`⚠️ Fallback a Binance directo: ${rate} ARS/USD`);

        return rate;
      } catch (binanceError) {
        console.error('Error obteniendo tasa de Binance:', binanceError);
        throw new Error('No se pudo obtener tasa de cambio de ninguna fuente');
      }
    }
  }

  /** @deprecated Use getRate() instead */
  async getPlatformRate(pair = 'USDARS'): Promise<number> {
    return this.getRate(pair);
  }

  /**
   * @deprecated La DB solo guarda 'rate' (ya con margen aplicado). Use getRate() en su lugar.
   */
  async getBinanceRate(): Promise<number> {
    return this.getRate();
  }

  /**
   * Convierte pesos argentinos a dólares estadounidenses
   */
  async convertArsToUsd(ars: number): Promise<number> {
    const rate = await this.getRate();
    const usd = ars / rate;
    return Math.round(usd * 100) / 100;
  }

  /**
   * Convierte dólares estadounidenses a pesos argentinos
   */
  async convertUsdToArs(usd: number): Promise<number> {
    const rate = await this.getRate();
    const ars = usd * rate;
    return Math.round(ars * 100) / 100;
  }

  /**
   * Obtiene la última tasa conocida (ExchangeRate object completo)
   */
  getLastKnownRate(): ExchangeRate | null {
    return this.lastRate();
  }

  /**
   * Obtiene el valor de la última tasa conocida
   * NOTA: Ya incluye el margen aplicado, no multiplicar nuevamente
   */
  getLastKnownRateValue(): number | null {
    return this.lastRate()?.rate ?? null;
  }

  /** @deprecated Use getLastKnownRateValue() instead */
  getLastKnownPlatformRate(): number | null {
    return this.getLastKnownRateValue();
  }

  /**
   * Verifica si el cache de la tasa está vigente
   */
  isCacheValid(): boolean {
    const cacheAge = Date.now() - this.lastFetch();
    return this.lastRate() !== null && cacheAge < this.CACHE_TTL_MS;
  }

  /**
   * Limpia el cache de la tasa
   */
  clearCache(): void {
    this.lastRate.set(null);
    this.lastFetch.set(0);
  }

  /**
   * Retorna objeto con toda la info de conversión para mostrar en UI
   */
  async getConversionPreview(ars: number): Promise<{
    ars: number;
    usd: number;
    rate: number;
  }> {
    const rate = await this.getRate();
    const usd = Math.round((ars / rate) * 100) / 100;

    return {
      ars,
      usd,
      rate,
    };
  }
}
