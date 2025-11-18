#!/usr/bin/env node

import { createServer } from './lib/server.js';
import { SupabaseClient } from './lib/supabase.js';
import { AuditClient } from './lib/audit-client.js';
import { registerResources } from './resources/index.js';
import { registerAuditResources } from './resources/audit.js';
import { registerTools } from './tools/index.js';

async function main() {
  try {
    // Inicializar clientes
    const supabase = new SupabaseClient();
    const audit = new AuditClient();

    // Crear servidor MCP
    const server = createServer('autorenta-platform', '1.0.0');

    // Registrar recursos (lectura de datos)
    registerResources(server, supabase);
    registerAuditResources(server, audit);

    // Registrar herramientas (acciones)
    registerTools(server, supabase, audit);

    // Iniciar servidor
    await server.start();

  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

// Manejo de señales para cierre limpio
process.on('SIGINT', () => {
  console.error('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

main();