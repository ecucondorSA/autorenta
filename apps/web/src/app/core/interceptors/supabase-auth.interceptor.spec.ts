import { TestBed } from '@angular/core/testing';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { SupabaseAuthInterceptor } from './supabase-auth.interceptor';
import { AuthService } from '../services/auth.service';
import { environment } from '../../../environments/environment';
import { signal } from '@angular/core';

describe('SupabaseAuthInterceptor', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let mockNext: jasmine.Spy<HttpHandlerFn>;
  let mockRequest: HttpRequest<any>;

  const mockSession = {
    access_token: 'mock-access-token-12345',
    user: { id: 'user-123' },
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', [], {
      sessionSignal: signal(mockSession),
    });

    mockNext = jasmine.createSpy('next').and.returnValue(of({} as HttpEvent<any>));

    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: authServiceSpy }],
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    mockRequest = new HttpRequest('GET', 'https://api.example.com/data');
  });

  // ============================================================================
  // TOKEN INJECTION TESTS
  // ============================================================================

  describe('Token Injection', () => {
    it('should add Authorization header with bearer token', () => {
      // Arrange
      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(mockRequest, mockNext);
      });

      // Assert
      expect(capturedRequest).toBeDefined();
      expect(capturedRequest!.headers.has('Authorization')).toBe(true);
      expect(capturedRequest!.headers.get('Authorization')).toBe(
        'Bearer mock-access-token-12345',
      );
    });

    it('should add apikey header with Supabase anon key', () => {
      // Arrange
      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(mockRequest, mockNext);
      });

      // Assert
      expect(capturedRequest).toBeDefined();
      expect(capturedRequest!.headers.has('apikey')).toBe(true);
      expect(capturedRequest!.headers.get('apikey')).toBe(environment.supabaseAnonKey);
    });

    it('should clone request with both headers', () => {
      // Arrange
      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(mockRequest, mockNext);
      });

      // Assert
      expect(capturedRequest).not.toBe(mockRequest); // Should be a new cloned request
      expect(capturedRequest!.headers.has('Authorization')).toBe(true);
      expect(capturedRequest!.headers.has('apikey')).toBe(true);
    });
  });

  // ============================================================================
  // NO TOKEN SCENARIOS
  // ============================================================================

  describe('No Token Scenarios', () => {
    it('should not modify request when no token is available', () => {
      // Arrange
      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(null),
        writable: true,
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(mockRequest, mockNext);
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(mockRequest); // Original request, not modified
    });

    it('should not modify request when session exists but access_token is missing', () => {
      // Arrange
      const sessionWithoutToken = { user: { id: 'user-123' } };
      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(sessionWithoutToken),
        writable: true,
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(mockRequest, mockNext);
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(mockRequest);
    });

    it('should not modify request when sessionSignal returns undefined', () => {
      // Arrange
      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(undefined),
        writable: true,
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(mockRequest, mockNext);
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(mockRequest);
    });
  });

  // ============================================================================
  // EXISTING AUTHORIZATION HEADER TESTS
  // ============================================================================

  describe('Existing Authorization Header', () => {
    it('should not override existing Authorization header', () => {
      // Arrange
      const requestWithAuth = new HttpRequest('GET', 'https://api.example.com/data', {
        headers: { Authorization: 'Bearer existing-token' },
      });

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(requestWithAuth, mockNext);
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(requestWithAuth); // Original request unchanged
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should respect manually set Authorization for third-party APIs', () => {
      // Arrange
      const thirdPartyRequest = new HttpRequest('GET', 'https://api.stripe.com/charges', {
        headers: { Authorization: 'Bearer sk_test_...' },
      });

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(thirdPartyRequest, mockNext);
      });

      // Assert
      expect(mockNext).toHaveBeenCalledWith(thirdPartyRequest);
    });
  });

  // ============================================================================
  // REQUEST METHODS TESTS
  // ============================================================================

  describe('Different HTTP Methods', () => {
    it('should add auth headers for GET requests', () => {
      // Arrange
      const getRequest = new HttpRequest('GET', 'https://api.example.com/users');

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(getRequest, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.has('Authorization')).toBe(true);
    });

    it('should add auth headers for POST requests', () => {
      // Arrange
      const postRequest = new HttpRequest('POST', 'https://api.example.com/users', {
        name: 'John Doe',
      });

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(postRequest, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.has('Authorization')).toBe(true);
      expect(capturedRequest!.body).toEqual({ name: 'John Doe' }); // Body preserved
    });

    it('should add auth headers for PUT requests', () => {
      // Arrange
      const putRequest = new HttpRequest('PUT', 'https://api.example.com/users/123', {
        name: 'Jane Doe',
      });

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(putRequest, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.has('Authorization')).toBe(true);
    });

    it('should add auth headers for DELETE requests', () => {
      // Arrange
      const deleteRequest = new HttpRequest('DELETE', 'https://api.example.com/users/123');

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(deleteRequest, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.has('Authorization')).toBe(true);
    });
  });

  // ============================================================================
  // REAL-WORLD SCENARIO TESTS
  // ============================================================================

  describe('Real-World Scenarios', () => {
    it('should handle Supabase REST API request', () => {
      // Arrange
      const supabaseRequest = new HttpRequest(
        'GET',
        `${environment.supabaseUrl}/rest/v1/cars?select=*`,
      );

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(supabaseRequest, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.get('Authorization')).toBe(
        'Bearer mock-access-token-12345',
      );
      expect(capturedRequest!.headers.get('apikey')).toBe(environment.supabaseAnonKey);
    });

    it('should handle Supabase Storage request', () => {
      // Arrange
      const storageRequest = new HttpRequest(
        'POST',
        `${environment.supabaseUrl}/storage/v1/object/car-images/photo.jpg`,
        new FormData(),
      );

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(storageRequest, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.get('Authorization')).toBeTruthy();
      expect(capturedRequest!.headers.get('apikey')).toBeTruthy();
    });

    it('should handle Edge Function invocation', () => {
      // Arrange
      const edgeFunctionRequest = new HttpRequest(
        'POST',
        `${environment.supabaseUrl}/functions/v1/mercadopago-webhook`,
        { payment_id: '123' },
      );

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(edgeFunctionRequest, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.get('Authorization')).toBeTruthy();
    });

    it('should preserve existing headers when adding auth', () => {
      // Arrange
      const requestWithHeaders = new HttpRequest(
        'POST',
        'https://api.example.com/data',
        { data: 'test' },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'custom-value',
          },
        },
      );

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(mockSession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(requestWithHeaders, mockNext);
      });

      // Assert
      expect(capturedRequest!.headers.get('Content-Type')).toBe('application/json');
      expect(capturedRequest!.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(capturedRequest!.headers.get('Authorization')).toBeTruthy();
      expect(capturedRequest!.headers.get('apikey')).toBeTruthy();
    });
  });

  // ============================================================================
  // TOKEN EXPIRY SCENARIOS
  // ============================================================================

  describe('Token Expiry Scenarios', () => {
    it('should use current token even if near expiry', () => {
      // Arrange - Token expires in 30 seconds
      const nearExpirySession = {
        ...mockSession,
        expires_at: Date.now() / 1000 + 30,
      };

      Object.defineProperty(authService, 'sessionSignal', {
        value: signal(nearExpirySession),
        writable: true,
      });

      let capturedRequest: HttpRequest<any> | undefined;
      mockNext = jasmine.createSpy('next').and.callFake((req: HttpRequest<any>) => {
        capturedRequest = req;
        return of({} as HttpEvent<any>);
      });

      // Act
      TestBed.runInInjectionContext(() => {
        SupabaseAuthInterceptor(mockRequest, mockNext);
      });

      // Assert - Should still use the token (refresh is handled elsewhere)
      expect(capturedRequest!.headers.get('Authorization')).toBe(
        'Bearer mock-access-token-12345',
      );
    });
  });
});
