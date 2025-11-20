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
 * Servicio para obtener tasas de cambio EN TIEMPO REAL desde Binance API.
 *
 * IMPORTANTE: Hace fetch directo a Binance para obtener precio actualizado.
 * Aplica margen del 10% automáticamente (política de negocio).
 *
 * Características:
 * - Fetch directo a Binance API (precio en tiempo real)
 * - Cache en memoria de 30 segundos (evita spam a API)
 * - Aplica margen del 10% sobre precio Binance
 * - Conversión bidireccional ARS ↔ USD
 * - Fuente: Binance USDT/ARS spot market
 * - CORS habilitado - funciona desde navegador
 *
 * Uso:
 * ```typescript
 * const rate = await this.exchangeRateService.getRate('USDARS');
 * // rate ya incluye margen del 10%
 * const usd = await this.exchangeRateService.convertArsToUsd(10000);
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class ExchangeRateService {
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';
  private readonly CACHE_TTL_MS = 30000; // 30 segundos - precio en tiempo real

  private lastRate = signal<number | null>(null);
  private lastFetch = signal<number>(0);
  private readonly PLATFORM_MARGIN = 1.10; // 10% margen de protección

  /**
   * Obtiene la tasa de cambio EN TIEMPO REAL directamente desde Binance API
   *
   * IMPORTANTE: Hace fetch directo a Binance para obtener precio actualizado.
   * Aplica margen del 10% en el frontend.
   * Cache de 30 segundos para evitar exceso de requests.
   */
  async getRate(pair = 'USDARS'): Promise<number> {
    const now = Date.now();
    const cacheAge = now - this.lastFetch();

    // Check cache (30 segundos)
    if (this.lastRate() !== null && cacheAge < this.CACHE_TTL_MS) {
      const cached = this.lastRate()!;
      console.log(
        `💱 Usando cotización cacheada: ${cached} ARS/USD (age: ${Math.round(cacheAge / 1000)}s)`,
      );
      return cached;
    }

    try {
      // Fetch directo a Binance API (tiempo real)
      const symbol = pair === 'USDARS' ? 'USDTARS' : pair;
      const response = await fetch(`${this.BINANCE_API}?symbol=${symbol}`);

      if (!response.ok) {
        throw new Error(`Binance API error: ${response.status}`);
      }

      const binanceData = await response.json();
      const binanceRate = parseFloat(binanceData.price);

      if (isNaN(binanceRate) || binanceRate <= 0) {
        throw new Error(`Invalid rate from Binance: ${binanceData.price}`);
      }

      // Aplicar margen del 10% (política de negocio)
      const platformRate = binanceRate * this.PLATFORM_MARGIN;

      // Cachear en memoria
      this.lastRate.set(platformRate);
      this.lastFetch.set(now);

      console.log(
        `✅ Binance USDT/ARS EN TIEMPO REAL: ${binanceRate.toFixed(2)} → Con margen 10%: ${platformRate.toFixed(2)} ARS/USD`,
      );

      return platformRate;
    } catch (error) {
      console.error('Error obteniendo tasa de Binance:', error);
      throw new Error('No se pudo obtener tasa de cambio de Binance');
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
   * Obtiene el valor de la última tasa conocida (cacheada)
   * NOTA: Ya incluye el margen del 10%, no multiplicar nuevamente
   */
  getLastKnownRateValue(): number | null {
    return this.lastRate();
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
