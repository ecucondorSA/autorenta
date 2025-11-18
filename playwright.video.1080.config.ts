import type { PlaywrightTestConfig } from '@playwright/test';
import baseConfig from './playwright.video.config';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  use: {
    ...(baseConfig.use ?? {}),
    viewport: { width: 1920, height: 1080 },
    launchOptions: {
      ...(baseConfig.use?.launchOptions ?? {}),
      args: [
        ...(baseConfig.use?.launchOptions?.args ?? []),
        '--force-device-scale-factor=1.2',
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
            viewport: { width: 1920, height: 1080 },
          },
        }
      : project,
  ),
};

export default config;



