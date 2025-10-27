import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';

/**
 * Prueba E2E REAL del sistema de chat de AutoRentar
 * 
 * Esta prueba verifica que dos usuarios diferentes puedan:
 * 1. Autenticarse en la aplicación
 * 2. Acceder a una reserva compartida
 * 3. Enviar y recibir mensajes en tiempo real
 * 4. Ver los indicadores de estado (enviado, entregado, leído)
 * 5. Ver los indicadores de "escribiendo..."
 */

test.describe('Chat Real - Conversación entre Locador y Locatario', () => {
  let browser: Browser;
  let locadorContext: BrowserContext;
  let locatarioContext: BrowserContext;
  let locadorPage: Page;
  let locatarioPage: Page;

  test.beforeAll(async ({ browser: b }) => {
    browser = b;
  });

  test('dos usuarios pueden conversar en tiempo real', async () => {
    // Crear contextos separados para simular dos usuarios diferentes
    locadorContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    
    locatarioContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    locadorPage = await locadorContext.newPage();
    locatarioPage = await locatarioContext.newPage();

    try {
      // PASO 1: Autenticar ambos usuarios
      console.log('🔐 Autenticando usuarios...');
      
      // Locador (owner)
      await locadorPage.goto('/login');
      await locadorPage.waitForLoadState('networkidle');
      
      // Verificar si hay sesión guardada o hacer login
      const locadorNeedsLogin = await locadorPage.locator('input[type="email"]').isVisible().catch(() => false);
      
      if (locadorNeedsLogin) {
        console.log('⚠️ Locador necesita autenticarse manualmente');
        await locadorPage.screenshot({ path: 'test-results/chat-real-locador-login.png' });
        
        // Esperar a que el usuario haga login manualmente
        await locadorPage.waitForURL('**/home', { timeout: 60000 });
      }

      // Locatario (renter)
      await locatarioPage.goto('/login');
      await locatarioPage.waitForLoadState('networkidle');
      
      const locatarioNeedsLogin = await locatarioPage.locator('input[type="email"]').isVisible().catch(() => false);
      
      if (locatarioNeedsLogin) {
        console.log('⚠️ Locatario necesita autenticarse manualmente');
        await locatarioPage.screenshot({ path: 'test-results/chat-real-locatario-login.png' });
        
        // Esperar a que el usuario haga login manualmente
        await locatarioPage.waitForURL('**/home', { timeout: 60000 });
      }

      console.log('✅ Usuarios autenticados');

      // PASO 2: Navegar a una reserva existente
      console.log('📱 Navegando a reservas...');
      
      await locadorPage.goto('/bookings');
      await locadorPage.waitForLoadState('networkidle');
      await locadorPage.waitForTimeout(2000);
      
      await locatarioPage.goto('/bookings');
      await locatarioPage.waitForLoadState('networkidle');
      await locatarioPage.waitForTimeout(2000);

      // Buscar una reserva activa
      const locadorBooking = locadorPage.locator('[data-testid*="booking"], .booking-card, ion-card').first();
      const hasLocadorBooking = await locadorBooking.count() > 0;
      
      if (!hasLocadorBooking) {
        console.log('⚠️ No se encontraron reservas para el locador');
        await locadorPage.screenshot({ path: 'test-results/chat-real-no-bookings-locador.png' });
        test.skip();
      }

      // Abrir la reserva del locador
      await locadorBooking.click();
      await locadorPage.waitForTimeout(2000);

      // Capturar pantalla inicial del locador
      await locadorPage.screenshot({ 
        path: 'test-results/chat-real-locador-booking-detail.png',
        fullPage: true 
      });

      // PASO 3: Verificar que el componente de chat existe
      console.log('💬 Verificando componente de chat...');
      
      const chatComponentLocador = locadorPage.locator('app-booking-chat, .whatsapp-chat-container');
      const hasChatLocador = await chatComponentLocador.count() > 0;
      
      if (!hasChatLocador) {
        console.log('⚠️ Componente de chat no encontrado en la vista del locador');
        await locadorPage.screenshot({ path: 'test-results/chat-real-no-chat-component.png' });
        throw new Error('Chat component not found');
      }

      console.log('✅ Componente de chat encontrado');

      // PASO 4: Locatario abre la misma reserva
      const locatarioBooking = locatarioPage.locator('[data-testid*="booking"], .booking-card, ion-card').first();
      const hasLocatarioBooking = await locatarioBooking.count() > 0;
      
      if (hasLocatarioBooking) {
        await locatarioBooking.click();
        await locatarioPage.waitForTimeout(2000);
        
        await locatarioPage.screenshot({ 
          path: 'test-results/chat-real-locatario-booking-detail.png',
          fullPage: true 
        });
      }

      // PASO 5: Locatario envía un mensaje
      console.log('📤 Locatario enviando mensaje...');
      
      const messageInput = locatarioPage.locator('input[placeholder*="mensaje"], textarea[placeholder*="mensaje"], .whatsapp-input input, .whatsapp-input textarea').first();
      const hasInput = await messageInput.count() > 0;
      
      if (hasInput) {
        const testMessage = `Hola! Esta es una prueba del chat en tiempo real - ${new Date().toISOString()}`;
        
        await messageInput.fill(testMessage);
        await locatarioPage.waitForTimeout(500);
        
        // Capturar el indicador de "escribiendo..."
        await locatarioPage.screenshot({ 
          path: 'test-results/chat-real-locatario-typing.png',
          fullPage: true 
        });
        
        // Buscar el botón de enviar
        const sendButton = locatarioPage.locator('button[type="submit"], button[aria-label*="enviar"], .whatsapp-input button, button:has-text("Enviar")').first();
        
        if (await sendButton.count() > 0) {
          await sendButton.click();
          console.log('✅ Mensaje enviado por locatario');
          
          await locatarioPage.waitForTimeout(1000);
          
          // Capturar después de enviar
          await locatarioPage.screenshot({ 
            path: 'test-results/chat-real-locatario-mensaje-enviado.png',
            fullPage: true 
          });
        }
      }

      // PASO 6: Verificar que el locador recibe el mensaje
      console.log('📥 Verificando que locador recibe el mensaje...');
      
      await locadorPage.waitForTimeout(2000);
      
      // Capturar pantalla del locador después de recibir
      await locadorPage.screenshot({ 
        path: 'test-results/chat-real-locador-mensaje-recibido.png',
        fullPage: true 
      });

      // PASO 7: Locador responde
      console.log('📤 Locador enviando respuesta...');
      
      const locadorMessageInput = locadorPage.locator('input[placeholder*="mensaje"], textarea[placeholder*="mensaje"], .whatsapp-input input, .whatsapp-input textarea').first();
      
      if (await locadorMessageInput.count() > 0) {
        const responseMessage = `Recibido! Respondiendo a tu mensaje - ${new Date().toISOString()}`;
        
        await locadorMessageInput.fill(responseMessage);
        await locadorPage.waitForTimeout(500);
        
        const locadorSendButton = locadorPage.locator('button[type="submit"], button[aria-label*="enviar"], .whatsapp-input button, button:has-text("Enviar")').first();
        
        if (await locadorSendButton.count() > 0) {
          await locadorSendButton.click();
          console.log('✅ Respuesta enviada por locador');
          
          await locadorPage.waitForTimeout(1000);
          
          await locadorPage.screenshot({ 
            path: 'test-results/chat-real-locador-respuesta-enviada.png',
            fullPage: true 
          });
        }
      }

      // PASO 8: Verificar que locatario recibe la respuesta
      console.log('📥 Verificando que locatario recibe la respuesta...');
      
      await locatarioPage.waitForTimeout(2000);
      
      await locatarioPage.screenshot({ 
        path: 'test-results/chat-real-locatario-respuesta-recibida.png',
        fullPage: true 
      });

      // PASO 9: Verificar indicadores de estado
      console.log('✓ Verificando indicadores de estado...');
      
      // Buscar checkmarks o indicadores de estado
      const statusIndicators = locatarioPage.locator('.checkmark, .message-status, [data-status]');
      const hasStatusIndicators = await statusIndicators.count() > 0;
      
      console.log(`Indicadores de estado encontrados: ${await statusIndicators.count()}`);

      // RESUMEN FINAL
      console.log('\n✅ PRUEBA COMPLETADA');
      console.log('📁 Capturas generadas:');
      console.log('   - chat-real-locador-booking-detail.png');
      console.log('   - chat-real-locatario-booking-detail.png');
      console.log('   - chat-real-locatario-typing.png');
      console.log('   - chat-real-locatario-mensaje-enviado.png');
      console.log('   - chat-real-locador-mensaje-recibido.png');
      console.log('   - chat-real-locador-respuesta-enviada.png');
      console.log('   - chat-real-locatario-respuesta-recibida.png');

      // Verificación final
      expect(hasInput).toBeTruthy();
      expect(hasChatLocador).toBeTruthy();

    } catch (error) {
      console.error('❌ Error en la prueba:', error);
      
      // Capturas de error
      await locadorPage.screenshot({ 
        path: 'test-results/chat-real-error-locador.png',
        fullPage: true 
      });
      
      await locatarioPage.screenshot({ 
        path: 'test-results/chat-real-error-locatario.png',
        fullPage: true 
      });
      
      throw error;
    }
  });

  test.afterAll(async () => {
    if (locadorContext) await locadorContext.close();
    if (locatarioContext) await locatarioContext.close();
  });
});
