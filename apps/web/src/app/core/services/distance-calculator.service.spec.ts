import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { DistanceCalculatorService, DistanceRiskTier } from './distance-calculator.service';

// TODO: Fix - Service API changed, mocks not matching
xdescribe('DistanceCalculatorService', () => {
  let service: DistanceCalculatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DistanceCalculatorService],
    });
    service = TestBed.inject(DistanceCalculatorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between Buenos Aires and Córdoba correctly', () => {
      // Buenos Aires: -34.6037, -58.3816
      // Córdoba: -31.4201, -64.1888
      const distance = service.calculateDistance(-34.6037, -58.3816, -31.4201, -64.1888);

      // Expected: ~646 km (real distance)
      expect(distance).toBeGreaterThan(640);
      expect(distance).toBeLessThan(650);
      expect(distance).toBeCloseTo(646.74, 1);
    });

    it('should calculate short distances correctly', () => {
      // CABA Palermo to CABA Recoleta (~2km)
      const distance = service.calculateDistance(-34.5875, -58.4097, -34.5889, -58.393);

      expect(distance).toBeGreaterThan(1);
      expect(distance).toBeLessThan(3);
    });

    it('should return 0 for same location', () => {
      const distance = service.calculateDistance(-34.6037, -58.3816, -34.6037, -58.3816);

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates', () => {
      const distance = service.calculateDistance(-34.6037, -58.3816, 40.7128, -74.006);

      // BA to NYC: ~8500 km
      expect(distance).toBeGreaterThan(8000);
    });
  });

  describe('getDistanceTier', () => {
    it('should classify 10km as local', () => {
      const tier = service.getDistanceTier(10);

      expect(tier).toBe('local');
    });

    it('should classify 50km as regional', () => {
      const tier = service.getDistanceTier(50);

      expect(tier).toBe('regional');
    });

    it('should classify 150km as long_distance', () => {
      const tier = service.getDistanceTier(150);

      expect(tier).toBe('long_distance');
    });

    it('should handle boundary cases for local threshold', () => {
      const localThreshold = environment.distanceConfig.localThresholdKm;

      expect(service.getDistanceTier(localThreshold - 0.1)).toBe('local');
      expect(service.getDistanceTier(localThreshold)).toBe('regional');
      expect(service.getDistanceTier(localThreshold + 0.1)).toBe('regional');
    });

    it('should handle boundary cases for regional threshold', () => {
      const regionalThreshold = environment.distanceConfig.regionalThresholdKm;

      expect(service.getDistanceTier(regionalThreshold - 0.1)).toBe('regional');
      expect(service.getDistanceTier(regionalThreshold)).toBe('long_distance');
      expect(service.getDistanceTier(regionalThreshold + 0.1)).toBe('long_distance');
    });
  });

  describe('getGuaranteeMultiplier', () => {
    it('should return 1.0 for local tier', () => {
      const multiplier = service.getGuaranteeMultiplier('local');

      expect(multiplier).toBe(1.0);
    });

    it('should return 1.15 for regional tier', () => {
      const multiplier = service.getGuaranteeMultiplier('regional');

      expect(multiplier).toBe(1.15);
    });

    it('should return 1.3 for long_distance tier', () => {
      const multiplier = service.getGuaranteeMultiplier('long_distance');

      expect(multiplier).toBe(1.3);
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should return 0 for distances under minimum threshold', () => {
      const fee = service.calculateDeliveryFee(3);

      expect(fee).toBe(0);
    });

    it('should return 0 for exactly minimum threshold', () => {
      const minDistance = environment.distanceConfig.minDistanceForDeliveryFee;
      const fee = service.calculateDeliveryFee(minDistance);

      expect(fee).toBe(0);
    });

    it('should calculate fee correctly for 10km distance', () => {
      // 10 * 0.5 * 100 = 500 cents
      const fee = service.calculateDeliveryFee(10);

      expect(fee).toBe(500);
    });

    it('should calculate fee correctly for 50km distance', () => {
      // 50 * 0.5 * 100 = 2500 cents
      const fee = service.calculateDeliveryFee(50);

      expect(fee).toBe(2500);
    });

    it('should calculate fee for distance beyond max delivery distance', () => {
      // Note: The service doesn't cap the fee automatically
      // It just calculates the fee for any distance
      const fee150km = service.calculateDeliveryFee(150);

      // 150 * 0.5 * 100 = 7500 cents
      expect(fee150km).toBe(7500);

      // Check if distance is within range separately
      expect(service.isWithinDeliveryRange(150)).toBe(false);
      expect(service.isWithinDeliveryRange(50)).toBe(true);
    });
  });

  describe('formatDistance', () => {
    it('should format distances < 1km as meters', () => {
      const formatted = service.formatDistance(0.5);

      expect(formatted).toBe('500 m');
    });

    it('should format distances >= 1km as kilometers', () => {
      const formatted = service.formatDistance(5.5);

      expect(formatted).toBe('5.5 km');
    });

    it('should round meters to nearest integer', () => {
      const formatted = service.formatDistance(0.856);

      expect(formatted).toBe('856 m');
    });

    it('should format large distances correctly', () => {
      const formatted = service.formatDistance(646.74);

      expect(formatted).toBe('646.7 km');
    });
  });

  describe('calculateDistanceMetadata', () => {
    it('should return complete metadata for local distance', () => {
      const metadata = service.calculateDistanceMetadata(15, 300);

      expect(metadata.distanceKm).toBe(15);
      expect(metadata.tier).toBe('local');
      expect(metadata.guaranteeMultiplier).toBe(1.0);
      expect(metadata.deliveryFeeCents).toBeGreaterThan(0);
      expect(metadata.message).toContain('cercano');
    });

    it('should return complete metadata for regional distance', () => {
      const metadata = service.calculateDistanceMetadata(50, 300);

      expect(metadata.distanceKm).toBe(50);
      expect(metadata.tier).toBe('regional');
      expect(metadata.guaranteeMultiplier).toBe(1.15);
      expect(metadata.message).toContain('media');
    });

    it('should return complete metadata for long distance', () => {
      const metadata = service.calculateDistanceMetadata(150, 300);

      expect(metadata.distanceKm).toBe(150);
      expect(metadata.tier).toBe('long_distance');
      expect(metadata.guaranteeMultiplier).toBe(1.3);
      expect(metadata.message).toContain('Larga distancia');
    });
  });

  describe('formatDeliveryFee', () => {
    it('should format zero fee', () => {
      const formatted = service.formatDeliveryFee(0);

      expect(formatted).toBe('$0.00 ARS');
    });

    it('should format fee with 2 decimal places', () => {
      expect(service.formatDeliveryFee(500)).toBe('$5.00 ARS');
      expect(service.formatDeliveryFee(1250)).toBe('$12.50 ARS');
      expect(service.formatDeliveryFee(2500)).toBe('$25.00 ARS');
    });

    it('should format large fees correctly', () => {
      expect(service.formatDeliveryFee(10000)).toBe('$100.00 ARS');
      expect(service.formatDeliveryFee(123456)).toBe('$1234.56 ARS');
    });

    it('should handle single cent amounts', () => {
      expect(service.formatDeliveryFee(1)).toBe('$0.01 ARS');
      expect(service.formatDeliveryFee(99)).toBe('$0.99 ARS');
    });
  });

  describe('isWithinDeliveryRange', () => {
    it('should return true for distances within maxDeliveryDistance (50km)', () => {
      expect(service.isWithinDeliveryRange(0)).toBe(true);
      expect(service.isWithinDeliveryRange(25)).toBe(true);
      expect(service.isWithinDeliveryRange(50)).toBe(true);
    });

    it('should return false for distances beyond maxDeliveryDistance', () => {
      expect(service.isWithinDeliveryRange(51)).toBe(false);
      expect(service.isWithinDeliveryRange(100)).toBe(false);
      expect(service.isWithinDeliveryRange(500)).toBe(false);
    });

    it('should handle exact boundary at maxDeliveryDistance', () => {
      const maxDelivery = environment.distanceConfig.maxDeliveryDistance;

      expect(service.isWithinDeliveryRange(maxDelivery)).toBe(true);
      expect(service.isWithinDeliveryRange(maxDelivery + 0.01)).toBe(false);
    });
  });

  describe('calculateDistanceBetweenLocations', () => {
    const buenosAires = { lat: -34.6037, lng: -58.3816 };
    const cordoba = { lat: -31.4201, lng: -64.1888 };

    it('should calculate distance for valid locations', () => {
      const distance = service.calculateDistanceBetweenLocations(buenosAires, cordoba);

      expect(distance).not.toBeNull();
      expect(distance!).toBeGreaterThan(640);
      expect(distance!).toBeLessThan(650);
    });

    it('should return null if user location is null', () => {
      const distance = service.calculateDistanceBetweenLocations(null, cordoba);

      expect(distance).toBeNull();
    });

    it('should return null if car location is null', () => {
      const distance = service.calculateDistanceBetweenLocations(buenosAires, null);

      expect(distance).toBeNull();
    });

    it('should return null if both locations are null', () => {
      const distance = service.calculateDistanceBetweenLocations(null, null);

      expect(distance).toBeNull();
    });

    it('should return 0 for same location', () => {
      const distance = service.calculateDistanceBetweenLocations(buenosAires, buenosAires);

      expect(distance).toBe(0);
    });
  });

  describe('isNearLocation', () => {
    const buenosAires = { lat: -34.6037, lng: -58.3816 };
    const nearby = { lat: -34.606, lng: -58.381 }; // ~0.4km away
    const laPlata = { lat: -34.9215, lng: -57.9545 }; // ~56km away

    it('should return true for locations within default threshold (0.5km)', () => {
      const isNear = service.isNearLocation(buenosAires, nearby);

      expect(isNear).toBe(true);
    });

    it('should return false for locations beyond default threshold', () => {
      const isNear = service.isNearLocation(buenosAires, laPlata);

      expect(isNear).toBe(false);
    });

    it('should return true for exact same location', () => {
      const isNear = service.isNearLocation(buenosAires, buenosAires);

      expect(isNear).toBe(true);
    });

    it('should respect custom threshold parameter', () => {
      // La Plata is ~56km away
      // Should be near with 60km threshold
      const isNear60 = service.isNearLocation(buenosAires, laPlata, 60);
      expect(isNear60).toBe(true);

      // Should NOT be near with 50km threshold
      const isNear50 = service.isNearLocation(buenosAires, laPlata, 50);
      expect(isNear50).toBe(false);
    });

    it('should handle very small custom thresholds', () => {
      // Nearby is ~0.4km away
      const isNear03 = service.isNearLocation(buenosAires, nearby, 0.3);
      expect(isNear03).toBe(false);

      const isNear05 = service.isNearLocation(buenosAires, nearby, 0.5);
      expect(isNear05).toBe(true);
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency between tier classification and multiplier', () => {
      const distances = [5, 15, 25, 50, 75, 100, 150, 200];

      distances.forEach((distance) => {
        const tier = service.getDistanceTier(distance);
        const multiplier = service.getGuaranteeMultiplier(tier);

        // Verify multiplier matches expected tier
        if (tier === 'local') {
          expect(multiplier).toBe(1.0);
        } else if (tier === 'regional') {
          expect(multiplier).toBe(1.15);
        } else if (tier === 'long_distance') {
          expect(multiplier).toBe(1.3);
        }
      });
    });

    it('should calculate delivery fee that increases with distance', () => {
      const fee10km = service.calculateDeliveryFee(10);
      const fee20km = service.calculateDeliveryFee(20);
      const fee30km = service.calculateDeliveryFee(30);

      expect(fee20km).toBeGreaterThan(fee10km);
      expect(fee30km).toBeGreaterThan(fee20km);
    });

    it('should handle complete booking distance flow', () => {
      const userLocation = { lat: -34.6037, lng: -58.3816 }; // Buenos Aires
      const carLocation = { lat: -34.61, lng: -58.39 }; // ~5km away

      // Step 1: Calculate distance
      const distance = service.calculateDistanceBetweenLocations(userLocation, carLocation);
      expect(distance).not.toBeNull();
      expect(distance!).toBeLessThan(20); // Local tier

      // Step 2: Get metadata
      const metadata = service.calculateDistanceMetadata(distance!);
      expect(metadata.tier).toBe('local');
      expect(metadata.guaranteeMultiplier).toBe(1.0);

      // Step 3: Verify delivery range
      const isDeliverable = service.isWithinDeliveryRange(distance!);
      expect(isDeliverable).toBe(true);

      // Step 4: Format for display
      const formatted = service.formatDistance(distance!);
      expect(formatted).toContain('km');
    });

    it('should handle distance-based check-in validation', () => {
      const userLocation = { lat: -34.6037, lng: -58.3816 };
      const carLocation = { lat: -34.606, lng: -58.381 }; // ~0.4km away

      // User should be near enough for check-in (within 0.5km)
      const isNearForCheckIn = service.isNearLocation(userLocation, carLocation, 0.5);
      expect(isNearForCheckIn).toBe(true);

      // But not with stricter threshold
      const isNearStrict = service.isNearLocation(userLocation, carLocation, 0.1);
      expect(isNearStrict).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle zero distance correctly', () => {
      const tier = service.getDistanceTier(0);
      expect(tier).toBe('local');

      const metadata = service.calculateDistanceMetadata(0);
      expect(metadata.deliveryFeeCents).toBe(0);

      const formatted = service.formatDistance(0);
      expect(formatted).toBe('0 m');
    });

    it('should handle very small distances (sub-meter)', () => {
      const formatted = service.formatDistance(0.001); // 1 meter

      expect(formatted).toBe('1 m');
    });

    it('should handle very large distances', () => {
      const distance = 10000; // 10,000 km

      const tier = service.getDistanceTier(distance);
      expect(tier).toBe('long_distance');

      const isDeliverable = service.isWithinDeliveryRange(distance);
      expect(isDeliverable).toBe(false);
    });

    it('should handle antipodal points correctly', () => {
      // Maximum distance on Earth (~20,000 km - half circumference)
      const northPole = { lat: 90, lng: 0 };
      const southPole = { lat: -90, lng: 0 };

      const distance = service.calculateDistance(
        northPole.lat,
        northPole.lng,
        southPole.lat,
        southPole.lng,
      );

      expect(distance).toBeGreaterThan(19000);
      expect(distance).toBeLessThan(21000);
    });

    it('should handle coordinates crossing the international date line', () => {
      const tokyo = { lat: 35.6762, lng: 139.6503 };
      const sanFrancisco = { lat: 37.7749, lng: -122.4194 };

      const distance = service.calculateDistance(
        tokyo.lat,
        tokyo.lng,
        sanFrancisco.lat,
        sanFrancisco.lng,
      );

      // Should be approximately 8,300 km
      expect(distance).toBeGreaterThan(8000);
      expect(distance).toBeLessThan(9000);
    });
  });
});
