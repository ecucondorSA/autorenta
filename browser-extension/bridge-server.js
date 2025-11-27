#!/usr/bin/env node
/**
 * Bridge Server v1.2 - Professional Browser Extension Bridge
 *
 * Conecta Claude Code MCP con Chrome Extension via WebSocket.
 * Identificación de clientes por handshake (no headers).
 */

import http from 'http';
import { URL } from 'url';
import { WebSocketServer } from 'ws';

const PORT = 9223;
const WS_OPEN = 1;
const wss = new WebSocketServer({ noServer: true });

// State
let extensionSocket = null;
let extensionConnected = false;
const mcpClients = new Map();
const activeSessions = new Map();

console.log('[Bridge v1.2] Starting on port ' + PORT);

// ========== WebSocket Connection Handler ==========
wss.on('connection', (ws, request) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  let clientType = 'unknown';
  let identified = false;

  console.log(`[Bridge] New connection: ${clientId}`);

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      // ===== HANDSHAKE - Identify client type =====
      if (message.type === 'handshake' && !identified) {
        clientType = message.data?.clientType || 'unknown';
        identified = true;

        if (clientType === 'extension') {
          // Chrome Extension connected
          extensionSocket = ws;
          extensionConnected = true;
          console.log('[Bridge] ✅ Chrome Extension connected');

          ws.send(JSON.stringify({
            type: 'handshake-ack',
            data: { status: 'connected', serverVersion: '1.2.0' }
          }));

        } else if (clientType === 'claude-code' || clientType === 'mcp') {
          // MCP Client connected
          mcpClients.set(clientId, ws);
          console.log('[Bridge] ✅ MCP Client connected');

          ws.send(JSON.stringify({
            type: 'handshake-ack',
            data: {
              status: 'connected',
              extensionStatus: extensionConnected ? 'ready' : 'waiting'
            }
          }));
        }
        return;
      }

      // ===== ACTION from MCP =====
      if (message.type === 'action' && clientType !== 'extension') {
        console.log('[Bridge] MCP → Action:', message.action?.type);

        if (!extensionConnected || !extensionSocket || extensionSocket.readyState !== WS_OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            sessionId: message.sessionId,
            error: 'Extension not connected'
          }));
          return;
        }

        const sessionId = message.sessionId || `session_${Date.now()}`;
        activeSessions.set(sessionId, { ws, timestamp: Date.now() });

        // Forward to extension
        extensionSocket.send(JSON.stringify({
          type: 'execute',
          sessionId,
          action: message.action,
          timeout: message.timeout || 10000
        }));

        // Timeout handler
        setTimeout(() => {
          if (activeSessions.has(sessionId)) {
            const session = activeSessions.get(sessionId);
            if (session.ws.readyState === WS_OPEN) {
              session.ws.send(JSON.stringify({
                type: 'action-result',
                sessionId,
                data: { error: 'Action timeout' }
              }));
            }
            activeSessions.delete(sessionId);
          }
        }, (message.timeout || 10000) + 2000);

        return;
      }

      // ===== RESULT from Extension =====
      if (clientType === 'extension') {
        // Action result
        if (message.sessionId && activeSessions.has(message.sessionId)) {
          const session = activeSessions.get(message.sessionId);
          if (session.ws.readyState === WS_OPEN) {
            session.ws.send(JSON.stringify({
              type: 'action-result',
              sessionId: message.sessionId,
              data: message.result || message
            }));
          }
          activeSessions.delete(message.sessionId);
          console.log('[Bridge] Extension → Result for:', message.sessionId);
        }
      }

    } catch (error) {
      console.error('[Bridge] Message parse error:', error.message);
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    if (clientType === 'extension') {
      console.log('[Bridge] ❌ Chrome Extension disconnected');
      extensionConnected = false;
      extensionSocket = null;
    } else if (mcpClients.has(clientId)) {
      console.log('[Bridge] MCP Client disconnected');
      mcpClients.delete(clientId);
    }
  });

  ws.on('error', (err) => {
    console.error('[Bridge] WebSocket error:', err.message);
  });
});

// ========== HTTP Server ==========
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (url.pathname === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'ok',
      extensionConnected,
      mcpClients: mcpClients.size,
      activeSessions: activeSessions.size,
      timestamp: new Date().toISOString()
    }));
    return;
  }

  if (url.pathname === '/status') {
    res.writeHead(200);
    res.end(JSON.stringify({
      server: 'Bridge Server v1.2.0',
      port: PORT,
      extensionConnected,
      mcpClients: mcpClients.size,
      activeSessions: activeSessions.size,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

// WebSocket upgrade
server.on('upgrade', (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req);
  });
});

// Error handling
server.on('error', (err) => console.error('[Bridge] Server error:', err));
process.on('uncaughtException', (err) => console.error('[Bridge] Uncaught:', err));

// Start
server.listen(PORT, () => {
  console.log(`[Bridge v1.2] Listening on ws://localhost:${PORT}`);
  console.log('[Bridge v1.2] Waiting for connections...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Bridge] Shutting down...');
  server.close(() => process.exit(0));
});
process.on('SIGTERM', () => {
  console.log('[Bridge] Shutting down...');
  server.close(() => process.exit(0));
});
