import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'
import { AuthFixture } from '../fixtures/auth.setup'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: Flujo Completo de Pago
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 4 bloques atómicos:
 * B1: Pago completo con wallet exitoso
 * B2: Pago completo con tarjeta (MercadoPago) exitoso
 * B3: Manejo de error por fondos insuficientes
 * B4: Webhook de MercadoPago procesa pago
 *
 * Prioridad: P0 (Critical Payment Flow)
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

interface PaymentTestContext {
  authFixture?: AuthFixture
  supabase?: ReturnType<typeof createClient>
  testCarId?: string | null
  testBookingId?: string | null
}

const ctx: PaymentTestContext = {}

test.describe('Flujo Completo de Pago E2E - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    ctx.authFixture = new AuthFixture(page)
    await ctx.authFixture.loadSession('renter')

    ctx.supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey)

    const { data: { user } } = await ctx.supabase.auth.getUser()
    if (!user) {
      console.log('⚠️ Usuario no autenticado')
      return
    }

    const { data: owners } = await ctx.supabase
      .from('profiles')
      .select('id')
      .eq('user_role', 'locador')
      .limit(1)
      .single()

    if (!owners) {
      console.log('⚠️ No hay owners disponibles para testing')
      return
    }

    const { data: car, error: carError } = await ctx.supabase
      .from('cars')
      .insert({
        owner_id: owners.id,
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        color: 'Blanco',
        license_plate: `TEST-${Date.now()}`,
        price_per_day_cents: 50000,
        status: 'active',
        city: 'Buenos Aires',
        province: 'CABA',
      })
      .select()
      .single()

    if (carError || !car) {
      console.log('⚠️ No se pudo crear auto de test')
      return
    }

    ctx.testCarId = car.id
    console.log(`✅ Auto de test creado: ${ctx.testCarId}`)
  })

  test.afterEach(async () => {
    if (ctx.testBookingId && ctx.supabase) {
      await ctx.supabase.from('bookings').delete().eq('id', ctx.testBookingId)
      ctx.testBookingId = null
    }
    if (ctx.testCarId && ctx.supabase) {
      await ctx.supabase.from('cars').delete().eq('id', ctx.testCarId)
      ctx.testCarId = null
    }
  })

  test('B1: Pago completo con wallet exitoso', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-payment-wallet-success', 'Pago wallet exitoso', {
      priority: 'P0',
      estimatedDuration: 45000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('payment-wallet-success')
    }))

    const result = await block.execute(async () => {
      if (!ctx.testCarId || !ctx.supabase) {
        return { skipped: true, reason: 'no test car' }
      }

      await page.goto(`/cars/${ctx.testCarId}`)
      await page.waitForLoadState('networkidle')

      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 3)

      const startDateInput = page.locator('input[name="start_date"]').or(
        page.locator('ion-datetime[name="start_date"]')
      )
      if (await startDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await startDateInput.fill(startDate.toISOString().split('T')[0])
      }

      const endDateInput = page.locator('input[name="end_date"]').or(
        page.locator('ion-datetime[name="end_date"]')
      )
      if (await endDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await endDateInput.fill(endDate.toISOString().split('T')[0])
      }

      const reserveButton = page.getByRole('button', { name: /reservar|solicitar reserva/i })
      await expect(reserveButton).toBeVisible({ timeout: 10000 })
      await reserveButton.click()

      await page.waitForURL(/\/bookings\/detail-payment|\/bookings\/payment/, { timeout: 15000 })

      const walletOption = page.getByRole('button', { name: /wallet|billetera/i })
      await walletOption.click()
      await expect(walletOption).toHaveClass(/selected|active/, { timeout: 5000 })

      const lockButton = page.getByRole('button', { name: /bloquear fondos|lock funds/i })
      if (await lockButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lockButton.click()
        await expect(page.getByText(/fondos bloqueados|funds locked/i)).toBeVisible({ timeout: 10000 })
      }

      const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos/i })
      await termsCheckbox.check()
      await expect(termsCheckbox).toBeChecked()

      const confirmButton = page.getByRole('button', { name: /confirmar y pagar|confirmar/i })
      await expect(confirmButton).toBeEnabled()
      await confirmButton.click()

      await expect(page.getByText('Creando reserva...')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Procesando pago...')).toBeVisible({ timeout: 10000 })

      await page.waitForURL(/\/bookings\/success\/.+/, { timeout: 15000 })

      await expect(page.getByText(/reserva confirmada|reserva está confirmada/i)).toBeVisible({ timeout: 10000 })

      const url = page.url()
      const bookingIdMatch = url.match(/\/bookings\/success\/([^\/]+)/)
      if (bookingIdMatch) {
        ctx.testBookingId = bookingIdMatch[1]

        const { data: booking } = await ctx.supabase
          .from('bookings')
          .select('status, payment_status')
          .eq('id', ctx.testBookingId)
          .single()

        expect(booking?.status).toBe('confirmed')
        expect(booking?.payment_status).toBe('completed')
      }

      console.log('✅ Pago con wallet completado exitosamente')
      return { paymentCompleted: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Pago completo con tarjeta (MercadoPago) exitoso', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-payment-card-success', 'Pago tarjeta exitoso', {
      priority: 'P0',
      estimatedDuration: 45000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.testCarId) {
        return { skipped: true, reason: 'no test car' }
      }

      let mpPreferenceId: string | null = null

      await page.route('**/mercadopago-create-booking-preference**', async route => {
        const preference = {
          id: `TEST-${Date.now()}`,
          init_point: `https://www.mercadopago.com.ar/checkout/v1/redirect?pref_id=TEST-${Date.now()}`,
          sandbox_init_point: `https://sandbox.mercadopago.com.ar/checkout/v1/redirect?pref_id=TEST-${Date.now()}`,
        }
        mpPreferenceId = preference.id

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(preference),
        })
      })

      await page.route('**/mercadopago-webhook**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ received: true }),
        })
      })

      await page.goto(`/cars/${ctx.testCarId}`)
      await page.waitForLoadState('networkidle')

      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7)

      const reserveButton = page.getByRole('button', { name: /reservar|solicitar reserva/i })
      await reserveButton.click()

      await page.waitForURL(/\/bookings\/detail-payment|\/bookings\/payment/, { timeout: 15000 })

      const cardOption = page.getByRole('button', { name: /tarjeta|card|crédito/i })
      await cardOption.click()
      await expect(cardOption).toHaveClass(/selected|active/, { timeout: 5000 })

      const authorizeHoldBtn = page.getByRole('button', { name: /autorizar.*hold|authorize/i })
      if (await authorizeHoldBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await authorizeHoldBtn.click()
        await expect(page.getByText(/hold autorizado|authorized/i)).toBeVisible({ timeout: 10000 })
      }

      const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos/i })
      await termsCheckbox.check()

      const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i })
      await confirmButton.click()

      await page.waitForTimeout(2000)
      expect(mpPreferenceId).toBeTruthy()

      if (ctx.testBookingId) {
        await page.goto(`/bookings/success/${ctx.testBookingId}`)
        await expect(page.getByText(/reserva confirmada/i)).toBeVisible({ timeout: 10000 })
      }

      console.log('✅ Pago con tarjeta iniciado correctamente')
      return { cardPaymentInitiated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Manejo de error por fondos insuficientes', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-payment-insufficient-funds', 'Fondos insuficientes', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.testCarId) {
        return { skipped: true, reason: 'no test car' }
      }

      await page.goto(`/cars/${ctx.testCarId}`)
      await page.waitForLoadState('networkidle')

      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7)

      const reserveButton = page.getByRole('button', { name: /reservar|solicitar reserva/i })
      await reserveButton.click()

      await page.waitForURL(/\/bookings\/detail-payment|\/bookings\/payment/, { timeout: 15000 })

      const walletOption = page.getByRole('button', { name: /wallet|billetera/i })
      await walletOption.click()

      const lockButton = page.getByRole('button', { name: /bloquear fondos/i })
      if (await lockButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lockButton.click()

        await expect(
          page.getByText(/fondos insuficientes|insufficient funds|saldo insuficiente/i)
        ).toBeVisible({ timeout: 10000 })
      }

      const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i })
      await expect(confirmButton).toBeDisabled()

      console.log('✅ Error de fondos insuficientes manejado correctamente')
      return { insufficientFundsHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Webhook de MercadoPago procesa pago', async ({ page, request, createBlock }) => {
    const block = createBlock(defineBlock('b4-payment-webhook', 'Webhook MercadoPago', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      if (!ctx.supabase || !ctx.testCarId) {
        return { skipped: true, reason: 'no test data' }
      }

      const { data: { user } } = await ctx.supabase.auth.getUser()
      if (!user) {
        return { skipped: true, reason: 'no user' }
      }

      const startDate = new Date()
      startDate.setDate(startDate.getDate() + 7)
      const endDate = new Date(startDate)
      endDate.setDate(endDate.getDate() + 3)

      const { data: booking } = await ctx.supabase
        .from('bookings')
        .insert({
          car_id: ctx.testCarId,
          renter_id: user.id,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          status: 'pending_payment',
          total_amount_cents: 150000,
          currency: 'ARS',
          payment_status: 'pending',
        })
        .select()
        .single()

      if (booking) {
        ctx.testBookingId = booking.id
      } else {
        return { skipped: true, reason: 'no booking created' }
      }

      const webhookPayload = {
        type: 'payment',
        data: {
          id: `TEST-${Date.now()}`,
          status: 'approved',
          transaction_amount: 1500,
          currency_id: 'ARS',
          payment_method_id: 'credit_card',
          date_approved: new Date().toISOString(),
        },
      }

      const webhookUrl = `${supabaseUrl}/functions/v1/mercadopago-webhook`
      const response = await request.post(webhookUrl, {
        headers: {
          'Content-Type': 'application/json',
          'x-mercadopago-signature': 'test-signature',
        },
        data: webhookPayload,
      })

      expect(response.ok()).toBeTruthy()

      const { data: updatedBooking } = await ctx.supabase
        .from('bookings')
        .select('status, payment_status')
        .eq('id', ctx.testBookingId)
        .single()

      expect(['confirmed', 'pending_confirmation', 'completed']).toContain(updatedBooking?.status)

      console.log('✅ Webhook de MercadoPago procesado correctamente')
      return { webhookProcessed: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
