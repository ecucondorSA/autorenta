/**
 * MCP client helper for Playwright tests and scripts.
 *
 * - Reads `.mcp.json` to discover configured MCP servers
 * - Provides `listTools` and `callTool` helpers that perform JSON-RPC calls
 * - Uses global fetch (Node 18+/20+) and accepts tokens via env vars
 */
import fs from 'fs';
import path from 'path';

type MCPConfig = Record<string, { type: string; url?: string; command?: string; args?: string[]; env?: Record<string, string> }>;

const MCP_FILE = path.resolve('.mcp.json');

function loadMcpConfig(): MCPConfig {
  if (!fs.existsSync(MCP_FILE)) throw new Error('.mcp.json not found in repo root');
  const raw = fs.readFileSync(MCP_FILE, 'utf-8');
  const parsed = JSON.parse(raw);
  return parsed.mcpServers || parsed;
}

export async function listTools(serverKey = 'autorenta-platform') {
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
      // allow token via env var per-server: MCP_<SERVER>_TOKEN or generic SUPABASE_MCP_TOKEN
      Authorization: `Bearer ${process.env[`MCP_${serverKey.toUpperCase()}_TOKEN`] || process.env.SUPABASE_MCP_TOKEN || ''}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MCP listTools failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.result;
}

export async function callTool(serverKey: string, toolName: string, args: any = {}) {
  const cfg = loadMcpConfig();
  const server = cfg[serverKey];
  if (!server || !server.url) throw new Error(`MCP server ${serverKey} not found or missing url`);

  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: toolName,
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
  const json = await res.json();
  return json.result;
}

export default { listTools, callTool };
