import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: false,
  defaultCurrency: 'ARS',
  paymentsWebhookUrl: 'http://localhost:8787/webhooks/payments',
});
