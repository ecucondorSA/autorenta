import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'
import { WalletPage } from '../pages/wallet/WalletPage'

/**
 * E2E Test: Wallet UI - Basic Validation
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 12 bloques atómicos:
 * B1: Redirección a login sin autenticación
 * B2: Verificar heading y descripción
 * B3: Verificar botón de depósito
 * B4: Verificar tabs de transacciones/retiros
 * B5: Cambiar entre tabs
 * B6: Verificar cards de información de crédito
 * B7: Verificar opciones de garantía
 * B8: Verificar progreso de crédito protegido
 * B9: Verificar modal de depósito
 * B10: Verificar formulario de retiro
 * B11: Verificar link de ayuda
 * B12: Verificar sección de acciones rápidas
 *
 * Prioridad: P1 (Core UI)
 */

test.describe('Wallet UI - Checkpoint Architecture', () => {

  test('B1: Redirección a login sin autenticación', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-wallet-redirect-login', 'Redirección a login', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('wallet-redirect-verified')
    }))

    const result = await block.execute(async () => {
      await page.goto('/wallet')
      await page.waitForURL(/\/auth\/login/, { timeout: 10000 })
      expect(page.url()).toContain('/auth/login')
      console.log('✅ Redirección a login verificada')

      return { redirected: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.describe('Authenticated Wallet Page - Checkpoint Architecture', () => {

    test.skip('B2: Verificar heading y descripción', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b2-wallet-heading', 'Verificar heading', {
        priority: 'P1',
        estimatedDuration: 10000,
        preconditions: [],
        postconditions: [],
        ...withCheckpoint('wallet-heading-verified')
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(walletPage.pageHeading).toBeVisible()
        await expect(walletPage.pageHeading).toHaveText('Mi Wallet')

        await expect(
          page.getByText(/administra tus fondos.*realiza depósitos/i)
        ).toBeVisible()

        console.log('✅ Heading y descripción verificados')
        return { headingVerified: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B3: Verificar botón de depósito', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b3-wallet-deposit-btn', 'Verificar botón depósito', {
        priority: 'P1',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        expect(await walletPage.isDepositButtonVisible()).toBeTruthy()
        console.log('✅ Botón de depósito visible')

        return { depositButtonVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B4: Verificar tabs de transacciones/retiros', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b4-wallet-tabs', 'Verificar tabs', {
        priority: 'P1',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: [],
        ...withCheckpoint('wallet-tabs-verified')
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(walletPage.transactionsTab).toBeVisible()
        await expect(walletPage.withdrawalsTab).toBeVisible()
        console.log('✅ Tabs de transacciones y retiros visibles')

        return { tabsVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B5: Cambiar entre tabs', async ({ page, checkpointManager, createBlock }) => {
      const prev = await checkpointManager.loadCheckpoint('wallet-tabs-verified')
      if (prev) {
        await checkpointManager.restoreCheckpoint(prev)
      }

      const block = createBlock(defineBlock('b5-wallet-switch-tabs', 'Cambiar tabs', {
        priority: 'P1',
        estimatedDuration: 10000,
        preconditions: [requiresCheckpoint('wallet-tabs-verified')],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(walletPage.transactionsTab).toHaveClass(/border-accent-petrol/)

        await walletPage.clickWithdraw()
        await expect(page.getByRole('heading', { name: /gestión de retiros/i })).toBeVisible()

        await walletPage.switchToTransactions()
        await expect(walletPage.transactionsTab).toHaveClass(/border-accent-petrol/)
        console.log('✅ Cambio entre tabs funcionando')

        return { tabSwitchWorking: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B6: Verificar cards de información de crédito', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b6-wallet-credit-cards', 'Verificar credit cards', {
        priority: 'P1',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(page.getByText(/opciones para garantizar tu reserva/i)).toBeVisible()
        await expect(page.getByText(/crédito autorentar.*usd 250/i)).toBeVisible()
        await expect(page.getByText(/beneficios/i)).toBeVisible()
        await expect(page.getByText(/seguridad/i)).toBeVisible()
        console.log('✅ Cards de información de crédito visibles')

        return { creditCardsVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B7: Verificar opciones de garantía', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b7-wallet-guarantee-options', 'Opciones de garantía', {
        priority: 'P1',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(page.getByText(/1.*tarjeta de crédito/i)).toBeVisible()
        await expect(page.getByText(/2.*crédito autorentar/i)).toBeVisible()
        console.log('✅ Opciones de garantía visibles')

        return { guaranteeOptionsVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B8: Verificar progreso de crédito protegido', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b8-wallet-credit-progress', 'Progreso crédito', {
        priority: 'P1',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(page.getByText(/progreso crédito protegido/i)).toBeVisible()
        await expect(page.getByText(/meta usd/i)).toBeVisible()
        console.log('✅ Progreso de crédito protegido visible')

        return { creditProgressVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B9: Verificar modal de depósito', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b9-wallet-deposit-modal', 'Modal de depósito', {
        priority: 'P1',
        estimatedDuration: 10000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await walletPage.clickDeposit()
        await expect(page.locator('app-deposit-modal')).toBeVisible({ timeout: 5000 })
        console.log('✅ Modal de depósito visible')

        return { depositModalVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B10: Verificar formulario de retiro', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b10-wallet-withdrawal-form', 'Formulario retiro', {
        priority: 'P1',
        estimatedDuration: 10000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await walletPage.clickWithdraw()
        await expect(page.locator('app-withdrawal-request-form')).toBeVisible()
        console.log('✅ Formulario de retiro visible')

        return { withdrawalFormVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B11: Verificar link de ayuda', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b11-wallet-help-link', 'Link de ayuda', {
        priority: 'P2',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        const helpLink = page.getByRole('link', { name: /consulta nuestras preguntas frecuentes/i })
        await expect(helpLink).toBeVisible()
        await expect(helpLink).toHaveAttribute('href', '/ayuda/wallet')
        console.log('✅ Link de ayuda visible')

        return { helpLinkVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B12: Verificar sección de acciones rápidas', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b12-wallet-quick-actions', 'Acciones rápidas', {
        priority: 'P1',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(page.getByText(/gestiona tu dinero fácilmente/i)).toBeVisible()

        const depositBtn = page.getByRole('button', { name: /depositar/i }).last()
        const withdrawBtn = page.getByRole('button', { name: /retirar/i }).last()

        await expect(depositBtn).toBeVisible()
        await expect(withdrawBtn).toBeVisible()
        console.log('✅ Sección de acciones rápidas visible')

        return { quickActionsVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })

    test.skip('B13: Verificar componente de balance', async ({ page, createBlock }) => {
      const block = createBlock(defineBlock('b13-wallet-balance-card', 'Balance card', {
        priority: 'P1',
        estimatedDuration: 5000,
        preconditions: [],
        postconditions: []
      }))

      const result = await block.execute(async () => {
        const walletPage = new WalletPage(page)
        await walletPage.goto()

        await expect(page.locator('app-wallet-balance-card')).toBeVisible()
        console.log('✅ Componente de balance visible')

        return { balanceCardVisible: true }
      })

      expect(result.state.status).toBe('passed')
    })
  })
})
