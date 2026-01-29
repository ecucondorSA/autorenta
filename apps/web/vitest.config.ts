import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Ionic aliases for ESM compatibility
      '@ionic/core/loader': '@ionic/core/loader/index.js',
      '@ionic/core/components': '@ionic/core/components/index.js',
      // Project aliases
      '@app': path.resolve(__dirname, './src/app'),
      '@core': path.resolve(__dirname, './src/app/core'),
      '@shared': path.resolve(__dirname, './src/app/shared'),
      '@features': path.resolve(__dirname, './src/app/features'),
      '@environment': path.resolve(__dirname, './src/environments/environment'),
      '@contracts': path.resolve(__dirname, '../../functions/contracts'),
      '@test-helpers': path.resolve(__dirname, './src/test-helpers'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.vitest.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
    globals: true,
    // Server config for ESM module resolution
    server: {
      deps: {
        inline: [/@ionic\/angular/, /@ionic\/core/, /ionicons/],
      },
    },
  },
});
