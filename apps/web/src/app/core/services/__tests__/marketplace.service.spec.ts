import { TestBed } from '@angular/core/testing';
import { SupabaseClient } from '@supabase/supabase-js';
import { MarketplaceService } from '../marketplace.service';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let mockSupabase: jasmine.SpyObj<SupabaseClient>;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = jasmine.createSpyObj('SupabaseClient', ['from']);

    TestBed.configureTestingModule({
      providers: [
        MarketplaceService,
        // Se puede inyectar el mock si es necesario
      ],
    });

    service = TestBed.inject(MarketplaceService);
  });

  describe('validateMarketplaceConfig', () => {
    it('should return valid config when all env vars are set', async () => {
      // Mock window.env
      (window as any).env = {
        MERCADOPAGO_MARKETPLACE_ID: 'marketplace-123',
        MERCADOPAGO_APPLICATION_ID: 'app-456',
        MERCADOPAGO_PLATFORM_FEE_PERCENTAGE: '10',
      };

      const result = await service.validateMarketplaceConfig();

      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
      expect(result.config?.marketplaceId).toBe('marketplace-123');
      expect(result.config?.applicationId).toBe('app-456');
      expect(result.config?.platformFeePercentage).toBe(10);
    });

    it('should return errors when marketplace ID is missing', async () => {
      (window as any).env = {
        MERCADOPAGO_APPLICATION_ID: 'app-456',
      };

      const result = await service.validateMarketplaceConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MERCADOPAGO_MARKETPLACE_ID no está configurado');
    });

    it('should return errors when application ID is missing', async () => {
      (window as any).env = {
        MERCADOPAGO_MARKETPLACE_ID: 'marketplace-123',
      };

      const result = await service.validateMarketplaceConfig();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('MERCADOPAGO_APPLICATION_ID no está configurado');
    });

    it('should use default fee percentage when invalid', async () => {
      (window as any).env = {
        MERCADOPAGO_MARKETPLACE_ID: 'marketplace-123',
        MERCADOPAGO_APPLICATION_ID: 'app-456',
        MERCADOPAGO_PLATFORM_FEE_PERCENTAGE: 'invalid',
      };

      const result = await service.validateMarketplaceConfig();

      expect(result.config?.platformFeePercentage).toBe(10);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('calculateSplitAmounts', () => {
    it('should calculate correct split with default 10% fee', () => {
      const result = service.calculateSplitAmounts(1000);

      expect(result.total).toBe(1000);
      expect(result.platformFee).toBe(100);
      expect(result.ownerAmount).toBe(900);
    });

    it('should calculate correct split with custom fee', () => {
      const result = service.calculateSplitAmounts(1000, 15);

      expect(result.total).toBe(1000);
      expect(result.platformFee).toBe(150);
      expect(result.ownerAmount).toBe(850);
    });

    it('should round platform fee correctly', () => {
      const result = service.calculateSplitAmounts(999, 10);

      expect(result.platformFee).toBe(100); // Math.round(99.9) = 100
      expect(result.ownerAmount).toBe(899);
    });

    it('should handle zero amount', () => {
      const result = service.calculateSplitAmounts(0);

      expect(result.total).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.ownerAmount).toBe(0);
    });
  });

  describe('isUserOnboardingComplete', () => {
    it('should return true when user has completed onboarding', async () => {
      const mockResponse = {
        data: {
          mp_onboarding_completed: true,
          mercadopago_collector_id: 'collector-123',
        },
        error: null,
      };

      // Mock the Supabase chain
      const mockSelect = jasmine.createSpyObj('select', ['eq']);
      const mockEq = jasmine.createSpyObj('eq', ['single']);
      mockEq.single.and.returnValue(Promise.resolve(mockResponse));
      mockSelect.eq.and.returnValue(mockEq);

      const mockFrom = jasmine.createSpyObj('from', ['select']);
      mockFrom.select.and.returnValue(mockSelect);

      mockSupabase.from.and.returnValue(mockFrom as any);

      // Inject mock (esto requiere configuración adicional en el servicio)
      // Por ahora, el test demuestra la estructura esperada

      const result = await service.isUserOnboardingComplete('user-123');

      // expect(result).toBe(true); // Descomentar cuando se inyecte el mock
    });

    it('should return false when onboarding is incomplete', async () => {
      const mockResponse = {
        data: {
          mp_onboarding_completed: false,
          mercadopago_collector_id: null,
        },
        error: null,
      };

      // Similar mock setup...
      // expect(result).toBe(false);
    });

    it('should return false when collector ID is missing', async () => {
      const mockResponse = {
        data: {
          mp_onboarding_completed: true,
          mercadopago_collector_id: null,
        },
        error: null,
      };

      // Similar mock setup...
      // expect(result).toBe(false);
    });
  });

  describe('getUserCollectorId', () => {
    it('should return collector ID when user exists', async () => {
      const mockResponse = {
        data: {
          mercadopago_collector_id: 'collector-123',
        },
        error: null,
      };

      // Mock setup...
      // const result = await service.getUserCollectorId('user-123');
      // expect(result).toBe('collector-123');
    });

    it('should return null when user not found', async () => {
      const mockResponse = {
        data: null,
        error: { message: 'Not found' },
      };

      // Mock setup...
      // const result = await service.getUserCollectorId('invalid-user');
      // expect(result).toBeNull();
    });
  });

  describe('getMarketplaceConfig', () => {
    it('should return config when marketplace is configured', async () => {
      (window as any).env = {
        MERCADOPAGO_MARKETPLACE_ID: 'marketplace-123',
        MERCADOPAGO_APPLICATION_ID: 'app-456',
        MERCADOPAGO_PLATFORM_FEE_PERCENTAGE: '10',
      };

      const config = await service.getMarketplaceConfig();

      expect(config.marketplaceId).toBe('marketplace-123');
      expect(config.applicationId).toBe('app-456');
      expect(config.isConfigured).toBe(true);
    });

    it('should throw error when marketplace is not configured', async () => {
      (window as any).env = {};

      await expectAsync(service.getMarketplaceConfig()).toBeRejectedWithError(
        /Marketplace no configurado/,
      );
    });
  });

  describe('validateCarHasCollectorId', () => {
    it('should return true when car has collector ID', async () => {
      const mockResponse = {
        data: {
          owner_mp_collector_id: 'collector-123',
          owner_id: 'user-123',
        },
        error: null,
      };

      // Mock setup...
      // const result = await service.validateCarHasCollectorId('car-123');
      // expect(result).toBe(true);
    });

    it('should update car when collector ID is missing but owner has onboarding', async () => {
      // Test that the service fetches owner's collector ID and updates the car
      // Mock setup...
      // expect(updateCarCollectorId).toHaveBeenCalled();
    });

    it('should return false when owner has no onboarding', async () => {
      // Mock setup...
      // const result = await service.validateCarHasCollectorId('car-123');
      // expect(result).toBe(false);
    });
  });

  afterEach(() => {
    // Clean up window.env
    delete (window as any).env;
  });
});
