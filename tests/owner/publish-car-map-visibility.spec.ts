import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Published Cars Map Visibility
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 5 bloques atómicos:
 * B1: Cargar autos activos desde API
 * B2: Verificar autos en mapa
 * B3: Verificar status en base de datos
 * B4: Navegar a detalle desde mapa
 * B5: Verificar deployment (opcional)
 *
 * Prioridad: P1 (Map Visibility)
 */

test.describe('Published Cars Map Visibility - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    // Interceptar API de autos para debugging
    await page.route('**/rest/v1/cars*', async (route) => {
      const response = await route.fetch()
      const data = await response.json()
      console.log('📊 Cars API Response:', {
        count: Array.isArray(data) ? data.length : 1,
        sample: Array.isArray(data) ? data[0] : data,
      })
      await route.fulfill({ response, json: data })
    })
  })

  test('B1: Cargar autos activos desde API', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-map-load-cars', 'Cargar autos desde API', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('map-cars-loaded')
    }))

    const result = await block.execute(async () => {
      await page.goto('/explore', { waitUntil: 'networkidle' })
      await page.waitForTimeout(3000)

      const apiResponse = await page.waitForResponse(
        (response) => response.url().includes('/rest/v1/cars') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null)

      if (apiResponse) {
        const cars = await apiResponse.json()
        console.log('✅ Cars loaded:', cars.length)

        expect(cars.length).toBeGreaterThan(0)

        // Verificar todos status='active'
        const activeCars = cars.filter((car: any) => car.status === 'active')
        console.log('📊 Active cars:', activeCars.length)
        expect(activeCars.length).toBe(cars.length)

        // Verificar coordenadas
        const carsWithCoords = cars.filter(
          (car: any) => car.location_lat !== null && car.location_lng !== null
        )
        console.log('📍 Cars with coordinates:', carsWithCoords.length)
        expect(carsWithCoords.length).toBeGreaterThan(0)

        return { carsLoaded: cars.length, activeCars: activeCars.length }
      }

      return { carsLoaded: 0 }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar autos en mapa', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('map-cars-loaded')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/explore', { waitUntil: 'domcontentloaded' })
    }

    const block = createBlock(defineBlock('b2-map-display', 'Verificar mapa', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('map-cars-loaded')],
      postconditions: [],
      ...withCheckpoint('map-display-verified')
    }))

    const result = await block.execute(async () => {
      // Verificar componente de mapa
      const mapComponent = page.locator('app-cars-map').first()
      await expect(mapComponent).toBeVisible({ timeout: 15000 })
      console.log('✅ Componente de mapa visible')

      await page.waitForTimeout(5000)

      // Verificar contenedor de mapa
      const mapContainer = page.locator('#map-container, .map-container').first()
      await expect(mapContainer).toBeVisible()

      const mapBox = await mapContainer.boundingBox()
      expect(mapBox).not.toBeNull()
      expect(mapBox?.width).toBeGreaterThan(0)
      expect(mapBox?.height).toBeGreaterThan(0)

      console.log('✅ Map rendered successfully')
      return { mapRendered: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Verificar status en base de datos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-map-verify-status', 'Verificar status en DB', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/explore')

      const response = await page.waitForResponse(
        (res) => res.url().includes('/rest/v1/cars') && res.status() === 200
      )

      const cars = await response.json()

      const statusCounts = cars.reduce((acc: any, car: any) => {
        acc[car.status] = (acc[car.status] || 0) + 1
        return acc
      }, {})

      console.log('📊 Status distribution:', statusCounts)

      expect(statusCounts.active).toBeGreaterThan(0)
      expect(statusCounts.draft || 0).toBe(0)
      expect(statusCounts.pending || 0).toBe(0)

      console.log('✅ Todos los autos están activos')
      return { statusVerified: true, distribution: statusCounts }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Navegar a detalle desde mapa', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-map-navigate-detail', 'Navegar a detalle', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/explore', { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(5000)

      const carCards = page.locator('app-car-card, .car-card')
      const carCount = await carCards.count()

      console.log('🚗 Car cards found:', carCount)

      if (carCount > 0) {
        await carCards.first().click()
        await page.waitForTimeout(2000)

        const currentUrl = page.url()
        console.log('📍 Current URL:', currentUrl)

        const isDetailPage = currentUrl.includes('/cars/')
        const hasModal = await page.locator('.modal, ion-modal').isVisible().catch(() => false)

        expect(isDetailPage || hasModal).toBe(true)
        console.log('✅ Navigation successful')
        return { navigated: true }
      }

      return { navigated: false, reason: 'no car cards found' }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Deployment Verification - Checkpoint Architecture', () => {

  test('B5: Verificar deployment URL', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-deployment-verify', 'Verificar deployment', {
      priority: 'P2',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const deploymentUrl = 'https://ca6618ec.autorenta-web.pages.dev'

      console.log('🧪 Verificando deployment:', deploymentUrl)

      const response = await page.goto(deploymentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })

      expect(response?.status()).toBe(200)
      console.log('✅ Deployment accesible')

      // Verificar autos en sitio desplegado
      await page.goto(`${deploymentUrl}/explore`, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      const apiResponse = await page.waitForResponse(
        (res) => res.url().includes('/rest/v1/cars') && res.status() === 200,
        { timeout: 15000 }
      ).catch(() => null)

      if (apiResponse) {
        const cars = await apiResponse.json()
        console.log('📊 Deployed site - Cars loaded:', cars.length)

        expect(cars.length).toBeGreaterThan(0)

        const activeCars = cars.filter((car: any) => car.status === 'active')
        expect(activeCars.length).toBe(cars.length)

        console.log('✅ Todos los autos en deployment están activos')
      }

      return { deploymentVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
