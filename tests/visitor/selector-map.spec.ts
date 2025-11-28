import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'
import { s } from '../playwright/selectors.js'

/**
 * E2E Test: Selector Map Validation
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 1 bloque atómico:
 * B1: Verificar header usando selector mapeado
 *
 * Prioridad: P1 (Selector Infrastructure)
 */

test.describe('Selector Map - Checkpoint Architecture', () => {

  test('B1: Header visible usando selector mapeado', async ({ page, baseURL, createBlock }) => {
    const block = createBlock(defineBlock('b1-selector-map-header', 'Header selector mapeado', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('selector-map-verified')
    }))

    const result = await block.execute(async () => {
      const url = baseURL ?? 'http://localhost:4200'
      await page.goto(url)

      const headerSelector = s('main-header')
      const header = page.locator(headerSelector)

      await expect(header).toBeVisible({ timeout: 10000 })
      console.log('✅ Header visible usando selector mapeado')

      return { headerVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
