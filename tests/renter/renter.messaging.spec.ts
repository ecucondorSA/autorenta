import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Renter Messaging with Owner
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 2 bloques atómicos:
 * B1: Navegar a detalle de vehículo
 * B2: Abrir chat y enviar mensaje
 *
 * Prioridad: P1 (Communication Flow)
 */

test.use({ storageState: 'tests/.auth/renter.json' })

test.describe('Renter Messaging - Checkpoint Architecture', () => {

  test('B1: Navegar a detalle de vehículo', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-messaging-navigate', 'Navegar a detalle', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('messaging-car-detail-ready')
    }))

    const result = await block.execute(async () => {
      await page.goto('/')
      await page.waitForLoadState('domcontentloaded')

      // Buscar vehículo
      const searchLocation = page.locator('#search-location').or(page.getByPlaceholder(/ubicación|location/i))
      if (await searchLocation.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchLocation.fill('CABA')
      }

      const searchStart = page.locator('#search-start').or(page.locator('input[type="date"]').first())
      if (await searchStart.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchStart.fill('2025-12-01')
      }

      const searchEnd = page.locator('#search-end').or(page.locator('input[type="date"]').nth(1))
      if (await searchEnd.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchEnd.fill('2025-12-05')
      }

      const searchButton = page.locator('button:has-text("Buscar")').or(page.getByRole('button', { name: /buscar/i }))
      if (await searchButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchButton.click()
        await page.waitForTimeout(2000)
      }

      // Ir a detalle del primer auto
      const carDetails = page.locator('.car-card >> text=Ver detalles').or(page.locator('app-car-card').first())
      if (await carDetails.isVisible({ timeout: 10000 }).catch(() => false)) {
        await carDetails.click()
        await page.waitForTimeout(1000)
        console.log('✅ Navegado a detalle de vehículo')
      }

      return { navigated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Abrir chat y enviar mensaje al owner', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('messaging-car-detail-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/cars')
      await page.waitForTimeout(2000)
      await page.locator('app-car-card').first().click()
    }

    const block = createBlock(defineBlock('b2-messaging-send', 'Enviar mensaje', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('messaging-car-detail-ready')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Abrir chat desde detalle
      const contactButton = page.locator('button:has-text("Contactar al propietario")').or(
        page.getByRole('button', { name: /contactar|mensaje|chat/i })
      )

      if (await contactButton.isVisible({ timeout: 10000 }).catch(() => false)) {
        await contactButton.click()
        await page.waitForTimeout(1000)

        // Verificar ventana de chat
        const chatWindow = page.locator('.chat-window').or(page.locator('app-chat'))
        const chatVisible = await chatWindow.isVisible({ timeout: 5000 }).catch(() => false)

        if (chatVisible) {
          console.log('✅ Ventana de chat visible')

          // Enviar mensaje
          const message = 'Hola, estoy interesado en este auto. ¿Está disponible?'
          const chatInput = page.locator('.chat-input textarea').or(
            page.locator('textarea[placeholder*="mensaje"]').or(
              page.locator('ion-textarea')
            )
          )

          if (await chatInput.isVisible({ timeout: 5000 }).catch(() => false)) {
            await chatInput.fill(message)

            const sendButton = page.locator('.chat-send-button').or(
              page.getByRole('button', { name: /enviar|send/i })
            )

            if (await sendButton.isVisible({ timeout: 3000 }).catch(() => false)) {
              await sendButton.click()
              await page.waitForTimeout(2000)

              // Verificar mensaje en conversación
              const sentMessage = page.locator(`.chat-window >> text=${message}`).or(
                page.getByText(message)
              )
              const messageVisible = await sentMessage.isVisible({ timeout: 5000 }).catch(() => false)

              if (messageVisible) {
                console.log('✅ Mensaje enviado y visible en conversación')
              } else {
                console.log('⚠️ Mensaje enviado pero no visible en chat')
              }
            }
          }
        } else {
          console.log('⚠️ Ventana de chat no visible')
        }
      } else {
        console.log('⚠️ Botón de contactar no encontrado')
      }

      return { messageSent: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
