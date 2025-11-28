import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: User Login
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 12 bloques atómicos:
 * B1: Mostrar formulario de login
 * B2: Validar campos vacíos
 * B3: Validar formato de email
 * B4: Validar longitud de contraseña
 * B5: Llenar formulario correctamente
 * B6: Navegar a registro
 * B7: Navegar a recuperar contraseña
 * B8: Verificar layout del formulario
 * B9: Mostrar indicadores de campo requerido
 * B10: Verificar atributos de accesibilidad
 * B11: Mostrar estado de carga
 * B12: Error credenciales inválidas (skip)
 *
 * Priority: P0 (Critical)
 */

test.describe('User Login - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login')
    await expect(page.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeVisible()
  })

  test('B1: Mostrar formulario de login', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-login-form-display', 'Mostrar formulario', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('login-form-displayed')
    }))

    const result = await block.execute(async () => {
      await expect(page.locator('#login-email')).toBeVisible()
      await expect(page.locator('#login-password')).toBeVisible()

      await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible()

      await expect(page.getByRole('link', { name: 'Crear cuenta' })).toBeVisible()
      await expect(page.getByRole('link', { name: /olvidaste tu contraseña/i })).toBeVisible()
      console.log('✅ Formulario de login visible')

      return { formDisplayed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Validar campos vacíos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-login-empty-validation', 'Validar vacíos', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#login-email').click()
      await page.locator('#login-password').click()

      await expect(page.locator('#login-email-error')).toContainText('email es obligatorio')
      console.log('✅ Validación de campos vacíos funcionando')

      return { emptyValidationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Validar formato de email', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-login-email-format', 'Validar email', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#login-email').fill('invalid-email')
      await page.locator('#login-password').click()

      await expect(page.locator('#login-email-error')).toContainText('Formato de email inválido')
      console.log('✅ Validación de formato de email funcionando')

      return { emailValidationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Validar longitud de contraseña', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-login-password-length', 'Validar contraseña', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#login-password').fill('short')
      await page.locator('#login-email').click()

      await expect(page.locator('#login-password-error')).toContainText('al menos 6 caracteres')
      console.log('✅ Validación de longitud de contraseña funcionando')

      return { passwordValidationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Llenar formulario correctamente', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-login-fill-form', 'Llenar formulario', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('login-form-filled')
    }))

    const result = await block.execute(async () => {
      await page.locator('#login-email').fill('test@autorenta.com')
      await page.locator('#login-password').fill('ValidPassword123!')

      await expect(page.locator('#login-email-error')).not.toBeVisible()
      await expect(page.locator('#login-password-error')).not.toBeVisible()

      const submitButton = page.getByRole('button', { name: 'Ingresar' })
      await expect(submitButton).toBeEnabled()
      console.log('✅ Formulario llenado correctamente')

      return { formFilled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Navegar a registro', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-login-navigate-register', 'Navegar a registro', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.getByRole('link', { name: 'Crear cuenta' }).click()
      await page.waitForURL('/auth/register')
      await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
      console.log('✅ Navegación a registro exitosa')

      return { navigatedToRegister: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Navegar a recuperar contraseña', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-login-navigate-recovery', 'Navegar a recuperar', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.getByRole('link', { name: /olvidaste tu contraseña/i }).click()
      await page.waitForURL('/auth/reset-password')
      expect(page.url()).toContain('/auth/reset-password')
      console.log('✅ Navegación a recuperar contraseña exitosa')

      return { navigatedToRecovery: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Verificar layout del formulario', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-login-layout', 'Layout formulario', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible()

      await expect(page.getByRole('heading', { name: 'Bienvenido de vuelta' })).toBeVisible()
      await expect(page.getByText('Ingresá a tu cuenta de Autorentar')).toBeVisible()

      await expect(page.getByText(/términos y condiciones/i).first()).toBeVisible()
      console.log('✅ Layout de formulario correcto')

      return { layoutCorrect: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B9: Mostrar indicadores de campo requerido', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b9-login-required-indicators', 'Indicadores requerido', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailLabel = page.locator('label[for="login-email"]')
      const passwordLabel = page.locator('label[for="login-password"]')

      await expect(emailLabel).toContainText('*')
      await expect(passwordLabel).toContainText('*')
      console.log('✅ Indicadores de campo requerido visibles')

      return { requiredIndicatorsVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B10: Verificar atributos de accesibilidad', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b10-login-accessibility', 'Accesibilidad', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailInput = page.locator('#login-email')
      const passwordInput = page.locator('#login-password')

      await expect(emailInput).toHaveAttribute('aria-required', 'true')
      await expect(passwordInput).toHaveAttribute('aria-required', 'true')
      await expect(emailInput).toHaveAttribute('autocomplete', 'username email')
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
      console.log('✅ Atributos de accesibilidad correctos')

      return { accessibilityCorrect: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B11: Mostrar estado de carga', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b11-login-loading-state', 'Estado de carga', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#login-email').fill('test@autorenta.com')
      await page.locator('#login-password').fill('ValidPassword123!')

      await page.getByRole('button', { name: 'Ingresar' }).click()

      const loadingButton = page.getByRole('button', { name: /ingresando/i })

      await expect(loadingButton.or(page.locator('role=alert'))).toBeVisible({ timeout: 5000 })
      console.log('✅ Estado de carga mostrado')

      return { loadingStateShown: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B12: Error credenciales inválidas', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b12-login-invalid-credentials', 'Credenciales inválidas', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#login-email').fill('wrong@example.com')
      await page.locator('#login-password').fill('WrongPassword123!')

      await page.getByRole('button', { name: 'Ingresar' }).click()

      await expect(page.locator('role=alert')).toContainText(/credenciales inválidas|email o contraseña incorrectos/i)
      console.log('✅ Error de credenciales inválidas mostrado')

      return { invalidCredentialsShown: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
