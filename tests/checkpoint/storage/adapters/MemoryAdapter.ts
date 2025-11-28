/**
 * MemoryAdapter - Almacena checkpoints en memoria
 * Útil para CI donde no queremos persistir entre ejecuciones
 */

import {
  Checkpoint,
  ICheckpointStorage,
  StorageAdapterOptions
} from '../../types/checkpoint.types'

const DEFAULT_MAX_CHECKPOINTS = 100

export class MemoryAdapter implements ICheckpointStorage {
  private checkpoints: Map<string, Checkpoint> = new Map()
  private maxCheckpoints: number

  constructor(options?: StorageAdapterOptions) {
    this.maxCheckpoints = options?.maxCheckpoints || DEFAULT_MAX_CHECKPOINTS
  }

  /**
   * Genera una clave única para el checkpoint
   */
  private getKey(name: string, testName?: string): string {
    if (testName) {
      return `${testName}::${name}`
    }
    return name
  }

  /**
   * Evita que excedamos el límite de checkpoints
   */
  private enforceLimit(): void {
    if (this.checkpoints.size >= this.maxCheckpoints) {
      // Eliminar el checkpoint más antiguo
      let oldest: { key: string; time: number } | null = null

      for (const [key, cp] of Array.from(this.checkpoints.entries())) {
        const time = new Date(cp.createdAt).getTime()
        if (!oldest || time < oldest.time) {
          oldest = { key, time }
        }
      }

      if (oldest) {
        this.checkpoints.delete(oldest.key)
        console.log(`[MemoryAdapter] Eliminado checkpoint más antiguo para hacer espacio`)
      }
    }
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    this.enforceLimit()

    const key = this.getKey(checkpoint.name, checkpoint.testName)
    this.checkpoints.set(key, checkpoint)

    // También guardar por ID para búsquedas rápidas
    this.checkpoints.set(`id::${checkpoint.id}`, checkpoint)

    console.log(`[MemoryAdapter] Checkpoint guardado: ${key} (total: ${this.checkpoints.size})`)
  }

  async load(name: string, testName?: string): Promise<Checkpoint | null> {
    // Intentar con testName específico primero
    if (testName) {
      const key = this.getKey(name, testName)
      const checkpoint = this.checkpoints.get(key)

      if (checkpoint) {
        // Verificar expiración
        const createdAt = new Date(checkpoint.createdAt).getTime()
        const now = Date.now()
        if (now - createdAt > checkpoint.ttlMs) {
          console.log(`[MemoryAdapter] Checkpoint expirado: ${name}`)
          this.checkpoints.delete(key)
          return null
        }
        return checkpoint
      }
    }

    // Buscar por nombre en cualquier test
    for (const [key, checkpoint] of Array.from(this.checkpoints.entries())) {
      if (key.startsWith('id::')) continue
      if (checkpoint.name === name) {
        // Verificar expiración
        const createdAt = new Date(checkpoint.createdAt).getTime()
        const now = Date.now()
        if (now - createdAt > checkpoint.ttlMs) {
          console.log(`[MemoryAdapter] Checkpoint expirado: ${name}`)
          this.checkpoints.delete(key)
          continue
        }
        return checkpoint
      }
    }

    console.log(`[MemoryAdapter] Checkpoint no encontrado: ${name}`)
    return null
  }

  async loadById(id: string): Promise<Checkpoint | null> {
    const checkpoint = this.checkpoints.get(`id::${id}`)

    if (checkpoint) {
      // Verificar expiración
      const createdAt = new Date(checkpoint.createdAt).getTime()
      const now = Date.now()
      if (now - createdAt > checkpoint.ttlMs) {
        console.log(`[MemoryAdapter] Checkpoint expirado: ${id}`)
        this.checkpoints.delete(`id::${id}`)
        return null
      }
    }

    return checkpoint || null
  }

  async list(testName?: string): Promise<Checkpoint[]> {
    const checkpoints: Checkpoint[] = []
    const seen = new Set<string>()

    for (const [key, checkpoint] of Array.from(this.checkpoints.entries())) {
      // Evitar duplicados (guardamos por key y por id)
      if (seen.has(checkpoint.id)) continue
      if (key.startsWith('id::')) continue

      if (!testName || checkpoint.testName === testName) {
        // Verificar expiración
        const createdAt = new Date(checkpoint.createdAt).getTime()
        const now = Date.now()
        if (now - createdAt <= checkpoint.ttlMs) {
          checkpoints.push(checkpoint)
          seen.add(checkpoint.id)
        }
      }
    }

    // Ordenar por blockNumber
    return checkpoints.sort((a, b) => a.blockNumber - b.blockNumber)
  }

  async delete(id: string): Promise<void> {
    const checkpoint = await this.loadById(id)
    if (!checkpoint) return

    const key = this.getKey(checkpoint.name, checkpoint.testName)
    this.checkpoints.delete(key)
    this.checkpoints.delete(`id::${id}`)

    console.log(`[MemoryAdapter] Checkpoint eliminado: ${id}`)
  }

  async cleanup(): Promise<number> {
    const now = Date.now()
    let deleted = 0
    const keysToDelete: string[] = []

    for (const [key, checkpoint] of Array.from(this.checkpoints.entries())) {
      const createdAt = new Date(checkpoint.createdAt).getTime()
      if (now - createdAt > checkpoint.ttlMs) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.checkpoints.delete(key)
      deleted++
    }

    console.log(`[MemoryAdapter] Limpiados ${deleted} checkpoints expirados`)
    return deleted
  }

  async clear(): Promise<void> {
    this.checkpoints.clear()
    console.log(`[MemoryAdapter] Todos los checkpoints eliminados`)
  }

  /**
   * Obtiene estadísticas del storage (útil para debugging)
   */
  getStats(): { total: number; maxCapacity: number; utilizationPercent: number } {
    // Contar solo checkpoints únicos (no los duplicados por ID)
    const uniqueCount = Array.from(this.checkpoints.keys()).filter(k => !k.startsWith('id::')).length

    return {
      total: uniqueCount,
      maxCapacity: this.maxCheckpoints,
      utilizationPercent: Math.round((uniqueCount / this.maxCheckpoints) * 100)
    }
  }
}
