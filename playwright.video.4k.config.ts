import type { PlaywrightTestConfig } from '@playwright/test';
import baseConfig from './playwright.video.config';

const config: PlaywrightTestConfig = {
  ...baseConfig,
  use: {
    ...(baseConfig.use ?? {}),
    viewport: { width: 3840, height: 2160 },
    launchOptions: {
      ...(baseConfig.use?.launchOptions ?? {}),
      args: [
        ...(baseConfig.use?.launchOptions?.args ?? []),
        '--force-device-scale-factor=1.1',
        '--disable-renderer-accessibility',
        '--window-size=3840,2160',
      ],
    },
  },
  projects: (baseConfig.projects ?? []).map((project) =>
    project.name === 'chromium:e2e'
      ? {
          ...project,
          use: {
            ...(project.use ?? {}),
            viewport: { width: 3840, height: 2160 },
          },
        }
      : project,
  ),
};

export default config;




