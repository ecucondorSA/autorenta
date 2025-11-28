/**
 * Checkpoint Module - Arquitectura "Checkpoint & Hydrate" para Tests E2E
 *
 * Este módulo proporciona:
 * - CheckpointManager: Captura y restaura estado completo
 * - TestBlock: Bloques atómicos con pre/post condiciones
 * - Storage adapters: File (local) y Memory (CI)
 *
 * Uso básico:
 * ```typescript
 * import { test } from '../checkpoint/fixtures';
 *
 * test('mi test', async ({ checkpointManager, createBlock }) => {
 *   const block = createBlock({
 *     id: 'b1-login',
 *     name: 'Verificar Login',
 *     priority: 'P0',
 *     estimatedDuration: 5000,
 *     preconditions: [],
 *     postconditions: [{ type: 'element', elementSelector: '[data-testid="user-menu"]' }],
 *     generateCheckpoint: true,
 *     checkpointOptions: { name: 'authenticated' }
 *   });
 *
 *   await block.execute(async () => {
 *     // Tu código de test aquí
 *   });
 * });
 * ```
 */

// Core exports
export * from './core'
export * from './types'
export * from './storage'
