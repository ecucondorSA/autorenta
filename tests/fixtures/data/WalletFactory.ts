/**
 * WalletFactory - Factory idempotente para operaciones de wallet en tests
 *
 * Características:
 * - Depositar fondos via RPC
 * - Verificar balance
 * - Simular transacciones
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface WalletBalance {
  userId: string
  balanceCents: number
  availableBalanceCents: number
  lockedBalanceCents: number
}

export interface WalletTransaction {
  id: string
  userId: string
  type: 'deposit' | 'withdrawal' | 'lock' | 'unlock' | 'payment' | 'refund'
  amountCents: number
  status: 'pending' | 'completed' | 'failed'
  createdAt: Date
}

export class WalletFactory {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NG_APP_SUPABASE_URL || ''
    const key = supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NG_APP_SUPABASE_ANON_KEY || ''

    if (!url || !key) {
      throw new Error('WalletFactory: Supabase credentials required')
    }

    this.supabase = createClient(url, key)
  }

  /**
   * Obtiene el balance actual de un usuario
   */
  async getBalance(userId: string): Promise<WalletBalance | null> {
    try {
      const { data, error } = await this.supabase.rpc('wallet_get_balance', {
        p_user_id: userId
      })

      if (error || !data) return null

      return {
        userId,
        balanceCents: data.balance_cents || 0,
        availableBalanceCents: data.available_balance_cents || 0,
        lockedBalanceCents: data.locked_balance_cents || 0
      }
    } catch {
      return null
    }
  }

  /**
   * Verifica si el usuario tiene wallet
   */
  async hasWallet(userId: string): Promise<boolean> {
    const balance = await this.getBalance(userId)
    return balance !== null
  }

  /**
   * Deposita fondos en la wallet (idempotente si ya tiene suficiente balance)
   */
  async deposit(userId: string, amountCents: number, options?: {
    /** Si true, solo deposita si el balance actual es menor */
    ensureMinimum?: boolean
    /** Referencia externa (ej: payment_intent_id) */
    externalReference?: string
  }): Promise<WalletBalance> {
    // Verificar balance actual
    const currentBalance = await this.getBalance(userId)

    // Si ensureMinimum y ya tiene suficiente, no hacer nada
    if (options?.ensureMinimum && currentBalance) {
      if (currentBalance.availableBalanceCents >= amountCents) {
        console.log(`[WalletFactory] Usuario ${userId} ya tiene balance suficiente`)
        return currentBalance
      }
    }

    // Crear transacción de depósito
    const { data: transaction, error: txError } = await this.supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount_cents: amountCents,
        status: 'completed',
        external_reference: options?.externalReference || `test-deposit-${Date.now()}`,
        description: 'Test deposit via WalletFactory'
      })
      .select()
      .single()

    if (txError) {
      throw new Error(`WalletFactory: Failed to create deposit transaction: ${txError.message}`)
    }

    // Procesar el depósito via RPC (esto actualiza el balance)
    const { error: processError } = await this.supabase.rpc('wallet_process_deposit', {
      p_user_id: userId,
      p_amount_cents: amountCents,
      p_external_reference: transaction.external_reference
    }).catch(() => ({ error: { message: 'RPC not available, using direct update' } }))

    // Si el RPC no existe, actualizar balance directamente
    if (processError) {
      // Actualizar o crear registro de wallet
      await this.supabase
        .from('wallets')
        .upsert({
          user_id: userId,
          balance_cents: (currentBalance?.balanceCents || 0) + amountCents,
          available_balance_cents: (currentBalance?.availableBalanceCents || 0) + amountCents,
          locked_balance_cents: currentBalance?.lockedBalanceCents || 0
        }, {
          onConflict: 'user_id'
        })
    }

    // Obtener balance actualizado
    const newBalance = await this.getBalance(userId)
    if (!newBalance) {
      throw new Error('WalletFactory: Failed to get updated balance')
    }

    console.log(`[WalletFactory] Depositados ${amountCents} centavos para usuario ${userId}`)
    return newBalance
  }

  /**
   * Asegura que el usuario tenga al menos X centavos disponibles
   */
  async ensureBalance(userId: string, minimumCents: number): Promise<WalletBalance> {
    const current = await this.getBalance(userId)
    const currentAvailable = current?.availableBalanceCents || 0

    if (currentAvailable >= minimumCents) {
      return current!
    }

    // Depositar la diferencia + 10% extra
    const toDeposit = Math.ceil((minimumCents - currentAvailable) * 1.1)
    return this.deposit(userId, toDeposit)
  }

  /**
   * Bloquea fondos para una reserva
   */
  async lockFunds(userId: string, amountCents: number, bookingId?: string): Promise<void> {
    // Verificar balance disponible
    const balance = await this.getBalance(userId)
    if (!balance || balance.availableBalanceCents < amountCents) {
      throw new Error(`WalletFactory: Insufficient balance. Available: ${balance?.availableBalanceCents || 0}, Required: ${amountCents}`)
    }

    // Crear transacción de bloqueo
    await this.supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'lock',
        amount_cents: amountCents,
        status: 'completed',
        booking_id: bookingId,
        description: 'Funds locked for booking'
      })

    // Intentar RPC o actualizar directamente
    const { error } = await this.supabase.rpc('wallet_lock_funds', {
      p_user_id: userId,
      p_amount_cents: amountCents,
      p_booking_id: bookingId
    }).catch(() => ({ error: { message: 'RPC not available' } }))

    if (error) {
      // Actualizar directamente
      await this.supabase
        .from('wallets')
        .update({
          available_balance_cents: balance.availableBalanceCents - amountCents,
          locked_balance_cents: balance.lockedBalanceCents + amountCents
        })
        .eq('user_id', userId)
    }

    console.log(`[WalletFactory] Bloqueados ${amountCents} centavos para usuario ${userId}`)
  }

  /**
   * Desbloquea fondos
   */
  async unlockFunds(userId: string, amountCents: number, bookingId?: string): Promise<void> {
    const balance = await this.getBalance(userId)
    if (!balance) {
      throw new Error('WalletFactory: Wallet not found')
    }

    await this.supabase
      .from('wallet_transactions')
      .insert({
        user_id: userId,
        type: 'unlock',
        amount_cents: amountCents,
        status: 'completed',
        booking_id: bookingId,
        description: 'Funds unlocked'
      })

    await this.supabase
      .from('wallets')
      .update({
        available_balance_cents: balance.availableBalanceCents + amountCents,
        locked_balance_cents: Math.max(0, balance.lockedBalanceCents - amountCents)
      })
      .eq('user_id', userId)

    console.log(`[WalletFactory] Desbloqueados ${amountCents} centavos para usuario ${userId}`)
  }

  /**
   * Obtiene las transacciones de un usuario
   */
  async getTransactions(userId: string, limit: number = 10): Promise<WalletTransaction[]> {
    const { data, error } = await this.supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error || !data) return []

    return data.map(tx => ({
      id: tx.id,
      userId: tx.user_id,
      type: tx.type,
      amountCents: tx.amount_cents,
      status: tx.status,
      createdAt: new Date(tx.created_at)
    }))
  }

  /**
   * Resetea el balance de un usuario (para cleanup)
   */
  async resetBalance(userId: string): Promise<void> {
    await this.supabase
      .from('wallets')
      .update({
        balance_cents: 0,
        available_balance_cents: 0,
        locked_balance_cents: 0
      })
      .eq('user_id', userId)

    console.log(`[WalletFactory] Balance reseteado para usuario ${userId}`)
  }
}

// Singleton
let instance: WalletFactory | null = null

export function getWalletFactory(): WalletFactory {
  if (!instance) {
    instance = new WalletFactory()
  }
  return instance
}

export function resetWalletFactory(): void {
  instance = null
}
