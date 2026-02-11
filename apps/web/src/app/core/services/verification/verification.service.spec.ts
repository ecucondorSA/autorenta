import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '@core/services/auth/auth.service';
import { FileUploadService } from '@core/services/infrastructure/file-upload.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { VerificationService } from '@core/services/verification/verification.service';

interface MockSession {
  access_token: string;
  user: {
    id: string;
  };
}

const createEdgeFunctionError = (status: number, body: Record<string, unknown>): { context: Response } => ({
  context: new Response(JSON.stringify(body), { status }),
});

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
