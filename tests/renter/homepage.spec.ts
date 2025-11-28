import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * Homepage Test
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 2 bloques atómicos:
 * B1: Cargar homepage y verificar elementos
 * B2: Probar búsqueda y navegación
 *
 * Prioridad: P1 (Discovery Flow)
 */

test.describe('Homepage - Checkpoint Architecture', () => {

  test('B1: Cargar homepage y verificar elementos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-homepage-load', 'Cargar homepage', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('homepage-ready')
    }))

    const result = await block.execute(async () => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Verificar título
      await expect(page).toHaveTitle(/AutoRenta/)
      console.log('✅ Page title correct')

      // Verificar hero search
      await expect(page.locator('app-hero-search')).toBeVisible()
      console.log('✅ Hero search visible')

      // Verificar formulario de búsqueda
      const locationInput = page.locator('app-hero-search input[placeholder*="Ubicación"]')
      await expect(locationInput).toBeVisible()
      console.log('✅ Location input visible')

      const searchButton = page.locator('app-hero-search button')
      await expect(searchButton).toContainText('Buscar')
      console.log('✅ Search button visible')

      return { loaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Probar búsqueda y navegación', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('homepage-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/')
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b2-homepage-search', 'Búsqueda desde homepage', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Llenar ubicación
      const locationInput = page.locator('app-hero-search input[placeholder*="Ubicación"]')
      await locationInput.fill('Buenos Aires')
      console.log('✅ Location filled')

      // Click en buscar
      const searchButton = page.locator('app-hero-search button.primary-button')
      await searchButton.click()

      // Verificar navegación a /explore
      await expect(page).toHaveURL(/\/explore/)
      console.log('✅ Navigated to explore page')

      return { searchWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
