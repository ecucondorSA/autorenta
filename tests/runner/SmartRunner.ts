import { spawn } from 'child_process';
import * as path from 'path';

export interface SmartRunnerConfig {
  specFile?: string;
  project?: string;
  headed?: boolean;
  debug?: boolean;
}

export class SmartRunner {
  private config: SmartRunnerConfig;
  private artifactsDir: string;

  constructor(config: SmartRunnerConfig) {
    this.config = config;
    this.artifactsDir = path.resolve(process.cwd(), 'e2e/artifacts');
  }

  async run(): Promise<void> {
    console.log('🚀 SmartRunner: Iniciando ejecución de pruebas...');

    const args = ['test', '--config=e2e/playwright.config.ts'];

    // Configurar argumentos de Playwright
    if (this.config.specFile) {
      args.push(this.config.specFile);
    }

    if (this.config.project) {
      args.push(`--project=${this.config.project}`);
    }

    if (this.config.headed) {
      args.push('--headed');
    }

    // Siempre generar reporte JSON para análisis
    const reportFile = path.resolve(this.artifactsDir, `smart-report-${Date.now()}.json`);
    args.push('--reporter=json');

    // Usamos una variable de entorno para decirle a Playwright dónde guardar el JSON
    // Nota: Playwright permite configurar output file en el config, pero aquí forzamos uno específico para este run
    process.env.PLAYWRIGHT_JSON_OUTPUT_NAME = reportFile;

    console.log(`📝 Ejecutando: npx playwright ${args.join(' ')}`);

    return new Promise((resolve, reject) => {
      // Asegurar que baseURL esté definido para evitar "Invalid URL"
      const env = {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_NAME: reportFile,
        E2E_WEB_PORT: process.env.E2E_WEB_PORT || '4300',
        // Si no hay URL definida, forzamos localhost con el puerto
        E2E_WEB_URL: process.env.E2E_WEB_URL || `http://localhost:${process.env.E2E_WEB_PORT || '4300'}`
      };

      const child = spawn('npx', ['playwright', ...args], {
        stdio: 'pipe',
        shell: true,
        env
      });

      // Capturar salida en tiempo real
      child.stdout.on('data', (data) => {
        const output = data.toString();
        // Filtrar un poco el ruido, o mostrar todo si es debug
        process.stdout.write(output);
      });

      child.stderr.on('data', (data) => {
        process.stderr.write(data);
      });

      child.on('close', async (code) => {
        console.log(`\n🏁 Playwright finalizó con código: ${code}`);

        if (code !== 0) {
          console.log('⚠️ Detectados fallos en las pruebas. Analizando reporte...');
          await this.analyzeFailure(reportFile);
        } else {
          console.log('✅ Todas las pruebas pasaron exitosamente.');
        }

        resolve();
      });
    });
  }

  private async analyzeFailure(reportPath: string): Promise<void> {
    // En una implementación real, Playwright JSON reporter escribe a stdout o a archivo según config.
    // Aquí asumimos que hemos capturado el JSON de alguna forma o configurado el reporter.
    // Como el reporter 'json' escribe a stdout por defecto si no se configura archivo,
    // en este MVP vamos a simular el análisis si no encontramos el archivo fácil.

    // NOTA: Para que esto funcione robustamente, deberíamos configurar un reporter custom o
    // asegurar que playwright.config.ts respete la variable de entorno para el output file.
    // Por ahora, vamos a intentar leer el archivo si existe (configurado en el spawn env var si el config lo soporta)
    // O simplemente simular la intervención.

    console.log('\n🕵️ SmartRunner: Iniciando análisis de fallo...');

    // Simulación de "AI Intervention"
    console.log('🤖 IA: "He detectado un error. Capturando contexto..."');
    console.log('📸 Screenshot: [Simulado] captured-failure.png');
    console.log('📄 Logs: [Simulado] Error log extract...');

    console.log('\n✨ Oportunidad de Auto-Corrección detectada.');
    console.log('   (En el futuro, aquí la IA generaría el parche y re-ejecutaría)');
  }
}
