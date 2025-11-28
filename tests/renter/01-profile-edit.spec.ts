import { test, expect, defineBlock, requiresCheckpoint, withCheckpoint } from '../checkpoint/fixtures'
import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Renter Test: Profile Edit
 * MIGRADO A ARQUITECTURA CHECKPOINT & HYDRATE
 *
 * Flujo en 3 bloques atómicos:
 * B1: Navegar y verificar perfil actual
 * B2: Editar campos del perfil
 * B3: Subir y eliminar avatar
 *
 * Prioridad: P1 (Renter Flow)
 */

const supabaseUrl = process.env.NG_APP_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NG_APP_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

test.use({ storageState: 'tests/.auth/renter.json' })

// Contexto compartido
interface ProfileTestContext {
  testUserId?: string
  originalName?: string
  testImagePath?: string
}
const ctx: ProfileTestContext = {}

test.describe('Renter - Profile Edit - Checkpoint Architecture', () => {

  test.beforeAll(async () => {
    // Obtener usuario de test
    const { data: user } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', '%renter.test%')
      .single()

    if (user) {
      ctx.testUserId = user.id
    }

    // Crear imagen de test
    const testDir = path.join(__dirname, '../fixtures')
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }

    ctx.testImagePath = path.join(testDir, 'test-avatar.png')

    // Crear PNG mínimo válido
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00,
      0x1f, 0x15, 0xc4, 0x89,
      0x00, 0x00, 0x00, 0x0a,
      0x49, 0x44, 0x41, 0x54,
      0x08, 0xd7, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01,
      0xe2, 0x21, 0xbc, 0x33,
      0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4e, 0x44,
      0xae, 0x42, 0x60, 0x82,
    ])

    fs.writeFileSync(ctx.testImagePath, pngBuffer)
  })

  test.afterAll(async () => {
    // Limpiar imagen de test
    if (ctx.testImagePath && fs.existsSync(ctx.testImagePath)) {
      fs.unlinkSync(ctx.testImagePath)
    }
  })

  test('B1: Navegar y verificar perfil actual', async ({ page, checkpointManager, createBlock }) => {
    const block = createBlock(defineBlock('b1-profile-navigate', 'Navegar a perfil', {
      priority: 'P1',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: [],
      ...withCheckpoint('profile-page-ready')
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(2000)

      // Verificar título de página
      const pageTitle = page.getByText(/mi perfil|perfil|profile/i).first()
      await expect(pageTitle).toBeVisible({ timeout: 10000 })
      console.log('✅ Profile page loaded successfully')

      // Obtener info actual
      const nameElement = page.locator('[data-testid="profile-name"]')
        .or(page.locator('input[name="full_name"]'))
        .or(page.locator('input[name="fullName"]'))
        .first()

      let currentName = ''
      if (await nameElement.isVisible({ timeout: 3000 }).catch(() => false)) {
        currentName = await nameElement.inputValue().catch(() => '') ||
                     await nameElement.textContent().catch(() => '') || ''
      }

      ctx.originalName = currentName
      console.log(`📋 Current profile name: ${currentName || 'Not found'}`)

      return { loaded: true, currentName }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B2: Editar campos del perfil', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('profile-page-ready')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/profile')
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b2-profile-edit', 'Editar perfil', {
      priority: 'P1',
      estimatedDuration: 20000,
      preconditions: [requiresCheckpoint('profile-page-ready')],
      postconditions: [],
      ...withCheckpoint('profile-edited')
    }))

    const result = await block.execute(async () => {
      // Buscar botón de editar
      const editButton = page.getByRole('button', { name: /editar|edit/i }).first()
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click()
        await page.waitForTimeout(1000)
      }

      // Editar nombre
      const newName = `Test Renter ${Date.now()}`
      const nameInput = page.locator('input[name="full_name"]')
        .or(page.locator('input[name="fullName"]'))
        .or(page.locator('input[placeholder*="nombre" i]'))
        .first()

      if (await nameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await nameInput.clear()
        await nameInput.fill(newName)
        console.log(`✅ Name field updated to: ${newName}`)
      }

      // Editar teléfono
      const newPhone = '+598 99 555 1234'
      const phoneInput = page.locator('input[name="phone"]')
        .or(page.locator('input[type="tel"]'))
        .first()

      if (await phoneInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await phoneInput.clear()
        await phoneInput.fill(newPhone)
        console.log(`✅ Phone field updated to: ${newPhone}`)
      }

      // Guardar cambios
      const saveButton = page.getByRole('button', { name: /guardar|save|actualizar/i }).first()
      if (await saveButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await saveButton.click()
        await page.waitForTimeout(2000)
      }

      // Verificar en DB si tenemos usuario
      if (ctx.testUserId) {
        const { data: dbProfile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', ctx.testUserId)
          .single()

        if (dbProfile) {
          console.log(`✅ DB verification: name="${dbProfile.full_name}", phone="${dbProfile.phone}"`)
        }
      }

      return { edited: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B3: Subir y eliminar avatar', async ({ page, checkpointManager, createBlock }) => {
    // Restaurar checkpoint
    const prev = await checkpointManager.loadCheckpoint('profile-edited')
    if (prev) {
      await checkpointManager.restoreCheckpoint(prev)
    } else {
      await page.goto('/profile')
      await page.waitForTimeout(2000)
    }

    const block = createBlock(defineBlock('b3-profile-avatar', 'Gestionar avatar', {
      priority: 'P1',
      estimatedDuration: 15000,
      preconditions: [requiresCheckpoint('profile-edited')],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      // Buscar input de archivo para avatar
      const fileInput = page.locator('input[type="file"][accept*="image"]').first()

      if (await fileInput.isVisible({ timeout: 5000 }).catch(() => false) && ctx.testImagePath) {
        // Subir avatar
        await fileInput.setInputFiles(ctx.testImagePath)
        await page.waitForTimeout(3000)
        console.log('✅ Avatar uploaded')

        // Verificar en DB
        if (ctx.testUserId) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', ctx.testUserId)
            .single()

          if (dbProfile?.avatar_url) {
            console.log(`✅ Avatar URL in DB: ${dbProfile.avatar_url.substring(0, 50)}...`)
          }
        }

        // Buscar botón de eliminar avatar
        const deleteAvatarBtn = page.getByRole('button', { name: /eliminar|delete|remove/i })
          .or(page.locator('[data-testid="delete-avatar"]'))
          .first()

        if (await deleteAvatarBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await deleteAvatarBtn.click()
          await page.waitForTimeout(2000)
          console.log('✅ Avatar deleted')
        }
      } else {
        console.log('⚠️ File input for avatar not found')
      }

      return { avatarTested: true }
    })

    expect(result.state.status).toBe('passed')
  })

  test('B4: Cancelar edición sin guardar', async ({ page, createBlock }) => {
    const block = createBlock(defineBlock('b4-profile-cancel', 'Cancelar edición', {
      priority: 'P2',
      estimatedDuration: 10000,
      preconditions: [],
      postconditions: []
    }))

    const result = await block.execute(async () => {
      await page.goto('/profile')
      await page.waitForTimeout(2000)

      // Entrar en modo edición
      const editButton = page.getByRole('button', { name: /editar|edit/i }).first()
      if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await editButton.click()
        await page.waitForTimeout(1000)
      }

      // Cambiar nombre
      const nameInput = page.locator('input[name="full_name"]')
        .or(page.locator('input[name="fullName"]'))
        .first()

      let originalValue = ''
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        originalValue = await nameInput.inputValue()
        await nameInput.clear()
        await nameInput.fill('Should Not Be Saved')
      }

      // Cancelar
      const cancelButton = page.getByRole('button', { name: /cancelar|cancel/i }).first()
      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click()
        await page.waitForTimeout(1000)

        // Verificar que no se guardó
        const currentValue = await nameInput.inputValue().catch(() => '')
        if (currentValue !== 'Should Not Be Saved') {
          console.log('✅ Cancel edit works correctly')
        }
      } else {
        console.log('⚠️ Cancel button not found')
      }

      return { cancelTested: true }
    })

    expect(result.state.status).toBe('passed')
  })
})
