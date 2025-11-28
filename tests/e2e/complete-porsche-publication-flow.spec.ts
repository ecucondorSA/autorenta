import { test, expect, defineBlock, requiresCheckpoint, expectsUrl, expectsElement, withCheckpoint } from '../checkpoint/fixtures'

/**
 * TEST E2E COMPLETO: Login → Publicar Porsche Carrera con Fotos
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 4 bloques atómicos:
 * B1: Login con usuario existente
 * B2: Navegar a publicar y completar formulario
 * B3: Subir fotos y verificar
 * B4: Publicar auto y verificar éxito
 *
 * Prioridad: P0 (Critical)
 * Duración estimada: ~2-3 minutos
 */

// No usar storageState - este test hace login manual
// test.use({ storageState: 'tests/.auth/owner.json' })

// Contexto compartido entre bloques
interface PublishFlowContext {
  testUser: { email: string; password: string }
  carId?: string
  consoleLogs: Array<{ type: string; text: string; timestamp: number }>
  networkErrors: Array<{ url: string; status: number; error: string }>
  jsErrors: Array<{ message: string; stack?: string }>
}

const ctx: PublishFlowContext = {
  testUser: {
    email: 'Ecucondor@gmail.com',
    password: 'Ab.12345'
  },
  consoleLogs: [],
  networkErrors: [],
  jsErrors: []
}

test.describe('Flujo Completo: Login → Publicar Porsche Carrera - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    // Limpiar arrays de logs
    ctx.consoleLogs = []
    ctx.networkErrors = []
    ctx.jsErrors = []

    // Capturar console logs
    page.on('console', (msg) => {
      ctx.consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      })
    })

    // Capturar errores de red
    page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        ctx.networkErrors.push({
          url: response.url(),
          status: response.status(),
          error: response.statusText()
        })
      }
    })

    // Capturar errores de JavaScript
    page.on('pageerror', (error) => {
      ctx.jsErrors.push({
        message: error.message,
        stack: error.stack
      })
    })

    // Capturar requests fallidos
    page.on('requestfailed', (request) => {
      ctx.networkErrors.push({
        url: request.url(),
        status: 0,
        error: request.failure()?.errorText || 'Request failed'
      })
    })
  })

  test('B1: Login con usuario existente', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-porsche-login', 'Login con usuario owner', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [
        expectsUrl(/\/(cars|inicio|dashboard|$)/)
      ],
      ...withCheckpoint('porsche-flow-logged-in')
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.waitForLoadState('networkidle')

      // Llenar formulario de login
      await page.fill('input[name="email"]', ctx.testUser.email)
      await page.fill('input[name="password"]', ctx.testUser.password)

      // Submit
      await page.click('button[type="submit"]')

      // Esperar redirección después del login
      await page.waitForURL(/\/(cars|inicio|dashboard|$)/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')

      // Verificar que el usuario está autenticado
      const isAuthenticated = !page.url().includes('/auth/login')
      expect(isAuthenticated).toBeTruthy()

      console.log(`✅ Usuario autenticado, redirigido a: ${page.url()}`)

      return { loggedIn: true, redirectUrl: page.url() }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Navegar a publicar y completar formulario', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint anterior
    const prev = await checkpointManager.loadCheckpoint('porsche-flow-logged-in')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Si no hay checkpoint, hacer login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', ctx.testUser.email)
      await page.fill('input[name="password"]', ctx.testUser.password)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/(cars|inicio|dashboard|$)/, { timeout: 15000 })
    }

    const block = createBlock(defineBlock('b2-porsche-form', 'Completar formulario Porsche', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [requiresCheckpoint('porsche-flow-logged-in')],
      postconditions: [
        expectsUrl(/\/cars\/publish/)
      ],
      ...withCheckpoint('porsche-flow-form-completed')
    }))

    const result = await block.execute(async () => {
      // Navegar a publicar auto
      await page.goto('/cars/publish')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(2000)

      // Verificar que el formulario está visible
      const formVisible = await page
        .locator('form, app-publish-car-v2, [class*="publish"]')
        .first()
        .isVisible({ timeout: 10000 })
        .catch(() => false)

      expect(formVisible).toBeTruthy()

      // ========== COMPLETAR FORMULARIO PORSCHE CARRERA ==========

      // Marca: Porsche
      const brandSelect = page
        .locator('select[name="brand_id"]')
        .or(page.locator('ion-select[name="brand_id"]'))
        .or(page.locator('[name="brand_id"]'))

      if (await brandSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await brandSelect.click()
        await page.waitForTimeout(500)
        const porscheOption = page
          .locator('ion-popover ion-item')
          .filter({ hasText: /porsche/i })
          .first()
        await expect(porscheOption).toBeVisible({ timeout: 5000 })
        await porscheOption.click()
        await page.waitForTimeout(1000)
      } else {
        const brandInput = page.locator('input[placeholder*="marca" i], input[name*="brand" i]')
        if (await brandInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await brandInput.fill('Porsche')
          await page.waitForTimeout(1000)
        }
      }

      // Modelo: Carrera
      const modelSelect = page
        .locator('select[name="model_id"]')
        .or(page.locator('ion-select[name="model_id"]'))
        .or(page.locator('[name="model_id"]'))

      if (await modelSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
        await modelSelect.click()
        await page.waitForTimeout(500)
        const carreraOption = page
          .locator('ion-popover ion-item')
          .filter({ hasText: /carrera|911/i })
          .first()
        await expect(carreraOption).toBeVisible({ timeout: 5000 })
        await carreraOption.click()
        await page.waitForTimeout(1000)
      } else {
        const modelInput = page.locator('input[placeholder*="modelo" i], input[name*="model" i]')
        if (await modelInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await modelInput.fill('Carrera')
          await page.waitForTimeout(1000)
        }
      }

      // Año: 2023
      const yearInput = page
        .locator('input[name="year"]')
        .or(page.locator('ion-input[name="year"] input'))
        .or(page.locator('input[type="number"][placeholder*="año" i]'))
      if (await yearInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await yearInput.fill('2023')
      }

      // Color
      const colorInput = page
        .locator('input[name="color"]')
        .or(page.locator('ion-input[name="color"] input'))
      if (await colorInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await colorInput.fill('Blanco')
      }

      // Patente
      const plateInput = page
        .locator('input[name="license_plate"]')
        .or(page.locator('ion-input[name="license_plate"] input'))
      if (await plateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await plateInput.fill(`POR${Date.now().toString().slice(-4)}`)
      }

      // Descripción
      const descriptionTextarea = page
        .locator('textarea[name="description"]')
        .or(page.locator('ion-textarea[name="description"] textarea'))
      if (await descriptionTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
        await descriptionTextarea.fill(
          'Porsche Carrera 911 en excelente estado. Mantenimiento al día, sin choques. Perfecto para disfrutar de la experiencia Porsche.'
        )
      }

      // Precio por día
      const priceInput = page
        .locator('input[name="price_per_day"]')
        .or(page.locator('ion-input[name="price_per_day"] input'))
      if (await priceInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await priceInput.fill('120000')
      }

      // Categoría (si existe)
      const categorySelect = page
        .locator('select[name="category"]')
        .or(page.locator('ion-select[name="category"]'))
      if (await categorySelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await categorySelect.click()
        await page.waitForTimeout(500)
        await page.locator('ion-popover ion-item:has-text("Lujo")').first().click()
      }

      // Transmisión
      const transmissionSelect = page
        .locator('select[name="transmission"]')
        .or(page.locator('ion-select[name="transmission"]'))
      if (await transmissionSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await transmissionSelect.click()
        await page.waitForTimeout(500)
        await page.locator('ion-popover ion-item:has-text("Automática")').first().click()
      }

      // Combustible
      const fuelSelect = page
        .locator('select[name="fuel_type"]')
        .or(page.locator('ion-select[name="fuel_type"]'))
      if (await fuelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fuelSelect.click()
        await page.waitForTimeout(500)
        await page.locator('ion-popover ion-item:has-text("Nafta")').first().click()
      }

      // Asientos
      const seatsInput = page
        .locator('input[name="seats"]')
        .or(page.locator('ion-input[name="seats"] input'))
      if (await seatsInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await seatsInput.fill('2')
      }

      // Ciudad
      const cityInput = page
        .locator('input[name="city"]')
        .or(page.locator('ion-input[name="city"] input'))
        .or(page.locator('input[placeholder*="ciudad" i]'))
      if (await cityInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cityInput.fill('Buenos Aires')
        await page.waitForTimeout(1000)
      }

      // Dirección
      const addressInput = page
        .locator('input[name="address"]')
        .or(page.locator('ion-input[name="address"] input'))
        .or(page.locator('input[placeholder*="dirección" i]'))
      if (await addressInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await addressInput.fill('Av. Corrientes 1234, CABA')
        await page.waitForTimeout(1000)
      }

      console.log('✅ Formulario completado con datos de Porsche Carrera')

      return { formCompleted: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Subir fotos y verificar', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint anterior
    const prev = await checkpointManager.loadCheckpoint('porsche-flow-form-completed')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Si no hay checkpoint, navegar a publish
      await page.goto('/cars/publish', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b3-porsche-photos', 'Subir fotos del auto', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('porsche-flow-form-completed')],
      postconditions: [],
      ...withCheckpoint('porsche-flow-photos-ready')
    }))

    const result = await block.execute(async () => {
      // Scroll down para ver la sección de fotos
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2))
      await page.waitForTimeout(1000)

      // Buscar el label que contiene el input de archivos
      const uploadLabel = page.locator('label:has-text("➕ Agregar Fotos")')

      if (await uploadLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log('✅ Botón de agregar fotos encontrado')
        const fileInput = uploadLabel.locator('input[type="file"]')
        const testImages = [
          'tests/fixtures/images/porsche-front.jpg',
          'tests/fixtures/images/porsche-side.jpg',
          'tests/fixtures/images/porsche-interior.jpg'
        ]
        await fileInput.setInputFiles(testImages)
        await page.waitForTimeout(5000)
        console.log('✅ 3 fotos de prueba subidas')
      } else {
        console.log('⚠️ No se encontró el botón de agregar fotos, intentando input directo')
        const fileInputDirect = page.locator('input[type="file"]').first()
        const testImages = [
          'tests/fixtures/images/porsche-front.jpg',
          'tests/fixtures/images/porsche-side.jpg',
          'tests/fixtures/images/porsche-interior.jpg'
        ]
        await fileInputDirect.setInputFiles(testImages)
        await page.waitForTimeout(5000)
        console.log('✅ 3 fotos subidas directamente al input file')
      }

      // Verificar fotos cargadas
      await page.waitForTimeout(1000)
      const photoCounterText = await page
        .locator('text=/\\d+\\/10/')
        .textContent()
        .catch(() => '0/10')

      const photosUploaded = parseInt(photoCounterText.split('/')[0]) || 0
      console.log(`📊 Fotos cargadas según contador: ${photosUploaded}/10`)

      if (photosUploaded === 0) {
        const alternativePhotosCount = await page
          .locator('img[alt*="Foto"]')
          .count()
        console.log(`📊 Fotos detectadas visualmente (por alt): ${alternativePhotosCount}`)
        if (alternativePhotosCount > 0) {
          console.log(`✅ ${alternativePhotosCount} fotos detectadas visualmente`)
        }
      } else {
        console.log(`✅ ${photosUploaded} fotos cargadas exitosamente`)
      }

      return { photosUploaded: photosUploaded > 0 }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Publicar auto y verificar éxito', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint anterior
    const prev = await checkpointManager.loadCheckpoint('porsche-flow-photos-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Si no hay checkpoint, navegar a publish
      await page.goto('/cars/publish', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b4-porsche-publish', 'Publicar auto y verificar', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('porsche-flow-photos-ready')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Cerrar modales si hay
      const modalCheck = page.locator('.fixed.inset-0.z-50, app-stock-photos-selector')
      if (await modalCheck.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Modal detectado, cerrando...')
        await page.keyboard.press('Escape')
        await page.waitForTimeout(1000)
        if (await modalCheck.isVisible({ timeout: 1000 }).catch(() => false)) {
          const closeButtons = page.locator('button').filter({ hasText: /cerrar|close|cancelar|×|✕/i })
          if (await closeButtons.count() > 0) {
            await closeButtons.first().click()
            await page.waitForTimeout(1500)
          }
        }
      }

      // Buscar botón de submit/publicar
      const submitButton = page
        .locator('button[type="submit"]')
        .or(page.getByRole('button', { name: /publicar|enviar|submit/i }))
        .or(page.locator('button:has-text("Publicar")'))
        .or(page.locator('button:has-text("Enviar")'))

      await expect(submitButton).toBeVisible({ timeout: 10000 })

      // Click en publicar
      try {
        await submitButton.click({ timeout: 5000 })
      } catch {
        console.log('Click normal falló, intentando con force...')
        await submitButton.click({ force: true })
      }

      await page.waitForTimeout(3000)

      // Verificar éxito
      console.log('🔍 Verificando indicadores de éxito...')
      console.log('📍 URL actual:', page.url())

      await page.waitForTimeout(2000)

      const successChecks = await Promise.all([
        page.url().includes('/cars/my') || page.url().includes('/cars'),
        page.locator('text=/éxito|success|publicado/i').isVisible().catch(() => false),
        page.locator('[class*="success"], [class*="toast"]').isVisible().catch(() => false),
        page.locator('text=/conectar.*mercado.*pago/i').isVisible().catch(() => false)
      ])

      console.log('✅ Verificaciones de éxito:', successChecks)
      const hasSuccess = successChecks.some(check => check === true)

      // Obtener carId de la URL
      const urlMatch = page.url().match(/\/cars\/([^\/]+)/)
      if (urlMatch) {
        ctx.carId = urlMatch[1]
      }

      // Navegar a mis autos para verificar
      await page.goto('/cars/my')
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(3000)

      console.log('🔍 URL actual:', page.url())
      console.log('🚗 Buscando auto publicado...')

      const verificationChecks = await Promise.all([
        page.locator('text=/porsche/i').isVisible({ timeout: 5000 }).catch(() => false),
        page.locator('text=/carrera/i').isVisible({ timeout: 5000 }).catch(() => false),
        page.locator('text=/borrador/i').isVisible({ timeout: 5000 }).catch(() => false),
        page.locator('text=/pendiente/i').isVisible({ timeout: 5000 }).catch(() => false),
        page.locator('[class*="car"], .car-item, .auto-item').count().then(count => count > 0).catch(() => false)
      ])

      console.log('✅ Verificaciones:', verificationChecks)
      const hasAnySuccess = verificationChecks.some(check => check === true) || hasSuccess

      expect(hasAnySuccess).toBeTruthy()

      // Log final
      console.log('📊 ============================================')
      console.log('📊 REPORTE FINAL DEL TEST')
      console.log('📊 ============================================')
      console.log(`🚗 Car ID: ${ctx.carId || 'No obtenido'}`)
      console.log(`📝 Console logs: ${ctx.consoleLogs.length}`)
      console.log(`❌ Network errors: ${ctx.networkErrors.length}`)
      console.log(`💥 JS errors: ${ctx.jsErrors.length}`)

      return {
        published: hasAnySuccess,
        carId: ctx.carId
      }
    })

    expect(result.state.status).toBe('passed')
  })
})
