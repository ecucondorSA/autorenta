import { test, expect, defineBlock } from '../checkpoint/fixtures'

/**
 * E2E Test: Edge Functions - MercadoPago
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 4 bloques atómicos:
 * B1: mercadopago-create-preference responde
 * B2: mercadopago-create-booking-preference responde
 * B3: mercadopago-process-booking-payment responde
 * B4: mercadopago-process-deposit-payment responde
 *
 * Priority: P0 (Smoke Critical)
 */

const SUPABASE_URL = 'https://pisqjmoklivzpwufhscx.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''

test.describe('Edge Functions - MercadoPago - Checkpoint Architecture', () => {

  test('B1: mercadopago-create-preference responde', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b1-edge-create-preference', 'Create preference', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(
        `${SUPABASE_URL}/functions/v1/mercadopago-create-preference`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          data: {
            transaction_id: `test-${Date.now()}`,
            amount: 100,
            description: 'Test deposit'
          }
        }
      )

      expect(response.status()).toBeLessThan(500)
      console.log(`mercadopago-create-preference: ${response.status()}`)

      return { status: response.status() }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: mercadopago-create-booking-preference responde', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b2-edge-create-booking-preference', 'Create booking preference', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(
        `${SUPABASE_URL}/functions/v1/mercadopago-create-booking-preference`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          data: {
            booking_id: 'test-booking-id',
            use_split_payment: false
          }
        }
      )

      expect(response.status()).toBeLessThan(500)
      console.log(`mercadopago-create-booking-preference: ${response.status()}`)

      return { status: response.status() }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: mercadopago-process-booking-payment responde', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b3-edge-process-booking-payment', 'Process booking payment', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(
        `${SUPABASE_URL}/functions/v1/mercadopago-process-booking-payment`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          data: {
            payment_id: 'test-payment-id',
            booking_id: 'test-booking-id'
          }
        }
      )

      expect(response.status()).toBeLessThan(500)
      console.log(`mercadopago-process-booking-payment: ${response.status()}`)

      return { status: response.status() }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: mercadopago-process-deposit-payment responde', async ({ request, createBlock }) => {
    const block = createBlock(defineBlock('b4-edge-process-deposit-payment', 'Process deposit payment', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const response = await request.post(
        `${SUPABASE_URL}/functions/v1/mercadopago-process-deposit-payment`,
        {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          data: {
            payment_id: 'test-payment-id',
            transaction_id: 'test-transaction-id'
          }
        }
      )

      expect(response.status()).toBeLessThan(500)
      console.log(`mercadopago-process-deposit-payment: ${response.status()}`)

      return { status: response.status() }
    })

    expect(result.state.status).toBe('passed')
  })
})
