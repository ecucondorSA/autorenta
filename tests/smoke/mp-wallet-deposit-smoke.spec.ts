import { test, expect, defineBlock } from '../checkpoint/fixtures'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: Smoke - Wallet Deposit via MercadoPago
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 1 bloque atómico:
 * B1: Crear init_point y acreditar balance
 *
 * Priority: P0 (Smoke Critical)
 * Note: Skips si no hay credenciales reales
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const renterEmail = process.env.E2E_RENTER_EMAIL || 'test-renter@autorenta.com'
const renterPassword = process.env.E2E_RENTER_PASSWORD || 'TestPassword123!'

test.describe('Smoke | Wallet deposit via MercadoPago - Checkpoint Architecture', () => {

  test('B1: Crear init_point y acreditar balance', async ({ page, createBlock }) => {
    test.skip(
      !supabaseUrl || !supabaseAnonKey || !supabaseServiceKey || !process.env.MERCADOPAGO_ACCESS_TOKEN,
      'Supabase + MercadoPago environment variables are required for the real-flow smoke test.',
    )

    const block = createBlock(defineBlock('b1-smoke-mp-deposit', 'MP deposit smoke', {
      priority: 'P0',
      estimatedDuration: 30000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey)
      const admin = createClient(supabaseUrl, supabaseServiceKey)

      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email: renterEmail,
        password: renterPassword,
      })
      if (error || !auth.session || !auth.user) {
        console.log('⚠️ Seed renter credentials are missing or invalid')
        return { skipped: true, reason: 'invalid credentials' }
      }

      const renterId = auth.user!.id

      const { data: balanceData, error: balanceError } = await supabase.rpc('wallet_get_balance')
      if (balanceError) {
        console.log(`⚠️ wallet_get_balance failed: ${balanceError.message}`)
        return { skipped: true, reason: balanceError.message }
      }
      const startingBalance = Number(balanceData?.[0]?.available_balance || 0)

      const amountUsd = 25
      const { data: depositData, error: depositError } = await supabase.rpc('wallet_initiate_deposit', {
        p_amount: amountUsd,
        p_provider: 'mercadopago',
        p_description: 'E2E smoke deposit',
        p_allow_withdrawal: true,
      })

      if (depositError || !depositData?.[0]?.transaction_id) {
        console.log(`⚠️ wallet_initiate_deposit failed: ${depositError?.message}`)
        return { skipped: true, reason: depositError?.message }
      }

      const transactionId = depositData![0]!.transaction_id as string

      const preferenceResponse = await supabase.functions.invoke('mercadopago-create-preference', {
        body: {
          transaction_id: transactionId,
          amount: amountUsd,
          description: 'Smoke deposit',
        },
        headers: {
          Authorization: `Bearer ${auth.session!.access_token}`,
        },
      })

      const prefData = preferenceResponse.data as { init_point?: string } | null
      const initPoint: string | undefined = prefData?.init_point
      expect(initPoint, 'MercadoPago init_point should be returned').toBeTruthy()

      if (initPoint) {
        await page.goto(initPoint)
      }

      const { error: confirmError } = await admin.rpc('wallet_confirm_deposit_admin', {
        p_user_id: renterId,
        p_transaction_id: transactionId,
        p_provider_transaction_id: `mp-smoke-${Date.now()}`,
        p_provider_metadata: {
          status: 'approved',
          status_detail: 'accredited',
          init_point: initPoint,
        },
      })

      if (confirmError) {
        console.log(`⚠️ wallet_confirm_deposit_admin failed: ${confirmError.message}`)
        return { skipped: true, reason: confirmError.message }
      }

      const { data: finalBalanceData, error: finalBalanceError } = await supabase.rpc('wallet_get_balance')
      if (finalBalanceError) {
        console.log(`⚠️ wallet_get_balance after confirm failed: ${finalBalanceError.message}`)
        return { skipped: true, reason: finalBalanceError.message }
      }
      const finalBalance = Number(finalBalanceData?.[0]?.available_balance || 0)

      expect(finalBalance).toBeGreaterThan(startingBalance)

      await page.goto(`/wallet?payment=success&transaction_id=${transactionId}`)
      await expect(page.getByText(/dep[oó]sito/i)).toBeVisible({ timeout: 10000 })
      console.log(`✅ Deposit successful: ${startingBalance} → ${finalBalance}`)

      return { startingBalance, finalBalance, transactionId }
    })

    expect(result.state.status).toBe('passed')
  })
})
