import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Force ts-node to use a specific tsconfig for Playwright's internal Node.js process
// This helps resolve module issues when Playwright loads TypeScript files directly.
process.env.TS_NODE_PROJECT = 'playwright-ts-node.json';
// Using direct require to ensure it loads before other imports
if (require.extensions) { // Check if running in Node.js environment
  require('ts-node/register');
}



/**
 * Configuración optimizada para velocidad y reutilización de estado.
 */

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: './tests',
  testMatch: 'tests/e2e/**/*.spec.ts',
  testIgnore: 'apps/web/src/**',
  fullyParallel: true, // Ejecutar tests en paralelo para velocidad
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Usar todos los cores en local
  reporter: 'html',
  
  // Timeout global (30s es estándar, pero para local rápido podemos bajarlo si la app es rápida)
  timeout: 30000,

  // ... resto de la config ...
  use: {
    baseURL: 'http://localhost:4200', // URL de desarrollo por defecto
    trace: 'on-first-retry', // Solo guardar traza si falla (ahorra disco/tiempo)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  // Configuración de webServer para que Playwright gestione el servidor
  webServer: {
    command: 'npx serve -s apps/web/dist/web/browser -l 4200', // Servir build de producción
    cwd: '.', // Ejecutar desde el root
    url: 'http://localhost:4200', // La URL a esperar
    reuseExistingServer: !process.env.CI, // Reutiliza el servidor en desarrollo local, lo mata en CI
    timeout: 120 * 1000, // Darle tiempo a Angular para compilar (2 minutos)
    stdout: 'pipe', // Redirigir la salida para no llenar la consola del agente
    stderr: 'pipe',
  },

  projects: [
    // 1. SETUP: Se ejecuta primero y guarda la sesión
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // 2. E2E: Depende del setup y reutiliza la sesión
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Aquí está la magia: inyecta las cookies/storage guardados
        storageState: AUTH_FILE, 
      },
      dependencies: ['setup'], // Espera a que 'setup' termine
    },

    /* Descomentar para probar en otros navegadores
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'], storageState: AUTH_FILE },
      dependencies: ['setup'],
    },
    */
  ],
});