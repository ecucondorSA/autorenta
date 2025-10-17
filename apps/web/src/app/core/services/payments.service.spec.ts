import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { PaymentsService } from './payments.service';
import { SupabaseClientService } from './supabase-client.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let supabase: {
    from: jasmine.Spy<any>;
  };
  let originalWebhookUrl: string;

  beforeEach(() => {
    originalWebhookUrl = environment.paymentsWebhookUrl;
    supabase = {
      from: jasmine.createSpy('from'),
    };

    TestBed.configureTestingModule({
      providers: [
        PaymentsService,
        { provide: SupabaseClientService, useValue: { getClient: () => supabase } },
      ],
    });

    service = TestBed.inject(PaymentsService);
  });

  afterEach(() => {
    environment.paymentsWebhookUrl = originalWebhookUrl;
  });

  it('creates payment intents with default values', async () => {
    const single = jasmine.createSpy('single').and.resolveTo({
      data: { id: 'intent-1', status: 'requires_payment_method' },
      error: null,
    });
    const select = jasmine.createSpy('select').and.returnValue({ single });
    const insert = jasmine.createSpy('insert').and.returnValue({ select });
    supabase.from.and.callFake((table: string) => {
      expect(table).toBe('payment_intents');
      return { insert };
    });

    const intent = await service.createIntent('booking-1');

    expect(insert).toHaveBeenCalledWith({
      booking_id: 'booking-1',
      provider: 'mock',
      status: 'requires_payment_method',
    });
    expect(intent).toEqual({ id: 'intent-1', status: 'requires_payment_method' } as any);
  });

  it('calls the worker webhook when marking as paid', async () => {
    environment.paymentsWebhookUrl = 'https://worker.example';
    const fetchSpy = spyOn(window, 'fetch').and.resolveTo(new Response(null, { status: 200 }));

    await service.markAsPaid('intent-7');

    expect(fetchSpy).toHaveBeenCalledWith('https://worker.example/webhooks/payments', {
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
    const builder: any = {};
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
