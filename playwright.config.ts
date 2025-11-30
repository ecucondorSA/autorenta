import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar variables de entorno desde .env.local
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://127.0.0.1:4300',
    trace: 'on-first-retry',
  },

  // Configuración de proyectos
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Servidor web opcional (descomentado si quieres que Playwright lo inicie)
  // webServer: {
  //   command: 'npm run dev:web',
  //   url: 'http://127.0.0.1:4300',
  //   reuseExistingServer: !process.env.CI,
  // },
});
