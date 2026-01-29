import { Injectable } from '@angular/core';
import { environment } from '@environment';

export interface DirectionsResponse {
  routes: Route[];
  waypoints: Waypoint[];
  code: string;
  uuid?: string;
}

export interface Route {
  distance: number; // meters
  duration: number; // seconds
  geometry: GeoJSON.LineString;
  legs: RouteLeg[];
  weight: number;
  weight_name: string;
}

export interface RouteLeg {
  distance: number;
  duration: number;
  steps: RouteStep[];
  summary: string;
}

export interface RouteStep {
  distance: number;
  duration: number;
  geometry: GeoJSON.LineString;
  name: string;
  mode: string;
  maneuver: {
    type: string;
    instruction: string;
    bearing_before: number;
    bearing_after: number;
    location: [number, number];
  };
}

export interface Waypoint {
  name: string;
  location: [number, number];
  distance: number;
}

@Injectable({
  providedIn: 'root',
})
export class MapboxDirectionsService {
  private readonly baseUrl = 'https://api.mapbox.com/directions/v5/mapbox';

  /**
   * Get directions between two points
   * @param origin [lng, lat]
   * @param destination [lng, lat]
   * @param profile 'driving', 'driving-traffic', 'walking', or 'cycling'
   * @returns DirectionsResponse with route information
   */
  async getDirections(
    origin: [number, number],
    destination: [number, number],
    profile: 'driving' | 'driving-traffic' | 'walking' | 'cycling' = 'driving',
  ): Promise<DirectionsResponse | null> {
    try {
      const coordinates = `${origin[0]},${origin[1]};${destination[0]},${destination[1]}`;
      const url = `${this.baseUrl}/${profile}/${coordinates}?geometries=geojson&steps=true&approaches=unrestricted;curb&access_token=${environment.mapboxAccessToken}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.error('[MapboxDirections] API error:', response.statusText);
        return null;
      }

      const data: DirectionsResponse = await response.json();

      if (data.code !== 'Ok') {
        console.warn('[MapboxDirections] No route found:', data.code);
        return null;
      }

      return data;
    } catch (error) {
      console.error('[MapboxDirections] Error fetching directions:', error);
      return null;
    }
  }

  /**
   * Format duration in seconds to human-readable string
   * @param seconds Duration in seconds
   * @returns Formatted string like "15 min" or "1 h 30 min"
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return minutes > 0 ? `${hours} h ${minutes} min` : `${hours} h`;
    }
    return `${minutes} min`;
  }

  /**
   * Format distance in meters to human-readable string
   * @param meters Distance in meters
   * @returns Formatted string like "1.5 km" or "500 m"
   */
  formatDistance(meters: number): string {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  }

  /**
   * Get simplified instructions for the route
   * @param route Route object from directions response
   * @returns Array of instruction strings
   */
  getRouteInstructions(route: Route): string[] {
    const instructions: string[] = [];

    route.legs.forEach((leg) => {
      leg.steps.forEach((step) => {
        if (step.maneuver.instruction) {
          instructions.push(step.maneuver.instruction);
        }
      });
    });

    return instructions;
  }
}
