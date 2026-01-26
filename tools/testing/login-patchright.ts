import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

class PatchrightLoginClient {
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
        name: "patchright-login-client",
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

async function runLogin() {
  console.log('🚀 Iniciando login en Patchright MCP...');

  const client = new PatchrightLoginClient();

  try {
    console.log('🔌 Conectando al servidor MCP Patchright...');
    await client.connect();
    console.log('✅ Conectado.');

    // 1. Navegar a la página de login
    console.log('\n🧭 1. Navegando a http://localhost:4200/auth/login...');
    const navResult = await client.callTool('stream_navigate', {
      url: 'http://localhost:4200/auth/login'
    });
    console.log('   Resultado de navegación:', (navResult as any).content[0].text);

    // 2. Esperar que cargue la página
    console.log('\n⏳ 2. Esperando 3 segundos para que cargue el formulario...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 3. Llenar email
    console.log('\n📧 3. Llenando email: ecucondor@gmail.com...');
    const fillEmailResult = await client.callTool('execute_javascript', {
      code: `document.querySelector('#login-email').value = 'ecucondor@gmail.com';`
    });
    console.log('   Email llenado.');

    // 4. Llenar password
    console.log('\n🔒 4. Llenando password...');
    const fillPassResult = await client.callTool('execute_javascript', {
      code: `document.querySelector('#login-password').value = 'Ab.12345';`
    });
    console.log('   Password llenado.');

    // 5. Hacer click en el botón de login
    console.log('\n👆 5. Haciendo click en "Ingresar"...');
    const clickResult = await client.callTool('execute_javascript', {
      code: `document.querySelector('button').click();`
    });
    console.log('   Click realizado.');

    // 6. Esperar redirección post-login
    console.log('\n⏳ 6. Esperando redirección post-login (10 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    // 7. Verificar si estamos logueados (no en /auth/login)
    console.log('\n🔍 7. Verificando login...');
    const urlResult = await client.callTool('execute_javascript', {
      code: `window.location.href`
    });
    const currentUrl = (urlResult as any).content[0].text;
    console.log(`   URL actual: ${currentUrl}`);

    if (currentUrl.includes('/auth/login')) {
      console.log('❌ Parece que el login falló (aún en login page).');
    } else {
      console.log('✅ Login exitoso! Navegado fuera de la página de login.');
    }

    console.log('\n🎯 Sesión de login lista. Manteniendo abierta.');
    console.log('   Presiona Ctrl+C para cerrar.');

    // Mantener vivo indefinidamente
    await new Promise(() => {}); // Nunca resuelve

  } catch (error) {
    console.error('❌ Error durante el login:', error);
  } finally {
    // Solo cerrar si hay error
    await client.close();
  }
}

runLogin();