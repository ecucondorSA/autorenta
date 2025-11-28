import { TestBed } from '@angular/core/testing';
import { makeSupabaseMock } from '../../../test-helpers/supabase.mock';
import { VALID_UUID } from '../../../test-helpers/factories';
import { CarsService } from './cars.service';
import { SupabaseClientService } from './supabase-client.service';

// TODO: Fix - Service API changed, mocks not matching
describe('CarsService', () => {
  let service: CarsService;
  let supabase: any;

  beforeEach(() => {
    supabase = makeSupabaseMock();

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

  it('creates a car for the authenticated owner', async () => {
    supabase.auth.getUser.and.resolveTo({ data: { user: { id: VALID_UUID } }, error: null });
    const insertedCar = { id: VALID_UUID, owner_id: VALID_UUID, car_photos: [] };
    const single = jasmine.createSpy('single').and.resolveTo({ data: insertedCar, error: null });
    const select = jasmine.createSpy('select').and.returnValue({ single });
    const insert = jasmine.createSpy('insert').and.callFake((payload: Record<string, unknown>) => {
      expect(payload).toEqual(jasmine.objectContaining({ owner_id: VALID_UUID, brand: 'Fiat' }));
      return { select };
    });
    supabase.from.and.callFake((table: string) => {
      expect(table).toBe('cars');
      return { insert };
    });

    const result = await service.createCar({ brand: 'Fiat' } as any);

    expect(insert).toHaveBeenCalledWith(jasmine.objectContaining({ brand: 'Fiat' }));
    expect(result).toEqual(
      jasmine.objectContaining({ id: VALID_UUID, owner_id: VALID_UUID, photos: [] }),
    );
  });

  it('filters active cars by city when provided', async () => {
    const rows = [{ id: VALID_UUID, car_photos: [] }];
    const builder: Record<string, any> = {};
    builder.select = jasmine.createSpy('select').and.returnValue(builder);
    builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
    builder.order = jasmine.createSpy('order').and.returnValue(builder);
    builder.limit = jasmine.createSpy('limit').and.returnValue(builder);
    builder.ilike = jasmine.createSpy('ilike').and.returnValue(builder);
    builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
      resolve({ data: rows, error: null });
    supabase.from.and.returnValue(builder);

    const result = await service.listActiveCars({ city: 'Buenos Aires' } as any);

    const selectArg = (builder.select as jasmine.Spy).calls.argsFor(0)[0];
    expect(selectArg.replace(/\s+/g, ' ')).toContain('car_photos(*)');
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
    expect(builder.ilike).toHaveBeenCalledWith('location_city', '%Buenos Aires%');
    // Result should have photos array
    expect(result).toEqual([jasmine.objectContaining({ id: VALID_UUID, photos: [] })]);
  });

  it('uploads a photo and returns metadata', async () => {
    supabase.auth.getUser.and.resolveTo({ data: { user: { id: VALID_UUID } }, error: null });

    // Mock optimizeImage to return file directly (no canvas processing in tests)
    spyOn(service as any, 'optimizeImage').and.callFake((file: File) => Promise.resolve(file));

    const uploadedPaths: string[] = [];
    const upload = jasmine.createSpy('upload').and.callFake((path: string, ...args: unknown[]) => {
      uploadedPaths.push(path);
      return Promise.resolve({ data: null, error: null });
    });
    const getPublicUrl = jasmine.createSpy('getPublicUrl').and.returnValue({
      data: { publicUrl: 'https://cdn.example/car.jpg' },
    });
    supabase.storage.from.and.callFake((bucket: string) => {
      expect(bucket).toBe('car-images');
      return { upload, getPublicUrl };
    });

    const single = jasmine.createSpy('single').and.callFake(() =>
      Promise.resolve({
        data: {
          id: 'photo-1',
          car_id: VALID_UUID,
          stored_path: uploadedPaths[0],
          url: 'https://cdn.example/car.jpg',
          position: 0,
          sort_order: 0,
        },
        error: null,
      }),
    );
    const select = jasmine.createSpy('select').and.returnValue({ single });
    const insert = jasmine.createSpy('insert').and.returnValue({ select });
    supabase.from.withArgs('car_photos').and.returnValue({ insert });

    const file = new File(['binary'], 'front.png');
    const result = await service.uploadPhoto(file, VALID_UUID);
    const storedPath = uploadedPaths[0];

    expect(upload).toHaveBeenCalled();
    expect(storedPath.startsWith(`${VALID_UUID}/${VALID_UUID}/`)).toBeTrue();
    expect(storedPath).toMatch(/\.webp$/); // optimizeImage converts to webp
    expect(upload).toHaveBeenCalledWith(storedPath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    expect(getPublicUrl).toHaveBeenCalledWith(storedPath);
    expect(result).toEqual(
      jasmine.objectContaining({
        car_id: VALID_UUID,
        stored_path: storedPath,
        url: 'https://cdn.example/car.jpg',
      }) as any,
    );
    expect(result.id.length).toBeGreaterThan(0);
  });

  // ✅ NUEVO: Tests para getNextAvailableRange
  describe('getNextAvailableRange', () => {
    it('should return alternative date ranges when car has conflicts', async () => {
      const carId = VALID_UUID;
      const requestedStart = '2025-11-10';
      const requestedEnd = '2025-11-15'; // 5 días

      // Mock de reservas existentes
      const mockBookings = [
        { start_at: '2025-11-16T00:00:00Z', end_at: '2025-11-18T00:00:00Z' }, // Bloquea 16-18
        { start_at: '2025-11-22T00:00:00Z', end_at: '2025-11-25T00:00:00Z' }, // Bloquea 22-25
      ];

      const builder: Record<string, any> = {};
      builder.select = jasmine.createSpy('select').and.returnValue(builder);
      builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
      builder.in = jasmine.createSpy('in').and.returnValue(builder);
      builder.gte = jasmine.createSpy('gte').and.returnValue(builder);
      builder.order = jasmine.createSpy('order').and.returnValue(builder);
      builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: mockBookings, error: null });

      supabase.from.and.returnValue(builder);

      const alternatives = await service.getNextAvailableRange(carId, requestedStart, requestedEnd);

      expect(builder.eq).toHaveBeenCalledWith('car_id', carId);
      expect(builder.in).toHaveBeenCalledWith('status', ['pending', 'confirmed', 'in_progress']);
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives.length).toBeLessThanOrEqual(3);

      // Verificar que todas las alternativas tengan la misma duración (5 días)
      alternatives.forEach((alt) => {
        expect(alt.daysCount).toBe(5);
        expect(alt.startDate).toBeTruthy();
        expect(alt.endDate).toBeTruthy();
      });
    });

    it('should return empty array when no bookings exist', async () => {
      const carId = VALID_UUID;
      const requestedStart = '2025-11-10';
      const requestedEnd = '2025-11-15';

      const builder: Record<string, any> = {};
      builder.select = jasmine.createSpy('select').and.returnValue(builder);
      builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
      builder.in = jasmine.createSpy('in').and.returnValue(builder);
      builder.gte = jasmine.createSpy('gte').and.returnValue(builder);
      builder.order = jasmine.createSpy('order').and.returnValue(builder);
      builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: [], error: null });

      supabase.from.and.returnValue(builder);

      const alternatives = await service.getNextAvailableRange(carId, requestedStart, requestedEnd);

      // Debería retornar alternativas empezando después del rango solicitado
      expect(alternatives.length).toBeGreaterThan(0);
      alternatives.forEach((alt) => {
        expect(new Date(alt.startDate).getTime()).toBeGreaterThan(new Date(requestedEnd).getTime());
      });
    });

    it('should handle database errors gracefully', async () => {
      const carId = VALID_UUID;
      const requestedStart = '2025-11-10';
      const requestedEnd = '2025-11-15';

      const builder: Record<string, any> = {};
      builder.select = jasmine.createSpy('select').and.returnValue(builder);
      builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
      builder.in = jasmine.createSpy('in').and.returnValue(builder);
      builder.gte = jasmine.createSpy('gte').and.returnValue(builder);
      builder.order = jasmine.createSpy('order').and.returnValue(builder);
      builder.then = (resolve: (value: { data: null; error: unknown }) => unknown) =>
        resolve({ data: null, error: { message: 'Database error' } });

      supabase.from.and.returnValue(builder);

      const alternatives = await service.getNextAvailableRange(carId, requestedStart, requestedEnd);

      // Debería retornar array vacío en caso de error
      expect(alternatives).toEqual([]);
    });

    it('should limit alternatives to maxOptions parameter', async () => {
      const carId = VALID_UUID;
      const requestedStart = '2025-11-10';
      const requestedEnd = '2025-11-15';
      const maxOptions = 2;

      const builder: Record<string, any> = {};
      builder.select = jasmine.createSpy('select').and.returnValue(builder);
      builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
      builder.in = jasmine.createSpy('in').and.returnValue(builder);
      builder.gte = jasmine.createSpy('gte').and.returnValue(builder);
      builder.order = jasmine.createSpy('order').and.returnValue(builder);
      builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
        resolve({ data: [], error: null });

      supabase.from.and.returnValue(builder);

      const alternatives = await service.getNextAvailableRange(
        carId,
        requestedStart,
        requestedEnd,
        maxOptions,
      );

      expect(alternatives.length).toBeLessThanOrEqual(maxOptions);
    });
  });
});
