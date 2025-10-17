import { TestBed } from '@angular/core/testing';
import { CarsService } from './cars.service';
import { SupabaseClientService } from './supabase-client.service';

describe('CarsService', () => {
  let service: CarsService;
  let supabase: {
    auth: jasmine.SpyObj<any>;
    from: jasmine.Spy<any>;
    storage: { from: jasmine.Spy<any> };
  };

  beforeEach(() => {
    supabase = {
      auth: jasmine.createSpyObj('auth', ['getUser']),
      from: jasmine.createSpy('from'),
      storage: {
        from: jasmine.createSpy('storage.from'),
      },
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

  it('creates a car for the authenticated owner', async () => {
    supabase.auth.getUser.and.resolveTo({ data: { user: { id: 'user-1' } }, error: null });
    const insertedCar = { id: 'car-1', owner_id: 'user-1' };
    const single = jasmine.createSpy('single').and.resolveTo({ data: insertedCar, error: null });
    const select = jasmine.createSpy('select').and.returnValue({ single });
    const insert = jasmine.createSpy('insert').and.callFake((payload: Record<string, unknown>) => {
      expect(payload).toEqual(jasmine.objectContaining({ owner_id: 'user-1', brand: 'Fiat' }));
      return { select };
    });
    supabase.from.and.callFake((table: string) => {
      expect(table).toBe('cars');
      return { insert };
    });

    const result = await service.createCar({ brand: 'Fiat' } as any);

    expect(insert).toHaveBeenCalledWith(jasmine.objectContaining({ brand: 'Fiat' }));
    expect(result).toBe(insertedCar as any);
  });

  it('filters active cars by city when provided', async () => {
    const rows = [{ id: 'car-1' }];
    const builder: any = {};
    builder.select = jasmine.createSpy('select').and.returnValue(builder);
    builder.eq = jasmine.createSpy('eq').and.returnValue(builder);
    builder.order = jasmine.createSpy('order').and.returnValue(builder);
    builder.limit = jasmine.createSpy('limit').and.returnValue(builder);
    builder.ilike = jasmine.createSpy('ilike').and.returnValue(builder);
    builder.then = (resolve: (value: { data: unknown; error: null }) => unknown) =>
      resolve({ data: rows, error: null });
    supabase.from.and.returnValue(builder);

    const result = await service.listActiveCars({ city: 'Buenos Aires' } as any);

    expect(builder.select).toHaveBeenCalledWith('*, car_photos(*)');
    expect(builder.eq).toHaveBeenCalledWith('status', 'active');
    expect(builder.ilike).toHaveBeenCalledWith('location_city', '%Buenos Aires%');
    expect(result).toEqual(rows as any);
  });

  it('uploads a photo and returns metadata', async () => {
    supabase.auth.getUser.and.resolveTo({ data: { user: { id: 'user-1' } }, error: null });
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

    const single = jasmine.createSpy('single').and.callFake(() => Promise.resolve({ data: { id: 'photo-1', car_id: 'car-123', stored_path: uploadedPaths[0], url: 'https://cdn.example/car.jpg', position: 0, sort_order: 0 }, error: null }));
    const select = jasmine.createSpy('select').and.returnValue({ single });
    const insert = jasmine.createSpy('insert').and.returnValue({ select });
    supabase.from.withArgs('car_photos').and.returnValue({ insert });

    const file = new File(['binary'], 'front.png');
    const result = await service.uploadPhoto(file, 'car-123');
    const storedPath = uploadedPaths[0];

    expect(upload).toHaveBeenCalled();
    expect(storedPath).toContain('user-1/car-123/');
    expect(storedPath).toMatch(/\.png$/);
    expect(upload).toHaveBeenCalledWith(storedPath, file, {
      cacheControl: '3600',
      upsert: false,
    });
    expect(getPublicUrl).toHaveBeenCalledWith(storedPath);
    expect(result).toEqual(
      jasmine.objectContaining({
        car_id: 'car-123',
        stored_path: storedPath,
        url: 'https://cdn.example/car.jpg',
      }) as any,
    );
    expect(result.id.length).toBeGreaterThan(0);
  });
});
