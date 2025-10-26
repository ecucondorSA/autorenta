import { buildEnvironment } from './environment.base';

export const environment = buildEnvironment({
  production: true,
  // HARDCODED VALUES para resolver "Failed to fetch" en producción
  supabaseUrl: 'https://obxvffplochgeiclibng.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ieHZmZnBsb2NoZ2VpY2xpYm5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NTMyMzIsImV4cCI6MjA3NjEyOTIzMn0.1b4XQpOgNm6bXdcU8gXGG2aUbTkjvr8xyJU4Mkgt6GU',
  mercadopagoPublicKey: 'APP_USR-a89f4240-f154-43dc-9535-4cde45b1d8cd',
  // ⚠️ NOTA: Estas credenciales deben venir de variables de entorno en producción
  // mercadopagoClientId: 'TU_CLIENT_ID', // Obtener de MP Developers
  // mercadopagoClientSecret: 'TU_CLIENT_SECRET', // Obtener de MP Developers
  appUrl: 'https://autorentar.com', // Cambiar a tu dominio
});
