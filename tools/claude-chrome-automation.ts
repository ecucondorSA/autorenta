#!/usr/bin/env bun
/**
 * AutoRenta - Claude Chrome Automation Toolkit
 *
 * Scripts de automatización para integrar con Claude Code + Chrome
 *
 * Uso:
 *   bun tools/claude-chrome-automation.ts <command> [options]
 *
 * Comandos:
 *   test:booking    - Test E2E del flujo de booking
 *   test:payment    - Test del flujo de pago
 *   audit:mobile    - Auditoría móvil
 *   scrape:prices   - Scraping de precios competencia
 *   record:demo     - Grabar demo GIF
 */

const COMMANDS = {
  'test:booking': {
    description: 'Test E2E del flujo de booking completo',
    steps: [
      'Navegar a marketplace',
      'Seleccionar auto',
      'Elegir fechas',
      'Completar datos',
      'Ir a checkout',
      'Verificar resumen',
    ],
  },
  'test:payment': {
    description: 'Test del flujo de pago con MercadoPago',
    steps: [
      'Ir a booking pendiente',
      'Abrir formulario de pago',
      'Verificar Brick cargado',
      'Simular pago (sandbox)',
      'Verificar webhook',
      'Confirmar estado en BD',
    ],
  },
  'audit:mobile': {
    description: 'Auditoría de responsive y accesibilidad',
    viewports: [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 14', width: 390, height: 844 },
      { name: 'iPad', width: 768, height: 1024 },
      { name: 'Desktop', width: 1440, height: 900 },
    ],
    pages: [
      '/',
      '/marketplace',
      '/cars/:id',
      '/bookings',
      '/wallet',
      '/profile',
    ],
  },
  'scrape:prices': {
    description: 'Scraping de precios de competencia',
    sites: [
      { name: 'RentCars', url: 'https://www.rentcars.com' },
      { name: 'Localiza', url: 'https://www.localiza.com' },
      { name: 'Movida', url: 'https://www.movida.com.br' },
    ],
  },
  'record:demo': {
    description: 'Grabar demo GIF para marketing',
    flows: ['booking', 'publish-car', 'inspection', 'wallet'],
  },
};

// Configuración de Chrome
const CHROME_CONFIG = {
  dev: 'http://localhost:4200',
  prod: 'https://autorentar.com.br',
  staging: 'https://staging.autorentar.com.br',
};

// Selectores comunes de AutoRenta
const SELECTORS = {
  // Marketplace
  searchInput: '[data-testid="search-input"]',
  carCard: '[data-testid="car-card"]',
  filterButton: '[data-testid="filter-button"]',

  // Booking
  datePickerStart: '[data-testid="date-start"]',
  datePickerEnd: '[data-testid="date-end"]',
  continueButton: '[data-testid="continue-btn"]',

  // Payment
  paymentForm: '[data-testid="payment-form"]',
  mpBrick: '#mercadopago-brick-container',
  submitPayment: '[data-testid="submit-payment"]',

  // Common
  loading: '.loading-spinner',
  toast: 'ion-toast',
  modal: 'ion-modal',
  bottomSheet: '.bottom-sheet',
};

// Export para uso en Claude
export { COMMANDS, CHROME_CONFIG, SELECTORS };

console.log(`
╔══════════════════════════════════════════════════════════════╗
║        AutoRenta - Claude Chrome Automation Toolkit          ║
╠══════════════════════════════════════════════════════════════╣
║  Comandos disponibles:                                       ║
║    /test-booking     - Test flujo de reserva                 ║
║    /debug-payment    - Debug pagos MercadoPago               ║
║    /audit-mobile     - Auditoría responsive                  ║
║    /scrape-competition - Scraping de competencia             ║
║    /record-demo      - Grabar demo GIF                       ║
╚══════════════════════════════════════════════════════════════╝
`);
