import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Password Recovery
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 14 bloques atómicos:
 * B1: Mostrar formulario de recuperación
 * B2: Mostrar heading y descripción
 * B3: Botón deshabilitado con email vacío
 * B4: Habilitar botón con email válido
 * B5: Mostrar placeholder y texto de ayuda
 * B6: Mostrar card de información de ayuda
 * B7: Navegar de vuelta a login
 * B8: Mostrar logo y branding
 * B9: Verificar estructura del formulario
 * B10: Mostrar estado de carga (skip)
 * B11: Mostrar mensaje de éxito (skip)
 * B12: Manejar email inexistente (skip)
 * B13: Verificar labels accesibles
 * B14: Verificar layout en card
 *
 * Priority: P1 (Important)
 */

test.describe('Password Recovery - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/reset-password')
    await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible()
  })

  test('B1: Mostrar formulario de recuperación', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-reset-form-display', 'Mostrar formulario', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('reset-form-displayed')
    }))

    const result = await block.execute(async () => {
      await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /enviar enlace de recuperación/i })).toBeVisible()

      await expect(page.getByRole('link', { name: /volver al inicio de sesión/i })).toBeVisible()
      console.log('✅ Formulario de recuperación visible')

      return { formDisplayed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Mostrar heading y descripción', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-reset-heading-description', 'Heading y descripción', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page.getByRole('heading', { name: 'Recuperar contraseña' })).toBeVisible()

      await expect(page.getByText(/te enviaremos un enlace para restablecer tu contraseña/i)).toBeVisible()
      console.log('✅ Heading y descripción visibles')

      return { headingDescriptionVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Botón deshabilitado con email vacío', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-reset-button-disabled', 'Botón deshabilitado', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i })

      await expect(submitButton).toBeDisabled()
      console.log('✅ Botón deshabilitado con email vacío')

      return { buttonDisabled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Habilitar botón con email válido', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-reset-button-enabled', 'Botón habilitado', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('reset-form-valid')
    }))

    const result = await block.execute(async () => {
      const emailInput = page.getByRole('textbox', { name: /email/i })
      const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i })

      await emailInput.fill('test@autorenta.com')

      await expect(submitButton).toBeEnabled()
      console.log('✅ Botón habilitado con email válido')

      return { buttonEnabled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Mostrar placeholder y texto de ayuda', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-reset-placeholder-helper', 'Placeholder y helper', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailInput = page.getByRole('textbox', { name: /email/i })

      await expect(emailInput).toHaveAttribute('placeholder', 'tu@email.com')

      await expect(page.getByText(/ingresá el email asociado a tu cuenta/i)).toBeVisible()
      console.log('✅ Placeholder y texto de ayuda visibles')

      return { placeholderHelperVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Mostrar card de información de ayuda', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-reset-help-card', 'Card de ayuda', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page.getByRole('heading', { name: /no recibiste el email/i })).toBeVisible()

      await expect(page.getByText(/revisá tu carpeta de spam/i)).toBeVisible()
      await expect(page.getByText(/asegurate de haber ingresado el email correcto/i)).toBeVisible()
      await expect(page.getByText(/el enlace puede tardar unos minutos/i)).toBeVisible()
      console.log('✅ Card de información de ayuda visible')

      return { helpCardVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Navegar de vuelta a login', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-reset-navigate-login', 'Navegar a login', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.getByRole('link', { name: /volver al inicio de sesión/i }).click()

      await page.waitForURL('/auth/login')
      await expect(page.getByRole('heading', { name: /bienvenido de vuelta/i })).toBeVisible()
      console.log('✅ Navegación a login exitosa')

      return { navigatedToLogin: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Mostrar logo y branding', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-reset-logo-branding', 'Logo y branding', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible()
      console.log('✅ Logo y branding visibles')

      return { logoVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B9: Verificar estructura del formulario', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b9-reset-form-structure', 'Estructura formulario', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailInput = page.getByRole('textbox', { name: /email/i })

      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('required')
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')
      console.log('✅ Estructura del formulario correcta')

      return { formStructureCorrect: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B10: Mostrar estado de carga', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b10-reset-loading-state', 'Estado de carga', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailInput = page.getByRole('textbox', { name: /email/i })
      const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i })

      await emailInput.fill('test@autorenta.com')

      await submitButton.click()

      await expect(page.getByRole('button', { name: /enviando/i })).toBeVisible({ timeout: 2000 })
      console.log('✅ Estado de carga mostrado')

      return { loadingStateShown: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B11: Mostrar mensaje de éxito', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b11-reset-success-message', 'Mensaje de éxito', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailInput = page.getByRole('textbox', { name: /email/i })
      const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i })

      await emailInput.fill('test@autorenta.com')

      await submitButton.click()

      const successMessage = page.locator('.bg-green-50')
      await expect(successMessage).toBeVisible({ timeout: 10000 })
      await expect(successMessage).toContainText(/enviado|éxito|correo/i)
      console.log('✅ Mensaje de éxito mostrado')

      return { successMessageShown: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B12: Manejar email inexistente', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b12-reset-nonexistent-email', 'Email inexistente', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailInput = page.getByRole('textbox', { name: /email/i })
      const submitButton = page.getByRole('button', { name: /enviar enlace de recuperación/i })

      await emailInput.fill('nonexistent@example.com')

      await submitButton.click()

      await page.waitForTimeout(2000)
      console.log('✅ Email inexistente manejado')

      return { nonexistentEmailHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B13: Verificar labels accesibles', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b13-reset-accessible-labels', 'Labels accesibles', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailLabel = page.locator('label', { hasText: /email/i })
      await expect(emailLabel).toBeVisible()
      console.log('✅ Labels accesibles')

      return { labelsAccessible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B14: Verificar layout en card', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b14-reset-card-layout', 'Layout en card', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const card = page.locator('.card-premium').first()
      await expect(card).toBeVisible()

      const helpCard = page.locator('.card-premium').last()
      await expect(helpCard).toBeVisible()
      await expect(helpCard).toContainText(/no recibiste el email/i)
      console.log('✅ Layout en card correcto')

      return { cardLayoutCorrect: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
