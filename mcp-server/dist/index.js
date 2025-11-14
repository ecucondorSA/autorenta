#!/usr/bin/env node
import { createServer } from './lib/server.js';
import { SupabaseClient } from './lib/supabase.js';
import { registerResources } from './resources/index.js';
import { registerTools } from './tools/index.js';
async function main() {
    try {
        // Inicializar cliente de Supabase
        const supabase = new SupabaseClient();
        // Crear servidor MCP
        const server = createServer('autorenta-platform', '1.0.0');
        // Registrar recursos (lectura de datos)
        registerResources(server, supabase);
        // Registrar herramientas (acciones)
        registerTools(server, supabase);
        // Iniciar servidor
        await server.start();
    }
    catch (error) {
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
