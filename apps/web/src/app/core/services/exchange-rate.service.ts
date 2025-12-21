import { LoggerService } from './logger.service';
import {Injectable, signal, inject} from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from './supabase-client.service';

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
  private readonly logger = inject(LoggerService);
  private readonly supabase: SupabaseClient = injectSupabase();
  private readonly BINANCE_API = 'https://api.binance.com/api/v3/ticker/price';
  private readonly CACHE_TTL_MS = 30000; // 30 segundos - precio en tiempo real

  private lastRates = signal<{
    binance: number; // Tasa raw de Binance (sin margen)
    platform: number; // Tasa con 10% margen (solo para garantías)
  } | null>(null);
  private lastFetch = signal<number>(0);
  private readonly PLATFORM_MARGIN = 1.1; // 10% margen SOLO para garantías USD→ARS

  /**
   * Obtiene tasa Binance RAW (sin margen) para conversiones de precios
   * Uso: Convertir ARS → USD en listados de autos
   */
  async getBinanceRate(pair = 'USDARS'): Promise<number> {
    await this.fetchRatesIfNeeded(pair);
    const rates = this.lastRates();

    if (!rates) {
      throw new Error('No se pudo obtener tasa de Binance');
    }

    return rates.binance;
  }

  /**
   * Obtiene tasa con 10% margen SOLO para garantías USD→ARS
   * Uso: Convertir garantía de USD 600 a ARS con protección de volatilidad
   */
  async getPlatformRate(pair = 'USDARS'): Promise<number> {
    await this.fetchRatesIfNeeded(pair);
    const rates = this.lastRates();

    if (!rates) {
      throw new Error('No se pudo obtener tasa de cambio');
    }

    return rates.platform;
  }

  /**
   * @deprecated Use getPlatformRate() for guarantees or getBinanceRate() for prices
   */
  async getRate(pair = 'USDARS'): Promise<number> {
    return this.getPlatformRate(pair);
  }

  /**
   * Fetch rates from Binance if cache expired
   * Caches both binance (raw) and platform (with margin) rates
   */
  private async fetchRatesIfNeeded(pair = 'USDARS'): Promise<void> {
    const now = Date.now();
    const cacheAge = now - this.lastFetch();

    // Check cache (30 segundos)
    if (this.lastRates() !== null && cacheAge < this.CACHE_TTL_MS) {
      const cached = this.lastRates()!;
      this.logger.debug(
        `💱 Usando cotización cacheada: Binance ${cached.binance.toFixed(2)} | Platform ${cached.platform.toFixed(2)} ARS/USD (age: ${Math.round(cacheAge / 1000)}s)`,
      );
      return;
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

      // Aplicar margen del 10% SOLO para platform_rate (garantías)
      const platformRate = binanceRate * this.PLATFORM_MARGIN;

      // Cachear ambas tasas en memoria
      this.lastRates.set({
        binance: binanceRate,
        platform: platformRate,
      });
      this.lastFetch.set(now);

      this.logger.debug(
        `✅ Binance USDT/ARS EN TIEMPO REAL: ${binanceRate.toFixed(2)} | Con margen 10% (garantías): ${platformRate.toFixed(2)} ARS/USD`,
      );
    } catch (error) {
      console.error('Error obteniendo tasa de Binance:', error);
      throw new Error('No se pudo obtener tasa de cambio de Binance');
    }
  }

  /**
   * Convierte pesos argentinos a dólares usando tasa Binance SIN margen
   * Uso: Mostrar equivalente en USD de precios en ARS
   */
  async convertArsToUsd(ars: number): Promise<number> {
    const rate = await this.getBinanceRate(); // SIN margen
    const usd = ars / rate;
    return Math.round(usd * 100) / 100;
  }

  /**
   * Convierte dólares a pesos argentinos usando tasa CON margen (garantías)
   * Uso: Convertir garantía USD → ARS
   */
  async convertUsdToArs(usd: number, useMargin = true): Promise<number> {
    const rate = useMargin
      ? await this.getPlatformRate() // Con 10% margen
      : await this.getBinanceRate(); // Sin margen
    const ars = usd * rate;
    return Math.round(ars * 100) / 100;
  }

  /**
   * Obtiene las últimas tasas conocidas (cacheadas)
   */
  getLastKnownRates(): { binance: number; platform: number } | null {
    return this.lastRates();
  }

  /**
   * Obtiene la tasa platform (con margen) cacheada
   */
  getLastKnownPlatformRate(): number | null {
    return this.lastRates()?.platform ?? null;
  }

  /**
   * Obtiene la tasa Binance (sin margen) cacheada
   */
  getLastKnownBinanceRate(): number | null {
    return this.lastRates()?.binance ?? null;
  }

  /**
   * Verifica si el cache de la tasa está vigente
   */
  isCacheValid(): boolean {
    const cacheAge = Date.now() - this.lastFetch();
    return this.lastRates() !== null && cacheAge < this.CACHE_TTL_MS;
  }

  /**
   * Limpia el cache de las tasas
   */
  clearCache(): void {
    this.lastRates.set(null);
    this.lastFetch.set(0);
  }

  /**
   * Retorna objeto con info de conversión para mostrar en UI
   */
  async getConversionPreview(ars: number): Promise<{
    ars: number;
    usd: number;
    binanceRate: number;
    platformRate: number;
  }> {
    const binanceRate = await this.getBinanceRate();
    const platformRate = await this.getPlatformRate();
    const usd = Math.round((ars / binanceRate) * 100) / 100;

    return {
      ars,
      usd,
      binanceRate,
      platformRate,
    };
  }
}
