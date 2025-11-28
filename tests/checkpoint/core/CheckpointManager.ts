/**
 * CheckpointManager - Clase principal para gestión de checkpoints E2E
 *
 * Responsabilidades:
 * - Capturar estado completo del navegador y DB
 * - Crear y guardar checkpoints
 * - Restaurar checkpoints (hidratación)
 * - Tracking de entidades creadas para cleanup
 */

import { Page, BrowserContext } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import {
  Checkpoint,
  BrowserState,
  DatabaseState,
  CreatedEntities,
  CreateCheckpointOptions,
  RestoreCheckpointOptions,
  HydrationResult
} from '../types/checkpoint.types'
import { CheckpointStorage, getCheckpointStorage } from '../storage/CheckpointStorage'

const CHECKPOINT_VERSION = '1.0.0'
const DEFAULT_TTL_MS = 60 * 60 * 1000 // 1 hora

export interface CheckpointManagerConfig {
  /** Page de Playwright */
  page: Page

  /** Contexto del navegador */
  context: BrowserContext

  /** Nombre del test actual */
  testName: string

  /** URL de Supabase */
  supabaseUrl?: string

  /** Key de Supabase (preferiblemente service role para tests) */
  supabaseKey?: string

  /** TTL por defecto para checkpoints */
  defaultTtlMs?: number

  /** Storage a usar (si no se especifica, usa el singleton) */
  storage?: CheckpointStorage
}

export class CheckpointManager {
  private page: Page
  private context: BrowserContext
  private testName: string
  private supabase: SupabaseClient | null = null
  private storage: CheckpointStorage
  private defaultTtlMs: number
  private blockCounter: number = 0
  private createdEntities: CreatedEntities = {
    users: [],
    cars: [],
    bookings: [],
    walletTransactions: [],
    inspections: [],
    messages: []
  }

  constructor(config: CheckpointManagerConfig) {
    this.page = config.page
    this.context = config.context
    this.testName = config.testName
    this.defaultTtlMs = config.defaultTtlMs || DEFAULT_TTL_MS
    this.storage = config.storage || getCheckpointStorage()

    // Inicializar Supabase si hay credenciales
    const supabaseUrl = config.supabaseUrl || process.env.NG_APP_SUPABASE_URL
    const supabaseKey = config.supabaseKey ||
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NG_APP_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey)
    } else {
      console.warn('[CheckpointManager] No Supabase credentials - DB features disabled')
    }
  }

  /**
   * Captura el estado actual del navegador
   */
  private async captureBrowserState(): Promise<BrowserState> {
    const storageState = await this.context.storageState()
    const currentUrl = this.page.url()
    const viewport = this.page.viewportSize() || { width: 1280, height: 720 }

    // Transformar localStorage de storageState format
    const localStorage: Record<string, Record<string, string>> = {}
    for (const origin of storageState.origins || []) {
      localStorage[origin.origin] = {}
      for (const item of origin.localStorage || []) {
        localStorage[origin.origin][item.name] = item.value
      }
    }

    // Capturar sessionStorage via page.evaluate
    const sessionStorageData: Record<string, Record<string, string>> = {}
    try {
      const currentOrigin = new URL(currentUrl).origin
      const ssData = await this.page.evaluate(() => {
        const data: Record<string, string> = {}
        const storage = window.sessionStorage
        for (let i = 0; i < storage.length; i++) {
          const key = storage.key(i)
          if (key) {
            data[key] = storage.getItem(key) || ''
          }
        }
        return data
      })
      sessionStorageData[currentOrigin] = ssData
    } catch {
      // Ignorar errores de sessionStorage
    }

    return {
      cookies: storageState.cookies || [],
      localStorage,
      sessionStorage: sessionStorageData,
      currentUrl,
      viewport
    }
  }

  /**
   * Obtiene el userId del usuario autenticado desde localStorage
   */
  private async getUserIdFromStorage(): Promise<string | null> {
    try {
      const userId = await this.page.evaluate(() => {
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (key.includes('supabase') && key.includes('auth')) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}')
              return data.user?.id || null
            } catch {
              return null
            }
          }
        }
        return null
      })
      return userId
    } catch {
      return null
    }
  }

  /**
   * Obtiene el email del usuario autenticado
   */
  private async getUserEmailFromStorage(): Promise<string | null> {
    try {
      const email = await this.page.evaluate(() => {
        const keys = Object.keys(localStorage)
        for (const key of keys) {
          if (key.includes('supabase') && key.includes('auth')) {
            try {
              const data = JSON.parse(localStorage.getItem(key) || '{}')
              return data.user?.email || null
            } catch {
              return null
            }
          }
        }
        return null
      })
      return email
    } catch {
      return null
    }
  }

  /**
   * Captura el estado de la base de datos
   */
  private async captureDatabaseState(userId: string): Promise<DatabaseState> {
    const email = await this.getUserEmailFromStorage()

    // Determinar rol
    let userRole: DatabaseState['userRole'] = 'locatario'
    if (this.supabase) {
      try {
        const { data: profile } = await this.supabase
          .from('profiles')
          .select('user_type')
          .eq('id', userId)
          .single()

        if (profile?.user_type) {
          userRole = profile.user_type as DatabaseState['userRole']
        }
      } catch {
        // Ignorar errores
      }
    }

    // Capturar estado de wallet
    let walletState: DatabaseState['walletState'] | undefined
    if (this.supabase) {
      try {
        const { data: wallet } = await this.supabase.rpc('wallet_get_balance', {
          p_user_id: userId
        })

        if (wallet) {
          walletState = {
            userId,
            balanceCents: wallet.balance_cents || 0,
            availableBalanceCents: wallet.available_balance_cents || 0,
            lockedBalanceCents: wallet.locked_balance_cents || 0
          }
        }
      } catch {
        // Wallet puede no existir
      }
    }

    return {
      userId,
      userEmail: email || '',
      userRole,
      createdEntities: { ...this.createdEntities },
      walletState
    }
  }

  /**
   * Crea un nuevo checkpoint
   */
  async createCheckpoint(options: CreateCheckpointOptions): Promise<Checkpoint> {
    this.blockCounter++

    const userId = await this.getUserIdFromStorage()
    if (!userId) {
      throw new Error('[CheckpointManager] No se pudo obtener userId. ¿Usuario no autenticado?')
    }

    console.log(`[CheckpointManager] Creando checkpoint: ${options.name}`)

    const browserState = await this.captureBrowserState()
    const databaseState = await this.captureDatabaseState(userId)

    const checkpoint: Checkpoint = {
      id: uuidv4(),
      name: options.name,
      testName: this.testName,
      blockNumber: this.blockCounter,
      createdAt: new Date().toISOString(),
      codeVersion: CHECKPOINT_VERSION,
      ttlMs: options.ttlMs || this.defaultTtlMs,
      browserState,
      databaseState,
      metadata: options.metadata || {}
    }

    // Capturar estado de formulario si se solicita
    if (options.captureFormState && options.formSelectors?.length) {
      checkpoint.formState = await this.captureFormState(options.formSelectors)
    }

    await this.storage.save(checkpoint)
    console.log(`[CheckpointManager] Checkpoint "${options.name}" creado (block #${this.blockCounter})`)

    return checkpoint
  }

  /**
   * Captura el estado de un formulario
   */
  private async captureFormState(selectors: string[]): Promise<Checkpoint['formState']> {
    const fields: Record<string, string | number | boolean> = {}
    const errors: Record<string, string> = {}
    const validatedFields: string[] = []

    for (const selector of selectors) {
      try {
        const element = this.page.locator(selector)
        const tagName = await element.evaluate(el => el.tagName.toLowerCase())
        const inputType = await element.getAttribute('type')

        if (tagName === 'input') {
          if (inputType === 'checkbox') {
            fields[selector] = await element.isChecked()
          } else if (inputType === 'radio') {
            fields[selector] = await element.isChecked()
          } else {
            fields[selector] = await element.inputValue()
          }
        } else if (tagName === 'select') {
          fields[selector] = await element.inputValue()
        } else if (tagName === 'textarea') {
          fields[selector] = await element.inputValue()
        }

        // Verificar si tiene clase de validación
        const classList = await element.evaluate(el => Array.from(el.classList))
        if (classList.includes('ng-valid')) {
          validatedFields.push(selector)
        }
        if (classList.includes('ng-invalid')) {
          // Intentar obtener mensaje de error
          const errorEl = await this.page.locator(`${selector} ~ .error, ${selector} ~ .validation-error`).first()
          if (await errorEl.isVisible().catch(() => false)) {
            errors[selector] = await errorEl.textContent() || 'Invalid'
          }
        }
      } catch {
        // Ignorar campos que no se pueden leer
      }
    }

    return {
      pageUrl: this.page.url(),
      fields,
      validatedFields,
      errors
    }
  }

  /**
   * Carga un checkpoint por nombre
   */
  async loadCheckpoint(name: string): Promise<Checkpoint | null> {
    return this.storage.load(name, this.testName)
  }

  /**
   * Restaura un checkpoint (hidratación)
   */
  async restoreCheckpoint(
    checkpoint: Checkpoint | string,
    options: RestoreCheckpointOptions = {}
  ): Promise<HydrationResult> {
    const startTime = Date.now()
    const warnings: string[] = []

    // Si es string, cargar el checkpoint
    let cp: Checkpoint
    if (typeof checkpoint === 'string') {
      const loaded = await this.loadCheckpoint(checkpoint)
      if (!loaded) {
        return {
          success: false,
          checkpoint: {} as Checkpoint,
          restoredAt: new Date().toISOString(),
          duration: Date.now() - startTime,
          warnings: [],
          error: `Checkpoint no encontrado: ${checkpoint}`
        }
      }
      cp = loaded
    } else {
      cp = checkpoint
    }

    console.log(`[CheckpointManager] Restaurando checkpoint: ${cp.name}`)

    try {
      // 1. Hook beforeNavigate
      if (options.beforeNavigate) {
        await options.beforeNavigate()
      }

      // 2. Restaurar cookies
      if (cp.browserState.cookies.length > 0) {
        await this.context.addCookies(cp.browserState.cookies)
      }

      // 3. Navegar a URL guardada
      await this.page.goto(cp.browserState.currentUrl, {
        waitUntil: 'domcontentloaded'
      })

      // 4. Restaurar localStorage
      for (const [origin, items] of Object.entries(cp.browserState.localStorage)) {
        for (const [key, value] of Object.entries(items)) {
          await this.page.evaluate(
            ([k, v]) => localStorage.setItem(k, v),
            [key, value]
          )
        }
      }

      // 5. Restaurar sessionStorage
      for (const [origin, items] of Object.entries(cp.browserState.sessionStorage)) {
        for (const [key, value] of Object.entries(items)) {
          await this.page.evaluate(
            ([k, v]) => sessionStorage.setItem(k, v),
            [key, value]
          )
        }
      }

      // 6. Reload para aplicar cambios
      await this.page.reload({ waitUntil: 'networkidle' })

      // 7. Restaurar estado interno
      this.createdEntities = { ...cp.databaseState.createdEntities }
      this.blockCounter = cp.blockNumber

      // 8. Validar estado DB si se solicita
      if (options.validateDbState && this.supabase) {
        const userId = await this.getUserIdFromStorage()
        if (userId !== cp.databaseState.userId) {
          warnings.push(`UserId mismatch: expected ${cp.databaseState.userId}, got ${userId}`)
        }
      }

      // 9. Hook afterHydrate
      if (options.afterHydrate) {
        await options.afterHydrate()
      }

      console.log(`[CheckpointManager] Checkpoint restaurado en ${Date.now() - startTime}ms`)

      return {
        success: true,
        checkpoint: cp,
        restoredAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        warnings
      }
    } catch (error) {
      return {
        success: false,
        checkpoint: cp,
        restoredAt: new Date().toISOString(),
        duration: Date.now() - startTime,
        warnings,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Registra una entidad creada durante el test (para cleanup)
   */
  trackEntity(type: keyof CreatedEntities, id: string): void {
    if (!this.createdEntities[type].includes(id)) {
      this.createdEntities[type].push(id)
    }
  }

  /**
   * Limpia todas las entidades creadas durante el test
   */
  async cleanup(): Promise<void> {
    if (!this.supabase) {
      console.log('[CheckpointManager] No Supabase - skipping cleanup')
      return
    }

    console.log('[CheckpointManager] Iniciando cleanup de entidades')

    // Orden inverso de dependencias
    for (const id of this.createdEntities.messages) {
      try {
        await this.supabase.from('messages').delete().eq('id', id)
      } catch { /* ignore */ }
    }

    for (const id of this.createdEntities.inspections) {
      try {
        await this.supabase.from('booking_inspections').delete().eq('id', id)
      } catch { /* ignore */ }
    }

    for (const id of this.createdEntities.walletTransactions) {
      try {
        await this.supabase.from('wallet_transactions').delete().eq('id', id)
      } catch { /* ignore */ }
    }

    for (const id of this.createdEntities.bookings) {
      try {
        await this.supabase.from('bookings').delete().eq('id', id)
      } catch { /* ignore */ }
    }

    for (const id of this.createdEntities.cars) {
      try {
        await this.supabase.from('cars').delete().eq('id', id)
      } catch { /* ignore */ }
    }

    // Reset estado
    this.createdEntities = {
      users: [],
      cars: [],
      bookings: [],
      walletTransactions: [],
      inspections: [],
      messages: []
    }
    this.blockCounter = 0

    console.log('[CheckpointManager] Cleanup completado')
  }

  /**
   * Obtiene las entidades creadas
   */
  getCreatedEntities(): CreatedEntities {
    return { ...this.createdEntities }
  }

  /**
   * Obtiene el número de bloque actual
   */
  getBlockNumber(): number {
    return this.blockCounter
  }

  /**
   * Obtiene el cliente Supabase (para validaciones custom)
   */
  getSupabaseClient(): SupabaseClient | null {
    return this.supabase
  }
}

/**
 * Factory function para crear CheckpointManager
 */
export function createCheckpointManager(config: CheckpointManagerConfig): CheckpointManager {
  return new CheckpointManager(config)
}
