/**
 * TestBlock - Clase para ejecutar bloques atómicos de test con pre/post condiciones
 *
 * Cada TestBlock:
 * - Verifica precondiciones antes de ejecutar
 * - Ejecuta la acción principal
 * - Verifica postcondiciones después de ejecutar
 * - Opcionalmente genera un checkpoint al completar
 */

import { Page, BrowserContext, expect } from '@playwright/test'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CheckpointManager } from './CheckpointManager'
import { Checkpoint } from '../types/checkpoint.types'
import {
  TestBlockDefinition,
  BlockExecutionState,
  BlockExecutionResult,
  BlockPrecondition,
  BlockPostcondition,
  BlockRunnerConfig,
  BlockEvent,
  BlockEventHandler
} from '../types/test-block.types'

const DEFAULT_TIMEOUT = 10000

export class TestBlock {
  private definition: TestBlockDefinition
  private checkpointManager: CheckpointManager
  private page: Page
  private context: BrowserContext
  private supabase: SupabaseClient | null = null
  private config: BlockRunnerConfig
  private executionState: BlockExecutionState
  private logs: string[] = []
  private eventHandlers: BlockEventHandler[] = []

  constructor(
    definition: TestBlockDefinition,
    checkpointManager: CheckpointManager,
    page: Page,
    context: BrowserContext,
    config?: BlockRunnerConfig
  ) {
    this.definition = definition
    this.checkpointManager = checkpointManager
    this.page = page
    this.context = context
    this.config = config || {}

    this.executionState = {
      blockId: definition.id,
      status: 'pending'
    }

    // Obtener cliente Supabase del CheckpointManager
    this.supabase = checkpointManager.getSupabaseClient()
  }

  /**
   * Agrega un handler de eventos
   */
  onEvent(handler: BlockEventHandler): void {
    this.eventHandlers.push(handler)
  }

  /**
   * Emite un evento
   */
  private async emit(event: Omit<BlockEvent, 'blockId' | 'timestamp'>): Promise<void> {
    const fullEvent: BlockEvent = {
      ...event,
      blockId: this.definition.id,
      timestamp: new Date().toISOString()
    }

    for (const handler of this.eventHandlers) {
      await handler(fullEvent)
    }
  }

  /**
   * Agrega un log
   */
  private log(message: string): void {
    const entry = `[${this.definition.id}] ${message}`
    this.logs.push(entry)

    if (this.config.logLevel !== 'error') {
      console.log(entry)
    }
  }

  /**
   * Ejecuta el bloque
   */
  async execute(action: () => Promise<void>): Promise<BlockExecutionResult> {
    const startTime = Date.now()
    let preconditionsDuration = 0
    let actionDuration = 0
    let postconditionsDuration = 0
    let checkpointDuration = 0

    this.executionState.status = 'running'
    this.executionState.startedAt = new Date().toISOString()
    this.executionState.attempt = (this.executionState.attempt || 0) + 1

    await this.emit({ type: 'block:start' })

    try {
      // 1. Verificar precondiciones
      const precondStart = Date.now()
      this.log('Verificando precondiciones...')
      await this.emit({ type: 'precondition:check' })

      const precondResult = await this.verifyPreconditions()
      preconditionsDuration = Date.now() - precondStart

      if (!precondResult.success) {
        if (!this.config.continueOnPreconditionFailure) {
          throw new Error(`Precondición fallida: ${precondResult.failedCondition}`)
        }
        this.log(`WARN: Precondición fallida pero continuando: ${precondResult.failedCondition}`)
      }

      this.log(`Precondiciones OK (${preconditionsDuration}ms)`)

      // 2. Ejecutar acción principal
      const actionStart = Date.now()
      this.log('Ejecutando acción principal...')

      await action()
      actionDuration = Date.now() - actionStart

      this.log(`Acción completada (${actionDuration}ms)`)

      // 3. Verificar postcondiciones
      const postcondStart = Date.now()
      this.log('Verificando postcondiciones...')
      await this.emit({ type: 'postcondition:check' })

      const postcondResult = await this.verifyPostconditions()
      postconditionsDuration = Date.now() - postcondStart

      if (!postcondResult.success) {
        throw new Error(`Postcondición fallida: ${postcondResult.failedCondition}`)
      }

      this.log(`Postcondiciones OK (${postconditionsDuration}ms)`)

      // 4. Generar checkpoint si se requiere
      let checkpoint: Checkpoint | undefined
      if (this.definition.generateCheckpoint) {
        const cpStart = Date.now()
        this.log('Generando checkpoint...')
        await this.emit({ type: 'checkpoint:create' })

        checkpoint = await this.checkpointManager.createCheckpoint({
          name: this.definition.checkpointOptions?.name || `${this.definition.id}-completed`,
          ...this.definition.checkpointOptions
        })

        checkpointDuration = Date.now() - cpStart
        this.executionState.checkpointId = checkpoint.id
        this.log(`Checkpoint creado: ${checkpoint.name} (${checkpointDuration}ms)`)
      }

      // 5. Marcar como exitoso
      this.executionState.status = 'passed'
      this.executionState.finishedAt = new Date().toISOString()
      this.executionState.duration = Date.now() - startTime

      await this.emit({ type: 'block:end', data: { status: 'passed' } })

      return {
        state: { ...this.executionState },
        checkpoint,
        logs: [...this.logs],
        metrics: {
          preconditionsDuration,
          actionDuration,
          postconditionsDuration,
          checkpointDuration: checkpointDuration || undefined
        }
      }
    } catch (error) {
      // Capturar screenshot si está configurado
      let screenshotPath: string | undefined
      if (this.config.screenshotOnFailure) {
        try {
          const filename = `${this.definition.id}-failure-${Date.now()}.png`
          const dir = this.config.artifactsDir || 'test-results'
          screenshotPath = `${dir}/${filename}`
          await this.page.screenshot({ path: screenshotPath, fullPage: true })
          this.log(`Screenshot guardado: ${screenshotPath}`)
        } catch {
          // Ignorar errores de screenshot
        }
      }

      this.executionState.status = 'failed'
      this.executionState.finishedAt = new Date().toISOString()
      this.executionState.duration = Date.now() - startTime
      this.executionState.error = {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        screenshot: screenshotPath
      }

      await this.emit({ type: 'error', data: { error: this.executionState.error } })
      await this.emit({ type: 'block:end', data: { status: 'failed' } })

      return {
        state: { ...this.executionState },
        logs: [...this.logs],
        metrics: {
          preconditionsDuration,
          actionDuration,
          postconditionsDuration
        }
      }
    }
  }

  /**
   * Verifica todas las precondiciones
   */
  private async verifyPreconditions(): Promise<{ success: boolean; failedCondition?: string }> {
    for (const precond of this.definition.preconditions) {
      const timeout = precond.timeout || this.config.preconditionTimeout || DEFAULT_TIMEOUT

      try {
        switch (precond.type) {
          case 'checkpoint':
            if (precond.checkpointId) {
              const cp = await this.checkpointManager.loadCheckpoint(precond.checkpointId)
              if (!cp) {
                return { success: false, failedCondition: `Checkpoint ${precond.checkpointId} no encontrado` }
              }
            }
            break

          case 'navigation':
            if (precond.navigationUrl) {
              if (!this.page.url().includes(precond.navigationUrl)) {
                return { success: false, failedCondition: `URL debe contener ${precond.navigationUrl}` }
              }
            }
            break

          case 'element':
            if (precond.elementSelector) {
              const element = this.page.locator(precond.elementSelector)
              await expect(element).toBeVisible({ timeout })
            }
            break

          case 'api':
            if (precond.apiEndpoint) {
              const method = precond.apiMethod || 'GET'
              const response = await this.page.request[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](
                precond.apiEndpoint,
                precond.apiBody ? { data: precond.apiBody } : undefined
              )
              if (!response.ok()) {
                return { success: false, failedCondition: `API ${method} ${precond.apiEndpoint} falló` }
              }
            }
            break

          case 'db':
            if (precond.dbQuery && this.supabase) {
              const { data } = await this.supabase
                .from(precond.dbQuery.table)
                .select('*')
                .match(precond.dbQuery.where)
                .limit(1)

              const exists = data && data.length > 0
              if (exists !== precond.dbQuery.expectExists) {
                return {
                  success: false,
                  failedCondition: `DB ${precond.dbQuery.table} ${precond.dbQuery.expectExists ? 'debe' : 'no debe'} existir`
                }
              }
            }
            break

          case 'custom':
            if (precond.customSetup) {
              await precond.customSetup(this.page, this.context)
            }
            break
        }
      } catch (error) {
        return {
          success: false,
          failedCondition: precond.description || `${precond.type}: ${error instanceof Error ? error.message : String(error)}`
        }
      }
    }

    return { success: true }
  }

  /**
   * Verifica todas las postcondiciones
   */
  private async verifyPostconditions(): Promise<{ success: boolean; failedCondition?: string }> {
    for (const postcond of this.definition.postconditions) {
      const timeout = postcond.timeout || this.config.postconditionTimeout || DEFAULT_TIMEOUT

      try {
        switch (postcond.type) {
          case 'url':
            if (postcond.urlPattern) {
              if (!postcond.urlPattern.test(this.page.url())) {
                return { success: false, failedCondition: `URL no coincide: ${postcond.urlPattern}` }
              }
            }
            break

          case 'element':
            if (postcond.elementSelector) {
              const element = this.page.locator(postcond.elementSelector)
              const state = postcond.elementState || 'visible'

              switch (state) {
                case 'visible':
                  await expect(element).toBeVisible({ timeout })
                  break
                case 'hidden':
                  await expect(element).toBeHidden({ timeout })
                  break
                case 'attached':
                  await expect(element).toBeAttached({ timeout })
                  break
                case 'detached':
                  await expect(element).not.toBeAttached({ timeout })
                  break
              }
            }
            break

          case 'db':
            if (postcond.dbQuery && this.supabase) {
              const { data } = await this.supabase
                .from(postcond.dbQuery.table)
                .select('*')
                .match(postcond.dbQuery.where)
                .single()

              if (!data) {
                return { success: false, failedCondition: `Registro no encontrado en ${postcond.dbQuery.table}` }
              }

              // Verificar campos esperados
              for (const [key, value] of Object.entries(postcond.dbQuery.expected)) {
                if (data[key] !== value) {
                  return {
                    success: false,
                    failedCondition: `${key}: esperado ${value}, obtenido ${data[key]}`
                  }
                }
              }
            }
            break

          case 'api':
            if (postcond.apiCall) {
              const method = postcond.apiCall.method || 'GET'
              const response = await this.page.request[method.toLowerCase() as 'get' | 'post'](
                postcond.apiCall.endpoint
              )

              if (response.status() !== postcond.apiCall.expectedStatus) {
                return {
                  success: false,
                  failedCondition: `API status: esperado ${postcond.apiCall.expectedStatus}, obtenido ${response.status()}`
                }
              }

              if (postcond.apiCall.expectedBody) {
                const body = await response.json()
                for (const [key, value] of Object.entries(postcond.apiCall.expectedBody)) {
                  if (body[key] !== value) {
                    return {
                      success: false,
                      failedCondition: `API body.${key}: esperado ${value}, obtenido ${body[key]}`
                    }
                  }
                }
              }
            }
            break

          case 'custom':
            if (postcond.customVerify) {
              const result = await postcond.customVerify(this.page)
              if (!result) {
                return { success: false, failedCondition: postcond.description || 'Custom verification failed' }
              }
            }
            break
        }
      } catch (error) {
        return {
          success: false,
          failedCondition: postcond.description || `${postcond.type}: ${error instanceof Error ? error.message : String(error)}`
        }
      }
    }

    return { success: true }
  }

  /**
   * Obtiene el estado de ejecución actual
   */
  getState(): BlockExecutionState {
    return { ...this.executionState }
  }

  /**
   * Obtiene la definición del bloque
   */
  getDefinition(): TestBlockDefinition {
    return this.definition
  }
}

/**
 * Factory function para crear TestBlock
 */
export function createTestBlock(
  definition: TestBlockDefinition,
  checkpointManager: CheckpointManager,
  page: Page,
  context: BrowserContext,
  config?: BlockRunnerConfig
): TestBlock {
  return new TestBlock(definition, checkpointManager, page, context, config)
}
