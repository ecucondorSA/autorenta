/**
 * Shared Testing Module for Angular Tests
 *
 * Provides common mocks and providers for all test files.
 * Import this module in your TestBed.configureTestingModule() to get:
 * - SupabaseClientService mock
 * - HttpClient mock
 * - RouterTestingModule
 * - Common service mocks
 *
 * @example
 * ```typescript
 * import { getTestingProviders, getMockSupabaseService } from '@test-helpers/testing.module';
 *
 * beforeEach(() => {
 *   TestBed.configureTestingModule({
 *     providers: getTestingProviders(),
 *   });
 * });
 * ```
 */

import { Provider, EnvironmentProviders } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { PLATFORM_ID } from '@angular/core';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { createMockSupabaseClient, MockSupabaseClient } from './mock-types';

/**
 * Creates a mock SupabaseClientService that returns a mock client
 */
export function getMockSupabaseService(mockClient?: MockSupabaseClient): {
  provide: typeof SupabaseClientService;
  useValue: {
    getClient: jasmine.Spy;
    getClientOrNull: jasmine.Spy;
    isAvailable: jasmine.Spy;
    healthCheck: jasmine.Spy;
    getConnectionInfo: jasmine.Spy;
    client: MockSupabaseClient;
  };
} {
  const client = mockClient || createMockSupabaseClient();

  return {
    provide: SupabaseClientService,
    useValue: {
      getClient: jasmine.createSpy('getClient').and.returnValue(client),
      getClientOrNull: jasmine.createSpy('getClientOrNull').and.returnValue(client),
      isAvailable: jasmine.createSpy('isAvailable').and.returnValue(true),
      healthCheck: jasmine.createSpy('healthCheck').and.resolveTo(true),
      getConnectionInfo: jasmine.createSpy('getConnectionInfo').and.returnValue({
        url: 'https://test.supabase.co',
        pooling: 'transaction',
      }),
      client,
    },
  };
}

/**
 * Creates a mock LoggerService
 */
export function getMockLoggerService(): {
  provide: typeof LoggerService;
  useValue: {
    log: jasmine.Spy;
    debug: jasmine.Spy;
    info: jasmine.Spy;
    warn: jasmine.Spy;
    error: jasmine.Spy;
    setContext: jasmine.Spy;
  };
} {
  return {
    provide: LoggerService,
    useValue: {
      log: jasmine.createSpy('log'),
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error'),
      setContext: jasmine.createSpy('setContext'),
    },
  };
}

/**
 * Get all common testing providers
 *
 * @param options - Optional configuration
 * @returns Array of providers for TestBed
 */
export function getTestingProviders(options?: {
  mockSupabaseClient?: MockSupabaseClient;
  includeRouter?: boolean;
}): (Provider | EnvironmentProviders)[] {
  const providers: (Provider | EnvironmentProviders)[] = [
    provideHttpClient(),
    provideHttpClientTesting(),
    getMockSupabaseService(options?.mockSupabaseClient),
    getMockLoggerService(),
    { provide: PLATFORM_ID, useValue: 'browser' },
  ];

  if (options?.includeRouter !== false) {
    providers.push(provideRouter([]));
  }

  return providers;
}

/**
 * Get minimal providers for unit tests that don't need HTTP
 */
export function getMinimalTestingProviders(options?: {
  mockSupabaseClient?: MockSupabaseClient;
}): Provider[] {
  return [
    getMockSupabaseService(options?.mockSupabaseClient),
    getMockLoggerService(),
    { provide: PLATFORM_ID, useValue: 'browser' },
  ];
}

/**
 * Re-export commonly used mock utilities
 */
export {
  createMockSupabaseClient,
  createMockQueryBuilder,
  createMockAuth,
  createMockStorageBucket,
  createMockRealtimeChannel,
  mockError,
  mockSuccess,
  TEST_CONSTANTS,
} from './mock-types';

export type { MockSupabaseClient, MockQueryBuilder, MockAuth, MockUser } from './mock-types';
