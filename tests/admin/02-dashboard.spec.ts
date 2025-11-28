import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: Admin Dashboard Metrics
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 7 bloques atómicos:
 * B1: Mostrar todas las estadísticas
 * B2: Verificar conteo de perfiles
 * B3: Verificar conteo de autos
 * B4: Verificar conteo de reservas
 * B5: Verificar conteo de fotos
 * B6: Cargar dashboard sin errores
 * B7: Mostrar título de página
 *
 * Priority: P0 (Admin Critical)
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

test.describe('Admin - Dashboard Metrics - Checkpoint Architecture', () => {
  let adminPage: AdminDashboardPage

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminDashboardPage(page)
  })

  test('B1: Mostrar todas las estadísticas', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b1-admin-all-stats', 'Todas las estadísticas', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('admin-stats-loaded')
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const stats = await adminPage.getStats()

      expect(stats.totalProfiles).toBeGreaterThanOrEqual(0)
      expect(stats.totalCars).toBeGreaterThanOrEqual(0)
      expect(stats.totalPhotos).toBeGreaterThanOrEqual(0)
      expect(stats.totalBookings).toBeGreaterThanOrEqual(0)

      console.log('📊 Dashboard Statistics:')
      console.log(`  - Total Profiles: ${stats.totalProfiles}`)
      console.log(`  - Total Cars: ${stats.totalCars}`)
      console.log(`  - Total Photos: ${stats.totalPhotos}`)
      console.log(`  - Total Bookings: ${stats.totalBookings}`)

      return stats
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Verificar conteo de perfiles', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b2-admin-profiles-count', 'Conteo perfiles', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const dashboardStats = await adminPage.getStats()

      const { count: dbCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      expect(dashboardStats.totalProfiles).toBe(dbCount || 0)
      console.log(`✅ Profiles count matches: Dashboard=${dashboardStats.totalProfiles}, DB=${dbCount}`)

      return { dashboardCount: dashboardStats.totalProfiles, dbCount }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Verificar conteo de autos', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b3-admin-cars-count', 'Conteo autos', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const dashboardStats = await adminPage.getStats()

      const { count: totalCars } = await supabase
        .from('cars')
        .select('*', { count: 'exact', head: true })

      const { count: activeCars } = await supabase
        .from('cars')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      expect(dashboardStats.totalCars).toBe(totalCars || 0)
      console.log(`✅ Total cars count matches: Dashboard=${dashboardStats.totalCars}, DB=${totalCars}`)
      console.log(`   Active cars: ${dashboardStats.activeCars} (DB: ${activeCars})`)

      return { dashboardTotal: dashboardStats.totalCars, dbTotal: totalCars, dbActive: activeCars }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Verificar conteo de reservas', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b4-admin-bookings-count', 'Conteo reservas', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const dashboardStats = await adminPage.getStats()

      const { count: dbCount } = await supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })

      expect(dashboardStats.totalBookings).toBe(dbCount || 0)
      console.log(`✅ Bookings count matches: Dashboard=${dashboardStats.totalBookings}, DB=${dbCount}`)

      return { dashboardCount: dashboardStats.totalBookings, dbCount }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Verificar conteo de fotos', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b5-admin-photos-count', 'Conteo fotos', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const dashboardStats = await adminPage.getStats()

      const { count: dbCount } = await supabase
        .from('car_photos')
        .select('*', { count: 'exact', head: true })

      expect(dashboardStats.totalPhotos).toBe(dbCount || 0)
      console.log(`✅ Photos count matches: Dashboard=${dashboardStats.totalPhotos}, DB=${dbCount}`)

      return { dashboardCount: dashboardStats.totalPhotos, dbCount }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B6: Cargar dashboard sin errores', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b6-admin-no-errors', 'Sin errores', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      const errors: string[] = []

      adminPage.page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text())
        }
      })

      adminPage.page.on('pageerror', (error) => {
        errors.push(error.message)
      })

      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const criticalErrors = errors.filter((err) =>
        err.toLowerCase().includes('error') && !err.includes('favicon')
      )

      expect(criticalErrors.length).toBe(0)
      if (criticalErrors.length > 0) {
        console.error('❌ Dashboard errors:', criticalErrors)
      } else {
        console.log('✅ Dashboard loaded without errors')
      }

      return { criticalErrorCount: criticalErrors.length }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B7: Mostrar título de página', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b7-admin-page-title', 'Título página', {
      priority: 'P1',
      estimatedDuration: 5000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()

      const title = await adminPage.page.locator('h1').first().textContent()
      expect(title).toContain('Panel de Administración')
      console.log(`✅ Page title: "${title}"`)

      return { title }
    })

    expect(result.state.status).toBe('passed')
  })
})
