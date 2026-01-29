#!/usr/bin/env node

/**
 * Script para iniciar el servidor de desarrollo con variables de entorno
 * Ubicado en tools/ para acceso desde la raíz del proyecto
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Obtener la raíz del proyecto (tools/ -> raíz)
const projectRoot = resolve(__dirname, '..');
const webDir = resolve(projectRoot, 'apps', 'web');
const envFile = resolve(webDir, '.env.development.local');

// Cargar variables de entorno
if (existsSync(envFile)) {
  const content = readFileSync(envFile, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!key) continue;
    process.env[key] = value;
  }
} else {
  console.warn(`⚠️  Archivo .env.development.local no encontrado en ${envFile}`);
  console.warn('   El servidor puede no funcionar correctamente sin variables de entorno.');
}

// Iniciar el servidor Angular
const child = spawn('npx', ['ng', 'serve', '--configuration', 'development'], {
  stdio: 'inherit',
  env: process.env,
  cwd: webDir,
});

child.on('exit', (code) => {
  process.exit(code ?? 0);
});

// Manejar señales para cerrar correctamente
process.on('SIGINT', () => {
  child.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
  process.exit(0);
});






