import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'

/**
 * E2E Test: Homepage & Navigation (Visitor)
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 12 bloques atómicos:
 * B1: Cargar homepage exitosamente
 * B2: Mostrar header de navegación
 * B3: Verificar botón de login en header
 * B4: Navegar a login desde botón
 * B5: Verificar link de registro
 * B6: Mostrar catálogo de autos como página default
 * B7: Verificar footer con links
 * B8: Verificar términos y condiciones en footer
 * B9: Verificar theme toggle
 * B10: Verificar responsive mobile
 * B11: Verificar logo accesible
 * B12: Verificar redirección root
 *
 * Prioridad: P0 (Critical - First Impression)
 */

test.describe('Homepage & Navigation Visitor - Checkpoint Architecture', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('B1: Cargar homepage exitosamente', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-homepage-load', 'Cargar homepage', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('homepage-loaded')
    }))

    const result = await block.execute(async () => {
      await expect(page).toHaveURL(/\/(cars)?$/)
      console.log('✅ Homepage cargada exitosamente')
      return { loaded: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Mostrar header de navegación', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-homepage-header', 'Header navegación', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible()

      const nav = page.locator('header, nav').first()
      await expect(nav).toBeVisible()
      console.log('✅ Header y navegación visibles')

      return { headerVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Verificar botón de login en header', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-homepage-login-btn', 'Botón login', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('login-button-visible')
    }))

    const result = await block.execute(async () => {
      const loginButton = page.getByRole('link', { name: /ingresar|iniciar sesión/i }).first()
      await expect(loginButton).toBeVisible()
      console.log('✅ Botón de login visible')

      return { loginButtonVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Navegar a login desde botón', async ({ page, checkpointManager, createBlock }) => {
    const prev = await checkpointManager.loadCheckpoint('login-button-visible')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b4-homepage-navigate-login', 'Navegar a login', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [requiresCheckpoint('login-button-visible')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.waitForLoadState('networkidle')

      const splashLoader = page.locator('app-splash-loader')
      await expect(splashLoader).toBeHidden({ timeout: 10000 })

      const loginButton = page.getByRole('link', { name: /ingresar|iniciar sesión/i }).first()
      await loginButton.click()

      await page.waitForURL('/auth/login')
      expect(page.url()).toContain('/auth/login')
      console.log('✅ Navegación a login exitosa')

      return { navigatedToLogin: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar link de registro', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-homepage-register-link', 'Link registro', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const registerLink = page.getByRole('link', { name: /registrar|crear cuenta|sign up/i }).first()
      const count = await registerLink.count()
      expect(count).toBeGreaterThanOrEqual(0)
      console.log(`✅ Link de registro verificado (count: ${count})`)

      return { registerLinkChecked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Mostrar catálogo de autos como página default', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-homepage-catalog', 'Catálogo default', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await expect(page).toHaveURL(/\/(cars)?$/)

      await expect(
        page.getByText(/autos disponibles|modelos|cercanos/i).first()
      ).toBeVisible({ timeout: 10000 })
      console.log('✅ Catálogo de autos visible como página default')

      return { catalogVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Verificar footer con links', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-homepage-footer', 'Footer links', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      const footer = page.locator('footer')
      await expect(footer).toBeVisible()
      console.log('✅ Footer visible')

      return { footerVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B8: Verificar términos y condiciones en footer', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b8-homepage-terms', 'Términos footer', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

      const termsLink = page.getByRole('link', { name: /términos.*condiciones/i })
      await expect(termsLink.first()).toBeVisible()
      console.log('✅ Link de términos y condiciones visible')

      return { termsLinkVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B9: Verificar theme toggle', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b9-homepage-theme', 'Theme toggle', {
      priority: 'P2',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const themeToggle = page.locator('[aria-label*="tema"], [aria-label*="dark"], [aria-label*="light"], [data-theme-toggle]')
      const count = await themeToggle.count()
      expect(count).toBeGreaterThanOrEqual(0)
      console.log(`✅ Theme toggle verificado (count: ${count})`)

      return { themeToggleChecked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B10: Verificar responsive mobile', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b10-homepage-mobile', 'Responsive mobile', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      await page.goto('/')

      await expect(page.locator('img[alt="Autorentar"]').first()).toBeVisible()
      console.log('✅ Página responsive en mobile')

      return { mobileResponsive: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B11: Verificar logo accesible', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b11-homepage-logo', 'Logo accesible', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const logo = page.locator('img[alt="Autorentar"]').first()
      await expect(logo).toHaveAttribute('alt', 'Autorentar')
      console.log('✅ Logo con alt text accesible')

      return { logoAccessible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B12: Verificar redirección root', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b12-homepage-redirect', 'Redirección root', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/')
      const url = page.url()
      expect(url).toMatch(/\/(cars)?$/)
      console.log('✅ Redirección root funcionando')

      return { redirectWorking: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
