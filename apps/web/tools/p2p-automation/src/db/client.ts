import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';
import { createServiceLogger } from '../utils/logger.js';
import type { P2POrder, P2PEvent, OrderStatus, PaymentDetails } from '../types/index.js';

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
