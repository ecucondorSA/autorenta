import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

class PatchrightE2EClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    const serverPath = path.resolve(process.cwd(), 'tools/patchright-streaming-mcp/server.js');
    console.log(`🔌 Conectando a servidor MCP en: ${serverPath}`);

    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    this.client = new Client(
      {
        name: "patchright-e2e-client",
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
    try {
      await this.client.callTool({ name: 'stream_close', arguments: {} });
    } catch (e) {
      // Ignorar error
    }
    await this.client.close();
  }

  async call(toolName: string, args: any) {
    const result = await this.client.callTool({
      name: toolName,
      arguments: args,
    });
    // @ts-ignore
    return result.content[0].text;
  }
}

async function runE2E() {
  console.log('🚀 Iniciando Simulación de Usuario (E2E Local) - Flow: LOGIN');
  const client = new PatchrightE2EClient();

  try {
    await client.connect();
    console.log('✅ Cliente MCP conectado.');

    // 1. Navegar a Home
    console.log('\n🧭 1. Navegando a http://localhost:4200...');
    const navResult = await client.call('stream_navigate', {
      url: 'http://localhost:4200'
    });
    console.log(navResult);

    // 2. Esperar carga inicial
    console.log('\n⏳ 2. Esperando carga inicial (Home)...');
    await new Promise(r => setTimeout(r, 5000)); 

    // 3. Buscar botón de Ingresar
    console.log('\n🔍 3. Buscando botón "Ingresar"...');
    // Usamos selector de texto de Playwright/Patchright que es muy robusto
    const loginSelector = 'text=Ingresar'; 
    
    await client.call('stream_wait_for', {
      selector: loginSelector,
      timeout: 10000 
    });
    console.log('✅ Botón encontrado');

    // 4. Hacer clic en Ingresar
    console.log('\n👆 4. Haciendo clic en "Ingresar"...');
    await client.call('stream_click', { selector: loginSelector });

    // 5. Esperar navegación a Login
    console.log('\n⏳ 5. Esperando navegación a /auth/login...');
    await new Promise(r => setTimeout(r, 3000)); 
    
    // Validar URL
    const urlResult = await client.call('stream_evaluate', {
      script: 'window.location.href'
    });
    console.log(`   📍 URL actual: ${urlResult}`);

    if (String(urlResult).includes('/auth/login')) {
      console.log('✅ ÉXITO: Navegación a Login correcta.');
    } else {
      console.error('❌ FALLO: No se navegó a la página de login.');
    }

    // 6. Screenshot final
    console.log('\n📸 6. Tomando evidencia (screenshot)...');
    const shotResult = await client.call('stream_screenshot', {
      fullPage: false
    });
    console.log(shotResult);

  } catch (error) {
    console.error('\n❌ Error crítico en la prueba:', error);
  } finally {
    await client.close();
    console.log('\n👋 Prueba finalizada.');
  }
}

runE2E();