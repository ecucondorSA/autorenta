import { test, expect, defineBlock } from '../checkpoint/fixtures'

/**
 * E2E Test: Chat Offline Queue
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 1 bloque atómico:
 * B1: Encolar mensaje en 400 y reenviar cuando vuelve online
 *
 * Priority: P1 (Chat)
 */

test.describe('Chat Offline Queue - Checkpoint Architecture', () => {

  test('B1: Queue on 400 and resend when back online', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-chat-offline-queue', 'Offline queue y reenvío', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.route('**/rest/v1/messages', route => {
        if (!route.request().headers()['x-once']) {
          return route.fulfill({ status: 400, body: JSON.stringify({ code: '42703', message: 'column "full_name" does not exist' }) })
        }
        return route.continue()
      })

      await page.goto('/chat/conv/123')
      await page.getByPlaceholder('Escribe un mensaje').fill('hola')
      await page.getByRole('button', { name: 'Enviar' }).click()

      await expect(page.getByText(/pendiente/i)).toBeVisible()

      await page.route('**/rest/v1/messages', route => {
        const headers = { ...route.request().headers(), 'x-once': '1' }
        route.continue({ headers })
      })

      await page.getByRole('button', { name: /reenviar/i }).click()

      await expect(page.getByText(/enviado/i)).toBeVisible()
      console.log('✅ Mensaje reenviado después de volver online')

      return { messageResentAfterOnline: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
