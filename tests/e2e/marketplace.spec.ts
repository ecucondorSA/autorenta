import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Marketplace Page
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 2 bloques atómicos:
 * B1: Mostrar lista de autos
 * B2: Navegar a detalle de auto
 *
 * Priority: P0 (Marketplace Critical)
 */

test.describe('Marketplace Page - Checkpoint Architecture', () => {

  test('B1: Mostrar lista de autos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-marketplace-list', 'Lista de autos', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('marketplace-loaded')
    }))

    const result = await block.execute(async () => {
      await page.goto('/marketplace-test')

      await expect(page).toHaveTitle(/Explorá nuestra flota/)

      await expect(page.getByRole('heading', { name: 'Explorá nuestra flota' })).toBeVisible()

      const carCards = page.locator('app-car-card')
      await expect(carCards.first()).toBeVisible()

      await expect(page.getByText('Renault Kangoo 2022')).toBeVisible()
      await expect(page.getByText('Ford Ranger 2023')).toBeVisible()
      await expect(page.getByText('Peugeot 208 2021')).toBeVisible()

      await expect(page.getByText('85.000 / día')).toBeVisible()
      console.log('✅ Lista de autos visible')

      return { listVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Navegar a detalle de auto', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-marketplace-navigate', 'Navegar a detalle', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/marketplace-test')

      await page.locator('app-car-card').first().click()

      await expect(page).toHaveURL(/cars\/.+/)

      await expect(page.locator('h1')).toBeVisible()
      console.log('✅ Navegación a detalle exitosa')

      return { navigatedToDetail: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
