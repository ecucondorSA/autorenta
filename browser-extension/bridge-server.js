#!/usr/bin/env node
/**
 * Bridge Server - Conecta Playwright MCP con Chrome Extension
 * Puerto: 9222
 *
 * Flujo:
 * 1. Playwright MCP (Claude Code) → HTTP/WS → Bridge Server → WebSocket → Chrome Extension
 * 2. Chrome Extension ejecuta acciones en el navegador
 * 3. Resultados vuelven a Bridge Server → Playwright MCP
 */

import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { URL } from 'url';

const PORT = 9222;
const WS_OPEN = 1; // WebSocket.OPEN
const wss = new WebSocketServer({ noServer: true });

let extensionConnected = false;
let extensionSocket = null;
let activeSessions = new Map();

console.log('[Bridge Server] Iniciando en puerto ' + PORT);
console.log('[Bridge Server] Esperando conexiones de Extension y Playwright MCP...');

// ========== WebSocket Server ==========
wss.on('connection', (ws, request) => {
  const clientType = request.headers['x-client-type'] || 'unknown';
  console.log('[Bridge] Nuevo cliente conectado:', clientType);

  if (clientType === 'extension') {
    // Chrome Extension conectada
    extensionSocket = ws;
    extensionConnected = true;
    console.log('[Bridge] ✅ Chrome Extension conectada');

    ws.send(JSON.stringify({
      type: 'handshake-ack',
      data: { status: 'connected', serverVersion: '1.0.0' }
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('[Bridge] Extension → Message:', message.type);

        // Si viene con sessionId, enviar respuesta al cliente original
        if (message.sessionId && activeSessions.has(message.sessionId)) {
          const clientSocket = activeSessions.get(message.sessionId);
          if (clientSocket && clientSocket.readyState === WS_OPEN) {
            clientSocket.send(JSON.stringify({
              type: 'action-result',
              sessionId: message.sessionId,
              data: message
            }));
            activeSessions.delete(message.sessionId);
          }
        }
      } catch (error) {
        console.error('[Bridge] Error parsing extension message:', error);
      }
    });

    ws.on('close', () => {
      console.log('[Bridge] ❌ Chrome Extension desconectada');
      extensionConnected = false;
      extensionSocket = null;
    });

  } else if (clientType === 'playwright' || clientType === 'claude-code') {
    // Cliente Playwright/Claude Code
    console.log('[Bridge] ✅ Cliente Playwright MCP conectado');

    ws.send(JSON.stringify({
      type: 'handshake-ack',
      data: {
        status: 'connected',
        extensionStatus: extensionConnected ? 'ready' : 'waiting'
      }
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        console.log('[Bridge] Playwright → Action:', message.action?.type);

        // Validar que extension está conectada
        if (!extensionConnected || !extensionSocket) {
          ws.send(JSON.stringify({
            type: 'error',
            sessionId: message.sessionId,
            error: 'Extension not connected'
          }));
          return;
        }

        // Generar sessionId si no existe
        const sessionId = message.sessionId || 'session_' + Date.now() + '_' + Math.random();

        // Guardar socket del cliente para respuesta
        activeSessions.set(sessionId, ws);

        // Enviar acción a extension
        extensionSocket.send(JSON.stringify({
          type: 'execute',
          sessionId,
          action: message.action,
          timeout: message.timeout || 5000
        }));

        // Timeout si no hay respuesta
        setTimeout(() => {
          if (activeSessions.has(sessionId)) {
            ws.send(JSON.stringify({
              type: 'error',
              sessionId,
              error: 'Action timeout'
            }));
            activeSessions.delete(sessionId);
          }
        }, (message.timeout || 5000) + 1000);

      } catch (error) {
        console.error('[Bridge] Error parsing playwright message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('[Bridge] Cliente Playwright desconectado');
    });
  }
});

// ========== HTTP Server ==========
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Health check endpoint
  if (pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      extensionConnected,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // Status endpoint
  if (pathname === '/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      server: 'Bridge Server v1.0.0',
      port: PORT,
      extensionConnected,
      activeSessions: activeSessions.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  // WebSocket upgrade
  if (req.headers['upgrade'] === 'websocket') {
    return;
  }

  // Default response
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Bridge Server - Use WebSocket to connect');
});

// ========== WebSocket Upgrade Handler ==========
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// ========== Error Handling ==========
server.on('error', (error) => {
  console.error('[Bridge] Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('[Bridge] Uncaught exception:', error);
});

// ========== Start Server ==========
server.listen(PORT, () => {
  console.log(`[Bridge Server] Escuchando en ws://localhost:${PORT}`);
  console.log('[Bridge Server] Esperando:');
  console.log('  - Chrome Extension (chrome://extensions → Load unpacked)');
  console.log('  - Claude Code con Playwright MCP');
});

// ========== Graceful Shutdown ==========
process.on('SIGINT', () => {
  console.log('[Bridge Server] Apagando...');
  server.close(() => {
    console.log('[Bridge Server] Cerrado');
    process.exit(0);
  });
});
