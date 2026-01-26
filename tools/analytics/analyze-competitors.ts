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
      { name: "competitor-analyzer", version: "1.0.0" },
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

async function analyzeTuro() {
  console.log('🚀 Iniciando Análisis de Competencia: TURO...');
  const client = new CompetitorAnalyzer();

  try {
    await client.connect();
    
    // 1. Navegar a una búsqueda directa en Turo (Los Angeles, fechas genéricas) para saltar el home
    // Usamos una URL de búsqueda para asegurar resultados
    console.log('\n🧭 1. Navegando a Turo (Resultados de búsqueda)...');
    await client.call('stream_navigate', { 
      url: 'https://turo.com/us/en/search?country=US&defaultZoomLevel=11&deliveryLocationType=city&endDate=01%2F20%2F2026&endTime=10%3A00&isMapSearch=false&itemsPerPage=200&latitude=34.0522342&location=Los+Angeles%2C+CA&locationType=CITY&longitude=-118.2436849&pickupType=ALL&region=CA&sortType=RELEVANCE&startDate=01%2F17%2F2026&startTime=10%3A00&useDefaultDates=true'
    });
    
    // Esperar a que carguen los resultados
    console.log('   ⏳ Esperando lista de autos...');
    try {
      // Turo usa clases ofuscadas/dinámicas, buscamos por tags semánticos o atributos comunes
      await client.call('stream_wait_for', { selector: 'a[href^="/us/en/car-rental/"]', timeout: 15000 });
    } catch (e) {
      console.log('   ⚠️ Timeout esperando lista. Tomando screenshot para debug...');
      await client.call('stream_screenshot', { fullPage: false });
      throw e;
    }

    // 2. Entrar al primer auto
    console.log('   👆 Entrando al primer auto encontrado...');
    await client.call('stream_click', { selector: 'a[href^="/us/en/car-rental/"]' });
    
    // Esperar navegación a detalle
    await new Promise(r => setTimeout(r, 5000));
    console.log('   ✅ Página de detalle cargada.');

    // 3. Captura de pantalla (Visual)
    console.log('\n📸 3. Capturando diseño de la página de detalle...');
    const shot = await client.call('stream_screenshot', { fullPage: false });
    console.log(shot);

    // 4. Extracción de Estructura (Código)
    console.log('\n🔍 4. Analizando estructura del DOM (Ingeniería Inversa)...');
    const analysis = await client.call('stream_evaluate',
      {
        script: `
        (() => {
          // Función auxiliar para limpiar clases ofuscadas y dejar estructura
          const getStructure = (root) => {
            if (!root) return 'Not found';
            
            // Identificar áreas clave
            const header = document.querySelector('h1')?.parentElement?.innerHTML.substring(0, 200);
            const gallery = document.querySelector('[data-testid="image-gallery"]')?.outerHTML.substring(0, 200) || 'Gallery not found by testid';
            
            // El widget de reserva suele ser un sidebar sticky
            // Buscamos algo que contenga el precio y botón de submit
            const sidebar = Array.from(document.querySelectorAll('div')).find(div => {
              return div.innerText.includes('trip start') || (div.innerText.includes('Go to checkout') && div.innerText.includes('$'));
            });

            return {
              title: document.title,
              h1: document.querySelector('h1')?.innerText,
              layout_type: 'Unknown', // Intentar deducir grid vs flex
              has_sticky_sidebar: !!sidebar,
              sidebar_text_sample: sidebar ? sidebar.innerText.substring(0, 100) : 'N/A'
            };
          };
          return getStructure(document.body);
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

analyzeTuro();
