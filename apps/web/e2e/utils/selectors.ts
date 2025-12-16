/**
 * Centralized Selector Registry for E2E Tests
 *
 * Single source of truth for all selectors.
 * Update here when DOM changes - tests will automatically use new selectors.
 */

export const Selectors = {
  // ==================== AUTH ====================
  login: {
    emailInput: '[data-testid="login-email-input"]',
    passwordInput: '[data-testid="login-password-input"]',
    submitButton: '[data-testid="login-button"]',
    googleButton: 'button:has-text("Continuar con Google")',
    errorMessage: '[role="alert"]',
    forgotPasswordLink: 'a[href*="reset-password"]',
    registerLink: 'a[href*="register"]',
    // Alternative selectors (fallback)
    emailInputAlt: '#login-email',
    passwordInputAlt: '#login-password',
  },

  register: {
    nameInput: '[data-testid="register-name-input"]',
    emailInput: '[data-testid="register-email-input"]',
    passwordInput: '[data-testid="register-password-input"]',
    submitButton: '[data-testid="register-button"]',
    loginLink: 'a[href*="login"]',
  },

  // ==================== APP SHELL ====================
  app: {
    root: 'app-root',
    header: 'app-header',
    footer: 'app-footer',
    userMenu: '[data-testid="user-menu"]',
    loadingSpinner: 'ion-spinner, .spinner, [class*="loading"]',
    mobileMenu: '[data-testid="mobile-menu"]',
  },

  // ==================== MARKETPLACE / CARS ====================
  marketplace: {
    carCard: '[data-testid="car-card"]',
    carCardAlt: 'app-car-card',
    searchInput: '[data-testid="search-input"]',
    sortSelect: '[data-testid="sort-select"]',
    mapView: 'div[data-testid="cars-map"]:not(.cars-map-container)',
    gridViewButton: '[data-testid="view-grid"]',
    mapViewButton: '[data-testid="view-map"]',
    resultsCount: '[data-testid="results-count"]',
    emptyState: '[data-testid="empty-state"]',
    loadError: '[data-testid="load-error"]',
    filters: {
      container: '[data-testid="filters-container"]',
      maxDistance: '[data-testid="filter-max-distance"]',
      minPrice: '[data-testid="filter-min-price"]',
      maxPrice: '[data-testid="filter-max-price"]',
      minRating: '[data-testid="filter-min-rating"]',
      clearButton: '[data-testid="clear-filters"]',
    },
  },

  carCard: {
    title: '[data-testid="car-title"]',
    price: '[data-testid="car-price"]',
    location: '[data-testid="car-location"]',
    rating: '[data-testid="car-rating"]',
    image: '[data-testid="car-image"]',
  },

  carDetail: {
    container: '[data-testid="car-detail"]',
    title: '[data-testid="car-detail-title"]',
    price: '[data-testid="car-detail-price"]',
    bookButton: '[data-testid="book-button"]',
    gallery: '[data-testid="car-gallery"]',
    specs: '[data-testid="car-specs"]',
    reviews: '[data-testid="car-reviews"]',
    owner: '[data-testid="car-owner"]',
    location: '[data-testid="car-location"]',
  },

  // ==================== BOOKING ====================
  booking: {
    wizard: '[data-testid="booking-wizard"]',
    loading: '[data-testid="booking-wizard-loading"]',
    stepIndicator: '[data-testid="booking-step-indicator"]',
    stepContent: '[data-testid="booking-step-content"]',
    nextButton: '[data-testid="booking-next-button"]',
    backButton: '[data-testid="booking-back-button"]',
    submitButton: '[data-testid="booking-submit-button"]',
    successPage: '[data-testid="booking-success-page"]',
    cancelButton: '[data-testid="booking-cancel-button"]',
  },

  datePicker: {
    container: '[data-testid="date-picker"]',
    dateFrom: '[data-testid="date-from"]',
    dateTo: '[data-testid="date-to"]',
    calendar: '[data-testid="calendar"]',
    confirmButton: '[data-testid="date-confirm"]',
  },

  // ==================== WALLET ====================
  wallet: {
    container: '[data-testid="wallet-container"]',
    balanceCard: '[data-testid="wallet-balance-card"]',
    balance: '[data-testid="wallet-balance"]',
    availableBalance: '[data-testid="available-balance"]',
    lockedBalance: '[data-testid="locked-balance"]',
    depositButton: '[data-testid="deposit-button"]',
    withdrawButton: '[data-testid="withdraw-button"]',
    transactionHistory: '[data-testid="transaction-history"]',
  },

  // ==================== PAYMENT ====================
  payment: {
    // Page structure
    container: 'app-booking-detail-payment',
    pageTitle: 'h1:has-text("Confirmar Reserva")',
    loadingSpinner: '.animate-spin',
    errorState: '.bg-error-bg',

    // Car summary
    carSummary: 'section:has(img[alt="Car"])',
    carBrand: 'p.text-primary-600',
    carModel: 'h3.text-2xl',

    // Dates section
    datesSection: 'section:has-text("Fechas y Ubicación")',
    pickupDate: 'div:has-text("Retiro")',
    returnDate: 'div:has-text("Devolución")',

    // Payment mode toggle
    paymentModeToggle: '.flex.rounded-lg.bg-surface-base.p-1',
    directPaymentBtn: 'button:has-text("Pago Directo")',
    preauthPaymentBtn: 'button:has-text("Preautorización")',

    // MercadoPago Brick container
    mpBrickContainer: '#paymentBrick_container',
    mpBrickWrapper: '.payment-brick-wrapper',
    mpLoadingText: 'p:has-text("Cargando formulario de pago")',

    // MercadoPago Brick internal selectors (inside iframe)
    mpIframe: 'iframe[src*="mercadopago"], iframe[title*="card"]',

    // Summary panel
    summaryPanel: '.sticky.top-24',
    totalUsd: 'span.text-3xl',
    totalArs: 'p:has-text("Aprox. ARS")',

    // Security deposit
    depositSection: '.bg-warning-default',
    depositAmount: 'span:has-text("USD 600")',

    // Action buttons
    confirmPayBtn: 'button:has-text("Confirmar y Pagar")',
    downloadPdfBtn: 'button:has-text("Descargar Presupuesto")',
    mpAlternativeBtn: 'button:has-text("pagar con efectivo")',

    // Error handling
    errorState: ':has-text("Hubo un problema")',
    errorMessage: 'p:has-text("Faltan"), p:has-text("problema"), p:has-text("error")',
    retryButton: 'button:has-text("Intentar nuevamente")',

    // Success indicators
    processingSpinner: 'button .animate-spin',
  },

  // MercadoPago Brick internal selectors (for iframe interaction)
  mpBrick: {
    // These selectors work inside the MercadoPago iframe
    cardNumberInput: '[data-testid="input-card-number"], input[name="cardNumber"]',
    expirationInput: '[data-testid="input-expiration-date"], input[name="expirationDate"]',
    cvvInput: '[data-testid="input-security-code"], input[name="securityCode"]',
    cardholderInput: '[data-testid="input-cardholder-name"], input[name="cardholderName"]',
    docTypeSelect: '[data-testid="select-identification-type"], select[name="identificationType"]',
    docNumberInput: '[data-testid="input-identification-number"], input[name="identificationNumber"]',
    emailInput: '[data-testid="input-email"], input[name="email"]',
    submitButton: '[data-testid="button-submit"], button[type="submit"]',
    installmentsSelect: '[data-testid="select-installments"], select[name="installments"]',
  },

  // ==================== MY BOOKINGS ====================
  myBookings: {
    container: '[data-testid="my-bookings"]',
    bookingCard: '[data-testid="booking-card"]',
    statusBadge: '[data-testid="booking-status"]',
    detailLink: '[data-testid="booking-detail-link"]',
    emptyState: '[data-testid="no-bookings"]',
    tabs: {
      active: '[data-testid="tab-active"]',
      past: '[data-testid="tab-past"]',
      cancelled: '[data-testid="tab-cancelled"]',
    },
  },

  // ==================== PROFILE ====================
  profile: {
    container: '[data-testid="profile-container"]',
    avatar: '[data-testid="profile-avatar"]',
    name: '[data-testid="profile-name"]',
    email: '[data-testid="profile-email"]',
    editButton: '[data-testid="profile-edit"]',
    verificationStatus: '[data-testid="verification-status"]',
  },

  // ==================== COMMON BUTTONS ====================
  buttons: {
    primary: 'button.btn-primary, [data-testid*="primary"]',
    secondary: 'button.btn-secondary, [data-testid*="secondary"]',
    cancel: '[data-testid="cancel-button"]',
    confirm: '[data-testid="confirm-button"]',
    close: '[data-testid="close-button"]',
  },

  // ==================== MODALS ====================
  modal: {
    overlay: '[data-testid="modal-overlay"]',
    container: '[data-testid="modal-container"]',
    closeButton: '[data-testid="modal-close"]',
    title: '[data-testid="modal-title"]',
    content: '[data-testid="modal-content"]',
    confirmButton: '[data-testid="modal-confirm"]',
    cancelButton: '[data-testid="modal-cancel"]',
  },

  // ==================== TOAST / NOTIFICATIONS ====================
  toast: {
    container: '[data-testid="toast-container"]',
    message: '[data-testid="toast-message"]',
    success: '[data-testid="toast-success"]',
    error: '[data-testid="toast-error"]',
    warning: '[data-testid="toast-warning"]',
    closeButton: '[data-testid="toast-close"]',
  },
} as const;

// Type helper for selector keys
export type SelectorKey = keyof typeof Selectors;
