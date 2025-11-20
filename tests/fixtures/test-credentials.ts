/**
 * Test Credentials for E2E Testing
 *
 * These credentials should match users created in your Supabase test environment.
 * Never commit real production credentials!
 */

export const TEST_CREDENTIALS = {
  /**
   * Test renter user for booking flow tests
   */
  renter: {
    email: 'test-renter@autorenta.com',
    password: 'TestPassword123!',
    role: 'locatario' as const
  },

  /**
   * Test car owner user for publication flow tests
   */
  owner: {
    email: 'test-owner@autorenta.com',
    password: 'TestPassword123!',
    role: 'locador' as const
  },

  /**
   * Admin user for admin panel tests (optional)
   */
  admin: {
    email: 'test-admin@autorenta.com',
    password: 'TestPassword123!',
    role: 'locatario' as const,
    isAdmin: true
  }
};

/**
 * MercadoPago Test Cards
 * Reference: https://www.mercadopago.com.ar/developers/es/docs/checkout-pro/additional-content/test-cards
 */
export const MP_TEST_CARDS = {
  /**
   * Card that will be APPROVED
   */
  APPROVED: {
    number: '5031755734530604',
    cvv: '123',
    expiration: '11/25',
    cardholderName: 'APRO',
    identification: {
      type: 'DNI',
      number: '12345678'
    }
  },

  /**
   * Card that will be REJECTED due to insufficient funds
   */
  REJECTED_INSUFFICIENT_FUNDS: {
    number: '5031433215406351',
    cvv: '123',
    expiration: '11/25',
    cardholderName: 'FUND',
    identification: {
      type: 'DNI',
      number: '12345678'
    }
  },

  /**
   * Card that will be REJECTED - invalid card
   */
  REJECTED_INVALID_CARD: {
    number: '5031755734530604',
    cvv: '123',
    expiration: '11/25',
    cardholderName: 'OTHE',
    identification: {
      type: 'DNI',
      number: '12345678'
    }
  },

  /**
   * Card that will trigger call for authorization
   */
  CALL_FOR_AUTH: {
    number: '5031755734530604',
    cvv: '123',
    expiration: '11/25',
    cardholderName: 'CALL',
    identification: {
      type: 'DNI',
      number: '12345678'
    }
  }
};

/**
 * Test booking data
 */
export const TEST_BOOKING = {
  /**
   * Sample car for testing (should exist in test DB)
   */
  carId: 'test-car-001',

  /**
   * Test booking dates (always in the future)
   */
  dates: {
    start: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    end: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000)   // 10 days from now
  },

  /**
   * Expected pricing (should match your pricing logic)
   */
  expectedPrice: {
    dailyRate: 50,
    days: 3,
    subtotal: 150,
    serviceFee: 15,
    total: 165
  }
};

/**
 * Wallet test amounts
 */
export const WALLET_TEST = {
  /**
   * Test deposit amount (in ARS)
   */
  depositAmount: 1000,

  /**
   * Minimum withdrawal amount
   */
  minWithdrawal: 100,

  /**
   * Test withdrawal amount
   */
  withdrawalAmount: 500
};

/**
 * API endpoints for testing
 */
export const TEST_ENDPOINTS = {
  login: '/auth/login',
  register: '/auth/register',
  dashboard: '/dashboard',
  catalog: '/cars',
  carDetail: (id: string) => `/cars/${id}`,
  booking: '/bookings',
  bookingDetail: (id: string) => `/bookings/${id}`,
  wallet: '/wallet',
  profile: '/profile'
};

/**
 * Playwright selectors (data-test attributes)
 */
export const SELECTORS = {
  auth: {
    emailInput: '[data-test="email"]',
    passwordInput: '[data-test="password"]',
    loginButton: '[data-test="login-submit"]',
    registerButton: '[data-test="register-submit"]',
    logoutButton: '[data-test="logout"]'
  },
  booking: {
    searchButton: '[data-test="search-button"]',
    dateStart: '[data-test="date-start"]',
    dateEnd: '[data-test="date-end"]',
    bookNowButton: '[data-test="book-now"]',
    confirmButton: '[data-test="confirm-booking"]',
    cancelButton: '[data-test="cancel-booking"]'
  },
  payment: {
    cardNumber: '[data-test="card-number"]',
    cardCvv: '[data-test="card-cvv"]',
    cardExpiry: '[data-test="card-expiry"]',
    payButton: '[data-test="pay-button"]',
    successMessage: '[data-test="payment-success"]'
  },
  wallet: {
    balance: '[data-test="wallet-balance"]',
    depositButton: '[data-test="deposit-button"]',
    withdrawButton: '[data-test="withdraw-button"]',
    amountInput: '[data-test="amount-input"]'
  }
};
