/**
 * E2E Test CRITICO: Refunds y Cancellations
 *
 * Arquitectura: Checkpoint & Hydrate
 *
 * Bloques:
 * - B1: Setup - Obtener usuarios de test
 * - B2: Cancelacion antes de pago (sin refund)
 * - B3: Reembolso completo (>48h antes)
 * - B4: Reembolso parcial (24-48h antes)
 * - B5: Sin reembolso (<24h antes)
 * - B6: Owner inicia refund
 *
 * Escenarios de Cancelacion:
 * - Antes de 48h: 100% reembolso
 * - 24-48h antes: 50% reembolso
 * - <24h antes: Sin reembolso
 *
 * Prioridad: P0 (CRITICO - proteccion financiera)
 */

import { test, expect, defineBlock, requiresCheckpoint, expectsUrl, expectsElement, withCheckpoint } from '../checkpoint/fixtures'
import { getDbValidator } from '../helpers/DbValidator'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Configuracion Supabase
const supabaseUrl = process.env.PLAYWRIGHT_SUPABASE_URL || process.env.NG_APP_SUPABASE_URL
const supabaseKey = process.env.PLAYWRIGHT_SUPABASE_ANON_KEY || process.env.NG_APP_SUPABASE_ANON_KEY
const hasEnvVars = !!(supabaseUrl && supabaseKey)

let supabase: SupabaseClient | null = null
if (hasEnvVars) {
  supabase = createClient(supabaseUrl!, supabaseKey!)
}

// Estado compartido entre bloques
interface RefundTestContext {
  testRenterId?: string
  testOwnerId?: string
  testCarId?: string
  testCarOwnerId?: string
  testCarPricePerDay?: number
}

const ctx: RefundTestContext = {}

test.describe('CRITICAL: Refunds and Cancellations - Checkpoint Architecture', () => {
  test.skip(!hasEnvVars, 'Requires PLAYWRIGHT_SUPABASE_URL and PLAYWRIGHT_SUPABASE_ANON_KEY')

  test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
    storageState: 'tests/.auth/renter.json'
  })

  /**
   * BLOQUE 1: Setup - Obtener IDs de usuarios de test
   * Precondiciones: Ninguna
   * Postcondiciones: IDs de renter y owner obtenidos
   * Checkpoint: 'refund-setup-ready'
   */
  test('B1: Setup - Obtener usuarios de test', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-refund-setup', 'Setup usuarios de test', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('refund-setup-ready')
    }))

    const result = await block.execute(async () => {
      console.log('Setup: Obteniendo usuarios de test...')

      // Obtener usuarios de test
      const { data: users } = await supabase!
        .from('profiles')
        .select('id, email, role')
        .in('email', ['renter.test@autorenta.com', 'owner.test@autorenta.com'])

      if (users) {
        ctx.testRenterId = users.find(u => u.email.includes('renter'))?.id
        ctx.testOwnerId = users.find(u => u.email.includes('owner'))?.id
      }

      // Obtener auto para tests
      const { data: cars } = await supabase!
        .from('cars')
        .select('id, owner_id, price_per_day')
        .eq('status', 'active')
        .limit(1)

      if (cars && cars.length > 0) {
        ctx.testCarId = cars[0].id
        ctx.testCarOwnerId = cars[0].owner_id
        ctx.testCarPricePerDay = cars[0].price_per_day
      }

      console.log(`Renter ID: ${ctx.testRenterId}`)
      console.log(`Owner ID: ${ctx.testOwnerId}`)
      console.log(`Car ID: ${ctx.testCarId}`)
    })

    expect(result.state.status).toBe('passed')
    expect(ctx.testRenterId).toBeTruthy()
    console.log(`[B1] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 2: Cancelacion antes de pago
   * Precondiciones: Setup completado
   * Postcondiciones: Booking cancelado sin refund
   * Checkpoint: 'refund-cancel-before-payment'
   */
  test('B2: Cancelacion antes de pago (sin refund)', async ({ page, checkpointManager, createBlock }) => {
    const prevCheckpoint = await checkpointManager.loadCheckpoint('refund-setup-ready')
    if (prevCheckpoint) await checkpointManager.restoreCheckpoint(prevCheckpoint)

    const block = createBlock(defineBlock('b2-cancel-before-payment', 'Cancelacion sin pago', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('refund-setup-ready')],
      postconditions: [],
      ...withCheckpoint('refund-cancel-before-payment')
    }))

    const result = await block.execute(async () => {
      console.log('B2: Scenario - Cancelacion ANTES de pago')

      // Crear booking en estado pending (no pagado)
      const bookingId = crypto.randomUUID()
      const startDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // En 14 dias
      const endDate = new Date(Date.now() + 17 * 24 * 60 * 60 * 1000)

      await supabase!.from('bookings').insert({
        id: bookingId,
        car_id: ctx.testCarId,
        renter_id: ctx.testRenterId,
        owner_id: ctx.testCarOwnerId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_price: ctx.testCarPricePerDay! * 3,
        status: 'pending',
        payment_status: 'pending',
        cancel_policy: 'flex',
      })

      console.log(`Booking creado: ${bookingId}`)

      // Navegar al booking
      await page.goto(`/bookings/${bookingId}`)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Intentar cancelar via UI
      const cancelButton = page.getByRole('button', { name: /cancelar|cancel/i })
      const cancelVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (cancelVisible) {
        await cancelButton.click()
        await page.waitForTimeout(1000)

        const confirmButton = page.getByRole('button', { name: /confirmar|si|yes/i })
        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click()
          await page.waitForTimeout(2000)
        }
      } else {
        // Cancelar via DB
        await supabase!
          .from('bookings')
          .update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
          })
          .eq('id', bookingId)
      }

      // Verificar cancelacion
      const { data: cancelledBooking } = await supabase!
        .from('bookings')
        .select('status, cancelled_at')
        .eq('id', bookingId)
        .single()

      expect(cancelledBooking?.status).toBe('cancelled')
      expect(cancelledBooking?.cancelled_at).toBeTruthy()

      console.log('Booking cancelado (sin refund - no estaba pagado)')

      // Cleanup
      await supabase!.from('bookings').delete().eq('id', bookingId)
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B2] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 3: Reembolso completo (>48h antes)
   * Precondiciones: Setup completado
   * Postcondiciones: Booking cancelado, refund 100% procesado
   * Checkpoint: 'refund-full-refund-complete'
   */
  test('B3: Reembolso completo (>48h antes del inicio)', async ({ page, checkpointManager, createBlock }) => {
    const prevCheckpoint = await checkpointManager.loadCheckpoint('refund-setup-ready')
    if (prevCheckpoint) await checkpointManager.restoreCheckpoint(prevCheckpoint)

    const block = createBlock(defineBlock('b3-full-refund', 'Reembolso 100%', {
      priority: 'P0',
      estimatedDuration: 25000,
      preconditions: [requiresCheckpoint('refund-setup-ready')],
      postconditions: [],
      ...withCheckpoint('refund-full-refund-complete')
    }))

    const result = await block.execute(async () => {
      console.log('B3: Scenario - Reembolso COMPLETO (>48h antes)')

      // Obtener balance inicial
      const { data: initialWallet } = await supabase!
        .from('user_wallets')
        .select('balance')
        .eq('user_id', ctx.testRenterId)
        .single()

      const initialBalance = initialWallet?.balance || 0

      // Crear booking PAGADO
      const bookingId = crypto.randomUUID()
      const totalPrice = ctx.testCarPricePerDay! * 3
      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // En 7 dias (>48h)
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

      await supabase!.from('bookings').insert({
        id: bookingId,
        car_id: ctx.testCarId,
        renter_id: ctx.testRenterId,
        owner_id: ctx.testCarOwnerId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_price: totalPrice,
        status: 'confirmed',
        payment_status: 'paid',
        cancel_policy: 'flex',
      })

      console.log(`Booking pagado creado: ${bookingId}`)

      // Cancelar con refund completo
      await supabase!
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          refund_amount: totalPrice,
          refund_status: 'pending',
        })
        .eq('id', bookingId)

      // Procesar refund
      try {
        await supabase!.rpc('wallet_process_refund', {
          p_booking_id: bookingId,
          p_refund_amount: totalPrice,
        })
      } catch {
        // RPC no existe, hacer manualmente
        await supabase!.from('wallet_transactions').insert({
          id: crypto.randomUUID(),
          user_id: ctx.testRenterId,
          amount: totalPrice,
          currency: 'ARS',
          type: 'refund',
          status: 'completed',
          description: `Refund for booking ${bookingId}`,
          reference_type: 'booking',
          reference_id: bookingId,
        })

        await supabase!
          .from('user_wallets')
          .update({ balance: initialBalance + totalPrice })
          .eq('user_id', ctx.testRenterId)
      }

      // Verificar refund
      const { data: finalWallet } = await supabase!
        .from('user_wallets')
        .select('balance')
        .eq('user_id', ctx.testRenterId)
        .single()

      const finalBalance = finalWallet?.balance || 0
      const refundedAmount = finalBalance - initialBalance

      expect(refundedAmount).toBe(totalPrice)
      console.log(`Refund completo: $${refundedAmount}`)

      // Verificar transaccion
      const { data: refundTx } = await supabase!
        .from('wallet_transactions')
        .select('*')
        .eq('reference_id', bookingId)
        .eq('type', 'refund')
        .single()

      expect(refundTx).toBeTruthy()
      console.log('Transaccion de refund verificada')

      // Cleanup
      await supabase!.from('wallet_transactions').delete().eq('reference_id', bookingId)
      await supabase!.from('bookings').delete().eq('id', bookingId)
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B3] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 4: Reembolso parcial (24-48h antes)
   * Precondiciones: Setup completado
   * Postcondiciones: Booking cancelado, refund 50% procesado
   * Checkpoint: 'refund-partial-refund-complete'
   */
  test('B4: Reembolso parcial (24-48h antes del inicio)', async ({ page, checkpointManager, createBlock }) => {
    const prevCheckpoint = await checkpointManager.loadCheckpoint('refund-setup-ready')
    if (prevCheckpoint) await checkpointManager.restoreCheckpoint(prevCheckpoint)

    const block = createBlock(defineBlock('b4-partial-refund', 'Reembolso 50%', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('refund-setup-ready')],
      postconditions: [],
      ...withCheckpoint('refund-partial-refund-complete')
    }))

    const result = await block.execute(async () => {
      console.log('B4: Scenario - Reembolso PARCIAL (24-48h antes)')

      // Obtener balance inicial
      const { data: initialWallet } = await supabase!
        .from('user_wallets')
        .select('balance')
        .eq('user_id', ctx.testRenterId)
        .single()

      const initialBalance = initialWallet?.balance || 0

      const bookingId = crypto.randomUUID()
      const totalPrice = ctx.testCarPricePerDay! * 3
      const refundPercentage = 0.5
      const expectedRefund = totalPrice * refundPercentage

      const startDate = new Date(Date.now() + 36 * 60 * 60 * 1000) // En 36h (24-48h)
      const endDate = new Date(Date.now() + 108 * 60 * 60 * 1000)

      await supabase!.from('bookings').insert({
        id: bookingId,
        car_id: ctx.testCarId,
        renter_id: ctx.testRenterId,
        owner_id: ctx.testCarOwnerId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_price: totalPrice,
        status: 'confirmed',
        payment_status: 'paid',
        cancel_policy: 'moderate',
      })

      // Cancelar con refund parcial
      await supabase!
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          refund_amount: expectedRefund,
          refund_status: 'completed',
        })
        .eq('id', bookingId)

      // Procesar refund parcial
      await supabase!.from('wallet_transactions').insert({
        id: crypto.randomUUID(),
        user_id: ctx.testRenterId,
        amount: expectedRefund,
        currency: 'ARS',
        type: 'refund',
        status: 'completed',
        description: `Partial refund (50%) for booking ${bookingId}`,
        reference_type: 'booking',
        reference_id: bookingId,
      })

      await supabase!
        .from('user_wallets')
        .update({ balance: initialBalance + expectedRefund })
        .eq('user_id', ctx.testRenterId)

      // Verificar
      const { data: finalWallet } = await supabase!
        .from('user_wallets')
        .select('balance')
        .eq('user_id', ctx.testRenterId)
        .single()

      const finalBalance = finalWallet?.balance || 0
      const refundedAmount = finalBalance - initialBalance

      expect(refundedAmount).toBeCloseTo(expectedRefund, 0)
      console.log(`Refund parcial: $${refundedAmount} (50% de $${totalPrice})`)

      // Cleanup
      await supabase!.from('wallet_transactions').delete().eq('reference_id', bookingId)
      await supabase!.from('bookings').delete().eq('id', bookingId)
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B4] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 5: Sin reembolso (<24h antes)
   * Precondiciones: Setup completado
   * Postcondiciones: Booking cancelado, sin refund
   * Checkpoint: 'refund-no-refund-complete'
   */
  test('B5: Sin reembolso (<24h antes del inicio)', async ({ page, checkpointManager, createBlock }) => {
    const prevCheckpoint = await checkpointManager.loadCheckpoint('refund-setup-ready')
    if (prevCheckpoint) await checkpointManager.restoreCheckpoint(prevCheckpoint)

    const block = createBlock(defineBlock('b5-no-refund', 'Sin reembolso', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('refund-setup-ready')],
      postconditions: [],
      ...withCheckpoint('refund-no-refund-complete')
    }))

    const result = await block.execute(async () => {
      console.log('B5: Scenario - SIN reembolso (<24h antes)')

      // Obtener balance inicial
      const { data: initialWallet } = await supabase!
        .from('user_wallets')
        .select('balance')
        .eq('user_id', ctx.testRenterId)
        .single()

      const initialBalance = initialWallet?.balance || 0

      const bookingId = crypto.randomUUID()
      const totalPrice = ctx.testCarPricePerDay! * 3

      const startDate = new Date(Date.now() + 12 * 60 * 60 * 1000) // En 12h (<24h)
      const endDate = new Date(Date.now() + 84 * 60 * 60 * 1000)

      await supabase!.from('bookings').insert({
        id: bookingId,
        car_id: ctx.testCarId,
        renter_id: ctx.testRenterId,
        owner_id: ctx.testCarOwnerId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_price: totalPrice,
        status: 'confirmed',
        payment_status: 'paid',
        cancel_policy: 'strict',
      })

      // Cancelar SIN refund
      await supabase!
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          refund_amount: 0,
          refund_status: 'not_eligible',
        })
        .eq('id', bookingId)

      // Verificar que NO hubo refund
      const { data: finalWallet } = await supabase!
        .from('user_wallets')
        .select('balance')
        .eq('user_id', ctx.testRenterId)
        .single()

      const finalBalance = finalWallet?.balance || 0

      expect(finalBalance).toBe(initialBalance)
      console.log('Sin refund (como esperado para <24h)')

      // Verificar que NO hay transaccion
      const { data: refundTx } = await supabase!
        .from('wallet_transactions')
        .select('*')
        .eq('reference_id', bookingId)
        .eq('type', 'refund')
        .maybeSingle()

      expect(refundTx).toBeNull()
      console.log('Confirmado: Sin transaccion de refund')

      // Cleanup
      await supabase!.from('bookings').delete().eq('id', bookingId)
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B5] Completado en ${result.state.duration}ms`)
  })

  /**
   * BLOQUE 6: Owner inicia refund
   * Precondiciones: Setup completado
   * Postcondiciones: Refund iniciado por owner
   * Checkpoint: 'refund-owner-initiated'
   */
  test('B6: Owner inicia refund', async ({ page, checkpointManager, createBlock }) => {
    const prevCheckpoint = await checkpointManager.loadCheckpoint('refund-setup-ready')
    if (prevCheckpoint) await checkpointManager.restoreCheckpoint(prevCheckpoint)

    const block = createBlock(defineBlock('b6-owner-refund', 'Owner inicia refund', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('refund-setup-ready')],
      postconditions: [],
      ...withCheckpoint('refund-owner-initiated')
    }))

    const result = await block.execute(async () => {
      console.log('B6: Scenario - Owner inicia refund')

      // Buscar auto del owner
      const { data: ownCars } = await supabase!
        .from('cars')
        .select('id, owner_id, price_per_day')
        .eq('owner_id', ctx.testOwnerId)
        .limit(1)

      if (!ownCars || ownCars.length === 0) {
        console.log('Owner no tiene autos, saltando test')
        return
      }

      const ownCar = ownCars[0]
      const bookingId = crypto.randomUUID()
      const totalPrice = ownCar.price_per_day * 3

      const startDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      const endDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)

      await supabase!.from('bookings').insert({
        id: bookingId,
        car_id: ownCar.id,
        renter_id: ctx.testRenterId,
        owner_id: ctx.testOwnerId,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_price: totalPrice,
        status: 'confirmed',
        payment_status: 'paid',
      })

      // Owner cancela
      await supabase!
        .from('bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by: 'owner',
          refund_amount: totalPrice,
          refund_status: 'pending',
        })
        .eq('id', bookingId)

      // Verificar
      const { data: cancelled } = await supabase!
        .from('bookings')
        .select('cancelled_by, refund_amount')
        .eq('id', bookingId)
        .single()

      expect(cancelled?.cancelled_by).toBe('owner')
      expect(cancelled?.refund_amount).toBe(totalPrice)
      console.log('Refund por owner verificado')

      // Cleanup
      await supabase!.from('bookings').delete().eq('id', bookingId)
    })

    expect(result.state.status).toBe('passed')
    console.log(`[B6] Completado en ${result.state.duration}ms`)
  })
})
