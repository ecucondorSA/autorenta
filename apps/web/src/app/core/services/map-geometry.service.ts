import { Injectable } from '@angular/core';

/**
 * MapGeometryService
 *
 * Pure geometric calculation service for map operations.
 * All methods are stateless and side-effect free.
 *
 * Responsibilities:
 * - Calculate distances between coordinates (Haversine formula)
 * - Generate circle geometries for map layers
 * - Calculate destination points given bearing and distance
 */
@Injectable({
  providedIn: 'root',
})
export class MapGeometryService {
  /**
   * Calculate distance between two coordinates using Haversine formula
   *
   * @param lat1 - Latitude of first point (decimal degrees)
   * @param lng1 - Longitude of first point (decimal degrees)
   * @param lat2 - Latitude of second point (decimal degrees)
   * @param lng2 - Longitude of second point (decimal degrees)
   * @returns Distance in meters
   *
   * @example
   * // Distance from Buenos Aires to La Plata (~56km)
   * const distance = service.calculateDistance(-34.603722, -58.381592, -34.921389, -57.954444);
   * console.log(distance); // ~56000 meters
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Create a circular polygon geometry for GeoJSON
   *
   * @param lat - Center latitude (decimal degrees)
   * @param lng - Center longitude (decimal degrees)
   * @param radiusMeters - Radius in meters
   * @param points - Number of points to generate (default: 64)
   * @returns GeoJSON Polygon geometry
   *
   * @example
   * // Create 5km radius circle around Buenos Aires center
   * const circle = service.createCircleGeometry(-34.603722, -58.381592, 5000);
   * // Use in Mapbox source
   * map.addSource('circle', { type: 'geojson', data: { type: 'Feature', geometry: circle } });
   */
  createCircleGeometry(
    lat: number,
    lng: number,
    radiusMeters: number,
    points = 64,
  ): GeoJSON.Polygon {
    const coordinates: [number, number][] = [];

    for (let i = 0; i <= points; i++) {
      const angle = (i * 360) / points;
      const point = this.destinationPoint(lat, lng, radiusMeters, angle);
      coordinates.push([point.lng, point.lat]);
    }

    return {
      type: 'Polygon',
      coordinates: [coordinates],
    };
  }

  /**
   * Calculate destination point given start point, distance and bearing
   *
   * @param lat - Start latitude (decimal degrees)
   * @param lng - Start longitude (decimal degrees)
   * @param distanceMeters - Distance to travel in meters
   * @param bearingDegrees - Bearing in degrees (0 = North, 90 = East)
   * @returns Destination point {lat, lng}
   *
   * @example
   * // Point 10km North of Buenos Aires
   * const destination = service.destinationPoint(-34.603722, -58.381592, 10000, 0);
   * console.log(destination); // { lat: -34.513..., lng: -58.381... }
   */
  destinationPoint(
    lat: number,
    lng: number,
    distanceMeters: number,
    bearingDegrees: number,
  ): { lat: number; lng: number } {
    const R = 6371e3; // Earth radius in meters
    const bearing = (bearingDegrees * Math.PI) / 180;
    const lat1 = (lat * Math.PI) / 180;
    const lng1 = (lng * Math.PI) / 180;

    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(distanceMeters / R) +
        Math.cos(lat1) * Math.sin(distanceMeters / R) * Math.cos(bearing),
    );

    const lng2 =
      lng1 +
      Math.atan2(
        Math.sin(bearing) * Math.sin(distanceMeters / R) * Math.cos(lat1),
        Math.cos(distanceMeters / R) - Math.sin(lat1) * Math.sin(lat2),
      );

    return {
      lat: (lat2 * 180) / Math.PI,
      lng: (lng2 * 180) / Math.PI,
    };
  }
}
