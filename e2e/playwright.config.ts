import { defineConfig, devices } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const artifactsRoot = resolve(__dirname, 'artifacts');
const defaultPort = process.env.E2E_WEB_PORT ?? '4300';

if (!existsSync(artifactsRoot)) {
  mkdirSync(artifactsRoot, { recursive: true });
}

const baseURL =
  process.env.E2E_WEB_URL ??
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.WEB_URL ??
  `http://127.0.0.1:${defaultPort}`;

const reporters = [
  ['list'],
  ['json', { outputFile: resolve(artifactsRoot, 'results.json') }],
  ['html', { outputFolder: resolve(artifactsRoot, 'html') }],
];

if (process.env.QASE_API_TOKEN) {
  reporters.push([
    'playwright-qase-reporter',
    {
      apiToken: process.env.QASE_API_TOKEN,
      projectCode: process.env.QASE_PROJECT_CODE,
      runComplete: true,
      basePath: 'https://api.qase.io/v1',
      logging: true,
      uploadAttachments: true,
    },
  ]);
}

export default defineConfig({
  testDir: resolve(__dirname, 'specs'),
  testIgnore: ['**/apps/**', '**/node_modules/**'],
  timeout: 120 * 1000,
  expect: {
    timeout: 10 * 1000,
  },
  fullyParallel: false,
  workers: process.env.CI ? 1 : undefined,
  reporter: reporters as any,
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
    url: `http://127.0.0.1:${defaultPort}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
