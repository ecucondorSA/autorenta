import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

class McpTestClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    const serverPath = path.resolve(process.cwd(), 'tools/state-aware-mcp/server.js');

    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    this.client = new Client(
      {
        name: "playwright-test-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect() {
    await this.client.connect(this.transport);
  }

  async close() {
    await this.client.close();
  }

  async callTool(name: string, args: any) {
    return await this.client.callTool({
      name,
      arguments: args,
    });
  }
}

async function analyzeFailure() {
  console.log('🚀 Analizando fallo del test con MCP...');
  const client = new McpTestClient();

  try {
    await client.connect();

    // 1. Buscar artifacts del test fallido
    console.log('\n📂 1. Buscando artifacts del test fallido...');
    // Hardcode path based on previous output or use a broader search
    const artifacts = await client.callTool('get_test_artifacts', {
      test_name: 'booking', // Broader search
      type: 'traces'
    });

    const artifactsData = JSON.parse(artifacts.content[0].text);
    // Sort by modification time to get the latest
    // (Assuming the tool returns modification time, if not take the last one)
    const trace = artifactsData.artifacts.traces.pop();

    if (!trace) {
      console.log('❌ No se encontró trace para el test.');
      return;
    }

    console.log(`✅ Trace encontrado: ${trace.path}`);

    // 2. Analizar logs de consola del navegador
    console.log('\n🖥️ 2. Analizando logs de consola...');
    const logs = await client.callTool('get_browser_console_logs', {
      trace_path: trace.path
    });
    console.log(logs.content[0].text);

    // 3. Analizar red
    console.log('\n🌐 3. Analizando red (errores 4xx/5xx)...');
    const network = await client.callTool('analyze_trace_network', {
      trace_path: trace.path,
      filter: 'failed'
    });
    console.log(network.content[0].text);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

analyzeFailure();
