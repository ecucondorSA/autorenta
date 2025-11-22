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

async function listTools(serverKey = 'autorenta-platform') {
  const server = cfg[serverKey];
  if (!server || !server.url) throw new Error(`MCP server ${serverKey} not found or missing url`);
  const body = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  };

  const token = process.env[`MCP_${serverKey.toUpperCase()}_TOKEN`] || process.env.SUPABASE_MCP_TOKEN || '';

  const res = await fetch(server.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`MCP listTools failed: ${res.status} ${res.statusText}`);
  const json = await res.json();
  return json.result;
}

(async () => {
  console.log('MCP servers discovered:', Object.keys(cfg));
  for (const key of Object.keys(cfg)) {
    try {
      console.log('\n-- calling listTools on', key, cfg[key].url);
      const r = await listTools(key);
      console.log('result:', JSON.stringify(r, null, 2));
    } catch (err) {
      console.error('error calling', key, err.message || err);
    }
  }
})();
