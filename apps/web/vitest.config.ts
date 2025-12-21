import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@ionic/core/loader': '@ionic/core/loader/index.js',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.vitest.ts'],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    deps: {
      inline: ['@ionic/angular', '@ionic/core'],
    },
  },
});
