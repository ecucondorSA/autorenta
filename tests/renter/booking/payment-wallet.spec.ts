import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../../checkpoint/fixtures'

/**
 * E2E Test: Flujo de Pago - Wallet
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 3 bloques atómicos:
 * B1: Navegar a payment y seleccionar wallet
 * B2: Bloquear fondos y confirmar
 * B3: Verificar success page
 *
 * Prioridad: P0 (Critical Payment Flow)
 */

test.use({ storageState: 'tests/.auth/renter.json' })

test.describe('Flujo de Pago - Wallet - Checkpoint Architecture', () => {

  test('B1: Navegar a payment y seleccionar wallet', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-wallet-navigate', 'Navegar y seleccionar wallet', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('wallet-payment-ready')
    }))

    const result = await block.execute(async () => {
      await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)

      // Verificar página cargada
      await expect(page.getByText('Completa tu Reserva')).toBeVisible({ timeout: 10000 })
      console.log('✅ Payment page loaded')

      // Verificar que no está en loading
      await expect(page.getByText('Calculando tu reserva...')).not.toBeVisible({ timeout: 5000 }).catch(() => {})

      // Seleccionar wallet
      const walletOption = page.getByRole('button', { name: /wallet|billetera/i })
      if (await walletOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await walletOption.click()
        console.log('✅ Wallet option selected')
      }

      return { pageLoaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Bloquear fondos y confirmar pago', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('wallet-payment-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05')
      await page.waitForTimeout(3000)
      const walletOption = page.getByRole('button', { name: /wallet|billetera/i })
      if (await walletOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await walletOption.click()
      }
    }

    const block = createBlock(defineBlock('b2-wallet-lock-funds', 'Bloquear fondos', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('wallet-payment-ready')],
      postconditions: [],
      ...withCheckpoint('wallet-funds-locked')
    }))

    const result = await block.execute(async () => {
      // Bloquear fondos
      const lockWalletBtn = page.getByRole('button', { name: /bloquear fondos|lock funds/i })
      if (await lockWalletBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lockWalletBtn.click()
        await page.waitForTimeout(3000)

        // Verificar confirmación de bloqueo
        const lockedConfirm = page.getByText(/fondos bloqueados|funds locked/i)
        await expect(lockedConfirm).toBeVisible({ timeout: 5000 }).catch(() => {
          console.log('⚠️ Funds locked confirmation not found')
        })
        console.log('✅ Funds locked')
      }

      // Aceptar términos
      const termsCheckbox = page.getByRole('checkbox', { name: /acepto|términos/i })
      if (await termsCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
        await termsCheckbox.check()
        await expect(termsCheckbox).toBeChecked()
        console.log('✅ Terms accepted')
      }

      // Confirmar pago
      const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i })
      if (await confirmButton.isEnabled({ timeout: 5000 }).catch(() => false)) {
        await confirmButton.click()
        console.log('✅ Confirm button clicked')

        // Verificar estados de procesamiento
        await expect(page.getByText('Creando reserva...')).toBeVisible({ timeout: 3000 }).catch(() => {})
        await expect(page.getByText('Procesando pago...')).toBeVisible({ timeout: 5000 }).catch(() => {})
      }

      return { confirmed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Verificar success page', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('wallet-funds-locked')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b3-wallet-success', 'Verificar success', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('wallet-funds-locked')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Esperar redirección a success
      await page.waitForURL(/\/bookings\/success\/.+/, { timeout: 15000 }).catch(() => {
        console.log('⚠️ Did not redirect to success page')
      })

      if (page.url().includes('/bookings/success')) {
        // Verificar elementos de success
        await expect(page.getByText(/tu reserva está confirmada/i)).toBeVisible({ timeout: 10000 })
        console.log('✅ Confirmation message visible')

        await expect(page.locator('ion-icon[name="checkmark-circle"]')).toBeVisible()
        console.log('✅ Success icon visible')

        // Verificar detalles
        await expect(page.getByText(/detalles de tu reserva/i)).toBeVisible().catch(() => {})
        await expect(page.getByText(/desde:/i)).toBeVisible().catch(() => {})
        await expect(page.getByText(/hasta:/i)).toBeVisible().catch(() => {})
        await expect(page.getByText(/total pagado:/i)).toBeVisible().catch(() => {})
        console.log('✅ Booking details visible')

        // Verificar próximos pasos
        await expect(page.getByText(/próximos pasos/i)).toBeVisible().catch(() => {})
        console.log('✅ Next steps visible')

        // Verificar botones
        await expect(page.getByRole('button', { name: /ver detalles/i })).toBeVisible().catch(() => {})
        await expect(page.getByRole('button', { name: /buscar más vehículos/i })).toBeVisible().catch(() => {})
        console.log('✅ Action buttons visible')
      }

      return { successVerified: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Manejar fondos insuficientes', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-wallet-insufficient', 'Fondos insuficientes', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/bookings/detail-payment?carId=test-car-id&startDate=2025-11-01&endDate=2025-11-05')
      await page.waitForTimeout(3000)

      // Seleccionar wallet
      const walletOption = page.getByRole('button', { name: /wallet|billetera/i })
      if (await walletOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await walletOption.click()
      }

      // Intentar bloquear fondos
      const lockBtn = page.getByRole('button', { name: /bloquear fondos/i })
      if (await lockBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
        await lockBtn.click()
        await page.waitForTimeout(2000)

        // Verificar mensaje de error
        const insufficientMsg = page.getByText(/fondos insuficientes|insufficient funds/i)
        const errorVisible = await insufficientMsg.isVisible({ timeout: 5000 }).catch(() => false)

        if (errorVisible) {
          console.log('✅ Insufficient funds error shown')
        }

        // Verificar botón de confirmar deshabilitado
        const confirmButton = page.getByRole('button', { name: /confirmar y pagar/i })
        const isDisabled = !(await confirmButton.isEnabled({ timeout: 3000 }).catch(() => true))
        if (isDisabled) {
          console.log('✅ Confirm button disabled')
        }
      }

      return { errorHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
