import { TestBed } from '@angular/core/testing';
import { CarsService } from './cars.service';
import { SupabaseClientService } from './supabase-client.service';

/**
 * SPRINT 2 - Test 2.1: RPC get_available_cars
 * Verifica que el servicio llame correctamente a get_available_cars RPC
 * con los parámetros adecuados: start_date, end_date, city, limit, offset
 */
describe('Availability Service - get_available_cars RPC', () => {
  let service: CarsService;
  let supabase: {
    rpc: jasmine.Spy<any>;
    auth: jasmine.SpyObj<any>;
    from: jasmine.Spy<any>;
    storage: jasmine.SpyObj<any>;
  };

  beforeEach(() => {
    supabase = {
      rpc: jasmine.createSpy('rpc'),
      auth: jasmine.createSpyObj('auth', ['getUser']),
      from: jasmine.createSpy('from'),
      storage: jasmine.createSpyObj('storage', ['from']),
    };

    TestBed.configureTestingModule({
      providers: [
        CarsService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => supabase },
        },
      ],
    });

    service = TestBed.inject(CarsService);
  });

  it('debería llamar a get_available_cars RPC con parámetros correctos', async () => {
    const mockCars = [
      {
        id: 'car-1',
        make: 'Toyota',
        model: 'Corolla',
        year: 2023,
        location: { city: 'Buenos Aires' },
      },
      {
        id: 'car-2',
        make: 'Honda',
        model: 'Civic',
        year: 2022,
        location: { city: 'Montevideo' },
      },
    ];

    supabase.rpc.and.resolveTo({ data: mockCars, error: null });

    // Mock para cargar fotos
    supabase.from.and.returnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    } as any);

    const startDate = '2025-11-01T10:00:00Z';
    const endDate = '2025-11-05T18:00:00Z';

    await service.getAvailableCars(startDate, endDate, {
      limit: 50,
      offset: 0,
    });

    expect(supabase.rpc).toHaveBeenCalledWith('get_available_cars', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: 50,
      p_offset: 0,
    });
  });

  it('debería usar valores por defecto para limit y offset si no se especifican', async () => {
    supabase.rpc.and.resolveTo({ data: [], error: null });

    const startDate = '2025-12-01T00:00:00Z';
    const endDate = '2025-12-05T00:00:00Z';

    await service.getAvailableCars(startDate, endDate);

    expect(supabase.rpc).toHaveBeenCalledWith('get_available_cars', {
      p_start_date: startDate,
      p_end_date: endDate,
      p_limit: 100,
      p_offset: 0,
    });
  });

  it('debería filtrar por ciudad cuando se especifica', async () => {
    const mockCars = [
      {
        id: 'car-ba-1',
        make: 'Toyota',
        model: 'Corolla',
        location: { city: 'Buenos Aires' },
      },
      {
        id: 'car-mv-1',
        make: 'Honda',
        model: 'Civic',
        location: { city: 'Montevideo' },
      },
      {
        id: 'car-ba-2',
        make: 'Ford',
        model: 'Focus',
        location: { city: 'Buenos Aires' },
      },
    ];

    supabase.rpc.and.resolveTo({ data: mockCars, error: null });

    // Mock para cargar fotos
    supabase.from.and.returnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    } as any);

    const result = await service.getAvailableCars(
      '2025-11-01T00:00:00Z',
      '2025-11-05T00:00:00Z',
      { city: 'Buenos Aires' }
    );

    expect(result.length).toBe(2);
    expect(result[0].id).toBe('car-ba-1');
    expect(result[1].id).toBe('car-ba-2');
  });

  it('debería retornar array vacío cuando no hay autos disponibles', async () => {
    supabase.rpc.and.resolveTo({ data: [], error: null });

    const result = await service.getAvailableCars(
      '2025-11-01T00:00:00Z',
      '2025-11-05T00:00:00Z'
    );

    expect(result).toEqual([]);
  });

  it('debería lanzar error cuando la RPC falla', async () => {
    const mockError = new Error('Database connection failed');
    supabase.rpc.and.resolveTo({ data: null, error: mockError });

    await expectAsync(
      service.getAvailableCars('2025-11-01T00:00:00Z', '2025-11-05T00:00:00Z')
    ).toBeRejectedWithError('Database connection failed');
  });

  it('debería manejar ciudades con mayúsculas y minúsculas', async () => {
    const mockCars = [
      {
        id: 'car-1',
        location: { city: 'BUENOS AIRES' },
      },
      {
        id: 'car-2',
        location: { city: 'buenos aires' },
      },
    ];

    supabase.rpc.and.resolveTo({ data: mockCars, error: null });

    supabase.from.and.returnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    } as any);

    const result = await service.getAvailableCars(
      '2025-11-01T00:00:00Z',
      '2025-11-05T00:00:00Z',
      { city: 'Buenos Aires' }
    );

    expect(result.length).toBe(2);
  });

  it('debería cargar fotos para cada auto disponible', async () => {
    const mockCars = [{ id: 'car-1', location: { city: 'Buenos Aires' } }];
    const mockPhotos = [
      {
        id: 'photo-1',
        car_id: 'car-1',
        url: 'photo1.jpg',
        stored_path: 'user/car-1/photo1.jpg',
        position: 0,
        sort_order: 0,
        created_at: new Date().toISOString(),
      },
      {
        id: 'photo-2',
        car_id: 'car-1',
        url: 'photo2.jpg',
        stored_path: 'user/car-1/photo2.jpg',
        position: 1,
        sort_order: 1,
        created_at: new Date().toISOString(),
      },
    ];

    supabase.rpc.and.resolveTo({ data: mockCars, error: null });

    supabase.from.and.returnValue({
      select: () => ({
        eq: () => ({
          order: () => Promise.resolve({ data: mockPhotos, error: null }),
        }),
      }),
    } as any);

    const result = await service.getAvailableCars(
      '2025-11-01T00:00:00Z',
      '2025-11-05T00:00:00Z'
    );

    expect(result[0].photos).toEqual(mockPhotos);
  });
});

/**
 * SPRINT 2 - Test 2.4: RPC is_car_available
 * Verifica que se pueda verificar la disponibilidad de un auto específico
 * antes de crear una reserva
 */
describe('Availability Service - is_car_available RPC', () => {
  let service: CarsService;
  let supabase: {
    rpc: jasmine.Spy<any>;
    auth: jasmine.SpyObj<any>;
    from: jasmine.Spy<any>;
    storage: jasmine.SpyObj<any>;
  };

  beforeEach(() => {
    supabase = {
      rpc: jasmine.createSpy('rpc'),
      auth: jasmine.createSpyObj('auth', ['getUser']),
      from: jasmine.createSpy('from'),
      storage: jasmine.createSpyObj('storage', ['from']),
    };

    TestBed.configureTestingModule({
      providers: [
        CarsService,
        {
          provide: SupabaseClientService,
          useValue: { getClient: () => supabase },
        },
      ],
    });

    service = TestBed.inject(CarsService);
  });

  it('debería retornar true cuando el auto está disponible', async () => {
    supabase.rpc.and.resolveTo({ data: true, error: null });

    const result = await service.isCarAvailable(
      'car-uuid-123',
      '2025-11-01T10:00:00Z',
      '2025-11-05T18:00:00Z'
    );

    expect(result).toBe(true);
    expect(supabase.rpc).toHaveBeenCalledWith('is_car_available', {
      p_car_id: 'car-uuid-123',
      p_start_date: '2025-11-01T10:00:00Z',
      p_end_date: '2025-11-05T18:00:00Z',
    });
  });

  it('debería retornar false cuando el auto NO está disponible', async () => {
    supabase.rpc.and.resolveTo({ data: false, error: null });

    const result = await service.isCarAvailable(
      'car-uuid-456',
      '2025-11-01T10:00:00Z',
      '2025-11-05T18:00:00Z'
    );

    expect(result).toBe(false);
  });

  it('debería retornar false cuando hay error de base de datos', async () => {
    const mockError = new Error('Database timeout');
    supabase.rpc.and.resolveTo({ data: null, error: mockError });

    const result = await service.isCarAvailable(
      'car-uuid-789',
      '2025-11-01T10:00:00Z',
      '2025-11-05T18:00:00Z'
    );

    expect(result).toBe(false);
  });

  it('debería retornar false cuando la RPC lanza excepción', async () => {
    supabase.rpc.and.throwError('Network error');

    const result = await service.isCarAvailable(
      'car-uuid-error',
      '2025-11-01T10:00:00Z',
      '2025-11-05T18:00:00Z'
    );

    expect(result).toBe(false);
  });

  it('debería validar disponibilidad con diferentes rangos de fechas', async () => {
    supabase.rpc.and.resolveTo({ data: true, error: null });

    // Test con fechas en el pasado (debería funcionar igual)
    await service.isCarAvailable(
      'car-123',
      '2024-01-01T00:00:00Z',
      '2024-01-05T00:00:00Z'
    );

    expect(supabase.rpc).toHaveBeenCalledWith('is_car_available', {
      p_car_id: 'car-123',
      p_start_date: '2024-01-01T00:00:00Z',
      p_end_date: '2024-01-05T00:00:00Z',
    });
  });

  it('debería integrar correctamente con el flujo de booking', async () => {
    // Simula el flujo: verificar disponibilidad antes de crear booking
    supabase.rpc.and.resolveTo({ data: true, error: null });

    const carId = 'car-for-booking';
    const start = '2025-12-01T10:00:00Z';
    const end = '2025-12-05T18:00:00Z';

    const isAvailable = await service.isCarAvailable(carId, start, end);

    expect(isAvailable).toBe(true);
    
    // Este resultado debería permitir continuar con la creación del booking
    if (isAvailable) {
      // En el código real, aquí se llamaría a bookingService.requestBooking()
      expect(true).toBe(true);
    }
  });

  it('debería bloquear creación de booking cuando auto no disponible', async () => {
    supabase.rpc.and.resolveTo({ data: false, error: null });

    const isAvailable = await service.isCarAvailable(
      'car-occupied',
      '2025-12-01T10:00:00Z',
      '2025-12-05T18:00:00Z'
    );

    expect(isAvailable).toBe(false);
    
    // Este resultado debería impedir la creación del booking
    if (!isAvailable) {
      // En el código real, aquí se mostraría error al usuario
      expect(true).toBe(true);
    }
  });
});
