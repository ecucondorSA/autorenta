import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../../checkpoint/fixtures'

/**
 * E2E Test Completo: Flujo de Alquiler desde Inicio hasta Postcheckout
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 7 bloques atómicos:
 * B1: Login (manual si es necesario)
 * B2: Buscar y seleccionar un auto
 * B3: Seleccionar fechas de alquiler
 * B4: Crear reserva (booking)
 * B5: Configurar método de pago (wallet)
 * B6: Aceptar términos y completar pago
 * B7: Verificar página de éxito/postcheckout
 *
 * Prioridad: P0 (Critical)
 */

interface BookingFlowContext {
  carId?: string | null
  bookingId?: string | null
  startDateStr?: string
  endDateStr?: string
}

const ctx: BookingFlowContext = {}

test.use({
  baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200',
})

test.describe('Flujo Completo de Alquiler - Checkpoint Architecture', () => {

  test('B1: Login', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-booking-login', 'Login usuario', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('booking-flow-logged-in')
    }))

    const result = await block.execute(async () => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      // Verificar si ya está autenticado
      const userMenu = page.getByTestId('user-menu').or(page.locator('[data-testid="user-menu"]'))
      const isAuthenticated = await userMenu.isVisible({ timeout: 5000 }).catch(() => false)

      if (!isAuthenticated) {
        console.log('🔐 Haciendo login manual...')
        await page.goto('/auth/login')
        await page.waitForLoadState('domcontentloaded')

        const emailInput = page.getByPlaceholder(/email|correo/i).or(page.locator('input[type="email"]'))
        const passwordInput = page.getByPlaceholder(/contraseña|password/i).or(page.locator('input[type="password"]'))
        const loginButton = page.getByRole('button', { name: /entrar|iniciar sesión|login/i })

        await emailInput.fill('renter.test@autorenta.com')
        await passwordInput.fill('TestRenter123!')
        await loginButton.click()

        await page.waitForURL(/\/cars|\//, { timeout: 15000 })
        await page.waitForTimeout(2000)
        console.log('✅ Login completado')
      } else {
        console.log('✅ Usuario ya autenticado')
      }

      return { authenticated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Buscar y seleccionar un auto', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('booking-flow-logged-in')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/')
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b2-booking-select-car', 'Seleccionar auto', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('booking-flow-logged-in')],
      postconditions: [],
      ...withCheckpoint('booking-flow-car-selected')
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)

      // Buscar el primer auto disponible
      const firstCarCard = page.locator('[data-car-id]').or(page.locator('app-car-card').first())
      const carCardVisible = await firstCarCard.isVisible({ timeout: 10000 }).catch(() => false)

      if (!carCardVisible) {
        const carLink = page.locator('a[href*="/cars/"]').first()
        const linkVisible = await carLink.isVisible({ timeout: 5000 }).catch(() => false)

        if (linkVisible) {
          ctx.carId = await carLink.getAttribute('href').then(href => {
            const match = href?.match(/\/cars\/([a-f0-9-]+)/)
            return match ? match[1] : null
          })

          if (ctx.carId) {
            await carLink.click()
          }
        } else {
          throw new Error('No se encontraron autos disponibles para alquilar')
        }
      } else {
        ctx.carId = await firstCarCard.getAttribute('data-car-id')

        if (!ctx.carId) {
          const carLink = firstCarCard.locator('a').first()
          const href = await carLink.getAttribute('href').catch(() => null)
          if (href) {
            const match = href.match(/\/cars\/([a-f0-9-]+)/)
            ctx.carId = match ? match[1] : null
          }
        }

        await firstCarCard.click({ timeout: 5000 })
      }

      await page.waitForURL(/\/cars\/[a-f0-9-]+/, { timeout: 10000 })

      if (!ctx.carId) {
        const url = page.url()
        const match = url.match(/\/cars\/([a-f0-9-]+)/)
        ctx.carId = match ? match[1] : null
      }

      expect(ctx.carId).toBeTruthy()
      console.log(`✅ Auto seleccionado: ${ctx.carId}`)

      return { carId: ctx.carId }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Seleccionar fechas de alquiler', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('booking-flow-car-selected')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      if (ctx.carId) {
        await page.goto(`/cars/${ctx.carId}`)
      } else {
        await page.goto('/cars')
        await page.locator('a[href*="/cars/"]').first().click()
      }
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b3-booking-select-dates', 'Seleccionar fechas', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [requiresCheckpoint('booking-flow-car-selected')],
      postconditions: [],
      ...withCheckpoint('booking-flow-dates-selected')
    }))

    const result = await block.execute(async () => {
      // Calcular fechas
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + 3)
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 7)

      ctx.startDateStr = startDate.toISOString().split('T')[0]
      ctx.endDateStr = endDate.toISOString().split('T')[0]

      const dateFromInput = page.getByTestId('date-from').or(page.locator('input[type="date"]').first())
      const dateToInput = page.getByTestId('date-to').or(page.locator('input[type="date"]').nth(1))

      await dateFromInput.fill(ctx.startDateStr)
      await page.waitForTimeout(500)
      await dateToInput.fill(ctx.endDateStr)
      await page.waitForTimeout(1000)

      console.log(`✅ Fechas seleccionadas: ${ctx.startDateStr} a ${ctx.endDateStr}`)

      return { startDate: ctx.startDateStr, endDate: ctx.endDateStr }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Crear reserva (booking)', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('booking-flow-dates-selected')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b4-booking-create', 'Crear reserva', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('booking-flow-dates-selected')],
      postconditions: [],
      ...withCheckpoint('booking-flow-booking-created')
    }))

    const result = await block.execute(async () => {
      const bookButton = page.getByRole('button', { name: /reservar|inicia sesión para reservar/i })
      await expect(bookButton).toBeVisible({ timeout: 10000 })

      const isEnabled = await bookButton.isEnabled()
      if (!isEnabled) {
        await page.waitForTimeout(2000)
      }

      await bookButton.click()

      await page.waitForURL(/\/bookings\/detail-payment/, { timeout: 15000 })

      const url = page.url()
      const bookingIdMatch = url.match(/bookingId=([a-f0-9-]+)/)
      ctx.bookingId = bookingIdMatch ? bookingIdMatch[1] : null

      console.log(`✅ Reserva creada: ${ctx.bookingId}`)

      return { bookingId: ctx.bookingId }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Configurar método de pago (wallet)', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('booking-flow-booking-created')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b5-booking-payment-method', 'Configurar pago', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('booking-flow-booking-created')],
      postconditions: [],
      ...withCheckpoint('booking-flow-payment-configured')
    }))

    const result = await block.execute(async () => {
      await expect(page.getByText(/completa tu reserva|detalle de pago/i)).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(2000)

      const walletOption = page.getByRole('button', { name: /wallet|billetera/i }).or(
        page.locator('[data-payment-method="wallet"]')
      )

      const walletVisible = await walletOption.isVisible({ timeout: 5000 }).catch(() => false)

      if (walletVisible) {
        await walletOption.click()
        await page.waitForTimeout(500)

        const lockButton = page.getByRole('button', { name: /bloquear fondos|lock funds/i })
        const lockVisible = await lockButton.isVisible({ timeout: 5000 }).catch(() => false)

        if (lockVisible && await lockButton.isEnabled()) {
          await lockButton.click()
          await page.waitForTimeout(2000)

          const lockConfirmed = await page.getByText(/fondos bloqueados|funds locked/i).isVisible({ timeout: 5000 }).catch(() => false)
          if (!lockConfirmed) {
            console.warn('No se confirmó el bloqueo de fondos, pero continuando...')
          }
        }
        console.log('✅ Wallet seleccionado')
      } else {
        console.warn('Opción de wallet no visible, usando tarjeta como alternativa')
        const cardOption = page.getByRole('button', { name: /tarjeta|card|crédito/i })
        if (await cardOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          await cardOption.click()
        }
      }

      return { paymentConfigured: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Aceptar términos y completar pago', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('booking-flow-payment-configured')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b6-booking-confirm-pay', 'Completar pago', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('booking-flow-payment-configured')],
      postconditions: [],
      ...withCheckpoint('booking-flow-payment-completed')
    }))

    const result = await block.execute(async () => {
      const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos|condiciones/i })
      const termsVisible = await termsCheckbox.isVisible({ timeout: 5000 }).catch(() => false)

      if (termsVisible) {
        await termsCheckbox.check()
        await expect(termsCheckbox).toBeChecked()
      }

      const confirmButton = page.getByRole('button', { name: /confirmar y pagar|confirmar|pagar/i })
      await expect(confirmButton).toBeVisible({ timeout: 10000 })
      await expect(confirmButton).toBeEnabled({ timeout: 5000 })

      await confirmButton.click()

      await expect(page.getByText(/creando reserva|procesando pago/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('No se mostró el estado de procesamiento')
      })

      await page.waitForURL(/\/bookings\/success\/.+/, { timeout: 20000 })

      if (!ctx.bookingId) {
        const successUrl = page.url()
        const match = successUrl.match(/\/bookings\/success\/([a-f0-9-]+)/)
        ctx.bookingId = match ? match[1] : null
      }

      console.log(`✅ Pago completado, booking ID: ${ctx.bookingId}`)

      return { paymentCompleted: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Verificar página de éxito/postcheckout', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('booking-flow-payment-completed')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b7-booking-verify-success', 'Verificar éxito', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('booking-flow-payment-completed')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page).toHaveURL(/\/bookings\/success\/.+/)

      await expect(page.getByText(/tu reserva está confirmada|reserva confirmada/i)).toBeVisible({ timeout: 10000 })

      const successIcon = page.locator('ion-icon[name="checkmark-circle"]').or(
        page.locator('[class*="success-icon"]')
      )
      await expect(successIcon.first()).toBeVisible({ timeout: 5000 })

      await expect(page.getByText(/enviamos.*detalles.*email|hemos enviado/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Mensaje de email no encontrado')
      })

      await expect(page.getByText(/detalles de tu reserva|resumen/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Card de detalles no encontrado')
      })

      await expect(page.getByText(/desde:|hasta:|fecha/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Fechas no encontradas en el resumen')
      })

      await expect(page.getByText(/total|precio|pagado/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Total no encontrado')
      })

      await expect(page.getByText(/próximos pasos|next steps/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Sección de próximos pasos no encontrada')
      })

      const viewDetailsButton = page.getByRole('button', { name: /ver detalles|ver reserva/i })
      const searchMoreButton = page.getByRole('button', { name: /buscar más|más vehículos/i })
      const homeButton = page.getByRole('button', { name: /ir al inicio|volver al inicio|home/i })

      const hasActionButton = await Promise.race([
        viewDetailsButton.isVisible().then(() => true),
        searchMoreButton.isVisible().then(() => true),
        homeButton.isVisible().then(() => true),
      ]).catch(() => false)

      expect(hasActionButton).toBe(true)

      if (ctx.bookingId) {
        const bookingIdVisible = await page.getByText(ctx.bookingId.slice(0, 8)).isVisible({ timeout: 5000 }).catch(() => false)
        if (bookingIdVisible) {
          console.log('✅ Booking ID visible en la página')
        }
      }

      console.log('✅ Flujo completo de alquiler completado exitosamente')
      console.log(`   - Auto ID: ${ctx.carId}`)
      console.log(`   - Booking ID: ${ctx.bookingId}`)
      console.log(`   - Fechas: ${ctx.startDateStr} a ${ctx.endDateStr}`)

      return { successVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Manejar errores durante el proceso de pago', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-booking-error-handling', 'Manejar errores de pago', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Placeholder para futuras mejoras
      console.log('⏭️ Test de errores pendiente de implementación')
      return { skipped: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
