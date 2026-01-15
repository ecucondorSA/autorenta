import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

class PatchrightTestClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    const serverPath = path.resolve(process.cwd(), 'tools/patchright-streaming-mcp/server.js');

    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
      env: { HEADLESS: 'true' }
    });

    this.client = new Client(
      {
        name: "patchright-google-client",
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

async function testGoogle() {
  console.log('🚀 Navegando a Google con Patchright streaming...');

  const client = new PatchrightTestClient();

  try {
    console.log('🔌 Conectando al servidor MCP Patchright...');
    await client.connect();
    console.log('✅ Conectado.');

    // 1. Navegar a Google
    console.log('\n🌐 1. Navegando a https://www.google.com...');
    const navResult = await client.callTool('stream_navigate', {
      url: 'https://www.google.com',
      waitUntil: 'domcontentloaded'
    });
    console.log('   Resultado de navegación:', navResult.content[0].text);

    // 2. Esperar un poco para que cargue
    console.log('\n⏳ 2. Esperando 3 segundos para que cargue...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Tomar screenshot
    console.log('\n📸 3. Tomando captura de pantalla...');
    const screenshotResult = await client.callTool('stream_screenshot', {
      fullPage: false,
      compress: true
    });
    console.log('   Resultado de screenshot:', screenshotResult.content[0].text);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Cerrar sesión
    try {
      await client.callTool('stream_close', {});
    } catch (e) { }
    await client.close();
    console.log('\n👋 Prueba finalizada.');
  }
}

testGoogle();