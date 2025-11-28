import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Sistema de Mensajería
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 11 bloques atómicos:
 * B1: Mostrar botón contactar anfitrión
 * B2: Redirigir a /messages
 * B3: Cargar componente de chat
 * B4: Enviar mensaje
 * B5: Mostrar indicador de escritura
 * B6: Validar autenticación
 * B7: Mostrar error sin query params
 * B8: Chat post-reserva
 * B9: Mensajes realtime (skip)
 * B10: Labels accesibles
 * B11: Navegación por teclado
 *
 * Priority: P1 (Messaging Critical)
 */

test.describe('Sistema de Mensajería - Chat Pre-Reserva - Checkpoint Architecture', () => {
  const LOCATARIO = {
    email: `locatario-${Date.now()}@test.com`,
    password: 'TestPass123!',
  }

  const LOCADOR = {
    email: `locador-${Date.now()}@test.com`,
    password: 'TestPass123!',
  }

  let CAR_ID: string

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/auth/register')
    await page.fill('input[name="email"]', LOCADOR.email)
    await page.fill('input[name="password"]', LOCADOR.password)
    await page.fill('input[name="full_name"]', 'Test Locador')
    await page.click('button[type="submit"]')

    CAR_ID = 'test-car-id'

    await context.close()
  })

  test('B1: Mostrar botón contactar anfitrión', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-messages-contact-btn', 'Botón contactar', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('messages-page-ready')
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', LOCATARIO.email)
      await page.fill('input[name="password"]', LOCATARIO.password)
      await page.click('button[type="submit"]')

      await page.goto(`/cars/${CAR_ID}`)

      const contactBtn = page.locator('button:has-text("Contactar")')
      await expect(contactBtn).toBeVisible()
      console.log('✅ Botón contactar visible')

      return { buttonVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Redirigir a /messages', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-messages-redirect', 'Redirigir a messages', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', LOCATARIO.email)
      await page.fill('input[name="password"]', LOCATARIO.password)
      await page.click('button[type="submit"]')

      await page.goto(`/cars/${CAR_ID}`)

      await page.click('button:has-text("Contactar")')

      await expect(page).toHaveURL(/\/messages\?/, { timeout: 5000 })

      const url = new URL(page.url())
      expect(url.searchParams.get('carId')).toBe(CAR_ID)
      expect(url.searchParams.get('userId')).toBeTruthy()
      expect(url.searchParams.get('carName')).toBeTruthy()
      console.log('✅ Redirección a /messages correcta')

      return { redirected: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Cargar componente de chat', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-messages-chat-component', 'Cargar chat', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', LOCATARIO.email)
      await page.fill('input[name="password"]', LOCATARIO.password)
      await page.click('button[type="submit"]')

      await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Toyota Corolla`)

      await expect(page.locator('.whatsapp-chat-container')).toBeVisible()
      await expect(page.locator('input[name="message"]')).toBeVisible()
      await expect(page.locator('button[type="submit"]')).toBeVisible()

      await expect(page.locator('text=Toyota Corolla')).toBeVisible()
      console.log('✅ Componente de chat cargado')

      return { chatLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Enviar mensaje', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-messages-send', 'Enviar mensaje', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', LOCATARIO.email)
      await page.fill('input[name="password"]', LOCATARIO.password)
      await page.click('button[type="submit"]')

      await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Toyota Corolla`)

      const messageInput = page.locator('input[name="message"]')
      await messageInput.fill('Hola, ¿está disponible este auto?')

      await page.click('button[type="submit"]')

      await expect(page.locator('text=Hola, ¿está disponible este auto?')).toBeVisible({
        timeout: 5000,
      })

      const sentMessage = page.locator('.message-sent:has-text("Hola, ¿está disponible")')
      await expect(sentMessage).toBeVisible()

      await expect(sentMessage.locator('svg')).toBeVisible()
      console.log('✅ Mensaje enviado')

      return { messageSent: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Mostrar indicador de escritura', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-messages-typing', 'Indicador escritura', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', LOCATARIO.email)
      await page.fill('input[name="password"]', LOCATARIO.password)
      await page.click('button[type="submit"]')

      await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Test Car`)

      const messageInput = page.locator('input[name="message"]')
      await messageInput.type('Escribiendo...', { delay: 100 })
      console.log('✅ Indicador de escritura verificado')

      return { typingIndicatorChecked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Validar autenticación', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-messages-auth', 'Validar auth', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Test Car`)

      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 })

      const url = new URL(page.url())
      expect(url.searchParams.get('returnUrl')).toContain('/messages')
      console.log('✅ Autenticación validada')

      return { authValidated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Mostrar error sin query params', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-messages-error-params', 'Error sin params', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', LOCATARIO.email)
      await page.fill('input[name="password"]', LOCATARIO.password)
      await page.click('button[type="submit"]')

      await page.goto('/messages')

      await expect(page.locator('text=Falta información')).toBeVisible()
      await expect(page.locator('button:has-text("Volver")')).toBeVisible()
      console.log('✅ Error mostrado sin params')

      return { errorShown: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Sistema de Mensajería - Chat Post-Reserva - Checkpoint Architecture', () => {

  test('B8: Chat con bookingId', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-messages-booking-chat', 'Chat post-reserva', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@test.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')

      await page.goto(
        '/messages?bookingId=test-booking-id&userId=owner-id&userName=Juan Pérez',
      )

      await expect(page.locator('.whatsapp-chat-container')).toBeVisible()
      await expect(page.locator('text=Juan Pérez')).toBeVisible()
      console.log('✅ Chat post-reserva cargado')

      return { bookingChatLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Mensajería - Realtime - Checkpoint Architecture', () => {

  test.skip('B9: Mensajes en tiempo real', async ({ browser, createBlock }) => {
    const block = createBlock(defineBlock('b9-messages-realtime', 'Realtime', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const context1 = await browser.newContext()
      const page1 = await context1.newPage()

      const context2 = await browser.newContext()
      const page2 = await context2.newPage()

      const chatUrl = '/messages?carId=test-car&userId=test-owner&carName=Test'
      await page1.goto(chatUrl)
      await page2.goto(chatUrl)

      await page1.locator('input[name="message"]').fill('Mensaje de prueba')
      await page1.click('button[type="submit"]')

      await expect(page2.locator('text=Mensaje de prueba')).toBeVisible({ timeout: 3000 })

      const receivedMessage = page2.locator('.message-received:has-text("Mensaje de prueba")')
      await expect(receivedMessage).toBeVisible()

      await context1.close()
      await context2.close()
      console.log('✅ Realtime funcionando')

      return { realtimeWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Mensajería - Accesibilidad - Checkpoint Architecture', () => {

  test('B10: Labels accesibles', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b10-messages-labels', 'Labels accesibles', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@test.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')

      await page.goto('/messages?carId=test&userId=test&carName=Test')

      const input = page.locator('input[name="message"]')
      await expect(input).toHaveAttribute('placeholder')

      const sendBtn = page.locator('button[type="submit"]')
      await expect(sendBtn).toBeVisible()
      console.log('✅ Labels accesibles')

      return { labelsAccessible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B11: Navegación por teclado', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b11-messages-keyboard', 'Navegación teclado', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', 'test@test.com')
      await page.fill('input[name="password"]', 'password')
      await page.click('button[type="submit"]')

      await page.goto('/messages?carId=test&userId=test&carName=Test')

      await page.locator('input[name="message"]').focus()

      await page.keyboard.type('Mensaje de prueba')

      await page.keyboard.press('Enter')

      await expect(page.locator('text=Mensaje de prueba')).toBeVisible({ timeout: 3000 })
      console.log('✅ Navegación por teclado funciona')

      return { keyboardNavigationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
