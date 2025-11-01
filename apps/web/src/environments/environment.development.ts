import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: false,
  supabaseUrl: 'https://obxvffplochgeiclibng.supabase.co',
  supabaseAnonKey:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg5NTgzODIsImV4cCI6MjA0NDUzNDM4Mn0.DXA1GE0AH1CyBT6fslmWLs_0H4y_Ec7oVTkL0ZSZwC4',
  defaultCurrency: 'ARS',
  paymentsWebhookUrl: 'http://localhost:8787/webhooks/payments',
  appUrl: 'http://localhost:4200',
});
