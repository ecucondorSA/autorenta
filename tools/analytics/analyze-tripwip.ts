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
    await client.call('stream_navigate', { 
      url: 'https://www.tripwip.app/' 
    });
    
    // Esperar hidratación
    await new Promise(r => setTimeout(r, 4000));

    // 2. EXTRACCIÓN PROFUNDA (Deep Extraction)
    console.log('\n💉 2. Ejecutando extracción de datos internos...');
    
    const extraction = await client.call('stream_evaluate', {
      script: `
        (() => {
          // A. Extraer __NEXT_DATA__ (La mina de oro)
          const nextData = window.__NEXT_DATA__ || {};
          
          // B. Buscar claves en variables de entorno runtime
          const env = nextData.runtimeConfig || nextData.env || nextData.props?.pageProps?.env || {};
          
          // C. Analizar el formulario de búsqueda para ingeniería inversa
          const searchInputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
            tag: el.tagName,
            id: el.id,
            name: el.name,
            placeholder: el.placeholder,
            type: el.type,
            value: el.value,
            class: el.className
          }));

          // D. Buscar enlaces profundos para entender la estructura de URL
          const deepLinks = Array.from(document.querySelectorAll('a'))
            .map(a => a.getAttribute('href'))
            .filter(href => href && href.startsWith('/'))
            .slice(0, 20);

          // E. Intentar encontrar la instancia de Supabase en memoria
          // A veces los desarrolladores la exponen en window sin querer
          let supabaseConfig = null;
          try {
             const chunkKeys = Object.keys(window).filter(k => k.toLowerCase().includes('supabase'));
             supabaseConfig = chunkKeys;
          } catch(e) {}

          return {
            buildId: nextData.buildId,
            props: nextData.props ? Object.keys(nextData.props) : [],
            pagePropsKeys: nextData.props?.pageProps ? Object.keys(nextData.props.pageProps) : [],
            envVars: env,
            searchFormStructure: searchInputs,
            internalRoutes: deepLinks,
            supabaseHints: supabaseConfig
          };
        })()
      `
    });

    console.log('\n📊 DATOS EXTRAÍDOS:');
    console.log(JSON.stringify(extraction, null, 2));

    /*
    // 3. Screenshot de referencia
    console.log('\n📸 3. Capturando evidencia visual...');
    const shot = await client.call('stream_screenshot', { fullPage: false });
    console.log(shot);
    */
    
    /* OLD LOGIC REMOVED */
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

analyzeTripWip();
