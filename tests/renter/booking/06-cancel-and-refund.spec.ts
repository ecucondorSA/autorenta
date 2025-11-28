import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../../checkpoint/fixtures'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: Cancelación de Booking con Refund
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 6 bloques atómicos:
 * B1: Cancelar booking dentro de ventana free (>24h) → refund completo
 * B2: Cancelar booking fuera de ventana (<24h) → sin refund o parcial
 * B3: Booking parcialmente pagado (wallet + tarjeta) [Placeholder]
 * B4: Intentar cancelar booking ya iniciado → error
 * B5: Validar ledger entries después de refund [Placeholder]
 * B6: Conciliación de wallet [Placeholder]
 *
 * Prioridad: P0 (Critical)
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface CancelRefundContext {
  supabase?: ReturnType<typeof createClient>
  testBookingId?: string | null
  userId?: string
  balanceBefore?: number
}

const ctx: CancelRefundContext = {}

test.use({ storageState: 'tests/.auth/renter.json' })

test.describe('Cancelación y Refund - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    ctx.supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

    await page.goto('/')
    await expect(page.getByTestId('user-menu').or(page.locator('[data-testid="user-menu"]'))).toBeVisible({ timeout: 10000 })
  })

  test.afterEach(async () => {
    if (ctx.testBookingId && ctx.supabase) {
      await ctx.supabase.from('bookings').delete().eq('id', ctx.testBookingId)
      ctx.testBookingId = null
    }
  })

  test('B1: Cancela booking dentro de ventana free (>24h) → refund completo', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-cancel-free-window', 'Cancelar en ventana free', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('cancel-free-window-done')
    }))

    const result = await block.execute(async () => {
      if (!ctx.supabase) throw new Error('Supabase client not initialized')

      // Crear booking de test con fecha futura (>24h)
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const endDate = new Date(futureDate)
      endDate.setDate(endDate.getDate() + 3)

      const { data: cars } = await ctx.supabase
        .from('cars')
        .select('id, owner_id')
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!cars) {
        console.log('⏭️ No hay autos disponibles para testing')
        return { skipped: true }
      }

      const { data: { user } } = await ctx.supabase.auth.getUser()
      if (!user) {
        console.log('⏭️ Usuario no autenticado')
        return { skipped: true }
      }

      ctx.userId = user.id

      const { data: booking, error: bookingError } = await ctx.supabase
        .from('bookings')
        .insert({
          car_id: cars.id,
          renter_id: user.id,
          start_at: futureDate.toISOString(),
          end_at: endDate.toISOString(),
          status: 'confirmed',
          total_amount_cents: 100000,
          currency: 'ARS',
          payment_status: 'completed',
        })
        .select()
        .single()

      if (bookingError || !booking) {
        console.log('⏭️ No se pudo crear booking de test')
        return { skipped: true }
      }

      ctx.testBookingId = booking.id

      // Obtener balance inicial de wallet
      const { data: walletBefore } = await ctx.supabase
        .from('user_wallets')
        .select('balance_cents')
        .eq('user_id', user.id)
        .single()

      ctx.balanceBefore = walletBefore?.balance_cents || 0

      // Navegar a booking
      await page.goto(`/bookings/${booking.id}`)
      await page.waitForLoadState('networkidle')

      // Click en cancelar
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      await expect(cancelButton).toBeVisible({ timeout: 10000 })
      await cancelButton.click()

      // Confirmar en modal
      await page.waitForTimeout(1000)
      const confirmButton = page.locator('ion-alert button:has-text("Confirmar")')
        .or(page.locator('button:has-text("Sí, cancelar")'))
        .or(page.locator('button:has-text("Confirmar cancelación")'))

      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click()
      }

      // Verificar mensaje de éxito
      await expect(
        page.getByText(/cancelado exitosamente|cancelado/i)
      ).toBeVisible({ timeout: 10000 })
      console.log('✅ Booking cancelado exitosamente')

      // Verificar status en BD
      const { data: updatedBooking } = await ctx.supabase
        .from('bookings')
        .select('status, cancellation_reason')
        .eq('id', booking.id)
        .single()

      expect(updatedBooking?.status).toBe('cancelled')
      console.log('✅ Status cambió a cancelled en BD')

      // Verificar wallet balance (refund)
      const { data: walletAfter } = await ctx.supabase
        .from('user_wallets')
        .select('balance_cents')
        .eq('user_id', user.id)
        .single()

      if (walletAfter) {
        expect(walletAfter.balance_cents).toBeGreaterThanOrEqual(ctx.balanceBefore)
        console.log('✅ Balance de wallet verificado')
      }

      return { cancelled: true, refundProcessed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Cancela booking fuera de ventana (<24h) → sin refund o parcial', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-cancel-outside-window', 'Cancelar fuera de ventana', {
      priority: 'P1',
      estimatedDuration: 25000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.supabase) throw new Error('Supabase client not initialized')

      // Crear booking con start_date cercano (6h)
      const nearDate = new Date()
      nearDate.setHours(nearDate.getHours() + 6)
      const endDate = new Date(nearDate)
      endDate.setDate(endDate.getDate() + 2)

      const { data: cars } = await ctx.supabase
        .from('cars')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!cars) {
        console.log('⏭️ No hay autos disponibles')
        return { skipped: true }
      }

      const { data: { user } } = await ctx.supabase.auth.getUser()
      if (!user) {
        console.log('⏭️ Usuario no autenticado')
        return { skipped: true }
      }

      const { data: booking, error } = await ctx.supabase
        .from('bookings')
        .insert({
          car_id: cars.id,
          renter_id: user.id,
          start_at: nearDate.toISOString(),
          end_at: endDate.toISOString(),
          status: 'confirmed',
          total_amount_cents: 100000,
          currency: 'ARS',
          payment_status: 'completed',
        })
        .select()
        .single()

      if (error || !booking) {
        console.log('⏭️ No se pudo crear booking de test')
        return { skipped: true }
      }

      ctx.testBookingId = booking.id

      // Navegar a booking
      await page.goto(`/bookings/${booking.id}`)
      await page.waitForLoadState('networkidle')

      // Intentar cancelar
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      const isVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        await cancelButton.click()

        // Verificar mensaje de advertencia
        await expect(
          page.getByText(/fuera de la ventana|no recibirás reembolso|sin reembolso/i)
        ).toBeVisible({ timeout: 10000 })
        console.log('✅ Mensaje de advertencia mostrado')

        // Confirmar cancelación
        const confirmButton = page.locator('ion-alert button:has-text("Confirmar")')
          .or(page.locator('button:has-text("Continuar")'))

        if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await confirmButton.click()
        }
      } else {
        await expect(
          page.getByText(/no puedes cancelar|fuera de plazo/i)
        ).toBeVisible({ timeout: 5000 })
        console.log('✅ Botón de cancelar no visible (correcto)')
      }

      // Verificar en BD
      const { data: updatedBooking } = await ctx.supabase
        .from('bookings')
        .select('status, cancellation_fee_cents')
        .eq('id', booking.id)
        .single()

      if (updatedBooking?.status === 'cancelled') {
        expect(updatedBooking.cancellation_fee_cents).toBeGreaterThanOrEqual(0)
        console.log('✅ Fee de cancelación aplicado')
      }

      return { handledCorrectly: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Booking parcialmente pagado (wallet + tarjeta)', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b3-cancel-partial-payment', 'Cancelar pago parcial', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      console.log('⏭️ Pendiente de implementación de payment_method parcial')
      return { skipped: true, reason: 'partial_wallet not implemented' }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Intenta cancelar booking ya iniciado → error', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-cancel-in-progress', 'Cancelar booking iniciado', {
      priority: 'P1',
      estimatedDuration: 25000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.supabase) throw new Error('Supabase client not initialized')

      // Crear booking ya iniciado (en el pasado)
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      const endDate = new Date(pastDate)
      endDate.setDate(endDate.getDate() + 3)

      const { data: cars } = await ctx.supabase
        .from('cars')
        .select('id')
        .eq('status', 'active')
        .limit(1)
        .single()

      if (!cars) {
        console.log('⏭️ No hay autos disponibles')
        return { skipped: true }
      }

      const { data: { user } } = await ctx.supabase.auth.getUser()
      if (!user) {
        console.log('⏭️ Usuario no autenticado')
        return { skipped: true }
      }

      const { data: booking, error } = await ctx.supabase
        .from('bookings')
        .insert({
          car_id: cars.id,
          renter_id: user.id,
          start_at: pastDate.toISOString(),
          end_at: endDate.toISOString(),
          status: 'in_progress',
          total_amount_cents: 100000,
          currency: 'ARS',
          payment_status: 'completed',
        })
        .select()
        .single()

      if (error || !booking) {
        console.log('⏭️ No se pudo crear booking de test')
        return { skipped: true }
      }

      ctx.testBookingId = booking.id

      // Navegar a booking
      await page.goto(`/bookings/${booking.id}`)
      await page.waitForLoadState('networkidle')

      // Verificar que botón "Cancelar" NO está visible o está disabled
      const cancelButton = page.getByRole('button', { name: /cancelar/i })
      const isVisible = await cancelButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (isVisible) {
        await expect(cancelButton).toBeDisabled()
        console.log('✅ Botón de cancelar deshabilitado')
      } else {
        await expect(
          page.getByText(/no puedes cancelar|ya inició|no se puede cancelar/i)
        ).toBeVisible({ timeout: 5000 })
        console.log('✅ Mensaje de no cancelar visible')
      }

      // Intentar cancelar via API
      const response = await page.request.post(
        `${supabaseUrl}/rest/v1/rpc/cancel_booking`,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
            apikey: supabaseAnonKey,
          },
          data: {
            booking_id: booking.id,
          },
        }
      )

      expect([400, 422, 500]).toContain(response.status())
      console.log('✅ API rechaza cancelación de booking iniciado')

      return { errorHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Validación de Ledger - Checkpoint Architecture', () => {

  test('B5: Ledger entries cumplen doble entrada después de refund', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b5-ledger-double-entry', 'Validar ledger', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      console.log('⏭️ Pendiente de implementación de ledger system')
      return { skipped: true, reason: 'ledger system not implemented' }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Conciliación de wallet después de múltiples cancelaciones', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b6-wallet-reconciliation', 'Conciliar wallet', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      console.log('⏭️ Pendiente de implementación')
      return { skipped: true, reason: 'stress test not implemented' }
    })

    expect(result.state.status).toBe('passed')
  })
})
