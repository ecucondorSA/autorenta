import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

/**
 * Configuración optimizada para velocidad y reutilización de estado.
 */

// Cargar variables de entorno
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const AUTH_FILE = path.join(__dirname, '.auth/user.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: true, // Ejecutar tests en paralelo para velocidad
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined, // Usar todos los cores en local
  reporter: 'html',
  
  // Timeout global (30s es estándar, pero para local rápido podemos bajarlo si la app es rápida)
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:4300', // URL de desarrollo por defecto
    trace: 'on-first-retry', // Solo guardar traza si falla (ahorra disco/tiempo)
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
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