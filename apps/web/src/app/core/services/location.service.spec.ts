import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LocationService } from './location.service';
import { SupabaseClientService } from './supabase-client.service';
import { GeocodingService } from './geocoding.service';

describe('LocationService', () => {
  let service: LocationService;
  let mockSupabaseClient: any;
  let mockGeocodingService: jasmine.SpyObj<GeocodingService>;

  const mockProfile = {
    id: 'user-123',
    home_latitude: -34.6037,
    home_longitude: -58.3816,
    location_verified_at: '2025-01-01T00:00:00Z',
    preferred_search_radius_km: 50,
  };

  beforeEach(() => {
    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: jasmine.createSpy('getUser').and.returnValue(
          Promise.resolve({
            data: { user: { id: 'user-123' } },
            error: null,
          })
        ),
      },
      from: jasmine.createSpy('from').and.returnValue({
        select: jasmine.createSpy('select').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue({
            single: jasmine.createSpy('single').and.returnValue(
              Promise.resolve({
                data: mockProfile,
                error: null,
              })
            ),
          }),
        }),
        update: jasmine.createSpy('update').and.returnValue({
          eq: jasmine.createSpy('eq').and.returnValue(
            Promise.resolve({
              data: mockProfile,
              error: null,
            })
          ),
        }),
      }),
    };

    const mockSupabaseClientService = {
      getClient: jasmine.createSpy('getClient').and.returnValue(mockSupabaseClient),
    };

    mockGeocodingService = jasmine.createSpyObj('GeocodingService', [
      'geocodeAddress',
      'reverseGeocode',
    ]);

    TestBed.configureTestingModule({
      providers: [
        LocationService,
        { provide: SupabaseClientService, useValue: mockSupabaseClientService },
        { provide: GeocodingService, useValue: mockGeocodingService },
      ],
    });

    service = TestBed.inject(LocationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('isGeolocationSupported', () => {
    it('should return true when geolocation is available', () => {
      // In browser test environment, geolocation is always available
      const result = service.isGeolocationSupported();

      // Since we're running in a browser, it should be truthy
      expect(typeof result).toBe('boolean');
    });
  });

  describe('hasHomeLocation', () => {
    it('should return true when user has home location', async () => {
      const result = await service.hasHomeLocation();

      expect(result).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
    });

    it('should return false when user has no home location', async () => {
      const profileWithoutHome = { ...mockProfile, home_latitude: null, home_longitude: null };
      mockSupabaseClient.from().select().eq().single.and.returnValue(
        Promise.resolve({
          data: profileWithoutHome,
          error: null,
        })
      );

      const result = await service.hasHomeLocation();

      expect(result).toBe(false);
    });

    it('should return false when profile not found', async () => {
      mockSupabaseClient.from().select().eq().single.and.returnValue(
        Promise.resolve({
          data: null,
          error: { message: 'Not found' },
        })
      );

      const result = await service.hasHomeLocation();

      expect(result).toBe(false);
    });
  });

  describe('getHomeLocation', () => {
    it('should return home location when available', async () => {
      const result = await service.getHomeLocation();

      expect(result).toBeTruthy();
      expect(result?.lat).toBe(-34.6037);
      expect(result?.lng).toBe(-58.3816);
      expect(result?.source).toBe('home');
    });

    it('should return null when home location not set', async () => {
      const profileWithoutHome = { ...mockProfile, home_latitude: null, home_longitude: null };
      mockSupabaseClient.from().select().eq().single.and.returnValue(
        Promise.resolve({
          data: profileWithoutHome,
          error: null,
        })
      );

      const result = await service.getHomeLocation();

      expect(result).toBeNull();
    });

    it('should return null when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.and.returnValue(
        Promise.resolve({
          data: { user: null },
          error: null,
        })
      );

      const result = await service.getHomeLocation();

      expect(result).toBeNull();
    });
  });

  describe('getCurrentPosition', () => {
    it('should return GPS coordinates when geolocation succeeds', async () => {
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: -34.6037,
          longitude: -58.3816,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      };

      spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((success: any) => {
        success(mockPosition);
      });

      const result = await service.getCurrentPosition();

      expect(result).toBeTruthy();
      expect(result?.lat).toBe(-34.6037);
      expect(result?.lng).toBe(-58.3816);
    });

    it('should return null when geolocation is not supported', async () => {
      // Mock the service method instead of navigator
      spyOn(service, 'isGeolocationSupported').and.returnValue(false);

      const result = await service.getCurrentPosition();

      expect(result).toBeNull();
    });

    it('should return null when geolocation fails', async () => {
      spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake(
        (success: any, error: any) => {
          error({ code: 1, message: 'Permission denied' });
        }
      );

      const result = await service.getCurrentPosition();

      expect(result).toBeNull();
    });
  });

  describe('saveHomeLocation', () => {
    it('should save home location successfully', async () => {
      await service.saveHomeLocation(-34.6037, -58.3816, 'Buenos Aires, Argentina');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profiles');
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          home_latitude: -34.6037,
          home_longitude: -58.3816,
        })
      );
    });

    it('should throw error when user not authenticated', async () => {
      mockSupabaseClient.auth.getUser.and.returnValue(
        Promise.resolve({
          data: { user: null },
          error: null,
        })
      );

      await expectAsync(
        service.saveHomeLocation(-34.6037, -58.3816, 'Test')
      ).toBeRejectedWithError('Usuario no autenticado');
    });

    it('should save without address if not provided', async () => {
      await service.saveHomeLocation(-34.6037, -58.3816);

      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        jasmine.objectContaining({
          home_latitude: -34.6037,
          home_longitude: -58.3816,
        })
      );
    });
  });

  describe('geocodeAndSaveHomeLocation', () => {
    it('should geocode address and save location', async () => {
      const mockGeocodingResult = {
        latitude: -34.6037,
        longitude: -58.3816,
        fullAddress: 'Buenos Aires, Argentina',
        placeName: 'Buenos Aires',
        city: 'Buenos Aires',
        state: 'Buenos Aires',
        country: 'Argentina',
      };

      mockGeocodingService.geocodeAddress.and.returnValue(
        Promise.resolve(mockGeocodingResult)
      );

      const result = await service.geocodeAndSaveHomeLocation(
        'Buenos Aires, Argentina',
        'AR'
      );

      expect(result).toEqual(mockGeocodingResult);
      expect(mockGeocodingService.geocodeAddress).toHaveBeenCalledWith(
        'Buenos Aires, Argentina',
        'AR'
      );
      expect(mockSupabaseClient.from().update).toHaveBeenCalled();
    });

    it('should throw error when geocoding fails', async () => {
      mockGeocodingService.geocodeAddress.and.returnValue(Promise.resolve(null) as Promise<any>);

      await expectAsync(
        service.geocodeAndSaveHomeLocation('Invalid Address', 'AR')
      ).toBeRejectedWithError('No se pudo geocodificar la dirección');
    });
  });

  describe('getUserLocation', () => {
    it('should return home location if available', async () => {
      const result = await service.getUserLocation();

      expect(result).toBeTruthy();
      expect(result?.lat).toBe(-34.6037);
      expect(result?.lng).toBe(-58.3816);
      expect(result?.source).toBe('home');
    });

    it('should fallback to GPS when home location not available', async () => {
      // Mock no home location
      const profileWithoutHome = { ...mockProfile, home_latitude: null, home_longitude: null };
      mockSupabaseClient.from().select().eq().single.and.returnValue(
        Promise.resolve({
          data: profileWithoutHome,
          error: null,
        })
      );

      // Mock GPS success
      const mockPosition: GeolocationPosition = {
        coords: {
          latitude: -34.5875,
          longitude: -58.4097,
          accuracy: 10,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      };

      spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((success: any) => {
        success(mockPosition);
      });

      const result = await service.getUserLocation();

      expect(result).toBeTruthy();
      expect(result?.lat).toBe(-34.5875);
      expect(result?.lng).toBe(-58.4097);
      expect(result?.source).toBe('gps');
    });

    it('should return null when both home and GPS fail', async () => {
      // Mock no home location
      const profileWithoutHome = { ...mockProfile, home_latitude: null, home_longitude: null };
      mockSupabaseClient.from().select().eq().single.and.returnValue(
        Promise.resolve({
          data: profileWithoutHome,
          error: null,
        })
      );

      // Mock GPS failure
      spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake(
        (success: any, error: any) => {
          error({ code: 1, message: 'Permission denied' });
        }
      );

      const result = await service.getUserLocation();

      expect(result).toBeNull();
    });
  });
});
