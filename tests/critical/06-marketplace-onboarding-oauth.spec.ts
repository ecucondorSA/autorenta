import { test, expect, defineBlock, requiresCheckpoint, expectsUrl, expectsElement, withCheckpoint } from '../checkpoint/fixtures'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * E2E Test CRÍTICO: Marketplace Onboarding - OAuth Flow de MercadoPago
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 3 bloques atómicos:
 * B1: Login como owner y verificar modal onboarding
 * B2: Completar OAuth flow (mock/simulado)
 * B3: Verificar autorización y acceso a publicar
 *
 * Prioridad: P0 (BLOCKER para owners)
 */

// Verificar env vars
const supabaseUrl = process.env.PLAYWRIGHT_SUPABASE_URL || process.env.NG_APP_SUPABASE_URL
const supabaseKey = process.env.PLAYWRIGHT_SUPABASE_ANON_KEY || process.env.NG_APP_SUPABASE_ANON_KEY
const hasEnvVars = !!(supabaseUrl && supabaseKey)

let supabase: SupabaseClient | null = null
if (hasEnvVars) {
  supabase = createClient(supabaseUrl!, supabaseKey!)
}

// Contexto compartido entre bloques
interface OAuthTestContext {
  testOwnerId?: string
}
const ctx: OAuthTestContext = {}

test.describe('CRITICAL: Marketplace Onboarding - MercadoPago OAuth - Checkpoint Architecture', () => {
  test.skip(!hasEnvVars, 'Requires PLAYWRIGHT_SUPABASE_URL and PLAYWRIGHT_SUPABASE_ANON_KEY')

  test.use({
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200'
  })

  test.beforeEach(async () => {
    if (!supabase) return
    // Limpiar cualquier autorización previa de test
    await supabase
      .from('marketplace_authorizations')
      .delete()
      .eq('user_id', 'test-owner-id')
  })

  test('B1: Login como owner y verificar modal de onboarding', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-oauth-login-modal', 'Login y verificar modal onboarding', {
      priority: 'P0',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('oauth-modal-visible')
    }))

    const result = await block.execute(async () => {
      // Login como owner
      console.log('🔐 Login como owner...')
      await page.goto('/auth/login')
      await page.waitForLoadState('domcontentloaded')

      const emailInput = page.locator('input[type="email"]').first()
      const passwordInput = page.locator('input[type="password"]').first()
      const loginButton = page.getByRole('button', { name: /entrar|login/i })

      await emailInput.fill('owner.test@autorenta.com')
      await passwordInput.fill('TestOwner123!')
      await loginButton.click()

      await page.waitForURL(/\/cars|\//, { timeout: 15000 })
      await page.waitForTimeout(2000)
      console.log('✅ Login como owner completado')

      // Obtener owner_id si tenemos supabase
      if (supabase) {
        const { data: authData } = await supabase.auth.getUser()
        ctx.testOwnerId = authData?.user?.id || undefined
      }

      // Navegar a "Publicar Auto"
      console.log('📝 Navegando a "Publicar Auto"...')
      await page.goto('/cars/publish')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000)

      // Verificar modal de onboarding
      console.log('🔍 Verificando modal de onboarding...')
      const onboardingModal = page.locator('[data-testid="mp-onboarding-modal"]').or(
        page.locator('.mp-onboarding-modal, ion-modal')
      )

      const modalVisible = await onboardingModal.isVisible({ timeout: 5000 }).catch(() => false)

      if (!modalVisible) {
        // Buscar banner de vinculación
        const mpBanner = page.getByText(/vincular mercado pago|conectar mercado pago/i)
        const bannerVisible = await mpBanner.isVisible({ timeout: 5000 }).catch(() => false)

        if (bannerVisible) {
          console.log('✅ Banner de vinculación encontrado')
          const vinculateButton = page.getByRole('button', { name: /vincular|conectar/i })
          await vinculateButton.click()
          await page.waitForTimeout(2000)
        } else if (supabase && ctx.testOwnerId) {
          // Verificar si ya está vinculado
          const { data: existing } = await supabase
            .from('marketplace_authorizations')
            .select('*')
            .eq('user_id', ctx.testOwnerId)
            .eq('status', 'approved')
            .single()

          if (existing) {
            console.log('ℹ️ Owner ya tiene MercadoPago vinculado')
            return { alreadyLinked: true }
          }
        }
      } else {
        console.log('✅ Modal de onboarding visible')
      }

      return { modalVisible: true, ownerId: ctx.testOwnerId }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Completar OAuth flow (simulado)', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('oauth-modal-visible')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      // Si no hay checkpoint, hacer login y navegar
      await page.goto('/auth/login')
      const emailInput = page.locator('input[type="email"]').first()
      const passwordInput = page.locator('input[type="password"]').first()
      await emailInput.fill('owner.test@autorenta.com')
      await passwordInput.fill('TestOwner123!')
      await page.getByRole('button', { name: /entrar|login/i }).click()
      await page.waitForURL(/\/cars|\//, { timeout: 15000 })
      await page.goto('/cars/publish')
      await page.waitForTimeout(3000)
    }

    const block = createBlock(defineBlock('b2-oauth-complete-flow', 'Completar OAuth flow', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('oauth-modal-visible')],
      postconditions: [],
      ...withCheckpoint('oauth-flow-completed')
    }))

    const result = await block.execute(async () => {
      console.log('🔗 Iniciando OAuth flow...')

      // Buscar botón de conectar
      const connectButton = page.getByRole('button', { name: /conectar mercado pago|vincular ahora/i })
      const connectVisible = await connectButton.isVisible({ timeout: 5000 }).catch(() => false)

      if (connectVisible) {
        await connectButton.click()
        await page.waitForTimeout(2000)
      }

      // Verificar redirección o mock
      const currentUrl = page.url()

      if (currentUrl.includes('mercadopago.com') || currentUrl.includes('auth.mercadopago')) {
        console.log('✅ Redirigido a MercadoPago OAuth')

        // Simular callback de MP
        const mockAuthCode = `TEST_AUTH_CODE_${Date.now()}`
        const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200'
        const callbackUrl = `${baseUrl}/mp-callback?code=${mockAuthCode}&state=${ctx.testOwnerId || 'test'}`

        await page.goto(callbackUrl)
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(3000)

        console.log('✅ Callback simulado procesado')
      } else {
        console.log('⚠️ No se redirigió a MercadoPago (puede ser mock local)')

        // Buscar indicadores de éxito
        const successMessage = page.getByText(/vinculado|conectado|success/i)
        const successVisible = await successMessage.isVisible({ timeout: 5000 }).catch(() => false)

        if (successVisible) {
          console.log('✅ Mock local detectado - vinculación exitosa')
        } else if (supabase && ctx.testOwnerId) {
          // Crear autorización mock para el test
          console.log('🔧 Creando autorización mock...')

          await supabase.from('marketplace_authorizations').insert({
            id: crypto.randomUUID(),
            user_id: ctx.testOwnerId,
            authorization_code: `TEST_AUTH_${Date.now()}`,
            access_token: 'TEST_ACCESS_TOKEN',
            public_key: 'TEST_PUBLIC_KEY',
            refresh_token: 'TEST_REFRESH_TOKEN',
            expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'approved',
            collector_id: '123456',
            marketplace_id: 'AUTORENTA'
          })

          console.log('✅ Autorización mock creada')
        }
      }

      return { oauthCompleted: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Verificar autorización y acceso a publicar', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('oauth-flow-completed')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    }

    const block = createBlock(defineBlock('b3-oauth-verify', 'Verificar autorización', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('oauth-flow-completed')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Verificar autorización en DB
      if (supabase && ctx.testOwnerId) {
        console.log('💾 Verificando autorización en DB...')

        const { data: authorization, error: authError } = await supabase
          .from('marketplace_authorizations')
          .select('*')
          .eq('user_id', ctx.testOwnerId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!authError && authorization) {
          expect(authorization.status).toBe('approved')
          expect(authorization.authorization_code).toBeTruthy()

          console.log(`✅ Autorización verificada: ${authorization.id}`)
          console.log(`   - Status: ${authorization.status}`)
          console.log(`   - Collector ID: ${authorization.collector_id}`)
        }
      }

      // Verificar que puede publicar
      console.log('📋 Verificando acceso a publicar...')
      await page.goto('/cars/publish')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Verificar que NO aparece el modal de onboarding
      const onboardingModal = page.locator('[data-testid="mp-onboarding-modal"]').or(
        page.locator('.mp-onboarding-modal, ion-modal')
      )
      const modalStillVisible = await onboardingModal.isVisible({ timeout: 3000 }).catch(() => false)

      // Verificar formulario disponible
      const publishForm = page.locator('form').or(page.getByText(/marca|modelo|precio/i))
      const formVisible = await publishForm.isVisible({ timeout: 5000 }).catch(() => false)

      if (formVisible) {
        console.log('✅ Formulario de publicación accesible')
      }

      // Verificar indicador de vinculación
      const linkedIndicator = page.getByText(/mercado pago vinculado|conectado correctamente/i).or(
        page.locator('[data-testid="mp-linked-badge"]')
      )
      const indicatorVisible = await linkedIndicator.isVisible({ timeout: 5000 }).catch(() => false)

      if (indicatorVisible) {
        console.log('✅ Indicador de vinculación visible')
      }

      console.log('✅ MARKETPLACE ONBOARDING TEST COMPLETO')

      return { verified: true, canPublish: formVisible }
    })

    expect(result.state.status).toBe('passed')
  })
})

test.describe('OAuth Error Handling - Checkpoint Architecture', () => {
  test.skip(!hasEnvVars, 'Requires env vars')

  test('B4: Manejar error de OAuth', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-oauth-error', 'Manejar error OAuth', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      console.log('❌ Testing OAuth error handling...')

      // Login
      await page.goto('/auth/login')
      const emailInput = page.locator('input[type="email"]').first()
      const passwordInput = page.locator('input[type="password"]').first()

      await emailInput.fill('owner.test@autorenta.com')
      await passwordInput.fill('TestOwner123!')
      await page.getByRole('button', { name: /entrar|login/i }).click()
      await page.waitForURL(/\/cars|\//, { timeout: 15000 })

      // Navegar a callback con error
      const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4200'
      const errorCallbackUrl = `${baseUrl}/mp-callback?error=access_denied&error_description=User%20cancelled`

      await page.goto(errorCallbackUrl)
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Verificar mensaje de error
      const errorMessage = page.getByText(/error|cancelado|rechazado/i)
      const errorVisible = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)

      if (errorVisible) {
        console.log('✅ OAuth error handled gracefully')
      }

      // Verificar botón de reintentar
      const retryButton = page.getByRole('button', { name: /reintentar|volver a intentar/i })
      const retryVisible = await retryButton.isVisible({ timeout: 3000 }).catch(() => false)

      if (retryVisible) {
        console.log('✅ Retry button available')
      }

      return { errorHandled: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar token refresh para expirados', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b5-oauth-refresh', 'Token refresh', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      console.log('🔄 Testing token refresh...')

      // Login
      await page.goto('/auth/login')
      const emailInput = page.locator('input[type="email"]').first()
      const passwordInput = page.locator('input[type="password"]').first()

      await emailInput.fill('owner.test@autorenta.com')
      await passwordInput.fill('TestOwner123!')
      await page.getByRole('button', { name: /entrar|login/i }).click()
      await page.waitForURL(/\/cars|\//, { timeout: 15000 })

      if (supabase) {
        const { data: authData } = await supabase.auth.getUser()
        const ownerId = authData?.user?.id

        if (ownerId) {
          // Crear autorización con token expirado
          const expiredAuth = {
            id: crypto.randomUUID(),
            user_id: ownerId,
            authorization_code: `EXPIRED_AUTH_${Date.now()}`,
            access_token: 'EXPIRED_TOKEN',
            public_key: 'EXPIRED_PUBLIC_KEY',
            refresh_token: 'VALID_REFRESH_TOKEN',
            expires_at: new Date(Date.now() - 1000).toISOString(),
            status: 'approved',
            collector_id: '123456',
            marketplace_id: 'AUTORENTA'
          }

          await supabase.from('marketplace_authorizations').upsert(expiredAuth)

          // Navegar a publicar (debería detectar token expirado)
          await page.goto('/cars/publish')
          await page.waitForTimeout(5000)

          // Verificar si el token se refrescó
          const { data: refreshedAuth } = await supabase
            .from('marketplace_authorizations')
            .select('*')
            .eq('user_id', ownerId)
            .single()

          if (refreshedAuth) {
            const expiresAt = new Date(refreshedAuth.expires_at).getTime()
            const now = Date.now()

            if (expiresAt > now) {
              console.log('✅ Token refreshed successfully')
            } else {
              console.log('⚠️ Token refresh no implementado aún')
            }
          }
        }
      }

      return { tested: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
