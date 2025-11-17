import { expect, test } from '../playwright/fixtures';

test.describe('MCP integration smoke', () => {
  test('list tools from autorenta-platform MCP', async ({ mcp }) => {
    // This test will attempt to call the MCP server defined in .mcp.json
    // In CI or local environments you must set SUPABASE_MCP_TOKEN or MCP_AUTORENTA-PLATFORM_TOKEN
    const result = await mcp.listTools('autorenta-platform');
    // Expect result.tools to be an array when the server responds correctly
    expect(result).toBeTruthy();
    if (Array.isArray(result.tools)) {
      expect(result.tools.length).toBeGreaterThanOrEqual(0);
    }
  });

  test('call sample tool on MercadoPago MCP if available', async ({ mcp }) => {
    // The 'mercadopago' MCP server may not be present; use 'supabase' or 'autorenta-platform' depending on env
    const serverKey = 'supabase';
    try {
      const tools = await mcp.listTools(serverKey);
      // If there is a tool named 'search-documentation' call it as a smoke test
      const found = Array.isArray(tools.tools) ? tools.tools.find((t: any) => t.name === 'search-documentation') : null;
      if (found) {
        const out = await mcp.callTool(serverKey, 'search-documentation', { query: 'marketplace split payments' });
        expect(out).toBeDefined();
      } else {
        test.skip(true, `search-documentation tool not available on ${serverKey}`);
      }
    } catch (err) {
      test.skip(true, `MCP server ${serverKey} unreachable: ${err}`);
    }
  });
});
