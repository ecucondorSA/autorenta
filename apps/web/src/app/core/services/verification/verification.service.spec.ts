import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/services/auth/auth.service';
import { FileUploadService } from '@core/services/infrastructure/file-upload.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { VerificationService } from '@core/services/verification/verification.service';
import { environment } from '@environment';

interface MockSession {
  access_token: string;
  user: {
    id: string;
  };
}

const createEdgeFunctionError = (status: number, body: Record<string, unknown>): { context: Response } => ({
  context: new Response(JSON.stringify(body), { status }),
});
const createFetchError = (message = 'Failed to fetch'): Error => new Error(message);

const encodeBase64Url = (value: string): string =>
  globalThis.btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const buildJwt = (payload: Record<string, unknown>): string =>
  `${encodeBase64Url('{"alg":"HS256","typ":"JWT"}')}.${encodeBase64Url(JSON.stringify(payload))}.signature`;

const EXPECTED_ISSUER = `${environment.supabaseUrl.replace(/\/+$/, '')}/auth/v1`;

const ocrSuccessResponse = {
  success: true,
  ocr_confidence: 91,
  validation: {
    isValid: true,
    confidence: 91,
    extracted: {},
    errors: [],
    warnings: [],
  },
  extracted_data: {
    fullName: 'Ana Test',
    documentNumber: '12345678',
  },
  errors: [],
  warnings: [],
};

describe('VerificationService', () => {
  let service: VerificationService;

  let invokeSpy: jasmine.Spy;
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    getCachedUserId: jasmine.Spy<() => Promise<string | null>>;
    ensureSession: jasmine.Spy<() => Promise<MockSession | null>>;
    refreshSession: jasmine.Spy<() => Promise<MockSession | null>>;
  };

  beforeEach(() => {
    invokeSpy = jasmine.createSpy('invoke');

    authServiceMock = {
      isAuthenticated: signal(false),
      getCachedUserId: jasmine.createSpy('getCachedUserId').and.resolveTo('user-test'),
      ensureSession: jasmine
        .createSpy('ensureSession')
        .and.resolveTo({ access_token: 'token-a', user: { id: 'user-test' } }),
      refreshSession: jasmine
        .createSpy('refreshSession')
        .and.resolveTo({ access_token: 'token-b', user: { id: 'user-test' } }),
    };

    const supabaseClientMock = {
      functions: {
        invoke: invokeSpy,
      },
      storage: {
        from: jasmine.createSpy('from').and.returnValue({
          upload: jasmine.createSpy('upload').and.resolveTo({ error: null }),
          remove: jasmine.createSpy('remove').and.resolveTo({ error: null }),
        }),
      },
      rpc: jasmine.createSpy('rpc').and.resolveTo({ data: null, error: null }),
      channel: jasmine.createSpy('channel').and.returnValue({
        on: jasmine.createSpy('on').and.returnValue({
          subscribe: jasmine.createSpy('subscribe'),
        }),
      }),
      removeChannel: jasmine.createSpy('removeChannel'),
    };

    const loggerMock = {
      debug: jasmine.createSpy('debug'),
      info: jasmine.createSpy('info'),
      warn: jasmine.createSpy('warn'),
      error: jasmine.createSpy('error'),
    };

    const fileUploadMock = {
      compressImage: jasmine
        .createSpy('compressImage')
        .and.callFake(async (file: File): Promise<File> => file),
    };

    TestBed.configureTestingModule({
      providers: [
        VerificationService,
        { provide: SupabaseClientService, useValue: { client: supabaseClientMock } },
        { provide: AuthService, useValue: authServiceMock },
        { provide: LoggerService, useValue: loggerMock },
        { provide: FileUploadService, useValue: fileUploadMock },
      ],
    });

    service = TestBed.inject(VerificationService);
  });

  it('reintenta verify-document tras 401 y refresh de sesión', async () => {
    const sessionA: MockSession = { access_token: 'token-a', user: { id: 'user-test' } };
    const sessionB: MockSession = { access_token: 'token-b', user: { id: 'user-test' } };

    authServiceMock.ensureSession.and.returnValues(Promise.resolve(sessionA), Promise.resolve(sessionB));

    invokeSpy.and.callFake(
      async (_fn: string, options: { headers?: Record<string, string> }) => {
        const authHeader = options.headers?.['Authorization'];

        if (authHeader === `Bearer ${sessionA.access_token}`) {
          return {
            data: null,
            error: createEdgeFunctionError(401, { code: 401, message: 'Invalid JWT' }),
          };
        }

        return {
          data: ocrSuccessResponse,
          error: null,
        };
      },
    );

    const result = await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');

    expect(authServiceMock.refreshSession).toHaveBeenCalledTimes(1);
    expect(invokeSpy).toHaveBeenCalledTimes(2);
    expect(result.success).toBeTrue();
  });

  it('reintenta verify-document sin x-kyc-trace-id ante fallo de red/CORS', async () => {
    invokeSpy.and.callFake(
      async (_fn: string, options: { headers?: Record<string, string> }) => {
        const traceHeader = options.headers?.['x-kyc-trace-id'];

        if (traceHeader) {
          return {
            data: null,
            error: createFetchError('Failed to fetch'),
          };
        }

        return {
          data: ocrSuccessResponse,
          error: null,
        };
      },
    );

    const result = await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');

    expect(result.success).toBeTrue();
    const firstInvokeOptions = invokeSpy.calls.argsFor(0)[1] as { headers?: Record<string, string> };
    if (environment.production) {
      expect(invokeSpy).toHaveBeenCalledTimes(1);
      expect(firstInvokeOptions.headers?.['x-kyc-trace-id']).toBeUndefined();
    } else {
      expect(invokeSpy).toHaveBeenCalledTimes(2);
      const secondInvokeOptions = invokeSpy.calls.argsFor(1)[1] as { headers?: Record<string, string> };
      expect(firstInvokeOptions.headers?.['x-kyc-trace-id']).toBeDefined();
      expect(secondInvokeOptions.headers?.['x-kyc-trace-id']).toBeUndefined();
    }
    expect(authServiceMock.refreshSession).not.toHaveBeenCalled();
  });

  it('mapea OCR_FAILED (400) a error de usuario legible', async () => {
    invokeSpy.and.resolveTo({
      data: null,
      error: createEdgeFunctionError(400, { error: 'OCR_FAILED' }),
    });

    try {
      await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');
      fail('Expected verifyDocumentOcr to throw for OCR_FAILED');
    } catch (error) {
      expect(error instanceof Error).toBeTrue();
      expect((error as Error).message).toContain('No pudimos validar esa foto');
    }
  });

  it('normaliza Invalid JWT para no exponer mensaje técnico al usuario', async () => {
    invokeSpy.and.resolveTo({
      data: null,
      error: createEdgeFunctionError(401, { code: 401, message: 'Invalid JWT' }),
    });

    try {
      await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');
      fail('Expected verifyDocumentOcr to throw for Invalid JWT');
    } catch (error) {
      expect(error instanceof Error).toBeTrue();
      expect((error as Error).message).toContain('Tu sesión expiró');
      expect((error as Error).message).not.toContain('Invalid JWT');
    }
  });

  it('aborta si el issuer del JWT no coincide con el entorno activo', async () => {
    const mismatchedIssuerToken = buildJwt({
      iss: 'https://otro-proyecto.supabase.co/auth/v1',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    authServiceMock.ensureSession.and.resolveTo({
      access_token: mismatchedIssuerToken,
      user: { id: 'user-test' },
    });

    try {
      await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');
      fail('Expected verifyDocumentOcr to throw on issuer mismatch');
    } catch (error) {
      expect(error instanceof Error).toBeTrue();
      expect((error as Error).message).toContain('entorno actual');
      expect(invokeSpy).not.toHaveBeenCalled();
    }
  });

  it('refresca token preventivamente cuando el access token está viejo', async () => {
    const staleToken = buildJwt({
      iss: EXPECTED_ISSUER,
      iat: Math.floor(Date.now() / 1000) - 600,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const freshToken = buildJwt({
      iss: EXPECTED_ISSUER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    authServiceMock.ensureSession.and.resolveTo({
      access_token: staleToken,
      user: { id: 'user-test' },
    });
    authServiceMock.refreshSession.and.resolveTo({
      access_token: freshToken,
      user: { id: 'user-test' },
    });

    invokeSpy.and.resolveTo({
      data: ocrSuccessResponse,
      error: null,
    });

    await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');

    expect(authServiceMock.refreshSession).toHaveBeenCalledTimes(1);
    const invokeArgs = invokeSpy.calls.mostRecent().args[1] as { headers?: Record<string, string> };
    expect(invokeArgs.headers?.['Authorization']).toBe(`Bearer ${freshToken}`);
  });

  it('evita loop de OCR_FAILED aplicando cooldown corto por imagen/lado', async () => {
    const validToken = buildJwt({
      iss: EXPECTED_ISSUER,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    authServiceMock.ensureSession.and.resolveTo({
      access_token: validToken,
      user: { id: 'user-test' },
    });

    invokeSpy.and.resolveTo({
      data: null,
      error: createEdgeFunctionError(400, { error: 'OCR_FAILED' }),
    });

    try {
      await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');
      fail('Expected first OCR attempt to fail');
    } catch {
      // expected
    }

    try {
      await service.verifyDocumentOcr('base64-image', 'dni', 'front', 'AR');
      fail('Expected second OCR attempt to be blocked by cooldown');
    } catch (error) {
      expect(error instanceof Error).toBeTrue();
      expect((error as Error).message).toContain('Espera unos segundos');
    }

    expect(invokeSpy).toHaveBeenCalledTimes(1);
  });

  it('devuelve ocrWarning cuando OCR falla pero mantiene upload exitoso', async () => {
    const file = new File(['fake'], 'doc.png', { type: 'image/png' });

    spyOn(service, 'uploadDocument').and.resolveTo('user-test/gov_id_front_123.png');
    spyOn(service, 'verifyDocumentOcr').and.rejectWith(
      new Error('No pudimos verificar el documento automáticamente.'),
    );
    spyOn(service, 'triggerVerification').and.resolveTo();

    const result = await service.uploadAndVerifyDocument(file, 'gov_id_front', 'AR');

    expect(service.uploadDocument).toHaveBeenCalledTimes(1);
    expect(service.verifyDocumentOcr).toHaveBeenCalledTimes(1);
    expect(result.storagePath).toBe('user-test/gov_id_front_123.png');
    expect(result.ocrResult).toBeNull();
    expect(result.ocrWarning).toContain('No pudimos verificar el documento automáticamente');
  });
});
