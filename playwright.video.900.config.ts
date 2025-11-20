import type { PlaywrightTestConfig } from '@playwright/test';
import baseConfig from './playwright.video.config';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  use: {
    ...(baseConfig.use ?? {}),
    viewport: { width: 1366, height: 768 },
    launchOptions: {
      ...(baseConfig.use?.launchOptions ?? {}),
      args: [
        ...(baseConfig.use?.launchOptions?.args ?? []),
        '--window-size=1366,768',
        '--force-device-scale-factor=1.0',
        '--disable-renderer-accessibility',
      ],
    },
  },
  projects: (baseConfig.projects ?? []).map((project) =>
    project.name === 'chromium:e2e'
      ? {
          ...project,
          use: {
            ...(project.use ?? {}),
            viewport: { width: 1366, height: 768 },
          },
        }
      : project,
  ),
};

export default config;




