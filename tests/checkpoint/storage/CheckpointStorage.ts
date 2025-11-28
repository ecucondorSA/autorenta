/**
 * CheckpointStorage - Factory que selecciona el adapter apropiado según el entorno
 *
 * Comportamiento:
 * - En CI (process.env.CI === 'true'): usa MemoryAdapter
 * - En local: usa FileAdapter
 * - Configurable via CHECKPOINT_STORAGE env var
 */

import {
  Checkpoint,
  ICheckpointStorage,
  StorageAdapterOptions
} from '../types/checkpoint.types'
import { FileAdapter } from './adapters/FileAdapter'
import { MemoryAdapter } from './adapters/MemoryAdapter'

export type StorageType = 'file' | 'memory' | 'auto'

export interface CheckpointStorageConfig extends StorageAdapterOptions {
  /** Tipo de storage: 'file', 'memory', o 'auto' (default) */
  type?: StorageType

  /** Si true, muestra logs de debug */
  debug?: boolean
}

/**
 * Singleton para el storage de checkpoints
 */
let instance: CheckpointStorage | null = null

export class CheckpointStorage implements ICheckpointStorage {
  private adapter: ICheckpointStorage
  private debug: boolean
  private storageType: StorageType

  constructor(config?: CheckpointStorageConfig) {
    this.debug = config?.debug || process.env.CHECKPOINT_DEBUG === 'true'
    this.storageType = this.resolveStorageType(config?.type)

    if (this.storageType === 'memory') {
      this.adapter = new MemoryAdapter({
        maxCheckpoints: config?.maxCheckpoints
      })
      this.log('Usando MemoryAdapter')
    } else {
      this.adapter = new FileAdapter({
        baseDir: config?.baseDir
      })
      this.log('Usando FileAdapter')
    }
  }

  /**
   * Resuelve el tipo de storage a usar
   */
  private resolveStorageType(type?: StorageType): 'file' | 'memory' {
    // Prioridad 1: Configuración explícita
    if (type && type !== 'auto') {
      return type
    }

    // Prioridad 2: Variable de entorno
    const envType = process.env.CHECKPOINT_STORAGE?.toLowerCase()
    if (envType === 'file' || envType === 'memory') {
      return envType
    }

    // Prioridad 3: Detectar CI
    if (process.env.CI === 'true') {
      return 'memory'
    }

    // Default: file para desarrollo local
    return 'file'
  }

  private log(message: string): void {
    if (this.debug) {
      console.log(`[CheckpointStorage] ${message}`)
    }
  }

  /**
   * Obtiene la instancia singleton del storage
   */
  static getInstance(config?: CheckpointStorageConfig): CheckpointStorage {
    if (!instance) {
      instance = new CheckpointStorage(config)
    }
    return instance
  }

  /**
   * Resetea la instancia singleton (útil para tests)
   */
  static resetInstance(): void {
    instance = null
  }

  /**
   * Obtiene el tipo de storage actual
   */
  getStorageType(): StorageType {
    return this.storageType
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    this.log(`Guardando checkpoint: ${checkpoint.name}`)
    return this.adapter.save(checkpoint)
  }

  async load(name: string, testName?: string): Promise<Checkpoint | null> {
    this.log(`Cargando checkpoint: ${name}`)
    return this.adapter.load(name, testName)
  }

  async loadById(id: string): Promise<Checkpoint | null> {
    this.log(`Cargando checkpoint por ID: ${id}`)
    return this.adapter.loadById(id)
  }

  async list(testName?: string): Promise<Checkpoint[]> {
    this.log(`Listando checkpoints${testName ? ` para: ${testName}` : ''}`)
    return this.adapter.list(testName)
  }

  async delete(id: string): Promise<void> {
    this.log(`Eliminando checkpoint: ${id}`)
    return this.adapter.delete(id)
  }

  async cleanup(): Promise<number> {
    this.log('Limpiando checkpoints expirados')
    return this.adapter.cleanup()
  }

  async clear(): Promise<void> {
    this.log('Limpiando todos los checkpoints')
    return this.adapter.clear()
  }

  /**
   * Verifica si un checkpoint existe y no está expirado
   */
  async exists(name: string, testName?: string): Promise<boolean> {
    const checkpoint = await this.load(name, testName)
    return checkpoint !== null
  }

  /**
   * Carga un checkpoint o lanza error si no existe
   */
  async loadOrFail(name: string, testName?: string): Promise<Checkpoint> {
    const checkpoint = await this.load(name, testName)
    if (!checkpoint) {
      throw new Error(`Checkpoint no encontrado: ${name}${testName ? ` (test: ${testName})` : ''}`)
    }
    return checkpoint
  }
}

// Export singleton factory
export const getCheckpointStorage = (config?: CheckpointStorageConfig): CheckpointStorage => {
  return CheckpointStorage.getInstance(config)
}

// Re-export adapters
export { FileAdapter } from './adapters/FileAdapter'
export { MemoryAdapter } from './adapters/MemoryAdapter'
