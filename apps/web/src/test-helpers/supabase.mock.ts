/**
 * Test helper for Supabase client
 *
 * @deprecated Use createMockSupabaseClient() from mock-types.ts instead
 * This function is kept for backward compatibility with existing tests.
 */

import { createMockSupabaseClient, MockSupabaseClient, TEST_CONSTANTS } from './mock-types';

/**
 * Creates a mock Supabase client
 *
 * @deprecated Use createMockSupabaseClient() from mock-types.ts for type safety
 */
export function makeSupabaseMock(): MockSupabaseClient {
  return createMockSupabaseClient({
    defaultData: {},
    user: {
      id: TEST_CONSTANTS.VALID_UUID,
      email: TEST_CONSTANTS.VALID_EMAIL,
    },
  });
}
