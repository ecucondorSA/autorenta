import { existsSync } from 'node:fs'
import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Owner Dashboard
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 1 bloque atómico:
 * B1: Verificar widgets de estadísticas y payouts
 *
 * Prioridad: P1 (Owner Dashboard)
 */

const ownerAuthFile = 'tests/.auth/owner.json'
const hasOwnerAuth = existsSync(ownerAuthFile)

if (hasOwnerAuth) {
  test.use({ storageState: ownerAuthFile })
}

test.describe('Owner Dashboard - Checkpoint Architecture', () => {

  test('B1: Verificar widgets de estadísticas y payouts', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-dashboard-widgets', 'Verificar widgets', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('owner-dashboard-verified')
    }))

    const result = await block.execute(async () => {
      // Si no hay storageState, hacer login manual
      if (!hasOwnerAuth) {
        await page.goto('/auth/login')
        await page.fill('input[type="email"]', 'owner.dashboard@example.com')
        await page.fill('input[type="password"]', 'TestOwnerDashboard123!')
        await page.click('button[type="submit"]')
        await page.waitForURL(/\//, { timeout: 15000 })
        console.log('✅ Login manual completado')
      }

      await page.goto('/dashboard')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Verificar título
      const dashboardTitle = page.locator('h1')
      await expect(dashboardTitle).toHaveText(/Dashboard/i)
      console.log('✅ Título Dashboard visible')

      // Verificar widget de estadísticas
      const statsWidget = page.locator('text=Estadísticas')
      await expect(statsWidget).toBeVisible()
      console.log('✅ Widget de estadísticas visible')

      // Verificar widget de ganancias y payouts
      const payoutsWidget = page.locator('text=Ganancias y Payouts')
      await expect(payoutsWidget).toBeVisible()
      console.log('✅ Widget de ganancias visible')

      return { widgetsVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
