import { test, expect, type Page } from '@playwright/test';
import path from 'path';

/**
 * Prueba de demostración del chat estilo WhatsApp de AutoRentar
 * Esta prueba simula una conversación entre dos perfiles diferentes
 * y captura pantallas de la conversación
 */

test.describe('WhatsApp Chat Demo - AutoRentar', () => {
  test.setTimeout(120000); // 2 minutos para la prueba completa

  test('demostración de chat entre locador y locatario', async ({ browser }) => {
    // Crear dos contextos de navegador independientes para simular dos usuarios
    const locadorContext = await browser.newContext({
      viewport: { width: 393, height: 852 }, // iPhone 13 Pro
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    });
    
    const locatarioContext = await browser.newContext({
      viewport: { width: 393, height: 852 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
    });

    // Crear páginas para cada usuario
    const locadorPage = await locadorContext.newPage();
    const locatarioPage = await locatarioContext.newPage();

    try {
      // Paso 1: Autenticar al locador (dueño del auto)
      console.log('🔐 Autenticando locador...');
      await authenticateUser(locadorPage, 'owner');
      await locadorPage.waitForTimeout(2000);

      // Paso 2: Autenticar al locatario (quien renta)
      console.log('🔐 Autenticando locatario...');
      await authenticateUser(locatarioPage, 'renter');
      await locatarioPage.waitForTimeout(2000);

      // Paso 3: Navegar a una conversación existente o crear una
      console.log('📱 Navegando al chat...');
      
      // Intentar navegar a bookings y seleccionar una reserva con chat
      await locadorPage.goto('/bookings');
      await locadorPage.waitForTimeout(2000);
      
      await locatarioPage.goto('/bookings');
      await locatarioPage.waitForTimeout(2000);

      // Buscar el componente de chat
      const chatExists = await locatarioPage.locator('.whatsapp-chat-container').count() > 0;
      
      if (!chatExists) {
        console.log('⚠️ Chat no encontrado en la vista actual, navegando a detalles de reserva...');
        
        // Buscar una reserva para abrir el chat
        const bookingCard = await locatarioPage.locator('[data-testid*="booking-"], .booking-card, ion-card').first();
        if (await bookingCard.count() > 0) {
          await bookingCard.click();
          await locatarioPage.waitForTimeout(2000);
        }
      }

      // Paso 4: Capturar pantallas del chat desde ambas perspectivas
      console.log('📸 Capturando conversación del locatario...');
      
      // Verificar si el chat es visible
      const chatComponent = locatarioPage.locator('.whatsapp-chat-container');
      if (await chatComponent.count() > 0) {
        await chatComponent.waitFor({ state: 'visible', timeout: 5000 });
        
        // Captura completa de la pantalla del locatario
        await locatarioPage.screenshot({
          path: 'test-results/whatsapp-chat-locatario-perfil-completo.png',
          fullPage: true,
        });

        // Captura solo del componente de chat
        await chatComponent.screenshot({
          path: 'test-results/whatsapp-chat-locatario-chat.png',
        });

        console.log('✅ Capturas del locatario guardadas');
      }

      // Capturar desde la perspectiva del locador
      console.log('📸 Capturando conversación del locador...');
      
      // Buscar el chat en la página del locador
      const locadorChatComponent = locadorPage.locator('.whatsapp-chat-container');
      if (await locadorChatComponent.count() > 0) {
        await locadorChatComponent.waitFor({ state: 'visible', timeout: 5000 });
        
        // Captura completa de la pantalla del locador
        await locadorPage.screenshot({
          path: 'test-results/whatsapp-chat-locador-perfil-completo.png',
          fullPage: true,
        });

        // Captura solo del componente de chat
        await locadorChatComponent.screenshot({
          path: 'test-results/whatsapp-chat-locador-chat.png',
        });

        console.log('✅ Capturas del locador guardadas');
      }

      // Paso 5: Simular envío de mensajes (si es posible)
      console.log('💬 Intentando simular envío de mensajes...');
      
      const messageInput = locatarioPage.locator('.whatsapp-input input, .whatsapp-input textarea, [placeholder*="mensaje"], [placeholder*="Escrib"]');
      if (await messageInput.count() > 0) {
        await messageInput.fill('Hola, estoy interesado en rentar tu auto. ¿Está disponible para el fin de semana?');
        
        const sendButton = locatarioPage.locator('button[aria-label*="enviar"], button[type="submit"], .whatsapp-input button').last();
        if (await sendButton.count() > 0) {
          await sendButton.click();
          await locatarioPage.waitForTimeout(1000);
          
          // Capturar después del mensaje
          await locatarioPage.screenshot({
            path: 'test-results/whatsapp-chat-locatario-con-mensaje.png',
            fullPage: true,
          });
        }
      }

      // Paso 6: Crear un reporte HTML con las capturas
      await createHTMLReport([
        {
          title: 'Vista del Locatario (Quien Renta)',
          screenshots: [
            'whatsapp-chat-locatario-perfil-completo.png',
            'whatsapp-chat-locatario-chat.png',
            'whatsapp-chat-locatario-con-mensaje.png',
          ],
        },
        {
          title: 'Vista del Locador (Dueño del Auto)',
          screenshots: [
            'whatsapp-chat-locador-perfil-completo.png',
            'whatsapp-chat-locador-chat.png',
          ],
        },
      ]);

      console.log('✅ Prueba completada exitosamente');
      console.log('📁 Las capturas se guardaron en: test-results/');
      console.log('📄 Reporte HTML: test-results/whatsapp-chat-report.html');

    } catch (error) {
      console.error('❌ Error en la prueba:', error);
      
      // Capturar pantallas de error
      await locadorPage.screenshot({ path: 'test-results/whatsapp-error-locador.png', fullPage: true });
      await locatarioPage.screenshot({ path: 'test-results/whatsapp-error-locatario.png', fullPage: true });
      
      throw error;
    } finally {
      // Limpiar contextos
      await locadorContext.close();
      await locatarioContext.close();
    }
  });
});

/**
 * Función auxiliar para autenticar usuarios
 */
async function authenticateUser(page: Page, role: 'owner' | 'renter') {
  const authFile = path.join(__dirname, '.auth', `${role}.json`);
  
  try {
    // Intentar cargar el estado de autenticación guardado
    const fs = require('fs');
    if (fs.existsSync(authFile)) {
      const context = page.context();
      await context.addCookies(JSON.parse(fs.readFileSync(authFile, 'utf-8')).cookies);
      console.log(`✅ Sesión de ${role} cargada desde archivo`);
    } else {
      console.log(`⚠️ No se encontró archivo de autenticación para ${role}`);
      // Navegar a login
      await page.goto('/login');
      await page.waitForTimeout(2000);
    }
  } catch (error) {
    console.error(`❌ Error cargando autenticación para ${role}:`, error);
    await page.goto('/login');
  }
}

/**
 * Función para crear un reporte HTML con las capturas
 */
async function createHTMLReport(sections: Array<{ title: string; screenshots: string[] }>) {
  const fs = require('fs');
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AutoRentar - Demostración Chat WhatsApp</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 40px 20px;
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #25D366 0%, #075E54 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      font-weight: 700;
    }
    
    .header p {
      font-size: 1.1rem;
      opacity: 0.95;
    }
    
    .content {
      padding: 40px;
    }
    
    .section {
      margin-bottom: 60px;
    }
    
    .section h2 {
      color: #075E54;
      font-size: 1.8rem;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #25D366;
    }
    
    .screenshots {
      display: grid;
      gap: 30px;
      margin-top: 30px;
    }
    
    .screenshot-item {
      background: #f5f5f5;
      border-radius: 15px;
      padding: 20px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .screenshot-item:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
    
    .screenshot-item img {
      width: 100%;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    .screenshot-label {
      margin-top: 15px;
      font-size: 0.9rem;
      color: #666;
      text-align: center;
      font-weight: 500;
    }
    
    .badge {
      display: inline-block;
      background: #25D366;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-top: 10px;
    }
    
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      color: #666;
      border-top: 1px solid #e5e7eb;
    }
    
    .timestamp {
      font-size: 0.9rem;
      color: #999;
      margin-top: 10px;
    }
    
    @media (max-width: 768px) {
      .header h1 {
        font-size: 1.8rem;
      }
      
      .content {
        padding: 20px;
      }
      
      .section h2 {
        font-size: 1.4rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚗 AutoRentar - Chat WhatsApp</h1>
      <p>Demostración de conversación entre dos perfiles diferentes</p>
      <span class="badge">Prueba E2E con Playwright</span>
    </div>
    
    <div class="content">
      ${sections
        .map(
          (section) => `
        <div class="section">
          <h2>${section.title}</h2>
          <div class="screenshots">
            ${section.screenshots
              .map(
                (screenshot) => `
              <div class="screenshot-item">
                <img src="${screenshot}" alt="${screenshot}" onerror="this.parentElement.style.display='none'">
                <div class="screenshot-label">${screenshot.replace('whatsapp-chat-', '').replace('.png', '').replace(/-/g, ' ')}</div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>
      `
        )
        .join('')}
    </div>
    
    <div class="footer">
      <p><strong>AutoRentar</strong> - Sistema de chat en tiempo real</p>
      <p class="timestamp">Generado: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p>
    </div>
  </div>
</body>
</html>
  `;

  fs.writeFileSync('test-results/whatsapp-chat-report.html', html);
  console.log('✅ Reporte HTML creado exitosamente');
}
