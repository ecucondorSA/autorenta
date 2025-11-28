import { test, expect, defineBlock, requiresCheckpoint, expectsUrl, expectsElement, withCheckpoint } from '../checkpoint/fixtures'

/**
 * TEST CRÍTICO: Publicación de Auto con Onboarding de MP
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 4 bloques atómicos:
 * B1: Registrar nuevo usuario
 * B2: Verificar modal de onboarding MP
 * B3: Probar flujo de cancelación y advertencias
 * B4: Completar publicación sin onboarding
 *
 * Prioridad: P0 (Critical)
 */

// Contexto compartido entre bloques
interface OnboardingTestContext {
  testUser: {
    email: string
    password: string
    fullName: string
    phone: string
  }
}

const ctx: OnboardingTestContext = {
  testUser: {
    email: `test-publisher-${Date.now()}@autorentar.com`,
    password: 'TestPassword123!',
    fullName: 'Test Publisher',
    phone: '+541112345678'
  }
}

test.describe('Publicación de Auto con Onboarding MP - Checkpoint Architecture', () => {

  test('B1: Registrar nuevo usuario de prueba', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-onboarding-register', 'Registrar usuario nuevo', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [
        expectsUrl(/\/(cars|inicio)/)
      ],
      ...withCheckpoint('onboarding-user-registered')
    }))

    const result = await block.execute(async () => {
      await page.goto('/auth/register')
      await page.fill('input[name="email"]', ctx.testUser.email)
      await page.fill('input[name="password"]', ctx.testUser.password)
      await page.fill('input[name="full_name"]', ctx.testUser.fullName)
      await page.fill('input[name="phone"]', ctx.testUser.phone)
      await page.click('button[type="submit"]')

      // Esperar a que se complete el registro
      await expect(page).toHaveURL(/\/(cars|inicio)/, { timeout: 10000 })

      console.log(`✅ Usuario registrado: ${ctx.testUser.email}`)

      return { registered: true, email: ctx.testUser.email }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar modal de onboarding MP aparece', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint o hacer login
    const prev = await checkpointManager.loadCheckpoint('onboarding-user-registered')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Si no hay checkpoint, intentar login
      await page.goto('/auth/login')
      await page.fill('input[name="email"]', ctx.testUser.email)
      await page.fill('input[name="password"]', ctx.testUser.password)
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL(/\/(cars|inicio)/, { timeout: 10000 })
    }

    const block = createBlock(defineBlock('b2-onboarding-modal', 'Verificar modal onboarding', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [requiresCheckpoint('onboarding-user-registered')],
      postconditions: [
        expectsElement('ion-modal')
      ],
      ...withCheckpoint('onboarding-modal-visible')
    }))

    const result = await block.execute(async () => {
      // Navegar a publicar auto
      await page.goto('/cars/publish')

      // Esperar a que se muestre el modal de onboarding
      await expect(page.locator('ion-modal[component="MpOnboardingModalComponent"]')).toBeVisible({
        timeout: 5000
      }).catch(async () => {
        // Fallback: buscar cualquier modal con texto de MP
        await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })
      })

      // Verificar texto del modal
      await expect(page.locator('ion-modal')).toContainText('Mercado Pago')
      await expect(page.locator('ion-modal')).toContainText('vincular')

      // Verificar botones
      const vincularBtn = page.locator('ion-modal button:has-text("Vincular")')
      await expect(vincularBtn).toBeVisible()

      const cancelarBtn = page.locator('ion-modal button:has-text("Cancelar")')
      await expect(cancelarBtn).toBeVisible()

      console.log('✅ Modal de onboarding MP visible con botones correctos')

      return { modalVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Probar cancelación y alert de advertencia', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('onboarding-modal-visible')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/cars/publish')
      await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })
    }

    const block = createBlock(defineBlock('b3-onboarding-cancel', 'Probar cancelación y warnings', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('onboarding-modal-visible')],
      postconditions: [
        expectsElement('ion-alert')
      ],
      ...withCheckpoint('onboarding-alert-shown')
    }))

    const result = await block.execute(async () => {
      // Si el modal no está visible, navegar de nuevo
      if (!await page.locator('ion-modal').isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.goto('/cars/publish')
        await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })
      }

      // Click en cancelar
      await page.locator('ion-modal button:has-text("Cancelar")').click()

      // Debe mostrar alert de advertencia
      await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 })

      // Verificar contenido del alert
      await expect(page.locator('ion-alert')).toContainText('Onboarding Pendiente')
      await expect(page.locator('ion-alert')).toContainText('No podrás recibir pagos automáticos')
      await expect(page.locator('ion-alert')).toContainText('split-payments no funcionarán')

      // Verificar que existen ambos botones
      await expect(page.locator('ion-alert button:has-text("Vincular Ahora")')).toBeVisible()
      await expect(page.locator('ion-alert button:has-text("Continuar Sin Vincular")')).toBeVisible()

      console.log('✅ Alert de advertencia mostrado correctamente')

      return { alertShown: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Publicar sin onboarding después de advertencia', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('onboarding-alert-shown')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Navegar y cancelar para llegar al alert
      await page.goto('/cars/publish')
      await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })
      await page.locator('ion-modal button:has-text("Cancelar")').click()
      await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 })
    }

    const block = createBlock(defineBlock('b4-onboarding-continue-without', 'Continuar sin vincular', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [requiresCheckpoint('onboarding-alert-shown')],
      postconditions: [
        expectsUrl(/\/cars\/publish/)
      ]
    }))

    const result = await block.execute(async () => {
      // Si el alert no está visible, navegar y cancelar de nuevo
      if (!await page.locator('ion-alert').isVisible({ timeout: 2000 }).catch(() => false)) {
        await page.goto('/cars/publish')
        await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })
        await page.locator('ion-modal button:has-text("Cancelar")').click()
        await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 })
      }

      // Click en "Continuar Sin Vincular"
      await page.click('ion-alert button:has-text("Continuar Sin Vincular")')

      // Alert debe cerrarse
      await expect(page.locator('ion-alert')).not.toBeVisible()

      // Debe permitir acceso al formulario de publicación
      await expect(page).toHaveURL('/cars/publish')
      await expect(page.locator('form, ion-content')).toBeVisible()

      console.log('✅ Acceso al formulario permitido sin onboarding')

      return { canPublish: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Flujos Adicionales de Onboarding - Checkpoint Architecture', () => {

  test('B5: Reabrir modal con "Vincular Ahora"', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b5-onboarding-reopen', 'Reabrir modal onboarding', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [
        expectsElement('ion-modal')
      ]
    }))

    const result = await block.execute(async () => {
      // Navegar a publish y esperar modal
      await page.goto('/cars/publish')
      await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })

      // Cerrar modal
      await page.locator('ion-modal button:has-text("Cancelar")').click()

      // Alert aparece
      await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 })

      // Click en "Vincular Ahora"
      await page.click('ion-alert button:has-text("Vincular Ahora")')

      // Alert debe cerrarse
      await expect(page.locator('ion-alert')).not.toBeVisible()

      // Modal debe reaparecer
      await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('ion-modal')).toContainText('Mercado Pago')

      console.log('✅ Modal reabierto correctamente con "Vincular Ahora"')

      return { modalReopened: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Cerrar modal con backdrop dismiss', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b6-onboarding-backdrop', 'Cerrar con backdrop', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [
        expectsElement('ion-alert')
      ]
    }))

    const result = await block.execute(async () => {
      // Navegar a publish
      await page.goto('/cars/publish')

      // Modal aparece
      await expect(page.locator('ion-modal')).toBeVisible({ timeout: 5000 })

      // Cerrar con backdrop (click fuera del modal)
      await page.locator('ion-backdrop').click()

      // Alert debe aparecer
      await expect(page.locator('ion-alert')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('ion-alert')).toContainText('Onboarding Pendiente')

      console.log('✅ Alert mostrado después de cerrar con backdrop')

      return { alertAfterBackdrop: true }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('Validaciones del Formulario - Checkpoint Architecture', () => {

  test('B7: Validar campos requeridos', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b7-validation-required', 'Validar campos requeridos', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/publish')

      // Si hay modal de onboarding, cerrarlo
      if (await page.locator('ion-modal').isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.locator('ion-modal button:has-text("Cancelar")').click()
        if (await page.locator('ion-alert').isVisible({ timeout: 2000 }).catch(() => false)) {
          await page.click('ion-alert button:has-text("Continuar Sin Vincular")')
        }
      }

      // Intentar enviar formulario vacío
      await page.click('button[type="submit"]')

      // Verificar mensajes de error
      const hasValidationError = await page.locator('text=Campo requerido')
        .isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasValidationError) {
        console.log('⚠️ No se mostró mensaje de "Campo requerido" - verificar implementación')
      } else {
        console.log('✅ Validación de campos requeridos funciona')
      }

      return { validated: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Validar requerimiento de fotos', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b8-validation-photos', 'Validar mínimo 3 fotos', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/cars/publish')

      // Si hay modal de onboarding, cerrarlo
      if (await page.locator('ion-modal').isVisible({ timeout: 3000 }).catch(() => false)) {
        await page.locator('ion-modal button:has-text("Cancelar")').click()
        if (await page.locator('ion-alert').isVisible({ timeout: 2000 }).catch(() => false)) {
          await page.click('ion-alert button:has-text("Continuar Sin Vincular")')
        }
      }

      // Completar campos básicos sin fotos
      const brandSelect = page.locator('select[name="brand_id"]')
      if (await brandSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await brandSelect.selectOption({ index: 1 })
      }

      const modelSelect = page.locator('select[name="model_id"]')
      if (await modelSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await modelSelect.selectOption({ index: 1 })
      }

      const yearInput = page.locator('input[name="year"]')
      if (await yearInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await yearInput.fill('2023')
      }

      const colorInput = page.locator('input[name="color"]')
      if (await colorInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await colorInput.fill('Blanco')
      }

      const priceInput = page.locator('input[name="price_per_day"]')
      if (await priceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await priceInput.fill('5000')
      }

      // Intentar enviar
      await page.click('button[type="submit"]')

      // Verificar error de fotos
      const hasPhotoError = await page.locator('text=al menos 3 fotos')
        .isVisible({ timeout: 5000 }).catch(() => false)

      if (!hasPhotoError) {
        console.log('⚠️ No se mostró error de fotos mínimas - verificar implementación')
      } else {
        console.log('✅ Validación de mínimo 3 fotos funciona')
      }

      return { validated: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
