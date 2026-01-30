import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'functions/**/*.test.ts',
      'functions/**/*.spec.ts',
      'apps/web/src/app/shared/utils/**/*.test.ts',
      'apps/web/src/app/core/utils/**/*.test.ts',
      'apps/web/src/app/core/services/**/*.spec.ts',
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
