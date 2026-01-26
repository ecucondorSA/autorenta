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
    });

    this.client = new Client(
      {
        name: "patchright-test-client",
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

async function runTest() {
  console.log('🚀 Iniciando prueba de Patchright MCP...');

  const client = new PatchrightTestClient();

  try {
    console.log('🔌 Conectando al servidor MCP Patchright...');
    await client.connect();
    console.log('✅ Conectado.');

    // 1. Navegar a localhost:4200
    console.log('\n🧭 1. Navegando a http://localhost:4200...');
    const navResult = await client.callTool('stream_navigate', {
      url: 'http://localhost:4200'
    });
    console.log('   Resultado de navegación:', navResult.content[0].text);

    // 1.5 Esperar a que pase el Splash Screen (7s) y cargue el modelo
    console.log('\n⏳ 1.5 Esperando 12 segundos (Splash + Carga 3D)...');
    await new Promise(resolve => setTimeout(resolve, 12000));

    // 2. Tomar screenshot
    console.log('\n📸 2. Tomando captura de pantalla...');
    const screenshotResult = await client.callTool('stream_screenshot', {
      fullPage: false,
      compress: true
    });
    console.log('   Resultado de screenshot:', screenshotResult.content[0].text);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    // Cerrar sesión
    try {
      await client.callTool('stream_close', {});
    } catch (e) { }
    await client.close();
    console.log('\n👋 Prueba finalizada.');
  }
}

runTest();
