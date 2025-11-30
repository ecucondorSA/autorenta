/**
 * TestBlock Types - Unidades atómicas de test con precondiciones y postcondiciones
 * Arquitectura "Checkpoint & Hydrate"
 */

import { Page, BrowserContext } from '@playwright/test'
import { Checkpoint, CreateCheckpointOptions } from './checkpoint.types'

/**
 * Tipo de precondición
 */
export type PreconditionType = 'checkpoint' | 'api' | 'navigation' | 'element' | 'db' | 'custom' | 'mcp'

/**
 * Precondición para un TestBlock
 */
export interface BlockPrecondition {
  /** Tipo de precondición */
  type: PreconditionType

  /** ID de checkpoint requerido (si type === 'checkpoint') */
  checkpointId?: string

  /** Endpoint de API a llamar (si type === 'api') */
  apiEndpoint?: string

  /** Método HTTP */
  apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'

  /** Body de la llamada API */
  apiBody?: Record<string, unknown>

  /** URL a navegar (si type === 'navigation') */
  navigationUrl?: string

  /** Selector de elemento requerido (si type === 'element') */
  elementSelector?: string

  /** Query de DB (si type === 'db') */
  dbQuery?: {
    table: string
    where: Record<string, unknown>
    expectExists: boolean
  }

  /** Acción MCP (si type === 'mcp') */
  mcpAction?: {
    toolName: string
    args: Record<string, unknown>
  }

  /** Función custom de setup */
  customSetup?: (page: Page, context: BrowserContext) => Promise<void>

  /** Descripción para logs */
  description?: string

  /** Timeout en ms */
  timeout?: number
}

/**
 * Tipo de postcondición
 */
export type PostconditionType = 'url' | 'element' | 'db' | 'api' | 'custom' | 'mcp'

/**
 * Postcondición para un TestBlock
 */
export interface BlockPostcondition {
  /** Tipo de postcondición */
  type: PostconditionType

  /** Patrón de URL esperado (si type === 'url') */
  urlPattern?: RegExp

  /** Selector de elemento esperado (si type === 'element') */
  elementSelector?: string

  /** Estado esperado del elemento */
  elementState?: 'visible' | 'hidden' | 'attached' | 'detached'

  /** Query de DB para verificar (si type === 'db') */
  dbQuery?: {
    table: string
    where: Record<string, unknown>
    expected: Record<string, unknown>
  }

  /** Llamada API para verificar (si type === 'api') */
  apiCall?: {
    endpoint: string
    method: 'GET' | 'POST'
    expectedStatus: number
    expectedBody?: Record<string, unknown>
  }

  /** Verificación MCP (si type === 'mcp') */
  mcpCheck?: {
    toolName: string
    args: Record<string, unknown>
    validate: (result: any) => boolean | Promise<boolean>
  }

  /** Función custom de verificación */
  customVerify?: (page: Page) => Promise<boolean>

  /** Descripción para logs */
  description?: string

  /** Timeout en ms */
  timeout?: number
}

/**
 * Prioridad del bloque
 */
export type BlockPriority = 'P0' | 'P1' | 'P2' | 'P3'

/**
 * Definición de un TestBlock
 */
export interface TestBlockDefinition {
  /** ID único del bloque (ej: 'b1-auth-verify') */
  id: string

  /** Nombre descriptivo */
  name: string

  /** Descripción detallada */
  description?: string

  /** Prioridad (P0 = crítico, P3 = edge case) */
  priority: BlockPriority

  /** Duración estimada en ms */
  estimatedDuration: number

  /** Precondiciones requeridas */
  preconditions: BlockPrecondition[]

  /** Postcondiciones a verificar */
  postconditions: BlockPostcondition[]

  /** IDs de bloques de los que depende */
  dependsOn?: string[]

  /** Generar checkpoint al completar */
  generateCheckpoint?: boolean

  /** Opciones del checkpoint a generar */
  checkpointOptions?: CreateCheckpointOptions

  /** Tags para filtrado (ej: ['booking', 'payment', 'critical']) */
  tags?: string[]

  /** Número máximo de reintentos */
  maxRetries?: number

  /** Delay entre reintentos en ms */
  retryDelay?: number
}

/**
 * Estado de ejecución de un bloque
 */
export type BlockStatus = 'pending' | 'running' | 'passed' | 'failed' | 'skipped' | 'retrying'

/**
 * Estado de ejecución de un bloque
 */
export interface BlockExecutionState {
  /** ID del bloque */
  blockId: string

  /** Estado actual */
  status: BlockStatus

  /** Timestamp de inicio */
  startedAt?: string

  /** Timestamp de fin */
  finishedAt?: string

  /** Duración en ms */
  duration?: number

  /** Número de intento actual */
  attempt?: number

  /** Error si falló */
  error?: {
    message: string
    stack?: string
    screenshot?: string
  }

  /** ID del checkpoint generado */
  checkpointId?: string
}

/**
 * Resultado de ejecución de un bloque
 */
export interface BlockExecutionResult {
  /** Estado de ejecución */
  state: BlockExecutionState

  /** Checkpoint generado (si aplica) */
  checkpoint?: Checkpoint

  /** Logs de ejecución */
  logs: string[]

  /** Métricas de rendimiento */
  metrics?: {
    preconditionsDuration: number
    actionDuration: number
    postconditionsDuration: number
    checkpointDuration?: number
  }
}

/**
 * Configuración del runner de bloques
 */
export interface BlockRunnerConfig {
  /** Continuar en caso de fallo de precondición */
  continueOnPreconditionFailure?: boolean

  /** Generar screenshots en fallo */
  screenshotOnFailure?: boolean

  /** Directorio para artifacts */
  artifactsDir?: string

  /** Nivel de logging */
  logLevel?: 'debug' | 'info' | 'warn' | 'error'

  /** Timeout global para precondiciones */
  preconditionTimeout?: number

  /** Timeout global para postcondiciones */
  postconditionTimeout?: number
}

/**
 * Evento emitido durante la ejecución
 */
export interface BlockEvent {
  type: 'block:start' | 'block:end' | 'precondition:check' | 'postcondition:check' | 'checkpoint:create' | 'error'
  blockId: string
  timestamp: string
  data?: Record<string, unknown>
}

/**
 * Handler de eventos de bloque
 */
export type BlockEventHandler = (event: BlockEvent) => void | Promise<void>
