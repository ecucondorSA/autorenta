/**
 * Test Data Management
 *
 * Centralized test data with support for environment variables.
 * Uses sensible defaults for local development.
 */

export interface UserCredentials {
  email: string;
  password: string;
}

export interface BookingDates {
  start: string;
  end: string;
}

export class TestData {
  // ==================== USER CREDENTIALS ====================

  /**
   * Valid test user credentials
   * Override with TEST_USER_EMAIL and TEST_USER_PASSWORD env vars
   */
  readonly validUser: UserCredentials = {
    email: process.env.TEST_USER_EMAIL || 'ecucondor@gmail.com',
    password: process.env.TEST_USER_PASSWORD || '',
  };

  /**
   * Invalid credentials for testing error handling
   */
  readonly invalidUser: UserCredentials = {
    email: 'invalid@nonexistent.com',
    password: 'wrongpassword123',
  };

  /**
   * New user for registration tests
   */
  readonly newUser = {
    name: 'Test User',
    email: this.generateUniqueEmail(),
    password: 'NewUserPass123!',
    phone: '+54 11 1234-5678',
  };

  /**
   * Owner user (for owner-specific tests)
   */
  readonly ownerUser: UserCredentials = {
    email: process.env.TEST_OWNER_EMAIL || 'owner@autorentar.com',
    password: process.env.TEST_OWNER_PASSWORD || 'ownerpass123',
  };

  // ==================== BOOKING DATA ====================

  /**
   * Sample booking dates (2-5 days from now)
   */
  readonly booking = {
    dates: {
      start: this.getFutureDate(2),
      end: this.getFutureDate(5),
    },
    driver: {
      licenseNumber: 'B12345678',
      issuedDate: '2020-01-15',
      expirationDate: '2030-01-15',
    },
    pickupLocation: 'Buenos Aires, Argentina',
    returnLocation: 'Buenos Aires, Argentina',
  };

  /**
   * Short rental (1 day)
   */
  readonly shortBooking = {
    dates: {
      start: this.getFutureDate(1),
      end: this.getFutureDate(2),
    },
  };

  /**
   * Long rental (2 weeks)
   */
  readonly longBooking = {
    dates: {
      start: this.getFutureDate(3),
      end: this.getFutureDate(17),
    },
  };

  // ==================== PAYMENT DATA ====================

  /**
   * MercadoPago test card (APRO = Approved)
   * See: https://www.mercadopago.com.ar/developers/es/docs/checkout-api/additional-content/test-cards
   */
  readonly testCard = {
    number: '5031755734530604', // Mastercard Argentina (sin espacios para MP brick)
    expiry: '11/25',
    cvv: '123',
    holder: 'APRO', // APRO = approved
    docType: 'DNI',
    docNumber: '12345678',
    email: 'test_user_e2e@autorentar.com',
  };

  /**
   * MercadoPago Visa test card (APRO = Approved)
   */
  readonly testCardVisa = {
    number: '4509953566233704', // Visa Argentina
    expiry: '11/25',
    cvv: '123',
    holder: 'APRO',
    docType: 'DNI',
    docNumber: '12345678',
    email: 'test_user_e2e@autorentar.com',
  };

  /**
   * MercadoPago test card (OTHE = Other error / rejected)
   */
  readonly failingCard = {
    number: '5031755734530604',
    expiry: '11/25',
    cvv: '123',
    holder: 'OTHE', // OTHE = rejected
    docType: 'DNI',
    docNumber: '12345678',
    email: 'test_user_e2e@autorentar.com',
  };

  /**
   * MercadoPago test card (CONT = Pending)
   */
  readonly pendingCard = {
    number: '5031755734530604',
    expiry: '11/25',
    cvv: '123',
    holder: 'CONT', // CONT = pending/contingency
    docType: 'DNI',
    docNumber: '12345678',
    email: 'test_user_e2e@autorentar.com',
  };

  /**
   * MercadoPago test card (CALL = Call for authorize)
   */
  readonly callCard = {
    number: '5031755734530604',
    expiry: '11/25',
    cvv: '123',
    holder: 'CALL', // CALL = call_for_authorize
    docType: 'DNI',
    docNumber: '12345678',
    email: 'test_user_e2e@autorentar.com',
  };

  /**
   * MercadoPago test card (FUND = Insufficient funds)
   */
  readonly insufficientFundsCard = {
    number: '5031755734530604',
    expiry: '11/25',
    cvv: '123',
    holder: 'FUND', // FUND = insufficient_amount
    docType: 'DNI',
    docNumber: '12345678',
    email: 'test_user_e2e@autorentar.com',
  };

  // ==================== URLS ====================

  readonly urls = {
    home: '/',
    login: '/auth/login',
    register: '/auth/register',
    resetPassword: '/auth/reset-password',
    cars: '/cars',
    carDetail: (id: string) => `/cars/${id}`,
    wallet: '/wallet',
    bookings: '/bookings',
    myBookings: '/bookings/my-bookings',
    bookingDetail: (id: string) => `/bookings/${id}`,
    profile: '/profile',
    myCars: '/cars/my-cars',
    publishCar: '/cars/publish',
    calendar: '/calendar',
    earnings: '/dashboard/earnings',
  };

  // ==================== SEARCH QUERIES ====================

  readonly searchQueries = {
    brandToyota: 'Toyota',
    brandFord: 'Ford',
    locationBsAs: 'Buenos Aires',
    locationCordoba: 'Córdoba',
    invalidSearch: 'xyznonexistent123',
  };

  // ==================== HELPERS ====================

  /**
   * Generate a unique email for test isolation
   */
  generateUniqueEmail(prefix = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}+${timestamp}_${random}@autorentar.com`;
  }

  /**
   * Get date N days in the future (YYYY-MM-DD format)
   */
  getFutureDate(daysAhead: number): string {
    const date = new Date();
    date.setDate(date.getDate() + daysAhead);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get date N days in the past (YYYY-MM-DD format)
   */
  getPastDate(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get today's date (YYYY-MM-DD format)
   */
  getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Generate random phone number
   */
  generatePhone(): string {
    const random = Math.floor(Math.random() * 90000000) + 10000000;
    return `+54 11 ${random.toString().slice(0, 4)}-${random.toString().slice(4)}`;
  }

  /**
   * Generate random DNI
   */
  generateDNI(): string {
    return Math.floor(Math.random() * 90000000 + 10000000).toString();
  }
}

// Export singleton instance
export const testData = new TestData();
