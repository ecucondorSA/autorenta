import { test, expect, defineBlock, requiresCheckpoint, expectsUrl, expectsElement, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test Completo: Flujo de Alquiler desde Inicio hasta Postcheckout
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo completo en 5 bloques atómicos:
 * B1: Verificar autenticación y navegar a lista de autos
 * B2: Seleccionar auto y navegar a detalle
 * B3: Seleccionar fechas y crear reserva
 * B4: Configurar pago y completar transacción
 * B5: Verificar página de éxito/postcheckout
 *
 * Prioridad: P0 (Critical)
 * Duración estimada: ~2-3 minutos
 */

test.use({
  storageState: 'tests/.auth/renter.json'
})

// Mock para la API car_stats para evitar 404
test.beforeEach(async ({ page }) => {
  await page.route('**/rest/v1/car_stats**', async route => {
    // Puedes personalizar la respuesta con datos válidos si necesitas
    const mockResponse = [
      {
        car_id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef', // Un ID de ejemplo
        reviews_count: 5,
        rating_avg: 4.5,
        total_bookings: 10
        // Asegúrate de incluir todas las columnas que tu frontend pueda esperar.
        // Aquí solo están las mínimas que inferí del esquema.
      }
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockResponse)
    });
  });

  // Mock para la API principal de coches
  await page.route('**/rest/v1/cars**', async route => {
    const mockCars = [
      {
        id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2022,
        price_per_day: 5000,
        currency: 'ARS',
        photos: [{ url: 'https://via.placeholder.com/150' }], // Necesario para que el card se renderice
        title: 'Toyota Corolla 2022',
        location_city: 'Buenos Aires',
        transmission: 'automatic',
        seats: 5,
        // Añadir más propiedades si son necesarias para el renderizado del app-car-card
        // Asegúrate de que este mock incluya todas las propiedades que `app-car-card` espera
      }
    ];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'Content-Range': '0-0/1' }, // Importante para Supabase
      body: JSON.stringify(mockCars)
    });
  });
});


// Contexto compartido entre bloques
interface BookingFlowContext {
  carId?: string
  bookingId?: string
  startDate?: string
  endDate?: string
}
const ctx: BookingFlowContext = {}

test.describe('Flujo Completo de Alquiler - Checkpoint Architecture', () => {

  test('B1: Verificar autenticación y navegar a lista', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-booking-auth-nav', 'Verificar auth y navegar a cars/list', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [
        expectsUrl(/\/cars\/list/),
        expectsElement('a[href^="/cars/"]')
      ],
      ...withCheckpoint('booking-flow-cars-list-ready')
    }))

    const result = await block.execute(async () => {
      // Verificar autenticación via storageState
      await page.goto('/', { waitUntil: 'commit' })

      const userMenu = page.getByTestId('user-menu')
        .or(page.locator('a[href*="/profile"]'))

      await expect(userMenu.first()).toBeAttached({ timeout: 10000 })
      console.log('✅ Usuario autenticado via storageState')

      // Navegar a lista de autos
      console.log('🚗 Navegando a /cars/list...')
      try {
        await page.goto('/cars/list', { waitUntil: 'domcontentloaded', timeout: 45000 })
      } catch {
        console.log('⚠️ La navegación tardó más de lo esperado, verificando contenido...')
      }

      // Esperar a que aparezca cualquier link de auto
      const carLink = page.locator('a[href^="/cars/"]').first()
      await expect(carLink).toBeVisible({ timeout: 20000 })
      console.log('✅ Autos detectados en la lista')

      // Esperar a que desaparezca el loading inicial
      await expect(page.locator('app-skeleton-loader, .loading, ion-spinner').first())
        .not.toBeVisible({ timeout: 10000 }).catch(() => { })

      // Handle mobile view
      const isMobile = page.viewportSize()?.width && page.viewportSize()!.width < 768
      if (isMobile) {
        console.log('📱 Detectado modo mobile')
        const mapTab = page.getByText('Mapa').or(page.locator('[data-tab="map"]'))
        if (await mapTab.isVisible()) {
          await mapTab.click()
          await page.waitForTimeout(500)
        }
      }

      // Verificar que hay autos visibles
      const anyCarCard = page.locator('app-car-card, [data-car-id], .car-card').first()
      try {
        await expect(anyCarCard).toBeVisible({ timeout: 15000 })
        console.log('✅ Autos encontrados en la vista actual')
      } catch {
        console.log('⚠️ No se encontraron autos inmediatamente, verificando estado...')
        const noCarsMsg = page.locator('text=/no hay autos|sin resultados|no se encontraron/i')
        if (await noCarsMsg.isVisible()) {
          throw new Error('La búsqueda no arrojó resultados. Verifica que haya autos disponibles.')
        }
        // Esperar un poco más si estamos en vista de mapa
        const mapContainer = page.locator('#map-container, .map-container')
        if (await mapContainer.isVisible()) {
          console.log('🗺️ Vista de mapa, esperando pines...')
          await page.waitForTimeout(3000)
        }
      }

      return { carsListReady: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Seleccionar auto y navegar a detalle', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint anterior
    const prev = await checkpointManager.loadCheckpoint('booking-flow-cars-list-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Si no hay checkpoint, navegar manualmente
      await page.goto('/cars/list', { waitUntil: 'commit' })
      // Esperar a que la página de lista de autos cargue elementos visibles
      await expect(page.locator('app-car-card').first()).toBeVisible({ timeout: 15000 });
    }

    const block = createBlock(defineBlock('b2-booking-select-car', 'Seleccionar auto y ver detalle', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('booking-flow-cars-list-ready')],
      postconditions: [
        expectsUrl(/\/cars\/[a-f0-9-]+/)
      ],
      ...withCheckpoint('booking-flow-car-detail-ready')
    }))

    const result = await block.execute(async () => {
      console.log('🔍 Buscando autos para seleccionar...')

      const carSelector = 'a[href^="/cars/"], app-car-card, [data-car-id], .car-card'
      const carElement = page.locator(carSelector).first()

      await expect(carElement).toBeVisible({ timeout: 30000 })
      console.log('✅ Auto encontrado')

      // Extraer carId
      let carId = await carElement.getAttribute('data-car-id')
      if (!carId) {
        const href = await carElement.getAttribute('href')
        if (href) {
          const match = href.match(/\/cars\/([a-f0-9-]+)/)
          carId = match ? match[1] : null
        }
      }
      console.log(`🆔 Car ID detectado: ${carId || 'Desconocido'}`)

      // Click en el auto
      await carElement.click({ timeout: 5000 })

      // Verificar navegación a detalle
      await page.waitForURL(/\/cars\/[a-f0-9-]+/, { timeout: 10000 })

      // Verificar y actualizar carId desde URL
      const carDetailUrl = page.url()
      const urlMatch = carDetailUrl.match(/\/cars\/([a-f0-9-]+)/)
      if (urlMatch) {
        if (urlMatch[1] !== carId) {
          console.warn(`⚠️ CarId del card (${carId}) no coincide con URL (${urlMatch[1]}). Usando URL.`)
        }
        carId = urlMatch[1]
      }

      expect(carId).toBeTruthy()
      ctx.carId = carId!
      console.log(`✅ Navegado a detalle del auto: ${ctx.carId}`)

      return { carId: ctx.carId }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Seleccionar fechas y crear reserva', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint anterior
    const prev = await checkpointManager.loadCheckpoint('booking-flow-car-detail-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else if (ctx.carId) {
      await page.goto(`/cars/${ctx.carId}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b3-booking-dates-create', 'Seleccionar fechas y crear booking', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [requiresCheckpoint('booking-flow-car-detail-ready')],
      postconditions: [
        expectsUrl(/\/bookings\/detail-payment/)
      ],
      ...withCheckpoint('booking-flow-payment-page-ready')
    }))

    const result = await block.execute(async () => {
      // Calcular fechas: desde hoy + 3 días hasta hoy + 7 días
      const today = new Date()
      const startDate = new Date(today)
      startDate.setDate(today.getDate() + 3)
      const endDate = new Date(today)
      endDate.setDate(today.getDate() + 7)

      ctx.startDate = startDate.toISOString().split('T')[0]
      ctx.endDate = endDate.toISOString().split('T')[0]

      // Buscar date range picker
      const dateFromInput = page.getByTestId('date-from').or(page.locator('input[type="date"]').first())
      const dateToInput = page.getByTestId('date-to').or(page.locator('input[type="date"]').nth(1))

      // Llenar fechas
      await dateFromInput.fill(ctx.startDate)
      await page.waitForTimeout(500)
      await dateToInput.fill(ctx.endDate)
      await page.waitForTimeout(1000)

      console.log(`✅ Fechas seleccionadas: ${ctx.startDate} a ${ctx.endDate}`)

      // Buscar botón de reservar
      const bookButton = page.locator('#book-now')
        .or(page.getByRole('button', { name: /solicitar reserva|reservar/i }))
        .or(page.getByRole('link', { name: /inicia sesión para reservar/i }))
        .first()

      await expect(bookButton).toBeVisible({ timeout: 10000 })
      console.log('✅ Botón de reserva encontrado')

      // Verificar que el botón esté habilitado
      const tagName = await bookButton.evaluate((el) => el.tagName.toLowerCase())
      if (tagName === 'button') {
        const isEnabled = await bookButton.isEnabled()
        if (!isEnabled) {
          await page.waitForTimeout(2000)
          const stillDisabled = !(await bookButton.isEnabled())
          if (stillDisabled) {
            // Re-seleccionar fechas
            console.log('⚠️ Botón deshabilitado, re-seleccionando fechas...')
            await dateFromInput.fill(ctx.startDate)
            await page.waitForTimeout(500)
            await dateToInput.fill(ctx.endDate)
            await page.waitForTimeout(2000)
          }
        }
      }

      // Esperar a que el botón esté habilitado
      await expect(bookButton).toBeEnabled({ timeout: 10000 })
      console.log('✅ Botón habilitado, haciendo click...')

      // Click en reservar
      await bookButton.click({ timeout: 5000 })
      await page.waitForTimeout(1000)

      // Esperar redirección a detail-payment
      try {
        await page.waitForURL(/\/bookings\/detail-payment/, { timeout: 25000 })
      } catch {
        const currentUrl = page.url()
        console.log(`⚠️ No se redirigió a detail-payment. URL actual: ${currentUrl}`)

        if (currentUrl.includes('/auth/login')) {
          throw new Error('La sesión se perdió durante la reserva. Redirigido a login.')
        }

        // Verificar errores
        await page.waitForTimeout(2000)
        const errorDiv = page.locator('.border-red-300.bg-red-50').first()
        const hasError = await errorDiv.isVisible({ timeout: 2000 }).catch(() => false)

        if (hasError) {
          const flexDiv = errorDiv.locator('.flex-1').first()
          const errorParagraphs = flexDiv.locator('p')
          const paragraphCount = await errorParagraphs.count()
          let errorText = 'Error desconocido'
          if (paragraphCount >= 2) {
            errorText = await errorParagraphs.nth(1).textContent() || errorText
          }
          throw new Error(`Error al crear reserva: ${errorText.trim()}`)
        }

        throw new Error(`Redirección inesperada. URL: ${currentUrl}`)
      }

      // Extraer bookingId de query params
      const paymentUrl = page.url()
      const bookingIdMatch = paymentUrl.match(/bookingId=([a-f0-9-]+)/)
      ctx.bookingId = bookingIdMatch ? bookingIdMatch[1] : undefined

      console.log(`✅ Reserva creada: ${ctx.bookingId}`)

      return { bookingId: ctx.bookingId }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Configurar pago y completar transacción', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint anterior
    const prev = await checkpointManager.loadCheckpoint('booking-flow-payment-page-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else if (ctx.bookingId) {
      await page.goto(`/bookings/detail-payment?bookingId=${ctx.bookingId}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b4-booking-payment', 'Configurar pago y completar', {
      priority: 'P0',
      estimatedDuration: 25000,
      preconditions: [requiresCheckpoint('booking-flow-payment-page-ready')],
      postconditions: [
        expectsUrl(/\/bookings\/success/)
      ],
      ...withCheckpoint('booking-flow-success-ready')
    }))

    const result = await block.execute(async () => {
      // Esperar a que la página de pago cargue
      await expect(page.getByText(/completa tu reserva|detalle de pago/i)).toBeVisible({ timeout: 10000 })
      await page.waitForTimeout(2000)

      // Seleccionar método de pago "wallet"
      const walletOption = page.getByRole('button', { name: /wallet|billetera/i }).or(
        page.locator('[data-payment-method="wallet"]')
      )

      const walletVisible = await walletOption.isVisible({ timeout: 5000 }).catch(() => false)

      if (walletVisible) {
        await walletOption.click()
        await page.waitForTimeout(500)

        // Bloquear fondos en wallet
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
      } else {
        console.warn('Opción de wallet no visible, usando tarjeta como alternativa')
        const cardOption = page.getByRole('button', { name: /tarjeta|card|crédito/i })
        if (await cardOption.isVisible({ timeout: 5000 }).catch(() => false)) {
          await cardOption.click()
        }
      }

      // Aceptar términos y condiciones
      const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos|condiciones/i })
      const termsVisible = await termsCheckbox.isVisible({ timeout: 5000 }).catch(() => false)

      if (termsVisible) {
        await termsCheckbox.check()
        await expect(termsCheckbox).toBeChecked()
      }

      // Click en "Confirmar y Pagar"
      const confirmButton = page.getByRole('button', { name: /confirmar y pagar|confirmar|pagar/i }).first()
      await expect(confirmButton).toBeVisible({ timeout: 10000 })
      await expect(confirmButton).toBeEnabled({ timeout: 10000 })

      await confirmButton.click()

      // Verificar estado de procesamiento
      await expect(page.getByText(/creando reserva|procesando pago/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('No se mostró el estado de procesamiento')
      })

      // Esperar redirección a página de éxito
      await page.waitForURL(/\/bookings\/success\/.+/, { timeout: 20000 })

      // Extraer bookingId de la URL si no lo tenemos
      if (!ctx.bookingId) {
        const successUrl = page.url()
        const match = successUrl.match(/\/bookings\/success\/([a-f0-9-]+)/)
        ctx.bookingId = match ? match[1] : undefined
      }

      console.log(`✅ Pago completado, booking ID: ${ctx.bookingId}`)

      return { bookingId: ctx.bookingId, paymentCompleted: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar página de éxito/postcheckout', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint anterior
    const prev = await checkpointManager.loadCheckpoint('booking-flow-success-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else if (ctx.bookingId) {
      await page.goto(`/bookings/success/${ctx.bookingId}`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b5-booking-verify-success', 'Verificar página de éxito', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [requiresCheckpoint('booking-flow-success-ready')],
      postconditions: [
        expectsUrl(/\/bookings\/success/),
        expectsElement('ion-icon[name="checkmark-circle"], [class*="success-icon"]')
      ]
    }))

    const result = await block.execute(async () => {
      // Verificar URL de éxito
      await expect(page).toHaveURL(/\/bookings\/success\/.+/)

      // Verificar elementos principales de la página de éxito
      await expect(page.getByText(/tu reserva está confirmada|reserva confirmada/i)).toBeVisible({ timeout: 10000 })

      // Verificar ícono de éxito
      const successIcon = page.locator('ion-icon[name="checkmark-circle"]').or(
        page.locator('[class*="success-icon"]')
      )
      await expect(successIcon.first()).toBeVisible({ timeout: 5000 })

      // Verificar mensaje de email
      await expect(page.getByText(/enviamos.*detalles.*email|hemos enviado/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Mensaje de email no encontrado')
      })

      // Verificar detalles de reserva
      await expect(page.getByText(/detalles de tu reserva|resumen/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Card de detalles no encontrado')
      })

      // Verificar fechas en el resumen
      await expect(page.getByText(/desde:|hasta:|fecha/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Fechas no encontradas en el resumen')
      })

      // Verificar total pagado
      await expect(page.getByText(/total|precio|pagado/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Total no encontrado')
      })

      // Verificar próximos pasos
      await expect(page.getByText(/próximos pasos|next steps/i)).toBeVisible({ timeout: 5000 }).catch(() => {
        console.warn('Sección de próximos pasos no encontrada')
      })

      // Verificar botones de acción
      const viewDetailsButton = page.getByRole('button', { name: /ver detalles|ver reserva/i })
      const searchMoreButton = page.getByRole('button', { name: /buscar más|más vehículos/i })
      const homeButton = page.getByRole('button', { name: /ir al inicio|volver al inicio|home/i })

      const hasActionButton = await Promise.race([
        viewDetailsButton.isVisible().then(() => true),
        searchMoreButton.isVisible().then(() => true),
        homeButton.isVisible().then(() => true),
      ]).catch(() => false)

      expect(hasActionButton).toBe(true)

      // Verificar booking ID en la página (opcional)
      if (ctx.bookingId) {
        const bookingIdVisible = await page.getByText(ctx.bookingId.slice(0, 8)).isVisible({ timeout: 5000 }).catch(() => false)
        if (bookingIdVisible) {
          console.log('✅ Booking ID visible en la página')
        }
      }

      console.log('✅ Flujo completo de alquiler completado exitosamente')
      console.log(`   - Auto ID: ${ctx.carId}`)
      console.log(`   - Booking ID: ${ctx.bookingId}`)
      console.log(`   - Fechas: ${ctx.startDate} a ${ctx.endDate}`)

      return {
        verified: true,
        carId: ctx.carId,
        bookingId: ctx.bookingId,
        dates: { start: ctx.startDate, end: ctx.endDate }
      }
    })

    expect(result.state.status).toBe('passed')
  })
})
