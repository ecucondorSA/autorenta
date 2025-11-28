/**
 * FileAdapter - Almacena checkpoints en disco como archivos JSON
 * Útil para desarrollo local donde queremos persistir entre ejecuciones
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  Checkpoint,
  ICheckpointStorage,
  StorageAdapterOptions
} from '../../types/checkpoint.types'

const DEFAULT_BASE_DIR = 'tests/fixtures/checkpoints'

export class FileAdapter implements ICheckpointStorage {
  private baseDir: string

  constructor(options?: StorageAdapterOptions) {
    this.baseDir = options?.baseDir || DEFAULT_BASE_DIR

    // Crear directorio si no existe
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true })
    }
  }

  /**
   * Genera el path del archivo para un checkpoint
   */
  private getFilePath(checkpoint: Checkpoint): string {
    const sanitizedName = checkpoint.name.replace(/[^a-z0-9-_]/gi, '-')
    const sanitizedTest = checkpoint.testName.replace(/[^a-z0-9-_]/gi, '-')
    return path.join(this.baseDir, `${sanitizedTest}__${sanitizedName}.json`)
  }

  /**
   * Genera el path del archivo por nombre
   */
  private getFilePathByName(name: string, testName?: string): string {
    const sanitizedName = name.replace(/[^a-z0-9-_]/gi, '-')
    if (testName) {
      const sanitizedTest = testName.replace(/[^a-z0-9-_]/gi, '-')
      return path.join(this.baseDir, `${sanitizedTest}__${sanitizedName}.json`)
    }
    // Buscar archivo que termine con el nombre
    const files = fs.readdirSync(this.baseDir)
    const match = files.find(f => f.endsWith(`__${sanitizedName}.json`) || f === `${sanitizedName}.json`)
    return match ? path.join(this.baseDir, match) : path.join(this.baseDir, `${sanitizedName}.json`)
  }

  async save(checkpoint: Checkpoint): Promise<void> {
    const filePath = this.getFilePath(checkpoint)
    const content = JSON.stringify(checkpoint, null, 2)
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`[FileAdapter] Checkpoint guardado: ${filePath}`)
  }

  async load(name: string, testName?: string): Promise<Checkpoint | null> {
    const filePath = this.getFilePathByName(name, testName)

    if (!fs.existsSync(filePath)) {
      console.log(`[FileAdapter] Checkpoint no encontrado: ${filePath}`)
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const checkpoint = JSON.parse(content) as Checkpoint

      // Verificar expiración
      const createdAt = new Date(checkpoint.createdAt).getTime()
      const now = Date.now()
      if (now - createdAt > checkpoint.ttlMs) {
        console.log(`[FileAdapter] Checkpoint expirado: ${name}`)
        return null
      }

      return checkpoint
    } catch (error) {
      console.error(`[FileAdapter] Error leyendo checkpoint: ${error}`)
      return null
    }
  }

  async loadById(id: string): Promise<Checkpoint | null> {
    const files = fs.readdirSync(this.baseDir)

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      try {
        const filePath = path.join(this.baseDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const checkpoint = JSON.parse(content) as Checkpoint

        if (checkpoint.id === id) {
          return checkpoint
        }
      } catch {
        continue
      }
    }

    return null
  }

  async list(testName?: string): Promise<Checkpoint[]> {
    const files = fs.readdirSync(this.baseDir)
    const checkpoints: Checkpoint[] = []

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      try {
        const filePath = path.join(this.baseDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const checkpoint = JSON.parse(content) as Checkpoint

        if (!testName || checkpoint.testName === testName) {
          checkpoints.push(checkpoint)
        }
      } catch {
        continue
      }
    }

    // Ordenar por blockNumber
    return checkpoints.sort((a, b) => a.blockNumber - b.blockNumber)
  }

  async delete(id: string): Promise<void> {
    const checkpoint = await this.loadById(id)
    if (!checkpoint) return

    const filePath = this.getFilePath(checkpoint)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      console.log(`[FileAdapter] Checkpoint eliminado: ${filePath}`)
    }
  }

  async cleanup(): Promise<number> {
    const files = fs.readdirSync(this.baseDir)
    let deleted = 0

    for (const file of files) {
      if (!file.endsWith('.json')) continue

      try {
        const filePath = path.join(this.baseDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        const checkpoint = JSON.parse(content) as Checkpoint

        const createdAt = new Date(checkpoint.createdAt).getTime()
        const now = Date.now()

        if (now - createdAt > checkpoint.ttlMs) {
          fs.unlinkSync(filePath)
          deleted++
        }
      } catch {
        continue
      }
    }

    console.log(`[FileAdapter] Limpiados ${deleted} checkpoints expirados`)
    return deleted
  }

  async clear(): Promise<void> {
    const files = fs.readdirSync(this.baseDir)

    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const filePath = path.join(this.baseDir, file)
      fs.unlinkSync(filePath)
    }

    console.log(`[FileAdapter] Todos los checkpoints eliminados`)
  }
}
