import { test, expect, defineBlock } from '../checkpoint/fixtures'

/**
 * E2E Test: User Logout
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 7 bloques atómicos (todos skip - requieren autenticación):
 * B1: Verificar botón logout en menú perfil
 * B2: Logout exitoso y redirección
 * B3: Limpiar autenticación después de logout
 * B4: Mostrar diálogo de confirmación
 * B5: Mantener preferencia de dark mode
 * B6: Limpiar datos de localStorage
 * B7: Prevenir navegación a rutas protegidas
 *
 * Priority: P0 (Critical)
 * Note: Tests skip hasta que configuración de auth esté completa
 */

test.describe('User Logout - Checkpoint Architecture', () => {

  test.skip('B1: Verificar botón logout en menú perfil', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b1-logout-button-visible', 'Botón logout visible', {
      priority: 'P0',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')

      const signOutButton = page.getByRole('button', { name: /cerrar sesión|salir/i })
      await expect(signOutButton).toBeVisible()
      console.log('✅ Botón de logout visible')

      return { buttonVisible: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B2: Logout exitoso y redirección', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b2-logout-redirect', 'Logout y redirección', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')

      const signOutButton = page.getByRole('button', { name: /cerrar sesión|salir/i })
      await signOutButton.click()

      await page.waitForURL(/\/(auth\/login|home|cars)?$/)
      expect(page.url()).toMatch(/\/(auth\/login|home|cars)?$/)
      console.log('✅ Logout exitoso y redirección correcta')

      return { logoutSuccessful: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B3: Limpiar autenticación después de logout', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b3-logout-clear-auth', 'Limpiar autenticación', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')

      await page.getByRole('button', { name: /cerrar sesión|salir/i }).click()

      await page.goto('/wallet')

      await page.waitForURL('/auth/login')
      expect(page.url()).toContain('/auth/login')
      console.log('✅ Autenticación limpiada correctamente')

      return { authCleared: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B4: Mostrar diálogo de confirmación', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-logout-confirm-dialog', 'Diálogo confirmación', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')

      await page.getByRole('button', { name: /cerrar sesión|salir/i }).click()

      const confirmDialog = page.getByRole('dialog')
      if (await confirmDialog.isVisible()) {
        await expect(confirmDialog).toContainText(/cerrar sesión|confirmar/i)
        await page.getByRole('button', { name: /confirmar|sí|aceptar/i }).click()
        console.log('✅ Diálogo de confirmación mostrado')
      } else {
        console.log('⚠️ No hay diálogo de confirmación implementado')
      }

      return { dialogChecked: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B5: Mantener preferencia de dark mode', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-logout-dark-mode', 'Mantener dark mode', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')

      const darkModeToggle = page.locator('[data-theme-toggle]')
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click()
      }

      await page.getByRole('button', { name: /cerrar sesión|salir/i }).click()

      const html = page.locator('html')
      const htmlClass = await html.getAttribute('class')
      expect(htmlClass).toContain('dark')
      console.log('✅ Preferencia de dark mode mantenida')

      return { darkModeMaintained: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B6: Limpiar datos de localStorage', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b6-logout-clear-storage', 'Limpiar localStorage', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')

      await page.getByRole('button', { name: /cerrar sesión|salir/i }).click()

      const authToken = await page.evaluate(() => {
        return localStorage.getItem('supabase.auth.token')
      })

      expect(authToken).toBeNull()
      console.log('✅ Datos de localStorage limpiados')

      return { storageCleared: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test.skip('B7: Prevenir navegación a rutas protegidas', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b7-logout-protected-routes', 'Rutas protegidas', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')

      await page.getByRole('button', { name: /cerrar sesión|salir/i }).click()

      const protectedRoutes = ['/profile', '/wallet', '/cars/publish', '/admin']

      for (const route of protectedRoutes) {
        await page.goto(route)
        await page.waitForURL('/auth/login')
        expect(page.url()).toContain('/auth/login')
      }
      console.log('✅ Navegación a rutas protegidas bloqueada')

      return { routesProtected: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
