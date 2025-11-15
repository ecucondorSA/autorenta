import { TestBed } from '@angular/core/testing';
import { MapGeometryService } from './map-geometry.service';

describe('MapGeometryService', () => {
  let service: MapGeometryService;

  // Test coordinates (Buenos Aires area)
  const BA_CENTER = { lat: -34.603722, lng: -58.381592 }; // Buenos Aires city center
  const LA_PLATA = { lat: -34.921389, lng: -57.954444 }; // La Plata (~56km SE)
  const TIGRE = { lat: -34.426111, lng: -58.579722 }; // Tigre (~28km N)

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MapGeometryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateDistance', () => {
    it('should calculate distance between Buenos Aires and La Plata (~56km)', () => {
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        LA_PLATA.lat,
        LA_PLATA.lng,
      );

      // Allow 1% margin of error
      expect(distance).toBeGreaterThan(55000);
      expect(distance).toBeLessThan(57000);
    });

    it('should calculate distance between Buenos Aires and Tigre (~28km)', () => {
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        TIGRE.lat,
        TIGRE.lng,
      );

      // Allow 1% margin of error
      expect(distance).toBeGreaterThan(27000);
      expect(distance).toBeLessThan(29000);
    });

    it('should return 0 for same coordinates', () => {
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        BA_CENTER.lat,
        BA_CENTER.lng,
      );

      expect(distance).toBe(0);
    });

    it('should handle negative coordinates correctly', () => {
      // Southern hemisphere (Buenos Aires) to Northern hemisphere (Miami)
      const miami = { lat: 25.7617, lng: -80.1918 };
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        miami.lat,
        miami.lng,
      );

      // Buenos Aires to Miami is approximately 7,200km
      expect(distance).toBeGreaterThan(7000000);
      expect(distance).toBeLessThan(7400000);
    });

    it('should handle very small distances (< 1m)', () => {
      const point1 = { lat: -34.603722, lng: -58.381592 };
      const point2 = { lat: -34.603723, lng: -58.381593 }; // ~0.15m difference

      const distance = service.calculateDistance(point1.lat, point1.lng, point2.lat, point2.lng);

      expect(distance).toBeLessThan(1);
      expect(distance).toBeGreaterThan(0);
    });

    it('should be symmetric (A to B === B to A)', () => {
      const distanceAB = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        LA_PLATA.lat,
        LA_PLATA.lng,
      );

      const distanceBA = service.calculateDistance(
        LA_PLATA.lat,
        LA_PLATA.lng,
        BA_CENTER.lat,
        BA_CENTER.lng,
      );

      expect(distanceAB).toBeCloseTo(distanceBA, 0);
    });
  });

  describe('createCircleGeometry', () => {
    it('should create circle with correct number of points (64 by default)', () => {
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, 5000);

      expect(circle.type).toBe('Polygon');
      expect(circle.coordinates).toHaveLength(1);
      expect(circle.coordinates[0]).toHaveLength(65); // 64 points + closing point
    });

    it('should create circle with custom number of points', () => {
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, 5000, 32);

      expect(circle.coordinates[0]).toHaveLength(33); // 32 points + closing point
    });

    it('should close the polygon (first point === last point)', () => {
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, 5000);

      const firstPoint = circle.coordinates[0][0];
      const lastPoint = circle.coordinates[0][circle.coordinates[0].length - 1];

      expect(firstPoint[0]).toBeCloseTo(lastPoint[0], 6); // lng
      expect(firstPoint[1]).toBeCloseTo(lastPoint[1], 6); // lat
    });

    it('should create valid GeoJSON polygon', () => {
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, 5000);

      // Validate GeoJSON structure
      expect(circle.type).toBe('Polygon');
      expect(Array.isArray(circle.coordinates)).toBe(true);
      expect(circle.coordinates[0].every((coord) => Array.isArray(coord) && coord.length === 2))
        .toBe(true);
    });

    it('should have all points approximately same distance from center', () => {
      const radiusMeters = 5000;
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, radiusMeters);

      // Check a few points around the circle
      const pointsToCheck = [0, 16, 32, 48]; // North, East, South, West

      pointsToCheck.forEach((index) => {
        const point = circle.coordinates[0][index];
        const distance = service.calculateDistance(BA_CENTER.lat, BA_CENTER.lng, point[1], point[0]);

        // Allow 1% margin of error due to Earth's curvature
        expect(distance).toBeGreaterThan(radiusMeters * 0.99);
        expect(distance).toBeLessThan(radiusMeters * 1.01);
      });
    });

    it('should handle very small radius (10m)', () => {
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, 10);

      expect(circle.coordinates[0]).toHaveLength(65);
      const firstPoint = circle.coordinates[0][0];
      // Point should be very close to center
      expect(Math.abs(firstPoint[1] - BA_CENTER.lat)).toBeLessThan(0.001);
      expect(Math.abs(firstPoint[0] - BA_CENTER.lng)).toBeLessThan(0.001);
    });

    it('should handle large radius (50km)', () => {
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, 50000);

      expect(circle.coordinates[0]).toHaveLength(65);
      const firstPoint = circle.coordinates[0][0];
      // Point should be significantly far from center
      expect(Math.abs(firstPoint[1] - BA_CENTER.lat)).toBeGreaterThan(0.1);
    });
  });

  describe('destinationPoint', () => {
    it('should calculate point 10km North of Buenos Aires', () => {
      const destination = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 10000, 0);

      // North means latitude increases
      expect(destination.lat).toBeGreaterThan(BA_CENTER.lat);
      // Longitude should be approximately the same (minor variation due to Earth curvature)
      expect(destination.lng).toBeCloseTo(BA_CENTER.lng, 1);

      // Verify distance
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        destination.lat,
        destination.lng,
      );
      expect(distance).toBeCloseTo(10000, -1);
    });

    it('should calculate point 10km East of Buenos Aires', () => {
      const destination = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 10000, 90);

      // East means longitude increases (becomes less negative)
      expect(destination.lng).toBeGreaterThan(BA_CENTER.lng);
      // Latitude should be approximately the same
      expect(destination.lat).toBeCloseTo(BA_CENTER.lat, 1);

      // Verify distance
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        destination.lat,
        destination.lng,
      );
      expect(distance).toBeCloseTo(10000, -1);
    });

    it('should calculate point 10km South of Buenos Aires', () => {
      const destination = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 10000, 180);

      // South means latitude decreases (becomes more negative)
      expect(destination.lat).toBeLessThan(BA_CENTER.lat);
      // Longitude should be approximately the same
      expect(destination.lng).toBeCloseTo(BA_CENTER.lng, 1);

      // Verify distance
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        destination.lat,
        destination.lng,
      );
      expect(distance).toBeCloseTo(10000, -1);
    });

    it('should calculate point 10km West of Buenos Aires', () => {
      const destination = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 10000, 270);

      // West means longitude decreases (becomes more negative)
      expect(destination.lng).toBeLessThan(BA_CENTER.lng);
      // Latitude should be approximately the same
      expect(destination.lat).toBeCloseTo(BA_CENTER.lat, 1);

      // Verify distance
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        destination.lat,
        destination.lng,
      );
      expect(distance).toBeCloseTo(10000, -1);
    });

    it('should handle diagonal bearings (NE = 45 degrees)', () => {
      const destination = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 10000, 45);

      // Northeast means both lat and lng increase
      expect(destination.lat).toBeGreaterThan(BA_CENTER.lat);
      expect(destination.lng).toBeGreaterThan(BA_CENTER.lng);

      // Verify distance
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        destination.lat,
        destination.lng,
      );
      expect(distance).toBeCloseTo(10000, -1);
    });

    it('should handle 0 distance (return same point)', () => {
      const destination = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 0, 90);

      expect(destination.lat).toBeCloseTo(BA_CENTER.lat, 6);
      expect(destination.lng).toBeCloseTo(BA_CENTER.lng, 6);
    });

    it('should handle very long distances (1000km)', () => {
      const destination = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 1000000, 0);

      // Verify distance
      const distance = service.calculateDistance(
        BA_CENTER.lat,
        BA_CENTER.lng,
        destination.lat,
        destination.lng,
      );
      expect(distance).toBeCloseTo(1000000, -3); // Allow 1km margin
    });

    it('should handle bearing > 360 degrees (normalize)', () => {
      // 450 degrees = 90 degrees (East)
      const dest1 = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 10000, 450);
      const dest2 = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, 10000, 90);

      expect(dest1.lat).toBeCloseTo(dest2.lat, 4);
      expect(dest1.lng).toBeCloseTo(dest2.lng, 4);
    });
  });

  describe('Integration: Circle creation uses destinationPoint', () => {
    it('should use destinationPoint for circle generation', () => {
      const radiusMeters = 5000;
      const circle = service.createCircleGeometry(BA_CENTER.lat, BA_CENTER.lng, radiusMeters);

      // First point should be at 0 degrees (North)
      const expectedNorth = service.destinationPoint(BA_CENTER.lat, BA_CENTER.lng, radiusMeters, 0);
      const actualNorth = circle.coordinates[0][0];

      expect(actualNorth[1]).toBeCloseTo(expectedNorth.lat, 6);
      expect(actualNorth[0]).toBeCloseTo(expectedNorth.lng, 6);
    });
  });

  describe('Edge cases', () => {
    it('should handle equator crossing', () => {
      const equator = { lat: 0, lng: 0 };
      const north = service.destinationPoint(equator.lat, equator.lng, 10000, 0);
      const south = service.destinationPoint(equator.lat, equator.lng, 10000, 180);

      expect(north.lat).toBeGreaterThan(0);
      expect(south.lat).toBeLessThan(0);
    });

    it('should handle prime meridian crossing', () => {
      const primeMeridian = { lat: 0, lng: 0 };
      const east = service.destinationPoint(primeMeridian.lat, primeMeridian.lng, 10000, 90);
      const west = service.destinationPoint(primeMeridian.lat, primeMeridian.lng, 10000, 270);

      expect(east.lng).toBeGreaterThan(0);
      expect(west.lng).toBeLessThan(0);
    });
  });
});
