import { Injectable, inject, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { injectSupabase } from './supabase-client.service';

interface ExchangeRate {
  id: string;
  pair: string;
  source: string;
  binance_rate: number;
  platform_rate: number;
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
 * Características:
 * - Consulta tasas desde exchange_rates table (incluye margen del 20%)
 * - Usa platform_rate (incluye comisión) para conversiones
 * - Cache de 60 segundos para evitar consultas excesivas
 * - Fallback a Binance API si no hay tasas en DB
 * - Conversión bidireccional ARS ↔ USD
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

  // Cache de la última cotización
  private lastRate = signal<ExchangeRate | null>(null);
  private lastFetch = signal<number>(0);

  /**
   * Obtiene la tasa de cambio platform_rate (incluye margen del 20%) desde la base de datos
   *
   * @param pair - Par de monedas (ej: 'USDTARS')
   * @returns Tasa de cambio de la plataforma (cuántos ARS equivalen a 1 USD)
   */
  async getPlatformRate(pair = 'USDTARS'): Promise<number> {
    const now = Date.now();
    const cacheAge = now - this.lastFetch();

    // Si el cache es válido (< 60s), retornar valor cacheado
    if (this.lastRate() !== null && cacheAge < this.CACHE_TTL_MS) {
      console.log(
        `💱 Usando cotización cacheada: 1 USD = ${this.lastRate()!.platform_rate} ARS (age: ${Math.round(cacheAge / 1000)}s)`
      );
      return this.lastRate()!.platform_rate;
    }

    try {
      console.log(`💱 Consultando base de datos para cotización ${pair}...`);

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

      // Actualizar cache
      this.lastRate.set(data as ExchangeRate);
      this.lastFetch.set(now);

      console.log(
        `✅ Cotización de plataforma (con margen ${data.margin_percent}%): 1 USD = ${data.platform_rate} ARS (Binance: ${data.binance_rate})`
      );

      return data.platform_rate;
    } catch (error) {
      console.error('❌ Error al obtener cotización de la base de datos:', error);

      // Intentar consultar Binance directamente como fallback
      try {
        console.log('💡 Intentando consultar Binance API directamente...');

        const response = await fetch(`${this.BINANCE_API}?symbol=${pair}`);

        if (!response.ok) {
          throw new Error(`Binance API error: ${response.status}`);
        }

        const binanceData = await response.json();
        const binanceRate = parseFloat(binanceData.price);

        if (isNaN(binanceRate) || binanceRate <= 0) {
          throw new Error(`Invalid rate from Binance: ${binanceData.price}`);
        }

        // Aplicar margen del 10% manualmente (fallback - debe coincidir con Edge Function)
        const platformRate = binanceRate * 1.1;

        console.log(`✅ Cotización de Binance + 10% margen: 1 USD = ${platformRate} ARS`);

        return platformRate;
      } catch (binanceError) {
        console.error('❌ Error al consultar Binance:', binanceError);
        throw new Error('No se pudo obtener tasa de cambio de ninguna fuente');
      }
    }
  }

  /**
   * Obtiene solo la tasa de Binance (sin margen)
   *
   * @returns Tasa de Binance pura (sin comisión de plataforma)
   */
  async getBinanceRate(): Promise<number> {
    const rate = this.lastRate();
    if (rate && Date.now() - this.lastFetch() < this.CACHE_TTL_MS) {
      return rate.binance_rate;
    }

    // Si no hay cache, obtener platform rate primero (que actualiza el cache)
    await this.getPlatformRate();

    throw new Error("No se pudo obtener tasa de Binance");
  }

  /**
   * Convierte pesos argentinos a dólares estadounidenses
   * Usa la tasa de plataforma (incluye margen del 20%)
   *
   * @param ars - Monto en pesos argentinos
   * @returns Monto equivalente en USD (redondeado a 2 decimales)
   */
  async convertArsToUsd(ars: number): Promise<number> {
    const rate = await this.getPlatformRate();
    const usd = ars / rate;

    return Math.round(usd * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Convierte dólares estadounidenses a pesos argentinos
   * Usa la tasa de plataforma (incluye margen del 20%)
   *
   * @param usd - Monto en dólares estadounidenses
   * @returns Monto equivalente en ARS (redondeado a 2 decimales)
   */
  async convertUsdToArs(usd: number): Promise<number> {
    const rate = await this.getPlatformRate();
    const ars = usd * rate;

    return Math.round(ars * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Obtiene la última tasa conocida (ExchangeRate object completo)
   */
  getLastKnownRate(): ExchangeRate | null {
    return this.lastRate();
  }

  /**
   * Obtiene solo el platform_rate de la última tasa conocida
   */
  getLastKnownPlatformRate(): number | null {
    return this.lastRate()?.platform_rate || null;
  }

  /**
   * Verifica si el cache de la tasa está vigente
   */
  isCacheValid(): boolean {
    const cacheAge = Date.now() - this.lastFetch();
    return this.lastRate() !== null && cacheAge < this.CACHE_TTL_MS;
  }

  /**
   * Limpia el cache de la tasa (fuerza un nuevo fetch en la próxima consulta)
   */
  clearCache(): void {
    this.lastRate.set(null);
    this.lastFetch.set(0);
    console.log('🗑️  Cache de cotización limpiado');
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
    const marginPercent = this.lastRate()?.margin_percent || 20;

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
