#!/usr/bin/env node

/**
 * Proxy Rotator and Health Checker
 * 
 * Maneja pool de proxies residenciales, health checks, y asignación a personas
 */

import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';

// Configuración
const PROXY_POOL_FILE = process.env.PROXY_POOL_FILE || './config/proxy-pool.json';
const HEALTH_CHECK_URL = 'https://httpbin.org/ip';
const HEALTH_CHECK_TIMEOUT = 10000; // 10s

/**
 * Carga el pool de proxies
 */
async function loadProxyPool() {
    try {
        const data = await fs.readFile(PROXY_POOL_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.warn('Proxy pool file not found, returning empty array');
        return [];
    }
}

/**
 * Guarda estado actualizado del pool
 */
async function saveProxyPool(pool) {
    await fs.writeFile(PROXY_POOL_FILE, JSON.stringify(pool, null, 2));
}

/**
 * Health check de un proxy
 */
async function checkProxyHealth(proxy) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

        const proxyUrl = proxy.username
            ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
            : `http://${proxy.host}:${proxy.port}`;

        // Usar httpbin para verificar que el proxy funciona
        const response = await fetch(HEALTH_CHECK_URL, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
            },
            // Node.js fetch no soporta proxies nativamente, necesitamos usar undici o proxy-agent
            // Para producción, instalar: npm install undici proxy-agent
        });

        clearTimeout(timeout);

        if (response.ok) {
            const data = await response.json();
            return {
                healthy: true,
                ip: data.origin,
                latency: Date.now() - proxy.last_check,
            };
        }

        return { healthy: false, error: `Status ${response.status}` };
    } catch (error) {
        return { healthy: false, error: error.message };
    }
}

/**
 * Asigna un proxy disponible a una persona
 */
export async function assignProxyToPersona(personaId) {
    const pool = await loadProxyPool();

    if (pool.length === 0) {
        throw new Error('No proxies available in pool');
    }

    // Buscar proxy ya asignado a esta persona
    let assignedProxy = pool.find(p => p.assigned_to === personaId);

    if (assignedProxy) {
        // Verificar si sigue saludable
        const health = await checkProxyHealth(assignedProxy);
        if (health.healthy) {
            return formatProxyConfig(assignedProxy);
        }

        // Si falló, reasignar
        assignedProxy.assigned_to = null;
        assignedProxy.is_healthy = false;
        assignedProxy.last_error = health.error;
    }

    // Buscar proxy disponible y saludable
    const availableProxies = pool.filter(p => !p.assigned_to && p.is_healthy !== false);

    if (availableProxies.length === 0) {
        // Intentar rehabilitar proxies
        console.log('No healthy proxies available, running health checks...');
        await runHealthChecks();
        return assignProxyToPersona(personaId); // Retry
    }

    // Seleccionar proxy con menor uso
    const selectedProxy = availableProxies.sort((a, b) =>
        (a.usage_count || 0) - (b.usage_count || 0)
    )[0];

    // Asignar
    selectedProxy.assigned_to = personaId;
    selectedProxy.usage_count = (selectedProxy.usage_count || 0) + 1;
    selectedProxy.last_assigned = new Date().toISOString();

    await saveProxyPool(pool);

    return formatProxyConfig(selectedProxy);
}

/**
 * Libera un proxy asignado
 */
export async function releaseProxy(personaId) {
    const pool = await loadProxyPool();
    const proxy = pool.find(p => p.assigned_to === personaId);

    if (proxy) {
        proxy.assigned_to = null;
        await saveProxyPool(pool);
    }
}

/**
 * Formatea config de proxy para Playwright
 */
function formatProxyConfig(proxy) {
    return {
        server: `http://${proxy.host}:${proxy.port}`,
        username: proxy.username,
        password: proxy.password,
        ip: proxy.ip,
    };
}

/**
 * Ejecuta health checks en todo el pool
 */
export async function runHealthChecks() {
    console.log('Running health checks on proxy pool...');
    const pool = await loadProxyPool();

    const results = await Promise.all(
        pool.map(async (proxy) => {
            const health = await checkProxyHealth(proxy);
            proxy.is_healthy = health.healthy;
            proxy.last_check = new Date().toISOString();

            if (health.healthy) {
                proxy.ip = health.ip;
                proxy.latency = health.latency;
                proxy.last_error = null;
            } else {
                proxy.last_error = health.error;
            }

            return {
                host: proxy.host,
                healthy: health.healthy,
                error: health.error,
            };
        })
    );

    await saveProxyPool(pool);

    const healthyCount = results.filter(r => r.healthy).length;
    console.log(`Health check complete: ${healthyCount}/${results.length} proxies healthy`);

    return results;
}

/**
 * Agrega un nuevo proxy al pool
 */
export async function addProxyToPool(proxyConfig) {
    const pool = await loadProxyPool();

    const newProxy = {
        id: `proxy-${Date.now()}`,
        host: proxyConfig.host,
        port: proxyConfig.port,
        username: proxyConfig.username || null,
        password: proxyConfig.password || null,
        assigned_to: null,
        is_healthy: null, // Will be checked
        usage_count: 0,
        added_at: new Date().toISOString(),
    };

    pool.push(newProxy);
    await saveProxyPool(pool);

    // Health check inmediato
    const health = await checkProxyHealth(newProxy);
    newProxy.is_healthy = health.healthy;
    newProxy.ip = health.ip;
    await saveProxyPool(pool);

    return newProxy;
}

/**
 * Muestra estado del pool
 */
export async function getPoolStatus() {
    const pool = await loadProxyPool();

    const healthy = pool.filter(p => p.is_healthy).length;
    const assigned = pool.filter(p => p.assigned_to).length;
    const available = pool.filter(p => p.is_healthy && !p.assigned_to).length;

    return {
        total: pool.length,
        healthy,
        assigned,
        available,
        unhealthy: pool.length - healthy,
        proxies: pool,
    };
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];

    switch (command) {
        case 'check':
            runHealthChecks().then(() => process.exit(0));
            break;

        case 'status':
            getPoolStatus().then(status => {
                console.log(JSON.stringify(status, null, 2));
                process.exit(0);
            });
            break;

        case 'assign':
            const personaId = process.argv[3];
            if (!personaId) {
                console.error('Usage: node proxy-rotator.js assign <persona-id>');
                process.exit(1);
            }
            assignProxyToPersona(personaId).then(proxy => {
                console.log(JSON.stringify(proxy, null, 2));
                process.exit(0);
            });
            break;

        case 'release':
            const persona = process.argv[3];
            releaseProxy(persona).then(() => {
                console.log(`Proxy released for ${persona}`);
                process.exit(0);
            });
            break;

        case 'add':
            const host = process.argv[3];
            const port = process.argv[4];
            if (!host || !port) {
                console.error('Usage: node proxy-rotator.js add <host> <port> [username] [password]');
                process.exit(1);
            }
            addProxyToPool({
                host,
                port,
                username: process.argv[5],
                password: process.argv[6],
            }).then(proxy => {
                console.log('Proxy added:', JSON.stringify(proxy, null, 2));
                process.exit(0);
            });
            break;

        default:
            console.log(`
Usage:
  node proxy-rotator.js <command> [args]

Commands:
  check                    Run health checks on all proxies
  status                   Show pool status
  assign <persona-id>      Assign proxy to persona
  release <persona-id>     Release  proxy from persona
  add <host> <port> [user] [pass]  Add new proxy to pool

Examples:
  node proxy-rotator.js check
  node proxy-rotator.js assign persona-001
  node proxy-rotator.js add proxy.example.com 8080 user pass
      `);
            process.exit(0);
    }
}
