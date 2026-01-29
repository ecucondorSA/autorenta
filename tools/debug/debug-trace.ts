
import * as path from 'path';
import { McpTestClient } from '../tests/checkpoint/mcp-client';

async function main() {
  const client = new McpTestClient();
  await client.connect();

  const tracePath = path.resolve(process.cwd(), 'test-results/e2e-complete-booking-flow--328a3-nticación-y-navegar-a-lista-chromium-desktop/trace.zip');
  console.log(`Analyzing trace: ${tracePath}`);

  try {
    console.log('\n--- Console Logs ---');
    const logs = await client.callTool('get_browser_console_logs', { trace_path: tracePath });
    console.log(JSON.stringify(logs, null, 2));

    console.log('\n--- Network Analysis ---');
    const network = await client.callTool('analyze_trace_network', { trace_path: tracePath });
    console.log(JSON.stringify(network, null, 2));

  } catch (error) {
    console.error('Error analyzing trace:', error);
  } finally {
    await client.close();
  }
}

main();
