import { test, expect, defineBlock, withCheckpoint } from '../checkpoint/fixtures'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { createClient } from '@supabase/supabase-js'

/**
 * E2E Test: Admin Car Approvals
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 5 bloques atómicos:
 * B1: Mostrar contador de autos pendientes
 * B2: Listar autos pendientes con botón aprobar
 * B3: Aprobar auto pendiente exitosamente
 * B4: Mostrar mensaje sin pendientes
 * B5: Actualizar estadísticas después de aprobar
 *
 * Priority: P0 (Admin Critical)
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

test.describe('Admin - Car Approvals - Checkpoint Architecture', () => {
  let adminPage: AdminDashboardPage
  let testCarId: string

  test.beforeEach(async ({ page }) => {
    adminPage = new AdminDashboardPage(page)

    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'owner')
      .single()

    if (!ownerProfile) {
      throw new Error('Owner test user not found in database')
    }

    const { data: car, error } = await supabase
      .from('cars')
      .insert({
        owner_id: ownerProfile.id,
        title: `Test Car for Approval ${Date.now()}`,
        description: 'Auto de prueba para aprobación por admin',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2023,
        price_per_day: 5000,
        location_city: 'Montevideo',
        location_state: 'Montevideo',
        location_country: 'UY',
        status: 'pending',
        seats: 5,
        transmission: 'automatic',
        fuel_type: 'gasoline',
      })
      .select()
      .single()

    if (error || !car) {
      throw new Error(`Failed to create test car: ${error?.message}`)
    }

    testCarId = car.id
    console.log(`✅ Created test car with ID: ${testCarId} (status: pending)`)
  })

  test.afterEach(async () => {
    if (testCarId) {
      await supabase.from('cars').delete().eq('id', testCarId)
      console.log(`🧹 Cleaned up test car: ${testCarId}`)
    }
  })

  test('B1: Mostrar contador de autos pendientes', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b1-admin-pending-count', 'Contador pendientes', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('admin-dashboard-loaded')
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const pendingCount = await adminPage.getPendingCarsCount()
      expect(pendingCount).toBeGreaterThan(0)
      console.log(`📊 Pending cars count: ${pendingCount}`)

      return { pendingCount }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Listar autos pendientes con botón aprobar', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b2-admin-pending-list', 'Listar pendientes', {
      priority: 'P0',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const hasPending = await adminPage.hasPendingCars()
      expect(hasPending).toBe(true)

      const visibleCarCount = await adminPage.getVisibleCarCount()
      expect(visibleCarCount).toBeGreaterThan(0)
      console.log(`✅ Found ${visibleCarCount} pending car(s)`)

      return { hasPending, visibleCarCount }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Aprobar auto pendiente exitosamente', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b3-admin-approve-car', 'Aprobar auto', {
      priority: 'P0',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('car-approved')
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const initialStats = await adminPage.getStats()
      const initialPendingCount = await adminPage.getPendingCarsCount()

      console.log(`📊 Initial pending count: ${initialPendingCount}`)
      console.log(`📊 Initial active cars: ${initialStats.activeCars}`)

      await adminPage.approveFirstCar()

      await adminPage.page.waitForTimeout(2000)

      const newPendingCount = await adminPage.getPendingCarsCount()
      expect(newPendingCount).toBe(initialPendingCount - 1)
      console.log(`✅ Pending count decreased to: ${newPendingCount}`)

      const { data: updatedCar } = await supabase
        .from('cars')
        .select('status')
        .eq('id', testCarId)
        .single()

      expect(updatedCar?.status).toBe('active')
      console.log(`✅ Car status changed to 'active' in database`)

      return { initialPendingCount, newPendingCount, carStatusActive: updatedCar?.status === 'active' }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Mostrar mensaje sin pendientes', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b4-admin-no-pending', 'Mensaje sin pendientes', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      let hasPending = await adminPage.hasPendingCars()
      while (hasPending) {
        await adminPage.approveFirstCar()
        await adminPage.page.waitForTimeout(1500)
        hasPending = await adminPage.hasPendingCars()
      }

      const showsNoPending = await adminPage.isNoPendingMessageVisible()
      expect(showsNoPending).toBe(true)
      console.log(`✅ "No pending cars" message displayed`)

      return { showsNoPending }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B5: Actualizar estadísticas después de aprobar', async ({ createBlock }) => {
    const block = createBlock(defineBlock('b5-admin-stats-update', 'Actualizar estadísticas', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await adminPage.goto()
      await adminPage.waitForStatsLoad()

      const initialStats = await adminPage.getStats()

      await adminPage.approveFirstCar()
      await adminPage.page.waitForTimeout(2000)

      const updatedStats = await adminPage.getStats()

      expect(updatedStats.activeCars).toBeGreaterThanOrEqual(initialStats.activeCars)
      console.log(`✅ Active cars: ${initialStats.activeCars} → ${updatedStats.activeCars}`)

      return { initialActiveCars: initialStats.activeCars, updatedActiveCars: updatedStats.activeCars }
    })

    expect(result.state.status).toBe('passed')
  })
})
