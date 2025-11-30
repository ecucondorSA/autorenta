/**
 * Checkpoint Fixtures para Playwright
 *
 * Proporciona fixtures reutilizables para tests con arquitectura Checkpoint & Hydrate
 *
 * Uso:
 * ```typescript
 * import { test, expect } from '../checkpoint/fixtures';
 *
 * test('mi test', async ({ page, checkpointManager, createBlock }) => {
 *   // checkpointManager ya está configurado con page y context
 *   // createBlock es un helper para crear TestBlocks fácilmente
 * });
 * ```
 */

import { test as base, expect } from '@playwright/test'
import { CheckpointManager, createCheckpointManager } from './core/CheckpointManager'
import { TestBlock, createTestBlock } from './core/TestBlock'
import { McpTestClient } from './mcp-client'
import { CheckpointStorage, getCheckpointStorage } from './storage/CheckpointStorage'
import { BlockRunnerConfig, TestBlockDefinition } from './types/test-block.types'

/**
 * Opciones de configuración para los fixtures
 */
export interface CheckpointFixtureOptions {
  /** Configuración del runner de bloques */
  blockRunnerConfig?: BlockRunnerConfig

  /** TTL por defecto para checkpoints (ms) */
  defaultCheckpointTtl?: number

  /** Si true, limpia checkpoints al finalizar el test */
  cleanupOnEnd?: boolean
}

/**
 * Tipo del fixture createBlock
 */
type CreateBlockFn = (definition: TestBlockDefinition) => TestBlock

/**
 * Fixtures extendidos para checkpoint
 */
/**
 * Fixtures de test para checkpoint
 */
type CheckpointTestFixtures = {
  /** Instancia de CheckpointManager para el test actual */
  checkpointManager: CheckpointManager

  /** Helper para crear TestBlocks */
  createBlock: CreateBlockFn

  /** Storage de checkpoints (singleton) */
  checkpointStorage: CheckpointStorage

  /** Opciones de configuración */
  checkpointOptions: CheckpointFixtureOptions
}

/**
 * Fixtures de worker para checkpoint
 */
type CheckpointWorkerFixtures = {
  /** Cliente MCP para state-aware testing (Worker Scoped) */
  mcp: McpTestClient
}

/**
 * Test base extendido con fixtures de checkpoint
 */
export const test = base.extend<CheckpointTestFixtures, CheckpointWorkerFixtures>({
  // Opciones por defecto (pueden ser overriden con test.use())
  checkpointOptions: [{
    blockRunnerConfig: {
      screenshotOnFailure: true,
      artifactsDir: 'test-results/checkpoints',
      logLevel: 'info'
    },
    defaultCheckpointTtl: 60 * 60 * 1000, // 1 hora
    cleanupOnEnd: true
  }, { option: true }],

  // Storage singleton
  checkpointStorage: async ({ }, use) => {
    const storage = getCheckpointStorage()
    await use(storage)
  },

  // CheckpointManager por test
  checkpointManager: async ({ page, context, checkpointOptions, baseURL }, use, testInfo) => {
    console.log(`[Fixture] Setup CheckpointManager. baseURL: '${baseURL}'`);
    if (!baseURL) {
      console.warn('⚠️ WARNING: baseURL is not defined! Navigation with relative URLs will fail.');
    }
    // Crear nombre único para el test
    const testName = testInfo.title
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-_]/gi, '')
      .toLowerCase()

    const manager = createCheckpointManager({
      page,
      context,
      testName,
      defaultTtlMs: checkpointOptions.defaultCheckpointTtl,
      // CRÍTICO: Pasar explícitamente las credenciales de Supabase
      supabaseUrl: process.env.NG_APP_SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NG_APP_SUPABASE_ANON_KEY
    })

    // Usar el manager durante el test
    await use(manager)

    // Cleanup después del test si está configurado
    if (checkpointOptions.cleanupOnEnd) {
      await manager.cleanup()
    }
  },

  // Helper para crear bloques
  createBlock: async ({ page, context, checkpointManager, checkpointOptions, mcp }, use) => {
    const createBlockFn: CreateBlockFn = (definition: TestBlockDefinition) => {
      return createTestBlock(
        definition,
        checkpointManager,
        page,
        context,
        checkpointOptions.blockRunnerConfig,
        mcp
      )
    }

    await use(createBlockFn)
  },

  // MCP Client fixture (Worker Scoped)
  mcp: [async ({ }, use) => {
    const mcp = new McpTestClient();
    await mcp.connect();
    await use(mcp);
    await mcp.close();
  }, { scope: 'worker' }]
})

// Re-export expect para conveniencia
export { expect }

/**
 * Helper para restaurar un checkpoint antes de ejecutar un test
 *
 * Uso:
 * ```typescript
 * test.beforeEach(async ({ checkpointManager }) => {
 *   await restoreIfExists(checkpointManager, 'authenticated');
 * });
 * ```
 */
export async function restoreIfExists(
  checkpointManager: CheckpointManager,
  checkpointName: string
): Promise<boolean> {
  const checkpoint = await checkpointManager.loadCheckpoint(checkpointName)

  if (checkpoint) {
    const result = await checkpointManager.restoreCheckpoint(checkpoint)
    return result.success
  }

  return false
}

/**
 * Helper para crear un bloque simple con defaults
 */
export function defineBlock(
  id: string,
  name: string,
  options: Partial<TestBlockDefinition> = {}
): TestBlockDefinition {
  return {
    id,
    name,
    priority: 'P1',
    estimatedDuration: 10000,
    preconditions: [],
    postconditions: [],
    ...options
  }
}

/**
 * Helper para definir precondición de checkpoint
 */
export function requiresCheckpoint(checkpointId: string) {
  return {
    type: 'checkpoint' as const,
    checkpointId,
    description: `Requiere checkpoint: ${checkpointId}`
  }
}

/**
 * Helper para definir precondición de elemento
 */
export function requiresElement(selector: string, description?: string) {
  return {
    type: 'element' as const,
    elementSelector: selector,
    description: description || `Requiere elemento: ${selector}`
  }
}

/**
 * Helper para definir postcondición de URL
 */
export function expectsUrl(pattern: RegExp, description?: string) {
  return {
    type: 'url' as const,
    urlPattern: pattern,
    description: description || `URL debe coincidir: ${pattern}`
  }
}

/**
 * Helper para definir postcondición de elemento visible
 */
export function expectsElement(selector: string, state: 'visible' | 'hidden' = 'visible', description?: string) {
  return {
    type: 'element' as const,
    elementSelector: selector,
    elementState: state,
    description: description || `Elemento ${selector} debe estar ${state}`
  }
}

/**
 * Helper para definir postcondición de DB
 */
export function expectsInDb(
  table: string,
  where: Record<string, unknown>,
  expected: Record<string, unknown>,
  description?: string
) {
  return {
    type: 'db' as const,
    dbQuery: { table, where, expected },
    description: description || `DB ${table} debe tener valores esperados`
  }
}

/**
 * Helper para definir opciones de checkpoint
 */
export function withCheckpoint(name: string, options: { ttlMs?: number; metadata?: Record<string, unknown> } = {}) {
  return {
    generateCheckpoint: true,
    checkpointOptions: {
      name,
      ...options
    }
  }
}

/**
 * Helper para definir postcondición de MCP
 */
export function expectsInMcp(
  toolName: string,
  args: Record<string, unknown>,
  validate: (result: any) => boolean | Promise<boolean>,
  description?: string
) {
  return {
    type: 'mcp' as const,
    mcpCheck: {
      toolName,
      args,
      validate
    },
    description: description || `MCP ${toolName} debe pasar validación`
  }
}
