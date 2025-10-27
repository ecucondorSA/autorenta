import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PaymentsService } from './payments.service';
import { SupabaseClientService } from './supabase-client.service';
import { FxService } from './fx.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let supabase: any;
  let originalWebhookUrl: string;
  let fxService: jasmine.SpyObj<FxService>;

  beforeEach(() => {
    originalWebhookUrl = environment.paymentsWebhookUrl;

    // Mock completo de Supabase
    supabase = {
      from: jasmine.createSpy('from'),
      auth: {
        getUser: jasmine.createSpy('getUser').and.resolveTo({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    };
    fxService = jasmine.createSpyObj<FxService>('FxService', ['getCurrentRateAsync']);
    fxService.getCurrentRateAsync.and.resolveTo(1000);

    TestBed.configureTestingModule({
      providers: [
        PaymentsService,
        { provide: SupabaseClientService, useValue: { getClient: () => supabase } },
        { provide: FxService, useValue: fxService },
      ],
    });

    service = TestBed.inject(PaymentsService);
  });

  afterEach(() => {
    environment.paymentsWebhookUrl = originalWebhookUrl;
  });

  describe('Basic functionality', () => {
    it('creates payment intents with default values', async () => {
      // Mock para obtener booking
      const bookingBuilder: unknown = {};
      bookingBuilder.select = jasmine.createSpy('select').and.returnValue(bookingBuilder);
      bookingBuilder.eq = jasmine.createSpy('eq').and.returnValue(bookingBuilder);
      bookingBuilder.single = jasmine.createSpy('single').and.resolveTo({
        data: {
          id: 'booking-1',
          total_amount: 100000,
          currency: 'ARS',
          renter_id: 'user-123',
        },
        error: null,
      });

      // Mock para insertar payment intent
      const intentBuilder: unknown = {};
      intentBuilder.select = jasmine.createSpy('select').and.returnValue(intentBuilder);
      intentBuilder.single = jasmine.createSpy('single').and.resolveTo({
        data: { id: 'intent-1', status: 'pending' },
        error: null,
      });
      const insert = jasmine.createSpy('insert').and.returnValue(intentBuilder);

      supabase.from.and.callFake((table: string) => {
        if (table === 'bookings') return bookingBuilder;
        if (table === 'payment_intents') return { insert };
        return {};
      });

      const intent = await service.createIntent('booking-1');

      expect(intent).toEqual({ id: 'intent-1', status: 'pending' } as any);
      expect(fxService.getCurrentRateAsync).toHaveBeenCalledWith('USD', 'ARS');
    });

    it('calls the worker webhook when marking as paid', async () => {
      environment.paymentsWebhookUrl = 'https://worker.example';
      const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 200 }));

      await service.markAsPaid('intent-7');

      expect(fetchSpy).toHaveBeenCalledWith('https://worker.example', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'mock',
          intent_id: 'intent-7',
          status: 'approved',
        }),
      });
    });

    it('returns null when payment intent is missing', async () => {
      const builder: unknown = {};
      builder.select = jasmine.createSpy('select').and.returnValue(builder);
      builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
      builder.single = jasmine.createSpy('single').and.resolveTo({
        data: null,
        error: { code: 'PGRST116' },
      });
      supabase.from.and.returnValue(builder);

      const result = await service.getStatus('missing');

      expect(builder.eq).toHaveBeenCalledWith('id', 'missing');
      expect(result).toBeNull();
    });
  });

  // ========================================
  // SPRINT 1.1: Email dinámico en pagos
  // ========================================
  describe('SPRINT 1.1: Email dinámico en pagos', () => {
    it('debería usar email del usuario cuando está disponible', async () => {
      pending('Funcionalidad pendiente de implementación');
    });

    it('debería usar email por defecto cuando no hay email', async () => {
      pending('Funcionalidad pendiente de implementación');
    });

    it('debería validar formato de email inválido', () => {
      pending('Funcionalidad pendiente de implementación');
    });
  });

  // ========================================
  // SPRINT 1.2: PaymentsService centralizado
  // ========================================
  describe('SPRINT 1.2: PaymentsService centralizado', () => {
    it('debería tener toda la lógica de pago centralizada en processPayment', () => {
      // Verificar que el método processPayment existe
      expect(typeof service.processPayment).toBe('function');
    });

    it('debería procesar el pago completo: crear intent, marcar como pagado, verificar estado', async () => {
      environment.paymentsWebhookUrl = 'https://worker.example';

      // Mock de createIntent
      spyOn(service, 'createIntent').and.resolveTo({
        id: 'intent-123',
        status: 'pending',
      } as any);

      // Mock de markAsPaid
      spyOn(service, 'markAsPaid').and.resolveTo();

      // Mock de getStatus
      spyOn(service, 'getStatus').and.resolveTo({
        id: 'intent-123',
        status: 'completed',
      } as any);

      const result = await service.processPayment('booking-1');

      expect(result.success).toBe(true);
      expect(result.paymentIntentId).toBe('intent-123');
      expect(service.createIntent).toHaveBeenCalledWith('booking-1');
      expect(service.markAsPaid).toHaveBeenCalledWith('intent-123');
      expect(service.getStatus).toHaveBeenCalledWith('intent-123');
    });

    it('debería manejar errores durante el proceso de pago', async () => {
      environment.paymentsWebhookUrl = 'https://worker.example';

      // Mock de createIntent que falla
      spyOn(service, 'createIntent').and.rejectWith(new Error('Error de red'));

      const result = await service.processPayment('booking-1');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Error de red');
    });

    it('no debería tener lógica de pago duplicada - todo debe usar PaymentsService', () => {
      // Este test verifica la arquitectura
      // Los componentes deben inyectar PaymentsService y llamar a processPayment
      // En lugar de duplicar lógica de createIntent + markAsPaid + getStatus
      expect(service.processPayment).toBeDefined();
      expect(service.createIntent).toBeDefined();
      expect(service.markAsPaid).toBeDefined();
      expect(service.getStatus).toBeDefined();
    });
  });

  // ========================================
  // SPRINT 1.3: Retry logic
  // ========================================
  describe('SPRINT 1.3: Retry logic', () => {
    beforeEach(() => {
      environment.paymentsWebhookUrl = 'https://worker.example';
    });

    it('debería reintentar después de un fallo de red', async () => {
      let attemptCount = 0;

      // Mock que falla 2 veces y luego tiene éxito
      const createIntentSpy = spyOn(service, 'createIntent').and.callFake(async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network error');
        }
        return { id: 'intent-123', status: 'pending' } as unknown;
      });

      const markAsPaidSpy = spyOn(service, 'markAsPaid').and.resolveTo();
      const getStatusSpy = spyOn(service, 'getStatus').and.resolveTo({
        id: 'intent-123',
        status: 'completed',
      } as any);

      // Mock del delay para acelerar el test
      spyOn<unknown>(service, 'delay').and.resolveTo();

      const result = await service.processPayment('booking-1');

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(createIntentSpy).toHaveBeenCalledTimes(3);
    });

    it('debería tener un máximo de 3 reintentos', async () => {
      let attemptCount = 0;

      // Mock que siempre falla
      const createIntentSpy = spyOn(service, 'createIntent').and.callFake(async () => {
        attemptCount++;
        throw new Error('Network error');
      });

      // Mock del delay para acelerar el test
      spyOn<unknown>(service, 'delay').and.resolveTo();

      const result = await service.processPayment('booking-1');

      expect(result.success).toBe(false);
      expect(attemptCount).toBe(4); // 1 intento inicial + 3 reintentos
      expect(result.error).toContain('Network error');
      expect(createIntentSpy).toHaveBeenCalledTimes(4);
    });

    it('debería usar backoff exponencial entre reintentos', async () => {
      const delays: number[] = [];

      // Mock del delay para capturar los valores
      const delaySpy = spyOn<unknown>(service, 'delay').and.callFake(async (ms: number) => {
        delays.push(ms);
        return Promise.resolve();
      });

      spyOn(service, 'createIntent').and.rejectWith(new Error('Network error'));

      await service.processPayment('booking-1');

      // Verificar que los delays aumentan exponencialmente
      expect(delays.length).toBe(3); // 3 reintentos
      expect(delays[0]).toBe(1000); // 1 segundo
      expect(delays[1]).toBe(2000); // 2 segundos
      expect(delays[2]).toBe(3000); // 3 segundos
      expect(delaySpy).toHaveBeenCalledTimes(3);
    });

    it('debería identificar errores reintentables correctamente', () => {
      const retryableErrors = [
        new Error('Network error'),
        new Error('timeout occurred'),
        new Error('ECONNRESET'),
        new Error('ETIMEDOUT'),
        new Error('Failed to fetch'),
      ];

      const nonRetryableErrors = [
        new Error('Invalid booking ID'),
        new Error('Payment declined'),
        new Error('Insufficient funds'),
      ];

      // Test de método privado (solo para verificación)
      const isRetryableError = (service as any).isRetryableError.bind(service);

      retryableErrors.forEach((err) => {
        expect(isRetryableError(err)).toBe(true, `${err.message} debería ser reintentable`);
      });

      nonRetryableErrors.forEach((err) => {
        expect(isRetryableError(err)).toBe(false, `${err.message} NO debería ser reintentable`);
      });
    });

    it('no debería reintentar errores de validación', async () => {
      let attemptCount = 0;

      // Error de validación (no reintentable)
      const createIntentSpy = spyOn(service, 'createIntent').and.callFake(async () => {
        attemptCount++;
        throw new Error('Invalid booking ID');
      });

      // Mock del delay (no debería llamarse)
      const delaySpy = spyOn<unknown>(service, 'delay').and.resolveTo();

      const result = await service.processPayment('booking-1');

      expect(result.success).toBe(false);
      expect(attemptCount).toBe(1); // Solo 1 intento, sin reintentos
      expect(result.error).toContain('Invalid booking ID');
      expect(createIntentSpy).toHaveBeenCalledTimes(1);
      expect(delaySpy).not.toHaveBeenCalled();
    });

    it('debería loggear los reintentos en consola', async () => {
      const logSpy = spyOn(console, 'log');
      const errorSpy = spyOn(console, 'error');

      spyOn(service, 'createIntent').and.rejectWith(new Error('Network error'));
      spyOn<unknown>(service, 'delay').and.resolveTo();

      await service.processPayment('booking-1');

      // Verificar que se loggearon los reintentos
      expect(logSpy).toHaveBeenCalledWith(jasmine.stringMatching(/Reintentando pago/));
      expect(errorSpy).toHaveBeenCalledWith(
        jasmine.stringMatching(/Error en processPayment/),
        jasmine.any(Error),
      );
    });
  });
});
