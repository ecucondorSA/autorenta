import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

class CompetitorAnalyzer {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    const serverPath = path.resolve(process.cwd(), 'tools/patchright-streaming-mcp/server.js');
    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });
    this.client = new Client(
      { name: "competitor-analyzer-tripwip", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  async connect() { await this.client.connect(this.transport); }
  async close() { await this.client.close(); }

  async call(toolName: string, args: any) {
    const result = await this.client.callTool({ name: toolName, arguments: args });
    // @ts-ignore
    return result.content[0].text;
  }
}

async function analyzeTripWip() {
  console.log('🚀 Iniciando Análisis de Competencia: TripWip...');
  const client = new CompetitorAnalyzer();

  try {
    await client.connect();
    
    // 1. Navegar a TripWip
    console.log('\n🧭 1. Navegando a TripWip...');
    // Intentamos ir a una página de búsqueda o listado si es posible, o al home
    await client.call('stream_navigate', { 
      url: 'https://www.tripwip.app/' 
    });
    
    // Esperar carga
    await new Promise(r => setTimeout(r, 5000));
    
    // Intentar buscar un enlace a "Alquilar" o "Autos"
    console.log('   🔍 Buscando enlace a vehículos...');
    try {
        // Buscamos botones comunes
        const searchBtn = 'text=Buscar';
        await client.call('stream_click', { selector: searchBtn });
        console.log('   👆 Click en Buscar...');
        await new Promise(r => setTimeout(r, 5000));
    } catch (e) {
        console.log('   ⚠️ No se encontró botón Buscar directo.');
    }

    // Intentar encontrar una tarjeta de auto
    console.log('   ⏳ Esperando lista de autos...');
    try {
      // Selectores genéricos de tarjetas (clases suelen cambiar, buscamos estructura)
      // Buscamos algo que parezca un precio o un modelo
      await client.call('stream_wait_for', { selector: 'img', timeout: 10000 });
    } catch (e) {
      console.log('   ⚠️ Timeout esperando lista.');
    }

    // 2. Screenshot del listado (o home)
    console.log('\n📸 2. Capturando pantalla actual...');
    const shot = await client.call('stream_screenshot', { fullPage: false });
    console.log(shot);

    // 3. Análisis de DOM
    const analysis = await client.call('stream_evaluate', {
      script: `
        (() => {
          return {
            title: document.title,
            meta_desc: document.querySelector('meta[name="description"]')?.content,
            h1: document.querySelector('h1')?.innerText,
            links: Array.from(document.querySelectorAll('a')).map(a => a.href).slice(0, 5)
          };
        })()
      `
    });
    console.log(analysis);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

analyzeTripWip();
