/**
 * Test Helpers - Índice de exportaciones
 *
 * Centraliza todas las utilidades de testing para imports más limpios
 *
 * @example
 * ```typescript
 * import { createMockSupabaseClient, mockError, TEST_CONSTANTS } from '@app/test-helpers';
 * ```
 */

// Mock Types y Factories
export {
  // Tipos
  type MockSupabaseClient,
  type MockQueryBuilder,
  type MockStorageBucket,
  type MockAuth,
  type MockFunctions,
  type MockSupabaseResponse,
  type MockUser,
  type MockSession,
  type MockRpcCall,

  // Factories
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockStorageBucket,
  createMockAuth,

  // Helpers
  mockError,
  mockSuccess,
  TEST_CONSTANTS,
} from './mock-types';

// Legacy support
export { makeSupabaseMock } from './supabase.mock';

// Factories (si existen)
export * from './factories';
