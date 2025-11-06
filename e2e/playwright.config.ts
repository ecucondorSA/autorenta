import { defineConfig, devices } from '@playwright/test';
import { resolve } from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';

const artifactsRoot = resolve(__dirname, 'artifacts');
const defaultPort = process.env.E2E_WEB_PORT ?? '4300';

if (!existsSync(artifactsRoot)) {
  mkdirSync(artifactsRoot, { recursive: true });
}

const baseURL =
  process.env.E2E_WEB_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.WEB_URL ??
  `http://localhost:${defaultPort}`;

export default defineConfig({
  testDir: resolve(__dirname, 'specs'),
  timeout: 120 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['json', { outputFile: resolve(artifactsRoot, 'results.json') }],
    ['html', { outputFolder: resolve(artifactsRoot, 'html') }],
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'on',
    screenshot: 'on',
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        baseURL,
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 5'],
        viewport: devices['Pixel 5'].viewport,
        isMobile: true,
        baseURL,
      },
    },
  ],
  webServer: {
    command: `bash -lc "cd apps/web && node scripts/generate-env.js && pnpm exec ng serve --configuration development --port ${defaultPort} --host 127.0.0.1"`,
    cwd: resolve(__dirname, '..'),
    url: `http://localhost:${defaultPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
