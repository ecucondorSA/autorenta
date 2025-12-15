import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as path from "path";

class PatchrightBookingClient {
  private client: Client;
  private transport: StdioClientTransport;

  constructor() {
    const serverPath = path.resolve(process.cwd(), 'tools/patchright-streaming-mcp/server.js');
    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });
    this.client = new Client(
      { name: "patchright-booking-client", version: "1.0.0" },
      { capabilities: {} }
    );
  }

  async connect() { await this.client.connect(this.transport); }
  
  async close() {
    try { await this.client.callTool({ name: 'stream_close', arguments: {} }); } catch (e) {}
    await this.client.close();
  }

  async call(toolName: string, args: any) {
    const result = await this.client.callTool({ name: toolName, arguments: args });
    // @ts-ignore
    return result.content[0].text;
  }
}

async function runBookingTest() {
  console.log('🚀 Iniciando Prueba de Reserva (Booking Flow)...');
  const client = new PatchrightBookingClient();

  try {
    await client.connect();
    console.log('✅ Conectado.');

    // --- PASO 1: LOGIN ---
    console.log('\n🔐 1. Iniciando sesión...');
    await client.call('stream_navigate', { url: 'http://localhost:4200/auth/login' });
    
    // Esperar inputs
    await client.call('stream_wait_for', { selector: 'input[name="email"]' });
    
    // Llenar credenciales
    console.log('   Escribiendo email...');
    await client.call('stream_fill', { selector: 'input[name="email"]', text: 'ecucondor@gmail.com' });
    
    console.log('   Escribiendo password...');
    await client.call('stream_fill', { selector: 'input[name="password"]', text: 'Ab.12345' });
    
    // Click Ingresar
    console.log('   Click en Ingresar...');
    await client.call('stream_click', { selector: 'button[type="submit"]' });
    
    // Esperar navegación post-login (a home o cars list)
    console.log('   ⏳ Esperando redirección...');
    await new Promise(r => setTimeout(r, 5000));
    
    const currentUrl = await client.call('stream_evaluate', { script: 'window.location.href' });
    console.log(`   📍 URL tras login: ${currentUrl}`);

    // --- PASO 2: SELECCIONAR AUTO ---
    console.log('\n🚗 2. Seleccionando auto...');
    // Forzar navegación a la lista de autos después del login
    console.log('   Navegando a la lista general de autos (/cars)...');
    await client.call('stream_navigate', { url: 'http://localhost:4200/cars' }); // /cars es alias de /cars/list
    await new Promise(r => setTimeout(r, 5000)); // Esperar carga de la página
    
    // Esperar tarjetas
    console.log('   ⏳ Esperando lista de autos...');
    try {
        await client.call('stream_wait_for', { selector: 'article', timeout: 15000 });
        console.log('   ✅ Autos encontrados.');
    } catch (e) {
        console.error('   ❌ No se encontraron autos en la lista.');
        throw new Error('No se pudo encontrar ningún auto para reservar.');
    }

    // Extraer el link de detalle del primer auto de la lista
    console.log('   🔍 Extrayendo routerLink del primer auto...');
    const carDetailPath = await client.call('stream_evaluate', {
      script: `
        (() => {
          const firstCarCard = document.querySelector('article');
          if (firstCarCard) {
            // Angular usa 'ng-reflect-router-link' o a veces un 'a' interno
            const routerLinkAttr = firstCarCard.getAttribute('ng-reflect-router-link');
            if (routerLinkAttr) return routerLinkAttr;
            const anchor = firstCarCard.querySelector('a[routerLink]');
            if (anchor) return anchor.getAttribute('routerLink');
          }
          return null;
        })();
      `
    });

    if (!carDetailPath || carDetailPath === 'null') {
      throw new Error('No se pudo extraer el link de detalle del primer auto.');
    }

    console.log(`   ➡️ Navegando directamente a: http://localhost:4200${carDetailPath}`);
    await client.call('stream_navigate', { url: `http://localhost:4200${carDetailPath}` });
    await new Promise(r => setTimeout(r, 5000)); // Esperar la carga de la página de detalle
    
    const detailUrl = await client.call('stream_evaluate', { script: 'window.location.href' });
    console.log(`   📍 URL tras navegar al detalle: ${detailUrl}`);

        // --- PASO 3: INTENTAR RESERVAR Y SELECCIONAR FECHAS ---
        console.log('\n📅 3. Intentando reservar y/o seleccionar fechas...');
        
        const bookBtnSelector = '#book-now';
        try {
            await client.call('stream_wait_for', { selector: bookBtnSelector, timeout: 15000 });
            console.log('   ✅ Botón de reserva encontrado en página de detalle.');
    
            const buttonText = await client.call('stream_evaluate', {
              script: `document.querySelector('${bookBtnSelector}')?.innerText;`
            });
            console.log(`   Texto del botón de reserva: "${buttonText}"`);
    
            if (String(buttonText).includes('Ver Disponibilidad')) {
                console.log('   🗓️ El botón dice "Ver Disponibilidad", intentando seleccionar fechas...');
                // Clicar en el input del date picker para abrirlo
                await client.call('stream_click', { selector: 'app-date-range-picker' });
                await new Promise(r => setTimeout(r, 2000)); // Esperar que el calendario se abra
                
                // Seleccionar dos días disponibles (asumimos que están visibles)
                // Esto puede variar mucho según la implementación del date picker
                // Buscamos un día que sea clickable (no deshabilitado)
                console.log('   👆 Seleccionando dos días del calendario...');
                try {
                    // Buscamos un día no deshabilitado, y luego el siguiente
                    // Playwright usa text="1", text="2" para buscar los números de día
                    await client.call('stream_click', { selector: 'div.flatpickr-day:not(.flatpickr-disabled):not(.prevMonthDay):not(.nextMonthDay)' });
                    await new Promise(r => setTimeout(r, 500));
                    await client.call('stream_click', { selector: 'div.flatpickr-day.selected + div.flatpickr-day:not(.flatpickr-disabled)' });
                    console.log('   ✅ Fechas seleccionadas.');
                    await new Promise(r => setTimeout(r, 1000)); // Esperar la UI se actualice
                } catch (dateError) {
                    console.warn('   ⚠️ No se pudieron seleccionar las fechas en el calendario. Es posible que el selector de fechas sea más complejo o no haya días disponibles.');
                    // Continuar intentando clickear el botón de reserva, aunque sea deshabilitado.
                }
            }
            
            // Click final en botón de reserva (ahora debería estar habilitado)
            console.log('   👆 Click en botón de reserva final...');
            await client.call('stream_click', { selector: bookBtnSelector });
            console.log('   👆 Click en botón de reserva.');
            
            // Esperar reacción (navegar a checkout/payment)
            await new Promise(r => setTimeout(r, 5000));
            
            // Check URL final
            const finalUrl = await client.call('stream_evaluate', { script: 'window.location.href' });
            console.log(`   📍 URL Final: ${finalUrl}`);
            
            // Verificar si llegamos a alguna página de booking/checkout
            if (String(finalUrl).includes('/bookings/checkout') || String(finalUrl).includes('/bookings/payment') || String(finalUrl).includes('/bookings/confirmation')) {
                console.log('✅ ÉXITO: Se llegó a la página de Checkout/Pago/Confirmación de la reserva.');
            } else {
                console.warn('   ⚠️ La acción de reservar no llevó a Checkout/Pago/Confirmación.');
                // Un screenshot adicional si no llegamos al final esperado para ver el estado
                const errorShot = await client.call('stream_screenshot', { fullPage: false });
                console.log(errorShot);
            }
    
        } catch (e) {
            console.error('   ❌ Error al interactuar con el botón de reserva:', e);
            throw new Error('Fallo en el proceso de reserva tras llegar a la página de detalle.');
        }
    
        // Screenshot final (si la prueba no falló antes)
        console.log('\n📸 4. Evidencia final...');
        const shot = await client.call('stream_screenshot', { fullPage: false });
        console.log(shot);  } finally { // <-- Esta llave cerraba el try
    await client.close();
    console.log('\n👋 Test finalizado.');
  } // <-- Y esta el runBookingTest
}

runBookingTest();
