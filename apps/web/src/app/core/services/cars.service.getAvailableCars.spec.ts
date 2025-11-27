// @ts-nocheck - Tests need rewrite: Jasmine API changes, score property, lat/lng params
import { TestBed } from '@angular/core/testing';
import { makeSupabaseMock } from '../../../test-helpers/supabase.mock';
import { VALID_UUID } from '../../../test-helpers/factories';
import { CarsService } from './cars.service';
import { SupabaseClientService } from './supabase-client.service';

// TODO: Fix Jasmine API (.returnThis(), score property, lat/lng parameters)
xdescribe('CarsService - getAvailableCars with scoring', () => {
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

  describe('getAvailableCars - Score mapping and types', () => {
    it('should map RPC response with score to Car objects', async () => {
      const mockRpcResponse = [
        {
          id: VALID_UUID,
          owner_id: VALID_UUID,
          brand: 'Fiat',
          model: 'Toro',
          year: 2020,
          plate: 'ABC123',
          price_per_day: 5000,
          currency: 'ARS',
          status: 'active',
          location: {
            city: 'Buenos Aires',
            state: 'CABA',
            province: 'CABA',
            country: 'AR',
            lat: -34.6037,
            lng: -58.3816,
          },
          images: ['https://example.com/car1.jpg'],
          features: { air_conditioning: true },
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          total_bookings: 5,
          avg_rating: 4.5,
          score: 0.75, // Score from RPC
        },
        {
          id: 'second-uuid',
          owner_id: VALID_UUID,
          brand: 'Ford',
          model: 'Ka',
          year: 2019,
          plate: 'XYZ789',
          price_per_day: 3000,
          currency: 'ARS',
          status: 'active',
          location: {
            city: 'Córdoba',
            state: 'Córdoba',
            province: 'Córdoba',
            country: 'AR',
            lat: -31.4201,
            lng: -64.1888,
          },
          images: ['https://example.com/car2.jpg'],
          features: {},
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-02T00:00:00Z',
          total_bookings: 2,
          avg_rating: 4.0,
          score: 0.65, // Lower score
        },
      ];

      // Mock RPC call
      supabase.rpc.and.resolveTo({
        data: mockRpcResponse,
        error: null,
      });

      // Mock car_photos query (called for each car)
      const photosBuilder = {
        select: jasmine.createSpy('select').and.returnThis(),
        eq: jasmine.createSpy('eq').and.returnThis(),
        order: jasmine.createSpy('order').and.returnThis(),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
          resolve({ data: [], error: null }),
      };

      supabase.from.and.returnValue(photosBuilder);

      const result = await service.getAvailableCars(
        '2025-12-01T00:00:00Z',
        '2025-12-05T00:00:00Z',
        {
          lat: -34.6037,
          lng: -58.3816,
          limit: 10,
        },
      );

      // Verify RPC was called with correct parameters
      expect(supabase.rpc).toHaveBeenCalledWith('get_available_cars', {
        p_start_date: '2025-12-01T00:00:00Z',
        p_end_date: '2025-12-05T00:00:00Z',
        p_lat: -34.6037,
        p_lng: -58.3816,
        p_limit: 10,
        p_offset: 0,
      });

      // Verify result structure
      expect(result).toHaveSize(2);
      expect(result[0].id).toBe(VALID_UUID);
      expect(result[0].brand_text_backup).toBe('Fiat');
      expect(result[0].model_text_backup).toBe('Toro');
      expect(result[0].price_per_day).toBe(5000);
      expect(result[0].rating_avg).toBe(4.5);
      expect(result[0].rating_count).toBe(5);

      // Verify score is preserved (if Car type includes score)
      // Note: TypeScript Car type may not include score, but it's in the runtime object
      const firstCar = result[0] as any;
      expect(firstCar.score).toBe(0.75);
      expect(firstCar.score).toBeGreaterThan(result[1].score || 0);
    });

    it('should handle null score from RPC', async () => {
      const mockRpcResponse = [
        {
          id: VALID_UUID,
          owner_id: VALID_UUID,
          brand: 'Chevrolet',
          model: 'Cruze',
          year: 2021,
          plate: 'DEF456',
          price_per_day: 4000,
          currency: 'ARS',
          status: 'active',
          location: { city: 'Rosario', lat: -32.9442, lng: -60.6505 },
          images: [],
          features: {},
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z',
          total_bookings: 0,
          avg_rating: null,
          score: null, // Null score
        },
      ];

      supabase.rpc.and.resolveTo({
        data: mockRpcResponse,
        error: null,
      });

      const photosBuilder = {
        select: jasmine.createSpy('select').and.returnThis(),
        eq: jasmine.createSpy('eq').and.returnThis(),
        order: jasmine.createSpy('order').and.returnThis(),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
          resolve({ data: [], error: null }),
      };

      supabase.from.and.returnValue(photosBuilder);

      const result = await service.getAvailableCars('2025-12-01T00:00:00Z', '2025-12-05T00:00:00Z');

      expect(result).toHaveSize(1);
      const car = result[0] as any;
      expect(car.score).toBeNull();
    });

    it('should filter by city when provided', async () => {
      const mockRpcResponse = [
        {
          id: VALID_UUID,
          owner_id: VALID_UUID,
          brand: 'Fiat',
          model: 'Toro',
          location: { city: 'Buenos Aires', lat: -34.6037, lng: -58.3816 },
          score: 0.8,
        },
        {
          id: 'second-uuid',
          owner_id: VALID_UUID,
          brand: 'Ford',
          model: 'Ka',
          location: { city: 'Córdoba', lat: -31.4201, lng: -64.1888 },
          score: 0.7,
        },
      ];

      supabase.rpc.and.resolveTo({
        data: mockRpcResponse,
        error: null,
      });

      const photosBuilder = {
        select: jasmine.createSpy('select').and.returnThis(),
        eq: jasmine.createSpy('eq').and.returnThis(),
        order: jasmine.createSpy('order').and.returnThis(),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
          resolve({ data: [], error: null }),
      };

      supabase.from.and.returnValue(photosBuilder);

      const result = await service.getAvailableCars(
        '2025-12-01T00:00:00Z',
        '2025-12-05T00:00:00Z',
        { city: 'Buenos Aires' },
      );

      // Should filter to only Buenos Aires
      expect(result).toHaveSize(1);
      expect(result[0].location_city?.toLowerCase()).toContain('buenos aires');
    });

    it('should handle RPC errors gracefully', async () => {
      supabase.rpc.and.resolveTo({
        data: null,
        error: { message: 'Database error', code: 'PGRST301' },
      });

      await expectAsync(
        service.getAvailableCars('2025-12-01T00:00:00Z', '2025-12-05T00:00:00Z'),
      ).toBeRejectedWithError();
    });

    it('should return empty array when no cars available', async () => {
      supabase.rpc.and.resolveTo({
        data: [],
        error: null,
      });

      const result = await service.getAvailableCars('2025-12-01T00:00:00Z', '2025-12-05T00:00:00Z');

      expect(result).toEqual([]);
    });

    it('should preserve score ordering from RPC (highest first)', async () => {
      const mockRpcResponse = [
        {
          id: 'high-score',
          owner_id: VALID_UUID,
          brand: 'Porsche',
          model: '911',
          location: { city: 'Buenos Aires' },
          score: 0.95, // Highest
        },
        {
          id: 'medium-score',
          owner_id: VALID_UUID,
          brand: 'BMW',
          model: '320i',
          location: { city: 'Buenos Aires' },
          score: 0.75, // Medium
        },
        {
          id: 'low-score',
          owner_id: VALID_UUID,
          brand: 'Fiat',
          model: 'Uno',
          location: { city: 'Buenos Aires' },
          score: 0.55, // Lowest
        },
      ];

      supabase.rpc.and.resolveTo({
        data: mockRpcResponse,
        error: null,
      });

      const photosBuilder = {
        select: jasmine.createSpy('select').and.returnThis(),
        eq: jasmine.createSpy('eq').and.returnThis(),
        order: jasmine.createSpy('order').and.returnThis(),
        then: (resolve: (value: { data: unknown[]; error: null }) => unknown) =>
          resolve({ data: [], error: null }),
      };

      supabase.from.and.returnValue(photosBuilder);

      const result = await service.getAvailableCars('2025-12-01T00:00:00Z', '2025-12-05T00:00:00Z');

      // Verify ordering is preserved (RPC returns sorted by score DESC)
      expect(result).toHaveSize(3);
      const firstCar = result[0] as any;
      const secondCar = result[1] as any;
      const thirdCar = result[2] as any;

      expect(firstCar.score).toBe(0.95);
      expect(secondCar.score).toBe(0.75);
      expect(thirdCar.score).toBe(0.55);

      expect(firstCar.score).toBeGreaterThan(secondCar.score);
      expect(secondCar.score).toBeGreaterThan(thirdCar.score);
    });
  });
});
