import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: true,
  defaultCurrency: 'ARS',
  appUrl: 'https://autorentar.com',
});
