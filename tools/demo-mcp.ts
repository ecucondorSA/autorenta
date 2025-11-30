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

  async readResource(uri: string) {
    return await this.client.readResource({
      uri,
    });
  }
}

async function runDemo() {
  console.log('🚀 Iniciando demostración de MCP State-Aware Testing...');

  const client = new McpTestClient();

  try {
    console.log('🔌 Conectando al servidor MCP...');
    await client.connect();
    console.log('✅ Conectado.');

    // 1. Analizar estructura del test
    console.log('\n📊 1. Analizando estructura del test: tests/renter/03-booking-flow.spec.ts');
    const analysis = await client.callTool('analyze_test_structure', {
      file_path: 'tests/renter/03-booking-flow.spec.ts',
      extract: ['describes', 'tests', 'locators']
    });

    // Parsear el resultado que viene como string JSON dentro de content[0].text
    const analysisData = JSON.parse(analysis.content[0].text);
    console.log('   Resultados del análisis:');
    console.log(`   - Describes: ${analysisData.describes.join(', ')}`);
    console.log(`   - Tests: ${analysisData.tests.join(', ')}`);
    console.log(`   - Líneas de código: ${analysisData.line_count}`);

    // 2. Buscar código fuente de un componente usado en el test
    console.log('\n🔍 2. Buscando código fuente del componente "CarDetailPage"');
    const source = await client.callTool('read_component_source', {
      component_name: 'CarDetailPage',
      search_in: 'pages' // Sabemos que está en pages
    });

    const sourceData = JSON.parse(source.content[0].text);
    if (sourceData.found > 0) {
      console.log(`   ✅ Encontrado en: ${sourceData.results[0].ts_file}`);
      console.log('   Vista previa del código:');
      console.log('   ---------------------------------------------------');
      console.log(sourceData.results[0].ts_preview.split('\n').slice(0, 10).join('\n'));
      console.log('   ... (truncado)');
      console.log('   ---------------------------------------------------');
    } else {
      console.log('   ❌ No se encontró el componente.');
    }

    // 3. Buscar definición de un selector (simulado, ya que el test usa Page Objects)
    // Pero podemos buscar dónde se define "selectFirstCar" en el código
    console.log('\n🕵️ 3. Buscando definición del método "selectFirstCar"');
    const selectorDef = await client.callTool('find_selector_definition', {
      selector: 'selectFirstCar',
      include_tests: false
    });

    const selectorData = JSON.parse(selectorDef.content[0].text);
    console.log(`   Encontrado en ${selectorData.total_files} archivos.`);
    if (selectorData.results.length > 0) {
      console.log(`   Archivo: ${selectorData.results[0].file}`);
      console.log(`   Línea: ${selectorData.results[0].lines[0].line_number}`);
      console.log(`   Contenido: ${selectorData.results[0].lines[0].content}`);
    }

  } catch (error) {
    console.error('❌ Error durante la demo:', error);
  } finally {
    await client.close();
    console.log('\n👋 Demo finalizada.');
  }
}

runDemo();
