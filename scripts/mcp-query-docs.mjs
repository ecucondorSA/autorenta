#!/usr/bin/env node
// Query the MCP 'search-documentation' tool and print results.
import fs from 'fs';
import path from 'path';

const MCP_FILE = path.resolve('.mcp.json');
if (!fs.existsSync(MCP_FILE)) {
  console.error('.mcp.json not found in repo root');
  process.exit(2);
}

const raw = fs.readFileSync(MCP_FILE, 'utf-8');
const parsed = JSON.parse(raw);
const cfg = parsed.mcpServers || parsed;
const serverKey = process.env.MCP_SERVER || 'supabase';
const server = cfg[serverKey];
if (!server || !server.url) {
  console.error(`MCP server '${serverKey}' not found or missing url in .mcp.json`);
  console.error('Available servers:', Object.keys(cfg).join(', '));
  process.exit(2);
}

const query = process.argv.slice(2).join(' ') || 'marketplace split payments';

async function callSearchDocumentation(q) {
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'search-documentation', arguments: { query: q } },
  };

  const res = await fetch(server.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env[`MCP_${serverKey.toUpperCase()}_TOKEN`] || process.env.SUPABASE_MCP_TOKEN || ''}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`MCP request failed: ${res.status} ${res.statusText} - ${text}`);
  }
  const json = await res.json();
  return json;
}

(async () => {
  try {
    console.log(`Querying MCP server '${serverKey}' (url=${server.url}) with query: ${query}`);
    const out = await callSearchDocumentation(query);
    console.log(JSON.stringify(out, null, 2));
  } catch (err) {
    console.error('Error calling MCP:', err);
    process.exit(1);
  }
})();
