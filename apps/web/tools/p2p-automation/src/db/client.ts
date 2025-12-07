import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';
import { createServiceLogger } from '../utils/logger.js';
import type { P2POrder, P2PEvent, OrderStatus, PaymentDetails, MarketPrice, P2PConfig } from '../types/index.js';

const logger = createServiceLogger('db');

class SupabaseDB {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: { persistSession: false },
    });
  }

  // ============ Orders ============

  async getOrderByNumber(orderNumber: string): Promise<P2POrder | null> {
    const { data, error } = await this.client
      .from('p2p_orders')
      .select('*')
      .eq('order_number', orderNumber)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error(`Error fetching order ${orderNumber}: ${error.message}`);
      throw error;
    }

    return data;
  }

  async insertOrder(order: Partial<P2POrder>): Promise<P2POrder> {
    const { data, error } = await this.client
      .from('p2p_orders')
      .insert(order)
      .select()
      .single();

    if (error) {
      logger.error(`Error inserting order: ${error.message}`);
      throw error;
    }

    logger.info(`Inserted order ${order.order_number}`);
    return data;
  }

  async getNextPendingOrder(serviceName: string): Promise<P2POrder | null> {
    // Query directly instead of using RPC (simpler and more reliable)
    const { data, error } = await this.client
      .from('p2p_orders')
      .select('*')
      .eq('status', 'pending_transfer')
      .or(`locked_by.is.null,lock_expires_at.lt.${new Date().toISOString()}`)
      .order('detected_at', { ascending: true })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error(`Error getting next order: ${error.message}`);
      return null;
    }

    if (!data) {
      return null;
    }

    // Acquire lock on this order
    const { error: lockError } = await this.client
      .from('p2p_orders')
      .update({
        locked_by: serviceName,
        lock_expires_at: new Date(Date.now() + 300000).toISOString(), // 5 min
      })
      .eq('id', data.id)
      .or(`locked_by.is.null,lock_expires_at.lt.${new Date().toISOString()}`);

    if (lockError) {
      logger.error(`Error acquiring lock: ${lockError.message}`);
      return null;
    }

    return data;
  }

  async transitionStatus(
    orderNumber: string,
    newStatus: OrderStatus,
    serviceName: string,
    payload?: Record<string, unknown>,
    errorMessage?: string
  ): Promise<boolean> {
    // Get current order
    const order = await this.getOrderByNumber(orderNumber);
    if (!order) {
      logger.error(`Order ${orderNumber} not found`);
      return false;
    }

    const previousStatus = order.status;

    // Update status
    const { error: updateError } = await this.client
      .from('p2p_orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        last_error: errorMessage || order.last_error,
        completed_at: ['completed', 'failed', 'cancelled'].includes(newStatus)
          ? new Date().toISOString()
          : order.completed_at,
      })
      .eq('order_number', orderNumber);

    if (updateError) {
      logger.error(`Error updating status: ${updateError.message}`);
      return false;
    }

    // Log event
    await this.logEvent({
      order_id: order.id,
      event_type: 'status_change',
      previous_status: previousStatus,
      new_status: newStatus,
      payload,
      error_message: errorMessage,
      service_name: serviceName,
    });

    logger.info(`Order ${orderNumber}: ${previousStatus} -> ${newStatus}`);
    return true;
  }

  async updatePaymentDetails(
    orderNumber: string,
    details: PaymentDetails
  ): Promise<boolean> {
    const { error } = await this.client
      .from('p2p_orders')
      .update({
        payment_cvu: details.cvu,
        payment_alias: details.alias,
        payment_holder: details.holder,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderNumber);

    if (error) {
      logger.error(`Error updating payment details: ${error.message}`);
      return false;
    }

    logger.info(`Updated payment details for ${orderNumber}`);
    return true;
  }

  async updateTransferResult(
    orderNumber: string,
    result: {
      mp_transfer_id?: string;
      mp_transfer_status?: string;
      mp_transferred_at?: Date;
    }
  ): Promise<boolean> {
    const { error } = await this.client
      .from('p2p_orders')
      .update({
        ...result,
        mp_transferred_at: result.mp_transferred_at?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderNumber);

    if (error) {
      logger.error(`Error updating transfer result: ${error.message}`);
      return false;
    }

    return true;
  }

  async incrementRetry(orderNumber: string, errorMessage: string): Promise<boolean> {
    const order = await this.getOrderByNumber(orderNumber);
    if (!order) return false;

    const newRetryCount = order.retry_count + 1;
    const newStatus: OrderStatus =
      newRetryCount >= order.max_retries ? 'failed' : order.status;

    const { error } = await this.client
      .from('p2p_orders')
      .update({
        retry_count: newRetryCount,
        last_error: errorMessage,
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('order_number', orderNumber);

    if (error) {
      logger.error(`Error incrementing retry: ${error.message}`);
      return false;
    }

    logger.warn(`Order ${orderNumber} retry ${newRetryCount}/${order.max_retries}: ${errorMessage}`);
    return true;
  }

  async releaseLock(orderNumber: string, serviceName: string): Promise<boolean> {
    const { error } = await this.client
      .from('p2p_orders')
      .update({
        locked_by: null,
        lock_expires_at: null,
      })
      .eq('order_number', orderNumber)
      .eq('locked_by', serviceName);

    if (error) {
      logger.error(`Error releasing lock: ${error.message}`);
      return false;
    }

    return true;
  }

  // ============ Events ============

  async logEvent(event: Omit<P2PEvent, 'id' | 'created_at'>): Promise<void> {
    const { error } = await this.client.from('p2p_events').insert(event);

    if (error) {
      logger.error(`Error logging event: ${error.message}`);
    }
  }

  // ============ Market Prices ============

  async recordMarketPrices(prices: MarketPrice[]): Promise<boolean> {
    if (prices.length === 0) return true;

    const records = prices.map(p => ({
      crypto_currency: p.cryptoCurrency,
      fiat_currency: p.fiatCurrency,
      order_type: p.orderType,
      price_per_unit: p.pricePerUnit,
      min_order_limit: p.minOrderLimit,
      max_order_limit: p.maxOrderLimit,
      available_amount: p.availableAmount,
      payment_methods: JSON.stringify(p.paymentMethods),
      source_user_id: p.sourceUserId,
      source_user_name: p.sourceUserName,
      source_user_trades: p.sourceUserTrades,
      source_user_completion_rate: p.sourceUserCompletionRate,
      ranking_position: p.rankingPosition,
    }));

    const { error } = await this.client
      .from('p2p_market_prices')
      .insert(records);

    if (error) {
      logger.error(`Error recording market prices: ${error.message}`);
      return false;
    }

    logger.info(`Recorded ${prices.length} market prices for ${prices[0]?.fiatCurrency}`);
    return true;
  }

  async getLatestPrices(fiatCurrency: string, orderType: 'buy' | 'sell', limit: number = 10): Promise<MarketPrice[]> {
    const { data, error } = await this.client
      .from('p2p_market_prices')
      .select('*')
      .eq('fiat_currency', fiatCurrency)
      .eq('order_type', orderType)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error(`Error fetching latest prices: ${error.message}`);
      return [];
    }

    return (data || []).map(d => ({
      cryptoCurrency: d.crypto_currency,
      fiatCurrency: d.fiat_currency,
      orderType: d.order_type as 'buy' | 'sell',
      pricePerUnit: parseFloat(d.price_per_unit),
      minOrderLimit: parseFloat(d.min_order_limit),
      maxOrderLimit: parseFloat(d.max_order_limit),
      availableAmount: d.available_amount ? parseFloat(d.available_amount) : undefined,
      paymentMethods: JSON.parse(d.payment_methods || '[]'),
      sourceUserId: d.source_user_id,
      sourceUserName: d.source_user_name,
      sourceUserTrades: d.source_user_trades,
      sourceUserCompletionRate: d.source_user_completion_rate ? parseFloat(d.source_user_completion_rate) : undefined,
      rankingPosition: d.ranking_position,
    }));
  }

  // ============ P2P Config ============

  async getActiveConfigs(): Promise<P2PConfig[]> {
    const { data, error } = await this.client
      .from('p2p_config')
      .select('*')
      .eq('is_active', true);

    if (error) {
      logger.error(`Error fetching configs: ${error.message}`);
      return [];
    }

    return (data || []).map(d => ({
      countryCode: d.country_code,
      countryName: d.country_name,
      fiatCurrency: d.fiat_currency,
      binanceTradeUrl: d.binance_trade_url,
      paymentMethods: JSON.parse(d.payment_methods || '[]'),
      minOrderFiat: parseFloat(d.min_order_fiat),
      maxOrderFiat: parseFloat(d.max_order_fiat),
      priceUpdateIntervalMinutes: d.price_update_interval_minutes,
      priceMarginPercentage: parseFloat(d.price_margin_percentage),
      isActive: d.is_active,
      timezone: d.timezone,
    }));
  }

  // ============ Health ============

  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.client.from('p2p_orders').select('id').limit(1);
      return !error;
    } catch {
      return false;
    }
  }
}

export const db = new SupabaseDB();
export default db;
