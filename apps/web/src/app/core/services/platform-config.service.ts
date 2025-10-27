import { Injectable, signal } from '@angular/core';
import { injectSupabase } from './supabase-client.service';

export interface PlatformConfig {
  key: string;
  value: unknown;
  data_type: 'number' | 'string' | 'boolean' | 'json';
  description: string;
  category: string;
}

export interface PlatformConfigValues {
  // Pricing
  'pricing.service_fee_percent': number;
  'pricing.min_rental_hours': number;
  'pricing.max_rental_days': number;

  // Deposits
  'deposit.wallet.usd': number;
  'deposit.partial_wallet.usd': number;
  'deposit.credit_card.usd': number;
  'deposit.default.usd': number;

  // Booking
  'booking.pending_expiration_minutes': number;
  'booking.cancellation_fee_percent': number;

  // Wallet
  'wallet.min_deposit.usd': number;
  'wallet.max_deposit.usd': number;
  'wallet.withdrawal_fee_percent': number;
  'wallet.min_withdrawal.usd': number;

  // Rate Limits
  'limits.max_active_bookings_per_user': number;

  // Features
  'features.wallet_enabled': boolean;
  'features.instant_booking_enabled': boolean;

  // Currency
  'currency.default': string;
  'currency.supported': string[];
}

type ConfigKey = keyof PlatformConfigValues;
type ConfigValue<K extends ConfigKey> = PlatformConfigValues[K];

@Injectable({
  providedIn: 'root',
})
export class PlatformConfigService {
  private readonly supabase = injectSupabase();
  private readonly configCache = signal<Map<string, unknown>>(new Map());
  private configCacheTimestamp = 0;
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Load all public config values from database
   */
  async loadPublicConfig(): Promise<void> {
    const { data, error } = await this.supabase.rpc('config_get_public');

    if (error) {
      console.error('Failed to load platform config:', error);
      return;
    }

    const newCache = new Map<string, unknown>();

    for (const item of data as PlatformConfig[]) {
      const parsedValue = this.parseConfigValue(item.value, item.data_type);
      newCache.set(item.key, parsedValue);
    }

    this.configCache.set(newCache);
    this.configCacheTimestamp = Date.now();
  }

  /**
   * Get config value with type safety
   */
  get<K extends ConfigKey>(key: K): ConfigValue<K> | null {
    const cache = this.configCache();

    // Auto-reload if cache expired
    if (Date.now() - this.configCacheTimestamp > this.CACHE_TTL) {
      this.loadPublicConfig().catch((err) => console.error('Failed to reload config:', err));
    }

    const value = cache.get(key);
    return value !== undefined ? (value as ConfigValue<K>) : null;
  }

  /**
   * Get config value with fallback
   */
  getWithFallback<K extends ConfigKey>(key: K, fallback: ConfigValue<K>): ConfigValue<K> {
    const value = this.get(key);
    return value !== null ? value : fallback;
  }

  /**
   * Get numeric config
   */
  getNumber(key: ConfigKey, fallback = 0): number {
    const value = this.get(key);
    return typeof value === 'number' ? value : fallback;
  }

  /**
   * Get string config
   */
  getString(key: ConfigKey, fallback = ''): string {
    const value = this.get(key);
    return typeof value === 'string' ? value : fallback;
  }

  /**
   * Get boolean config
   */
  getBoolean(key: ConfigKey, fallback = false): boolean {
    const value = this.get(key);
    return typeof value === 'boolean' ? value : fallback;
  }

  /**
   * Get JSON config
   */
  getJson<T = unknown>(key: ConfigKey, fallback: T): T {
    const value = this.get(key);
    return value !== null ? (value as T) : fallback;
  }

  /**
   * Get all config values by category
   */
  getByCategory(category: string): PlatformConfig[] {
    const cache = this.configCache();
    const configs: PlatformConfig[] = [];

    for (const [key, value] of cache.entries()) {
      if (key.startsWith(category + '.')) {
        configs.push({
          key,
          value,
          data_type: this.inferDataType(value),
          description: '',
          category,
        });
      }
    }

    return configs;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: string): boolean {
    const key = `features.${feature}_enabled` as ConfigKey;
    return this.getBoolean(key, false);
  }

  /**
   * Get deposit amount for payment method
   */
  getDepositForPaymentMethod(paymentMethod: string): number {
    const key = `deposit.${paymentMethod}.usd` as ConfigKey;
    return this.getNumber(key, this.getNumber('deposit.default.usd', 500));
  }

  /**
   * Convert deposit from USD to cents
   */
  getDepositCents(paymentMethod: string): number {
    return Math.round(this.getDepositForPaymentMethod(paymentMethod) * 100);
  }

  /**
   * Get service fee percentage
   */
  getServiceFeePercent(): number {
    return this.getNumber('pricing.service_fee_percent', 23);
  }

  /**
   * Calculate service fee for amount
   */
  calculateServiceFee(amountCents: number): number {
    const feePercent = this.getServiceFeePercent() / 100;
    return Math.round(amountCents * feePercent);
  }

  /**
   * Check if booking duration is valid
   */
  isValidRentalDuration(hours: number): {
    valid: boolean;
    reason?: string;
  } {
    const minHours = this.getNumber('pricing.min_rental_hours', 4);
    const maxDays = this.getNumber('pricing.max_rental_days', 90);
    const maxHours = maxDays * 24;

    if (hours < minHours) {
      return {
        valid: false,
        reason: `El alquiler mínimo es de ${minHours} horas`,
      };
    }

    if (hours > maxHours) {
      return {
        valid: false,
        reason: `El alquiler máximo es de ${maxDays} días`,
      };
    }

    return { valid: true };
  }

  /**
   * Get booking expiration time in milliseconds
   */
  getBookingExpirationMs(): number {
    const minutes = this.getNumber('booking.pending_expiration_minutes', 30);
    return minutes * 60 * 1000;
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): string[] {
    return this.getJson<string[]>('currency.supported', ['USD', 'ARS']);
  }

  /**
   * Get default currency
   */
  getDefaultCurrency(): string {
    return this.getString('currency.default', 'USD');
  }

  /**
   * Parse config value based on data type
   */
  private parseConfigValue(value: unknown, 
    _dataType: string): unknown {
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return parsed;
      } catch {
        return value;
      }
    }

    return value;
  }

  /**
   * Infer data type from value
   */
  private inferDataType(value: unknown): 'number' | 'string' | 'boolean' | 'json' {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'boolean') return 'boolean';
    return 'json';
  }

  /**
   * Refresh config cache (can be called manually if needed)
   */
  async refresh(): Promise<void> {
    await this.loadPublicConfig();
  }

  /**
   * Clear config cache
   */
  clearCache(): void {
    this.configCache.set(new Map());
    this.configCacheTimestamp = 0;
  }
}
