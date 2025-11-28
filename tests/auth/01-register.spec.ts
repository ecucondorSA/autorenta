import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'
import { generateTestUser } from '../helpers/test-data'

/**
 * E2E Test: User Registration
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 12 bloques atómicos:
 * B1: Mostrar formulario de registro
 * B2: Validar campos vacíos
 * B3: Validar formato de email
 * B4: Validar longitud de contraseña
 * B5: Llenar formulario correctamente
 * B6: Mostrar hint de contraseña
 * B7: Navegar a login desde registro
 * B8: Mostrar mensaje después de registro
 * B9: Validar longitud de nombre
 * B10: Verificar layout del formulario
 * B11: Mostrar indicadores de campo requerido
 * B12: Verificar atributos de accesibilidad
 *
 * Priority: P0 (Critical)
 */

test.describe('User Registration - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/register')
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
  })

  test('B1: Mostrar formulario de registro', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-register-form-display', 'Mostrar formulario', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('register-form-displayed')
    }))

    const result = await block.execute(async () => {
      await expect(page.locator('#register-fullname')).toBeVisible()
      await expect(page.locator('#register-email')).toBeVisible()
      await expect(page.locator('#register-password')).toBeVisible()
      await expect(page.locator('#register-phone')).toBeVisible()

      await expect(page.getByRole('button', { name: 'Crear cuenta' })).toBeVisible()

      await expect(page.getByRole('link', { name: 'Ingresar' }).last()).toBeVisible()
      console.log('✅ Formulario de registro visible')

      return { formDisplayed: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Validar campos vacíos', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-register-empty-validation', 'Validar vacíos', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#register-fullname').click()
      await page.locator('#register-email').click()

      await expect(page.locator('#register-fullname-error')).toContainText('nombre completo es obligatorio')
      console.log('✅ Validación de campos vacíos funcionando')

      return { emptyValidationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Validar formato de email', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-register-email-format', 'Validar email', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#register-email').fill('invalid-email')
      await page.locator('#register-password').click()

      await expect(page.locator('#register-email-error')).toContainText('Formato de email inválido')
      console.log('✅ Validación de formato de email funcionando')

      return { emailValidationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Validar longitud de contraseña', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-register-password-length', 'Validar contraseña', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#register-password').fill('short')
      await page.locator('#register-email').click()

      await expect(page.locator('#register-password-error')).toContainText('al menos 8 caracteres')
      console.log('✅ Validación de longitud de contraseña funcionando')

      return { passwordValidationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Llenar formulario correctamente', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-register-fill-form', 'Llenar formulario', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('register-form-filled')
    }))

    const result = await block.execute(async () => {
      const testUser = generateTestUser('locatario')

      await page.locator('#register-fullname').fill(testUser.fullName)
      await page.locator('#register-email').fill(testUser.email)
      await page.locator('#register-password').fill(testUser.password)
      await page.locator('#register-phone').fill('+59899123456')

      await expect(page.locator('#register-fullname-error')).not.toBeVisible()
      await expect(page.locator('#register-email-error')).not.toBeVisible()
      await expect(page.locator('#register-password-error')).not.toBeVisible()
      await expect(page.locator('#register-phone-error')).not.toBeVisible()

      const submitButton = page.getByRole('button', { name: 'Crear cuenta' })
      await expect(submitButton).toBeEnabled()
      console.log('✅ Formulario llenado correctamente')

      return { formFilled: true, email: testUser.email }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Mostrar hint de contraseña', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-register-password-hint', 'Hint contraseña', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#register-password').click()

      await expect(page.locator('#register-password-hint')).toBeVisible()
      await expect(page.locator('#register-password-hint')).toContainText('al menos 8 caracteres')
      console.log('✅ Hint de contraseña visible')

      return { hintVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Navegar a login desde registro', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-register-navigate-login', 'Navegar a login', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.getByRole('link', { name: 'Ingresar' }).last().click()

      await page.waitForURL('/auth/login', { timeout: 10000 })
      expect(page.url()).toContain('/auth/login')

      await expect(page.getByRole('heading', { name: 'Crear cuenta' })).not.toBeVisible()
      console.log('✅ Navegación a login exitosa')

      return { navigatedToLogin: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Mostrar mensaje después de registro', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-register-success-message', 'Mensaje post-registro', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const testUser = generateTestUser('locatario')

      await page.locator('#register-fullname').fill(testUser.fullName)
      await page.locator('#register-email').fill(testUser.email)
      await page.locator('#register-password').fill(testUser.password)
      await page.locator('#register-phone').fill('+59899123456')

      await page.getByRole('button', { name: 'Crear cuenta' }).click()

      const loadingState = page.getByRole('button', { name: /creando cuenta/i })
      await expect(loadingState.or(page.locator('role=alert'))).toBeVisible({ timeout: 10000 })
      console.log('✅ Mensaje post-registro visible')

      return { messageShown: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B9: Validar longitud de nombre', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b9-register-fullname-length', 'Validar nombre', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.locator('#register-fullname').fill('ab')
      await page.locator('#register-email').click()

      await expect(page.locator('#register-fullname-error')).toContainText('al menos 3 caracteres')
      console.log('✅ Validación de longitud de nombre funcionando')

      return { fullnameValidationWorks: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B10: Verificar layout del formulario', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b10-register-layout', 'Layout formulario', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page.locator('#main-content img[alt="Autorentar"]')).toBeVisible()

      await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible()
      await expect(page.getByText('Unite a la comunidad de Autorentar')).toBeVisible()

      await expect(page.getByText(/términos y condiciones/i).first()).toBeVisible()
      console.log('✅ Layout de formulario correcto')

      return { layoutCorrect: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B11: Mostrar indicadores de campo requerido', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b11-register-required-indicators', 'Indicadores requerido', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const fullNameLabel = page.locator('label[for="register-fullname"]')
      const emailLabel = page.locator('label[for="register-email"]')
      const passwordLabel = page.locator('label[for="register-password"]')

      await expect(fullNameLabel).toContainText('*')
      await expect(emailLabel).toContainText('*')
      await expect(passwordLabel).toContainText('*')
      await expect(page.locator('label[for="register-phone"]')).toContainText('*')
      console.log('✅ Indicadores de campo requerido visibles')

      return { requiredIndicatorsVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B12: Verificar atributos de accesibilidad', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b12-register-accessibility', 'Accesibilidad', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const emailInput = page.locator('#register-email')
      const passwordInput = page.locator('#register-password')

      await expect(emailInput).toHaveAttribute('aria-required', 'true')
      await expect(passwordInput).toHaveAttribute('aria-required', 'true')
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')
      await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password')
      await expect(page.locator('#register-phone')).toHaveAttribute('aria-required', 'true')
      console.log('✅ Atributos de accesibilidad correctos')

      return { accessibilityCorrect: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
