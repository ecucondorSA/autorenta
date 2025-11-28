/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck - Tests need rewrite: Response type mock incomplete
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { makeSupabaseMock } from '../../../test-helpers/supabase.mock';
import type { PaymentPreferenceResponse } from '../interfaces/payment-gateway.interface';
import { PayPalBookingGatewayService } from './paypal-booking-gateway.service';
import { SupabaseClientService } from './supabase-client.service';

// TODO: Fix Response mock type (missing headers, redirected, type, url properties)
describe('PayPalBookingGatewayService', () => {
  let service: PayPalBookingGatewayService;
  let supabaseMock: any;
  const originalFetch = globalThis.fetch;
  const mockSession = {
    access_token: 'mock-access-token',
    user: { id: 'user-123', email: 'test@example.com' },
  };

  beforeEach(() => {
    supabaseMock = makeSupabaseMock();

    // Mock getSession to return authenticated session
    supabaseMock.auth.getSession.and.resolveTo({
      data: { session: mockSession },
      error: null,
    });

    // Mock Supabase URL
    (supabaseMock as any).supabaseUrl = 'https://test.supabase.co';

    const supabaseServiceMock = {
      getClient: () => supabaseMock,
    };

    TestBed.configureTestingModule({
      providers: [
        PayPalBookingGatewayService,
        { provide: SupabaseClientService, useValue: supabaseServiceMock },
      ],
    });

    service = TestBed.inject(PayPalBookingGatewayService);
  });

  afterEach(() => {
    if (originalFetch) {
      globalThis.fetch = originalFetch;
    } else {
      delete (globalThis as any).fetch;
    }
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have provider set to "paypal"', () => {
    expect(service.provider).toBe('paypal');
  });

  describe('createBookingPreference()', () => {
    it('should create booking preference successfully', async () => {
      const mockResponse = {
        success: true,
        order_id: 'ORDER-123',
        approval_url: 'https://paypal.com/approve/ORDER-123',
        status: 'CREATED',
        amount_usd: '150.00',
        currency: 'USD',
        split_enabled: false,
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await firstValueFrom(service.createBookingPreference('booking-123', false));

      expect(result.success).toBe(true);
      expect(result.preference_id).toBe('ORDER-123');
      expect(result.init_point).toBe('https://paypal.com/approve/ORDER-123');
      expect(result.amount_usd).toBe(150);
      expect(result.currency).toBe('USD');
      expect(result.provider).toBe('paypal');

      // Verify fetch was called correctly
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/paypal-create-order',
        jasmine.objectContaining({
          method: 'POST',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-access-token',
          }),
          body: JSON.stringify({
            booking_id: 'booking-123',
            use_split_payment: false,
          }),
        }),
      );
    });

    it('should create booking preference with split payment enabled', async () => {
      const mockResponse = {
        success: true,
        order_id: 'ORDER-456',
        approval_url: 'https://paypal.com/approve/ORDER-456',
        status: 'CREATED',
        amount_usd: '200.00',
        currency: 'USD',
        split_enabled: true,
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await firstValueFrom(service.createBookingPreference('booking-456', true));

      expect(result.success).toBe(true);
      expect(globalThis.fetch).toHaveBeenCalledWith(
        jasmine.any(String),
        jasmine.objectContaining({
          body: JSON.stringify({
            booking_id: 'booking-456',
            use_split_payment: true,
          }),
        }),
      );
    });

    it('should throw error when user is not authenticated', async () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null,
      });

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Usuario no autenticado');
      }
    });

    it('should handle HTTP error response', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Edge Function error' }),
      } as Response);

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Edge Function error');
      }
    });

    it('should handle HTTP error without JSON body', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => {
          throw new Error('No JSON');
        },
      } as Response);

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('HTTP 503');
      }
    });

    it('should handle PayPal API error (success: false)', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Insufficient funds in PayPal account',
        }),
      } as Response);

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Insufficient funds in PayPal account');
      }
    });

    it('should handle unknown PayPal error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => ({
          success: false,
        }),
      } as Response);

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Error desconocido al crear orden de PayPal');
      }
    });
  });

  describe('captureOrder()', () => {
    it('should capture order successfully', async () => {
      const mockCaptureResponse = {
        success: true,
        capture_id: 'CAPTURE-789',
        order_id: 'ORDER-123',
        status: 'COMPLETED',
        amount: '150.00',
        currency: 'USD',
        booking_id: 'booking-123',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockCaptureResponse,
      } as Response);

      const result = await firstValueFrom(service.captureOrder('ORDER-123'));

      expect(result.success).toBe(true);
      expect(result.capture_id).toBe('CAPTURE-789');
      expect(result.order_id).toBe('ORDER-123');
      expect(result.status).toBe('COMPLETED');

      // Verify fetch was called correctly
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://test.supabase.co/functions/v1/paypal-capture-order',
        jasmine.objectContaining({
          method: 'POST',
          headers: jasmine.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer mock-access-token',
          }),
          body: JSON.stringify({ order_id: 'ORDER-123' }),
        }),
      );
    });

    it('should throw error when user is not authenticated', async () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null,
      });

      try {
        await firstValueFrom(service.captureOrder('ORDER-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Usuario no autenticado');
      }
    });

    it('should handle capture HTTP error', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Order not found' }),
      } as Response);

      try {
        await firstValueFrom(service.captureOrder('INVALID-ORDER'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Order not found');
      }
    });

    it('should handle capture failure (success: false)', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Order already captured',
        }),
      } as Response);

      try {
        await firstValueFrom(service.captureOrder('ORDER-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Order already captured');
      }
    });
  });

  describe('isPreferenceValid()', () => {
    it('should return true for valid pending booking', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    payment_preference_id: 'ORDER-123',
                    payment_provider: 'paypal',
                    status: 'pending',
                  },
                  error: null,
                }),
            }),
          }),
        }),
      });

      const isValid = await service.isPreferenceValid('ORDER-123');

      expect(isValid).toBe(true);
    });

    it('should return false for confirmed booking', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    payment_preference_id: 'ORDER-123',
                    payment_provider: 'paypal',
                    status: 'confirmed',
                  },
                  error: null,
                }),
            }),
          }),
        }),
      });

      const isValid = await service.isPreferenceValid('ORDER-123');

      expect(isValid).toBe(false);
    });

    it('should return false when booking not found', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: null,
                  error: null,
                }),
            }),
          }),
        }),
      });

      const isValid = await service.isPreferenceValid('INVALID-ORDER');

      expect(isValid).toBe(false);
    });

    it('should return false when user is not authenticated', async () => {
      supabaseMock.auth.getSession.and.resolveTo({
        data: { session: null },
        error: null,
      });

      const isValid = await service.isPreferenceValid('ORDER-123');

      expect(isValid).toBe(false);
    });

    it('should return false on database error', async () => {
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () => Promise.reject(new Error('Database connection failed')),
            }),
          }),
        }),
      });

      const isValid = await service.isPreferenceValid('ORDER-123');

      expect(isValid).toBe(false);
    });
  });

  describe('redirectToCheckout()', () => {
    let windowOpenSpy: jasmine.Spy;
    let originalLocationHref: string;

    beforeEach(() => {
      windowOpenSpy = spyOn(window, 'open');
      originalLocationHref = window.location.href;
    });

    afterEach(() => {
      // Cannot restore window.location.href in tests, but we track the intent
    });

    it('should redirect in same window by default', () => {
      const approvalUrl = 'https://paypal.com/approve/ORDER-123';

      service.redirectToCheckout(approvalUrl);

      expect(windowOpenSpy).not.toHaveBeenCalled();
      // Would set window.location.href = approvalUrl in real browser
    });

    it('should open in new tab when requested', () => {
      const approvalUrl = 'https://paypal.com/approve/ORDER-456';

      service.redirectToCheckout(approvalUrl, true);

      expect(windowOpenSpy).toHaveBeenCalledWith(approvalUrl, '_blank');
    });

    it('should handle same window when explicitly false', () => {
      const approvalUrl = 'https://paypal.com/approve/ORDER-789';

      service.redirectToCheckout(approvalUrl, false);

      expect(windowOpenSpy).not.toHaveBeenCalled();
    });
  });

  describe('error formatting', () => {
    it('should format Error objects correctly', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith(new Error('Network failure'));

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Network failure');
      }
    });

    it('should format string errors correctly', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith('Simple error string');

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe('Simple error string');
      }
    });

    it('should format unknown errors with generic message', async () => {
      globalThis.fetch = jasmine.createSpy('fetch').and.rejectWith({ code: 12345 });

      try {
        await firstValueFrom(service.createBookingPreference('booking-123'));
        fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBe(
          'Error al procesar el pago con PayPal. Por favor intente nuevamente.',
        );
      }
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete booking payment flow', async () => {
      // Step 1: Create preference
      const mockCreateResponse = {
        success: true,
        order_id: 'ORDER-INTEGRATION',
        approval_url: 'https://paypal.com/approve/ORDER-INTEGRATION',
        status: 'CREATED',
        amount_usd: '250.00',
        currency: 'USD',
        split_enabled: true,
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockCreateResponse,
      } as Response);

      const preference = await firstValueFrom(
        service.createBookingPreference('booking-integration', true),
      );

      expect(preference.success).toBe(true);
      expect(preference.preference_id).toBe('ORDER-INTEGRATION');

      // Step 2: Verify preference is valid
      supabaseMock.from.and.returnValue({
        select: () => ({
          eq: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    payment_preference_id: 'ORDER-INTEGRATION',
                    payment_provider: 'paypal',
                    status: 'pending',
                  },
                  error: null,
                }),
            }),
          }),
        }),
      });

      const isValid = await service.isPreferenceValid('ORDER-INTEGRATION');
      expect(isValid).toBe(true);

      // Step 3: Capture order (after user approval)
      const mockCaptureResponse = {
        success: true,
        capture_id: 'CAPTURE-INTEGRATION',
        order_id: 'ORDER-INTEGRATION',
        status: 'COMPLETED',
        amount: '250.00',
        currency: 'USD',
        booking_id: 'booking-integration',
      };

      globalThis.fetch = jasmine.createSpy('fetch').and.resolveTo({
        ok: true,
        json: async () => mockCaptureResponse,
      } as Response);

      const capture = await firstValueFrom(service.captureOrder!('ORDER-INTEGRATION'));
      expect(capture.success).toBe(true);
      expect(capture.status).toBe('COMPLETED');
    });
  });
});
