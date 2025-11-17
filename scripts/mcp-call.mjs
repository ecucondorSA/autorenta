#!/usr/bin/env node
// Autonomous JS MCP CLI - does not import TypeScript files
import fs from 'fs';
import path from 'path';

const MCP_FILE = path.resolve('.mcp.json');
const [,, cmd, serverKeyArg, toolName, ...rest] = process.argv;

function loadMcpConfig() {
  if (!fs.existsSync(MCP_FILE)) {
    console.error('.mcp.json not found in repo root');
    process.exit(2);
  }
  const raw = fs.readFileSync(MCP_FILE, 'utf-8');
  const parsed = JSON.parse(raw);
  return parsed.mcpServers || parsed;
}

async function listTools(serverKey = 'autorenta-platform') {
  const cfg = loadMcpConfig();
  const server = cfg[serverKey];
  if (!server || !server.url) throw new Error(`MCP server ${serverKey} not found or missing url`);

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  };

  const res = await fetch(server.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env[`MCP_${serverKey.toUpperCase()}_TOKEN`] || process.env.SUPABASE_MCP_TOKEN || ''}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MCP listTools failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function callTool(serverKey, toolNameArg, args = {}) {
  const cfg = loadMcpConfig();
  const server = cfg[serverKey];
  if (!server || !server.url) throw new Error(`MCP server ${serverKey} not found or missing url`);

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: toolNameArg,
      arguments: args,
    },
  };

  const res = await fetch(server.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env[`MCP_${serverKey.toUpperCase()}_TOKEN`] || process.env.SUPABASE_MCP_TOKEN || ''}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MCP callTool failed: ${res.status} ${res.statusText}`);
  return res.json();
}

async function main() {
  if (!cmd || cmd === 'help') {
    console.log('Usage: node scripts/mcp-call.mjs list <serverKey>');
    console.log('       node scripts/mcp-call.mjs call <serverKey> <toolName> <jsonArgs>');
    process.exit(0);
  }

  if (cmd === 'list') {
    const res = await listTools(serverKeyArg || 'autorenta-platform');
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  if (cmd === 'call') {
    if (!serverKeyArg || !toolName) {
      console.error('call requires serverKey and toolName');
      process.exit(2);
    }
    const args = rest.length ? JSON.parse(rest.join(' ')) : {};
    const res = await callTool(serverKeyArg, toolName, args);
    console.log(JSON.stringify(res, null, 2));
    return;
  }

  console.error('Unknown command');
  process.exit(2);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
