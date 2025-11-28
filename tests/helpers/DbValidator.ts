/**
 * DbValidator - Helper para verificar estado en Supabase durante tests E2E
 *
 * Uso:
 * ```typescript
 * const validator = getDbValidator();
 *
 * // Verificar que existe un booking con status específico
 * await validator.assertExists('bookings', { id: bookingId, status: 'confirmed' });
 *
 * // Verificar que NO existe
 * await validator.assertNotExists('bookings', { id: bookingId, status: 'cancelled' });
 *
 * // Verificar valor específico
 * await validator.assertEquals('wallets', { user_id: userId }, 'balance_cents', 10000);
 * ```
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { expect } from '@playwright/test'

export interface DbValidationResult {
  success: boolean
  table: string
  where: Record<string, unknown>
  data?: Record<string, unknown> | null
  error?: string
}

export class DbValidator {
  private supabase: SupabaseClient

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    const url = supabaseUrl || process.env.NG_APP_SUPABASE_URL || ''
    const key = supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NG_APP_SUPABASE_ANON_KEY || ''

    if (!url || !key) {
      throw new Error('DbValidator: Supabase credentials required')
    }

    this.supabase = createClient(url, key)
  }

  /**
   * Busca un registro por condiciones
   */
  async findOne(
    table: string,
    where: Record<string, unknown>,
    select: string = '*'
  ): Promise<Record<string, unknown> | null> {
    let query = this.supabase.from(table).select(select)

    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value)
    }

    const { data, error } = await query.limit(1).single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - this is expected for assertNotExists
        return null
      }
      console.warn(`[DbValidator] Query error: ${error.message}`)
      return null
    }

    return data
  }

  /**
   * Busca múltiples registros
   */
  async findMany(
    table: string,
    where: Record<string, unknown>,
    select: string = '*',
    limit: number = 100
  ): Promise<Record<string, unknown>[]> {
    let query = this.supabase.from(table).select(select)

    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value)
    }

    const { data, error } = await query.limit(limit)

    if (error) {
      console.warn(`[DbValidator] Query error: ${error.message}`)
      return []
    }

    return data || []
  }

  /**
   * Cuenta registros que coinciden
   */
  async count(table: string, where: Record<string, unknown>): Promise<number> {
    let query = this.supabase.from(table).select('*', { count: 'exact', head: true })

    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value)
    }

    const { count, error } = await query

    if (error) {
      console.warn(`[DbValidator] Count error: ${error.message}`)
      return 0
    }

    return count || 0
  }

  /**
   * Verifica que existe un registro con las condiciones dadas
   */
  async assertExists(
    table: string,
    where: Record<string, unknown>,
    message?: string
  ): Promise<DbValidationResult> {
    const data = await this.findOne(table, where)

    const result: DbValidationResult = {
      success: data !== null,
      table,
      where,
      data
    }

    if (!result.success) {
      result.error = message || `Expected record in ${table} with ${JSON.stringify(where)} to exist`
    }

    expect(data, result.error).not.toBeNull()
    return result
  }

  /**
   * Verifica que NO existe un registro
   */
  async assertNotExists(
    table: string,
    where: Record<string, unknown>,
    message?: string
  ): Promise<DbValidationResult> {
    const data = await this.findOne(table, where)

    const result: DbValidationResult = {
      success: data === null,
      table,
      where,
      data
    }

    if (!result.success) {
      result.error = message || `Expected record in ${table} with ${JSON.stringify(where)} to NOT exist`
    }

    expect(data, result.error).toBeNull()
    return result
  }

  /**
   * Verifica que un campo tiene un valor específico
   */
  async assertEquals(
    table: string,
    where: Record<string, unknown>,
    field: string,
    expectedValue: unknown,
    message?: string
  ): Promise<DbValidationResult> {
    const data = await this.findOne(table, where, field)

    const result: DbValidationResult = {
      success: data !== null && data[field] === expectedValue,
      table,
      where,
      data
    }

    if (!result.success) {
      if (data === null) {
        result.error = message || `Record not found in ${table} with ${JSON.stringify(where)}`
      } else {
        result.error = message || `Expected ${field} to be ${expectedValue}, got ${data[field]}`
      }
    }

    expect(data, `Record not found in ${table}`).not.toBeNull()
    expect(data?.[field], result.error).toBe(expectedValue)
    return result
  }

  /**
   * Verifica que un campo numérico está en un rango
   */
  async assertInRange(
    table: string,
    where: Record<string, unknown>,
    field: string,
    min: number,
    max: number,
    message?: string
  ): Promise<DbValidationResult> {
    const data = await this.findOne(table, where, field)
    const value = data?.[field] as number

    const result: DbValidationResult = {
      success: data !== null && value >= min && value <= max,
      table,
      where,
      data
    }

    if (!result.success) {
      result.error = message || `Expected ${field} to be between ${min} and ${max}, got ${value}`
    }

    expect(data).not.toBeNull()
    expect(value).toBeGreaterThanOrEqual(min)
    expect(value).toBeLessThanOrEqual(max)
    return result
  }

  /**
   * Verifica el estado de un booking
   */
  async assertBookingStatus(
    bookingId: string,
    expectedStatus: string,
    message?: string
  ): Promise<DbValidationResult> {
    return this.assertEquals(
      'bookings',
      { id: bookingId },
      'status',
      expectedStatus,
      message || `Expected booking ${bookingId} to have status ${expectedStatus}`
    )
  }

  /**
   * Verifica el balance de wallet
   */
  async assertWalletBalance(
    userId: string,
    expectedBalanceCents: number,
    tolerance: number = 0,
    message?: string
  ): Promise<DbValidationResult> {
    if (tolerance === 0) {
      return this.assertEquals(
        'wallets',
        { user_id: userId },
        'balance_cents',
        expectedBalanceCents,
        message
      )
    }

    return this.assertInRange(
      'wallets',
      { user_id: userId },
      'balance_cents',
      expectedBalanceCents - tolerance,
      expectedBalanceCents + tolerance,
      message
    )
  }

  /**
   * Verifica que un auto tiene un status específico
   */
  async assertCarStatus(
    carId: string,
    expectedStatus: string,
    message?: string
  ): Promise<DbValidationResult> {
    return this.assertEquals(
      'cars',
      { id: carId },
      'status',
      expectedStatus,
      message || `Expected car ${carId} to have status ${expectedStatus}`
    )
  }

  /**
   * Verifica que existe una transacción de wallet
   */
  async assertWalletTransaction(
    userId: string,
    type: string,
    amountCents: number,
    message?: string
  ): Promise<DbValidationResult> {
    return this.assertExists(
      'wallet_transactions',
      {
        user_id: userId,
        type,
        amount_cents: amountCents
      },
      message || `Expected wallet transaction of ${amountCents} cents (${type}) for user ${userId}`
    )
  }

  /**
   * Espera hasta que una condición se cumpla (polling)
   */
  async waitFor(
    table: string,
    where: Record<string, unknown>,
    condition: (data: Record<string, unknown> | null) => boolean,
    options?: {
      timeout?: number
      interval?: number
      message?: string
    }
  ): Promise<DbValidationResult> {
    const timeout = options?.timeout || 10000
    const interval = options?.interval || 500
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      const data = await this.findOne(table, where)

      if (condition(data)) {
        return {
          success: true,
          table,
          where,
          data
        }
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }

    return {
      success: false,
      table,
      where,
      error: options?.message || `Timeout waiting for condition in ${table}`
    }
  }

  /**
   * Espera hasta que un booking tenga un status específico
   */
  async waitForBookingStatus(
    bookingId: string,
    expectedStatus: string,
    timeout: number = 10000
  ): Promise<DbValidationResult> {
    return this.waitFor(
      'bookings',
      { id: bookingId },
      data => data?.status === expectedStatus,
      {
        timeout,
        message: `Timeout waiting for booking ${bookingId} to have status ${expectedStatus}`
      }
    )
  }
}

// Singleton
let instance: DbValidator | null = null

export function getDbValidator(): DbValidator {
  if (!instance) {
    instance = new DbValidator()
  }
  return instance
}

export function resetDbValidator(): void {
  instance = null
}
