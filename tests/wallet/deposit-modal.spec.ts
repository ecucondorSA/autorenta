import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'
import { SEED_USERS } from '../helpers/test-data'

/**
 * E2E Test: Wallet Deposit Modal
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 2 bloques atómicos:
 * B1: Autenticar y navegar a wallet
 * B2: Validar monto mínimo en modal de depósito
 *
 * Prioridad: P1 (Wallet Validation)
 */

const FALLBACK_RENTER = {
  email: 'test-renter@autorenta.com',
  password: 'TestPassword123!',
}

test.describe('Wallet Deposit Modal - Checkpoint Architecture', () => {

  test('B1: Autenticar y navegar a wallet', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-deposit-modal-auth', 'Autenticar y navegar', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('deposit-modal-wallet-page')
    }))

    const result = await block.execute(async () => {
      const profileLink = page.locator('a[href="/profile"], [data-testid="user-menu"]')
      if (await profileLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('✅ Usuario ya autenticado')
      } else {
        await page.goto('/auth/login')
        await page.getByRole('textbox', { name: /email|correo/i }).fill(SEED_USERS?.renter?.email ?? FALLBACK_RENTER.email)
        await page.getByRole('textbox', { name: /contraseña|password/i }).fill(SEED_USERS?.renter?.password ?? FALLBACK_RENTER.password)
        await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click()
        await page.waitForURL(/(cars|wallet|profile)/, { timeout: 15000 })
        console.log('✅ Login completado')
      }

      await page.goto('/wallet')
      await page.waitForLoadState('domcontentloaded')
      console.log('✅ Navegado a wallet')

      return { authenticated: true, navigated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Validar monto mínimo en modal de depósito', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('deposit-modal-wallet-page')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Fallback: authenticate and navigate
      const profileLink = page.locator('a[href="/profile"], [data-testid="user-menu"]')
      if (!await profileLink.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.goto('/auth/login')
        await page.getByRole('textbox', { name: /email|correo/i }).fill(SEED_USERS?.renter?.email ?? FALLBACK_RENTER.email)
        await page.getByRole('textbox', { name: /contraseña|password/i }).fill(SEED_USERS?.renter?.password ?? FALLBACK_RENTER.password)
        await page.getByRole('button', { name: /iniciar sesión|entrar|login/i }).click()
        await page.waitForURL(/(cars|wallet|profile)/, { timeout: 15000 })
      }
      await page.goto('/wallet')
      await page.waitForLoadState('domcontentloaded')
    }

    const block = createBlock(defineBlock('b2-deposit-modal-validation', 'Validar monto mínimo', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Abrir modal de depósito
      const depositCta = page.getByRole('button', { name: /Depositar|Configura tu crédito|Configurar crédito|Agregar fondos/i }).first()
      await depositCta.click()
      await expect(page.getByTestId('deposit-modal')).toBeVisible({ timeout: 10000 })
      console.log('✅ Modal de depósito abierto')

      // Ingresar monto por debajo del mínimo
      const amountInput = page.getByTestId('deposit-amount-input')
      await amountInput.fill('50') // MIN is 100 ARS

      const submit = page.getByRole('button', { name: /continuar al pago|continuar|confirmar/i }).last()
      await submit.click()

      // Verificar mensaje de error
      const errorAlert = page.getByRole('alert')
      await expect(errorAlert).toBeVisible()
      await expect(errorAlert).toContainText(/mínim|100/i)
      console.log('✅ Validación de monto mínimo funcionando')

      return { validationWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
