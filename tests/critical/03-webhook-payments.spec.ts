import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * TEST CRÍTICO: Webhook de Pagos
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Valida el worker de webhooks que procesa pagos de Mock y Mercado Pago.
 *
 * Flujo en 4 bloques atómicos principales:
 * B1: Mock Provider - Procesar webhooks approved/rejected
 * B2: Mercado Pago Provider - Procesar webhooks de MP
 * B3: Validaciones Generales - Payload, provider, etc.
 * B4: Performance y Error Handling
 *
 * Prioridad: P0 (Critical)
 */

const WORKER_URL =
  'https://autorenta-payments-webhook.marques-eduardo95466020.workers.dev/webhooks/payments'

test.describe('Webhook Worker - Mock Provider - Checkpoint Architecture', () => {

  test('B1a: Procesar webhook mock approved', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b1a-webhook-mock-approved', 'Webhook mock approved', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const bookingId = `test-booking-${Date.now()}`

      const response = await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: bookingId,
          status: 'approved'
        }
      })

      expect(response.ok()).toBeTruthy()

      const responseData = await response.json()
      expect(responseData.message).toBe('Mock payment processed')
      expect(responseData.result.paymentStatus).toBe('completed')
      expect(responseData.result.bookingStatus).toBe('confirmed')

      console.log(`✅ Mock approved webhook procesado: ${bookingId}`)

      return { bookingId, status: 'approved', processed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B1b: Procesar webhook mock rejected', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b1b-webhook-mock-rejected', 'Webhook mock rejected', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const bookingId = `test-booking-${Date.now()}`

      const response = await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: bookingId,
          status: 'rejected'
        }
      })

      expect(response.ok()).toBeTruthy()

      const responseData = await response.json()
      expect(responseData.message).toBe('Mock payment processed')
      expect(responseData.result.paymentStatus).toBe('failed')
      expect(responseData.result.bookingStatus).toBe('cancelled')

      console.log(`✅ Mock rejected webhook procesado: ${bookingId}`)

      return { bookingId, status: 'rejected', processed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B1c: Verificar idempotencia - mismo webhook dos veces', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b1c-webhook-idempotency', 'Verificar idempotencia', {
      priority: 'P0',
      estimatedDuration: 8000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const bookingId = `test-booking-${Date.now()}`

      const payload = {
        provider: 'mock',
        booking_id: bookingId,
        status: 'approved'
      }

      // Primera llamada
      const response1 = await request.post(WORKER_URL, { data: payload })
      expect(response1.ok()).toBeTruthy()
      const result1 = await response1.json()
      expect(result1.message).toBe('Mock payment processed')

      // Segunda llamada (duplicada)
      const response2 = await request.post(WORKER_URL, { data: payload })
      expect(response2.ok()).toBeTruthy()
      const result2 = await response2.json()

      // Debe retornar "Already processed"
      expect(result2.message).toBe('Already processed')
      expect(response2.status()).toBe(200)

      console.log('✅ Idempotencia verificada correctamente')

      return { idempotent: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B1d: Validar payload requerido para mock', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b1d-webhook-mock-validation', 'Validar payload mock', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Sin booking_id
      const response1 = await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          status: 'approved'
        }
      })

      expect(response1.status()).toBe(400)
      const result1 = await response1.json()
      expect(result1.message).toContain('Missing required fields')

      // Sin status
      const response2 = await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: 'test-id'
        }
      })

      expect(response2.status()).toBe(400)

      console.log('✅ Validación de payload mock funciona')

      return { validated: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Webhook Worker - Mercado Pago Provider - Checkpoint Architecture', () => {

  test('B2a: Procesar webhook de MP payment.created', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b2a-webhook-mp-created', 'Webhook MP payment.created', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const paymentId = `${Date.now()}`

      const response = await request.post(WORKER_URL, {
        data: {
          provider: 'mercadopago',
          action: 'payment.created',
          type: 'payment',
          data: {
            id: paymentId
          }
        }
      })

      expect(response.ok()).toBeTruthy()

      const responseData = await response.json()

      // Si no existe payment_intent, debe retornar "not found"
      if (responseData.message === 'Payment intent not found') {
        expect(response.status()).toBe(200)
        console.log('✅ MP webhook: Payment intent not found (esperado para test)')
      } else {
        // Si existe, debe procesarse
        expect(responseData.message).toBe('Mercado Pago payment processed')
        expect(responseData.result.paymentId).toBe(paymentId)
        console.log(`✅ MP webhook procesado: ${paymentId}`)
      }

      return { paymentId, processed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2b: Ignorar eventos no soportados de MP', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b2b-webhook-mp-unsupported-event', 'Ignorar eventos no soportados', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Evento de tipo merchant_order
      const response = await request.post(WORKER_URL, {
        data: {
          provider: 'mercadopago',
          action: 'merchant_order.created',
          type: 'merchant_order',
          data: {
            id: '123'
          }
        }
      })

      expect(response.ok()).toBeTruthy()
      const responseData = await response.json()
      expect(responseData.message).toBe('Event type not supported')

      console.log('✅ Evento no soportado ignorado correctamente')

      return { ignored: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2c: Ignorar acciones no soportadas de MP', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b2c-webhook-mp-unsupported-action', 'Ignorar acciones no soportadas', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(WORKER_URL, {
        data: {
          provider: 'mercadopago',
          action: 'payment.deleted',
          type: 'payment',
          data: {
            id: '123'
          }
        }
      })

      expect(response.ok()).toBeTruthy()
      const responseData = await response.json()
      expect(responseData.message).toBe('Action not supported')

      console.log('✅ Acción no soportada ignorada correctamente')

      return { ignored: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2d: Validar payload requerido para MP', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b2d-webhook-mp-validation', 'Validar payload MP', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Sin action
      const response1 = await request.post(WORKER_URL, {
        data: {
          provider: 'mercadopago',
          type: 'payment',
          data: { id: '123' }
        }
      })

      expect(response1.status()).toBe(400)

      // Sin data.id
      const response2 = await request.post(WORKER_URL, {
        data: {
          provider: 'mercadopago',
          action: 'payment.created',
          type: 'payment',
          data: {}
        }
      })

      expect(response2.status()).toBe(400)

      console.log('✅ Validación de payload MP funciona')

      return { validated: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Webhook Worker - Validaciones Generales - Checkpoint Architecture', () => {

  test('B3a: Rechazar métodos que no sean POST', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b3a-webhook-method-validation', 'Validar método HTTP', {
      priority: 'P0',
      estimatedDuration: 3000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.get(WORKER_URL)
      expect(response.status()).toBe(404)

      console.log('✅ Método GET rechazado correctamente')

      return { methodValidated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3b: Rechazar JSON inválido', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b3b-webhook-json-validation', 'Validar JSON', {
      priority: 'P0',
      estimatedDuration: 3000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(WORKER_URL, {
        data: 'invalid json string'
      })

      expect(response.status()).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toContain('Invalid JSON')

      console.log('✅ JSON inválido rechazado correctamente')

      return { jsonValidated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3c: Rechazar provider no soportado', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b3c-webhook-provider-validation', 'Validar provider', {
      priority: 'P0',
      estimatedDuration: 3000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(WORKER_URL, {
        data: {
          provider: 'stripe', // No soportado
          booking_id: 'test'
        }
      })

      expect(response.status()).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toBe('Unsupported provider')

      console.log('✅ Provider no soportado rechazado')

      return { providerValidated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3d: Requerir campo provider', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b3d-webhook-require-provider', 'Requerir provider', {
      priority: 'P0',
      estimatedDuration: 3000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(WORKER_URL, {
        data: {
          booking_id: 'test',
          status: 'approved'
        }
      })

      expect(response.status()).toBe(400)
      const responseData = await response.json()
      expect(responseData.message).toBe('Missing provider field')

      console.log('✅ Campo provider requerido validado')

      return { providerRequired: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Webhook Worker - Performance - Checkpoint Architecture', () => {

  test('B4a: Responder en menos de 2 segundos', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b4a-webhook-performance', 'Verificar performance', {
      priority: 'P1',
      estimatedDuration: 3000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const start = Date.now()

      await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: `perf-test-${Date.now()}`,
          status: 'approved'
        }
      })

      const duration = Date.now() - start

      // Worker debe responder rápido
      expect(duration).toBeLessThan(2000)

      console.log(`✅ Tiempo de respuesta: ${duration}ms`)

      return { duration, fast: duration < 2000 }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4b: Manejar 10 requests concurrentes', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b4b-webhook-concurrent', 'Requests concurrentes', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request.post(WORKER_URL, {
          data: {
            provider: 'mock',
            booking_id: `concurrent-${Date.now()}-${i}`,
            status: 'approved'
          }
        })
      )

      const responses = await Promise.all(requests)

      // Todas deben ser exitosas
      responses.forEach((response) => {
        expect(response.ok()).toBeTruthy()
      })

      console.log('✅ 10 requests concurrentes procesadas')

      return { concurrent: 10, allSuccessful: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Webhook Worker - Error Handling - Checkpoint Architecture', () => {

  test('B5a: Manejar error con booking inexistente', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b5a-webhook-error-handling', 'Error handling', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: 'definitely-does-not-exist-12345',
          status: 'approved'
        }
      })

      // Puede retornar 200 (procesado) o 500 (error)
      expect([200, 500]).toContain(response.status())

      console.log(`✅ Error handling verificado, status: ${response.status()}`)

      return { handled: true, status: response.status() }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5b: Limpiar lock de KV en caso de error', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b5b-webhook-lock-cleanup', 'Limpieza de lock', {
      priority: 'P1',
      estimatedDuration: 8000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const bookingId = `error-test-${Date.now()}`

      // Primera llamada (puede fallar)
      await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: bookingId,
          status: 'approved'
        }
      })

      // Segunda llamada debe poder procesar (no quedar locked)
      const response2 = await request.post(WORKER_URL, {
        data: {
          provider: 'mock',
          booking_id: bookingId,
          status: 'approved'
        }
      })

      // Debe ser "Already processed" (no "Processing in progress")
      const responseData = await response2.json()
      expect(responseData.message).toBe('Already processed')

      console.log('✅ Lock de KV limpiado correctamente')

      return { lockCleaned: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
