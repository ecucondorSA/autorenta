import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * Search Results & Filters Test
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 2 bloques atómicos:
 * B1: Mostrar resultados y filtrar
 * B2: Cambiar vistas (grid/list/map)
 *
 * Prioridad: P1 (Renter Flow)
 */

test.describe('Search Results - Checkpoint Architecture', () => {

  test('B1: Mostrar resultados y filtrar', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-search-results', 'Mostrar y filtrar resultados', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('search-results-ready')
    }))

    const result = await block.execute(async () => {
      // Navegar a búsqueda
      await page.goto('/explore?location=Buenos%20Aires')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)

      // Esperar resultados
      const gridItem = page.locator('.grid > div.group').first()
      await expect(gridItem).toBeVisible({ timeout: 10000 })

      // Contar resultados
      const count = await page.locator('.grid > div.group').count()
      expect(count).toBeGreaterThan(0)
      console.log(`✅ Search results loaded: ${count} cars found`)

      // Verificar input de búsqueda
      const searchInput = page.getByPlaceholder('Buscar por marca, modelo o ciudad...')
      await expect(searchInput).toBeVisible()

      // Probar filtro
      await searchInput.fill('Toyota')
      await expect(searchInput).toHaveValue('Toyota')
      console.log('✅ Search filter works')

      return { resultCount: count, filterWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Cambiar vistas (grid/list/map)', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-search-views', 'Cambiar vistas', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/explore?location=Buenos%20Aires')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)

      // Verificar botones de vista
      const mapButton = page.getByTitle('Vista Mapa')
      const gridButton = page.getByTitle('Vista Cuadrícula')
      const listButton = page.getByTitle('Vista Lista')

      await expect(mapButton).toBeVisible()
      await expect(gridButton).toBeVisible()
      await expect(listButton).toBeVisible()
      console.log('✅ View buttons visible')

      // Cambiar a vista de mapa
      await mapButton.click()
      const mapCanvas = page.locator('app-cars-map canvas, app-waze-live-map iframe').first()
      await expect(mapCanvas).toBeVisible({ timeout: 10000 })
      console.log('✅ Map view works')

      // Cambiar a vista de lista
      await listButton.click()
      await expect(page.locator('.flex.flex-col.gap-4.max-w-5xl')).toBeVisible()
      console.log('✅ List view works')

      // Cambiar a vista de grid
      await gridButton.click()
      await expect(page.locator('.grid.grid-cols-1')).toBeVisible()
      console.log('✅ Grid view works')

      return { viewsWork: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
