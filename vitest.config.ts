import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

const webSrc = resolve(__dirname, 'apps/web/src');

export default defineConfig({
  resolve: {
    alias: {
      '@app': resolve(webSrc, 'app'),
      '@core': resolve(webSrc, 'app/core'),
      '@shared': resolve(webSrc, 'app/shared'),
      '@features': resolve(webSrc, 'app/features'),
      '@environment': resolve(webSrc, 'environments/environment'),
      '@contracts': resolve(__dirname, 'functions/contracts'),
      '@test-helpers': resolve(webSrc, 'test-helpers'),
    },
  },
  test: {
    // Pure unit tests only - Angular service tests should use `ng test`
    include: [
      'functions/**/*.test.ts',
      'functions/**/*.spec.ts',
      'apps/web/src/app/shared/utils/**/*.test.ts',
      'apps/web/src/app/core/utils/**/*.test.ts',
      // Beacon protocol uses custom test setup, not Angular TestBed
      'apps/web/src/app/core/services/beacon/**/*.spec.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
    environment: 'node',
    globals: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    passWithNoTests: true,
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    reportsDirectory: 'coverage',
    exclude: ['**/*.d.ts', '**/node_modules/**', '**/dist/**', '**/apps/web/**'],
  },
});
