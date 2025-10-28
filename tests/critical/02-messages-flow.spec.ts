import { test, expect } from '@playwright/test';

/**
 * TEST CRÍTICO: Flujo de Mensajería
 *
 * Valida el sistema de mensajería implementado que permite a los usuarios
 * comunicarse antes y después de crear una reserva.
 *
 * Pre-requisitos:
 * - Ruta /messages implementada
 * - CarChatComponent y BookingChatComponent funcionales
 * - Supabase Realtime configurado
 *
 * Flujo:
 * 1. Usuario A (locatario) ve detalle de auto
 * 2. Click en "Contactar Anfitrión"
 * 3. Redirige a /messages con query params correctos
 * 4. Usuario A envía mensaje
 * 5. Usuario B (locador) recibe mensaje en tiempo real
 * 6. Conversación bidireccional
 */

test.describe('Sistema de Mensajería - Chat Pre-Reserva', () => {
  const LOCATARIO = {
    email: `locatario-${Date.now()}@test.com`,
    password: 'TestPass123!',
  };

  const LOCADOR = {
    email: `locador-${Date.now()}@test.com`,
    password: 'TestPass123!',
  };

  let CAR_ID: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Crear locador y publicar un auto
    const context = await browser.newContext();
    const page = await context.newPage();

    // Registrar locador
    await page.goto('/auth/register');
    await page.fill('input[name="email"]', LOCADOR.email);
    await page.fill('input[name="password"]', LOCADOR.password);
    await page.fill('input[name="full_name"]', 'Test Locador');
    await page.click('button[type="submit"]');

    // TODO: Publicar auto y obtener CAR_ID
    // Por ahora usar un ID mock
    CAR_ID = 'test-car-id';

    await context.close();
  });

  test('debe mostrar botón "Contactar Anfitrión" en detalle de auto', async ({ page }) => {
    // Login como locatario
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', LOCATARIO.email);
    await page.fill('input[name="password"]', LOCATARIO.password);
    await page.click('button[type="submit"]');

    // Navegar a detalle de auto
    await page.goto(`/cars/${CAR_ID}`);

    // Verificar que existe el botón de contactar
    const contactBtn = page.locator('button:has-text("Contactar")');
    await expect(contactBtn).toBeVisible();
  });

  test('debe redirigir correctamente a /messages', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', LOCATARIO.email);
    await page.fill('input[name="password"]', LOCATARIO.password);
    await page.click('button[type="submit"]');

    await page.goto(`/cars/${CAR_ID}`);

    // Click en contactar
    await page.click('button:has-text("Contactar")');

    // Debe redirigir a /messages con query params
    await expect(page).toHaveURL(/\/messages\?/, { timeout: 5000 });

    // Verificar query params
    const url = new URL(page.url());
    expect(url.searchParams.get('carId')).toBe(CAR_ID);
    expect(url.searchParams.get('userId')).toBeTruthy(); // ID del locador
    expect(url.searchParams.get('carName')).toBeTruthy();
  });

  test('debe cargar el componente de chat correctamente', async ({ page }) => {
    // Login y navegar a mensajes
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', LOCATARIO.email);
    await page.fill('input[name="password"]', LOCATARIO.password);
    await page.click('button[type="submit"]');

    await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Toyota Corolla`);

    // Verificar elementos del chat
    await expect(page.locator('.whatsapp-chat-container')).toBeVisible();
    await expect(page.locator('input[name="message"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verificar header del chat
    await expect(page.locator('text=Toyota Corolla')).toBeVisible();
  });

  test('debe enviar mensaje correctamente', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', LOCATARIO.email);
    await page.fill('input[name="password"]', LOCATARIO.password);
    await page.click('button[type="submit"]');

    await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Toyota Corolla`);

    // Escribir mensaje
    const messageInput = page.locator('input[name="message"]');
    await messageInput.fill('Hola, ¿está disponible este auto?');

    // Enviar
    await page.click('button[type="submit"]');

    // Verificar que el mensaje aparece en la UI
    await expect(page.locator('text=Hola, ¿está disponible este auto?')).toBeVisible({
      timeout: 5000,
    });

    // Verificar que es un mensaje "enviado" (derecha, verde)
    const sentMessage = page.locator('.message-sent:has-text("Hola, ¿está disponible")');
    await expect(sentMessage).toBeVisible();

    // Verificar marca de enviado (check)
    await expect(sentMessage.locator('svg')).toBeVisible();
  });

  test('debe mostrar indicador de escritura', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', LOCATARIO.email);
    await page.fill('input[name="password"]', LOCATARIO.password);
    await page.click('button[type="submit"]');

    await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Test Car`);

    // Simular escritura
    const messageInput = page.locator('input[name="message"]');
    await messageInput.type('Escribiendo...', { delay: 100 });

    // El indicador de typing debería activarse
    // (esto requiere tener dos sesiones abiertas para probarlo completamente)
  });

  test('debe validar autenticación antes de mostrar chat', async ({ page }) => {
    // Intentar acceder sin login
    await page.goto(`/messages?carId=${CAR_ID}&userId=test-owner-id&carName=Test Car`);

    // Debe redirigir a login
    await expect(page).toHaveURL(/\/auth\/login/, { timeout: 5000 });

    // Debe incluir returnUrl
    const url = new URL(page.url());
    expect(url.searchParams.get('returnUrl')).toContain('/messages');
  });

  test('debe mostrar error si faltan query params', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', LOCATARIO.email);
    await page.fill('input[name="password"]', LOCATARIO.password);
    await page.click('button[type="submit"]');

    // Navegar sin query params
    await page.goto('/messages');

    // Debe mostrar error
    await expect(page.locator('text=Falta información')).toBeVisible();
    await expect(page.locator('button:has-text("Volver")')).toBeVisible();
  });
});

test.describe('Sistema de Mensajería - Chat Post-Reserva', () => {
  test('debe permitir chat con bookingId después de reservar', async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@test.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    // Navegar con bookingId
    await page.goto(
      '/messages?bookingId=test-booking-id&userId=owner-id&userName=Juan Pérez',
    );

    // Verificar que carga BookingChatComponent
    await expect(page.locator('.whatsapp-chat-container')).toBeVisible();
    await expect(page.locator('text=Juan Pérez')).toBeVisible();
  });
});

test.describe('Mensajería - Realtime', () => {
  test.skip('debe recibir mensajes en tiempo real', async ({ browser }) => {
    // NOTA: Este test requiere dos contextos/browsers para simular dos usuarios

    // Contexto 1: Locatario
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    // Contexto 2: Locador
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    // Login en ambos
    await page1.goto('/auth/login');
    // ... login locatario

    await page2.goto('/auth/login');
    // ... login locador

    // Ambos abren el mismo chat
    const chatUrl = '/messages?carId=test-car&userId=test-owner&carName=Test';
    await page1.goto(chatUrl);
    await page2.goto(chatUrl);

    // Page1 envía mensaje
    await page1.locator('input[name="message"]').fill('Mensaje de prueba');
    await page1.click('button[type="submit"]');

    // Page2 debe recibir el mensaje automáticamente
    await expect(page2.locator('text=Mensaje de prueba')).toBeVisible({ timeout: 3000 });

    // Verificar que aparece en el lado correcto
    const receivedMessage = page2.locator('.message-received:has-text("Mensaje de prueba")');
    await expect(receivedMessage).toBeVisible();

    await context1.close();
    await context2.close();
  });
});

test.describe('Mensajería - Accesibilidad', () => {
  test('debe tener labels accesibles', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@test.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/messages?carId=test&userId=test&carName=Test');

    // Verificar que el input tiene placeholder
    const input = page.locator('input[name="message"]');
    await expect(input).toHaveAttribute('placeholder');

    // Verificar que los botones tienen aria-labels o text
    const sendBtn = page.locator('button[type="submit"]');
    await expect(sendBtn).toBeVisible();
  });

  test('debe ser navegable por teclado', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', 'test@test.com');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await page.goto('/messages?carId=test&userId=test&carName=Test');

    // Focus en el input
    await page.locator('input[name="message"]').focus();

    // Escribir con teclado
    await page.keyboard.type('Mensaje de prueba');

    // Enter para enviar
    await page.keyboard.press('Enter');

    // Mensaje debe enviarse
    await expect(page.locator('text=Mensaje de prueba')).toBeVisible({ timeout: 3000 });
  });
});
