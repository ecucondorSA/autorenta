import { Injectable, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from './supabase-client.service';

interface ExchangeRate {
  id: string;
  pair: string;
  source: string;
  binance_rate: number; // Tasa sin margen desde Binance API
  platform_rate: number; // Tasa con margen (binance_rate + 10%)
  margin_percent: number;
  margin_absolute: number;
  volatility_24h: number | null;
  last_updated: string;
  created_at: string;
  is_active: boolean;
}

/**
 * ExchangeRateService
 *
 * Servicio para obtener tasas de cambio desde la base de datos (que se actualiza con Binance).
 *
 * IMPORTANTE: El campo 'rate' en exchange_rates YA contiene el margen del 10% aplicado.
 * NO se debe multiplicar por 1.1 nuevamente - solo retornar el rate directamente.
 *
 * Características:
 * - Consulta tasas desde exchange_rates table (incluye margen del 10%)
 * - Usa rate (= platform_rate con comisión del 10%) para conversiones
 * - Cache de 60 segundos para evitar consultas excesivas
 * - Fallback a Binance API si no hay tasas en DB
 * - Conversión bidireccional ARS ↔ USD
 * - Fuente: Binance USDT/ARS (NO es "Dólar Tarjeta" oficial)
 *
 * Uso:
 * ```typescript
 * const rate = await this.exchangeRateService.getPlatformRate('USDTARS');
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
   * Obtiene la tasa de cambio platform_rate (incluye margen del 10%) desde la base de datos
   *
   * NOTA: El campo 'platform_rate' en la DB YA contiene el margen del 10% aplicado.
   * binance_rate = precio real de Binance USDT/ARS (dinámico)
   * platform_rate = binance_rate × 1.10 (con margen de protección)
   *
   * Ejemplo:
   * - Binance ahora: 900 ARS/USD
   * - Platform rate: 900 × 1.10 = 990 ARS/USD
   */
  async getPlatformRate(pair = 'USDTARS'): Promise<number> {
    const now = Date.now();
    const cacheAge = now - this.lastFetch();

    if (this.lastRate() !== null && cacheAge < this.CACHE_TTL_MS) {
      const cached = this.lastRate()!;
      console.log(
        `💱 Usando cotización cacheada: Binance ${cached.binance_rate} ARS → Platform ${cached.platform_rate} ARS (age: ${Math.round(cacheAge / 1000)}s)`,
      );
      return cached.platform_rate;
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

      // Retornar platform_rate que YA tiene el margen del 10%
      console.log(
        `✅ Binance USDT/ARS dinámico: ${data.binance_rate} → Tasa de plataforma (con margen): ${data.platform_rate} ARS`,
      );

      return data.platform_rate;
    } catch (error) {
      console.error('Error obteniendo tasa de DB:', error);

      try {
        const response = await fetch(`${this.BINANCE_API}?symbol=${pair}`);

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status}`);
        }

        const binanceData = await response.json();
        const binanceRate = parseFloat(binanceData.price);

        if (isNaN(binanceRate) || binanceRate <= 0) {
          throw new Error(`Invalid rate from Binance: ${binanceData.price}`);
        }

        const platformRate = binanceRate * 1.1;

        console.log(`⚠️ Fallback a Binance directo: ${binanceRate} ARS → ${platformRate} ARS (+ 10% margen)`);

        return platformRate;
      } catch (binanceError) {
        console.error('Error obteniendo tasa de Binance:', binanceError);
        throw new Error('No se pudo obtener tasa de cambio de ninguna fuente');
      }
    }
  }

  /**
   * Obtiene solo la tasa de Binance (sin margen)
   */
  async getBinanceRate(): Promise<number> {
    const rate = this.lastRate();
    if (rate && Date.now() - this.lastFetch() < this.CACHE_TTL_MS) {
      return rate.binance_rate;
    }

    await this.getPlatformRate();
    const updatedRate = this.lastRate();

    if (updatedRate) {
      return updatedRate.binance_rate;
    }

    throw new Error('No se pudo obtener tasa de Binance');
  }

  /**
   * Convierte pesos argentinos a dólares estadounidenses
   */
  async convertArsToUsd(ars: number): Promise<number> {
    const rate = await this.getPlatformRate();
    const usd = ars / rate;
    return Math.round(usd * 100) / 100;
  }

  /**
   * Convierte dólares estadounidenses a pesos argentinos
   */
  async convertUsdToArs(usd: number): Promise<number> {
    const rate = await this.getPlatformRate();
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
   * Obtiene solo el platform_rate de la última tasa conocida
   * NOTA: Ya incluye margen del 10%, no multiplicar nuevamente
   */
  getLastKnownPlatformRate(): number | null {
    const platformRate = this.lastRate()?.platform_rate;
    return platformRate ? platformRate : null;
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
    platformRate: number;
    binanceRate: number;
    margin: number;
    marginPercent: number;
  }> {
    const platformRate = await this.getPlatformRate();
    const binanceRate = await this.getBinanceRate();
    const usd = Math.round((ars / platformRate) * 100) / 100;
    const margin = platformRate - binanceRate;
    const marginPercent = 10;

    return {
      ars,
      usd,
      platformRate,
      binanceRate,
      margin,
      marginPercent,
    };
  }
}
