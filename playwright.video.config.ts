import type { PlaywrightTestConfig } from '@playwright/test';
import baseConfig from './playwright.config';

/**
 * Configuración auxiliar para grabar video de cualquier spec de Playwright.
 * Extiende la configuración principal y deja siempre encendidos:
 * - video
 * - screenshots
 * - traces
 *
 * Uso sugerido:
 *   npx playwright test tests/e2e/complete-porsche-publication-flow.spec.ts \\
 *     --config=playwright.video.config.ts \\
 *     --project=mobile-chrome:owner \\
 *     --headed --workers=1
 */
const config: PlaywrightTestConfig = {
  ...baseConfig,
  use: {
    ...(baseConfig.use ?? {}),
    screenshot: 'on',
    trace: 'on',
    video: 'on',
  },
  reporter: baseConfig.reporter,
};

export default config;











