import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['functions/**/*.test.ts', 'functions/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/apps/web/**'],
    environment: 'node',
    globals: true,
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    watchExclude: ['**/node_modules/**', '**/dist/**', '**/coverage/**'],
  },
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'lcov'],
    reportsDirectory: 'coverage',
    exclude: ['**/*.d.ts', '**/node_modules/**', '**/dist/**', '**/apps/web/**'],
  },
});
