import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { interval, Subscription, Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { SupabaseClientService } from './supabase-client.service';

export interface LocationUpdate {
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
}

export interface TrackingSession {
  tracking_id: string;
  user_id: string;
  user_role: 'locador' | 'locatario';
  user_name: string;
  user_photo: string | null;
  latitude: number;
  longitude: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  last_updated: string;
  estimated_arrival?: string;
  distance_remaining?: number;
}

@Injectable({
  providedIn: 'root',
})
export class LocationTrackingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private supabaseClient: SupabaseClient;
  private watchId: number | null = null;
  private updateInterval: Subscription | null = null;
  private currentTrackingId = signal<string | null>(null);
  private isTracking = signal(false);

  constructor(private supabaseService: SupabaseClientService) {
    this.supabaseClient = this.supabaseService.getClient();
  }

  /**
   * Start tracking session for a booking
   * @param bookingId Booking ID
   * @param trackingType 'check_in' or 'check_out'
   * @returns Tracking session ID
   */
  async startTracking(bookingId: string, trackingType: 'check_in' | 'check_out'): Promise<string> {
    try {
      // Start tracking session in database
      const { data, error } = await this.supabaseClient.rpc('start_location_tracking', {
        p_booking_id: bookingId,
        p_tracking_type: trackingType,
      });

      if (error) throw error;

      const trackingId = data as string;
      this.currentTrackingId.set(trackingId);
      this.isTracking.set(true);

      // Start watching user's location
      this.startWatchingLocation(trackingId);

      console.log('[LocationTracking] Started tracking session:', trackingId);
      return trackingId;
    } catch (error) {
      console.error('[LocationTracking] Error starting tracking:', error);
      throw error;
    }
  }

  /**
   * Stop tracking session
   * @param status 'arrived' or 'inactive'
   */
  async stopTracking(status: 'arrived' | 'inactive' = 'inactive'): Promise<void> {
    const trackingId = this.currentTrackingId();
    if (!trackingId) return;

    try {
      // Stop location watching
      this.stopWatchingLocation();

      // End tracking session in database
      await this.supabaseClient.rpc('end_location_tracking', {
        p_tracking_id: trackingId,
        p_status: status,
      });

      this.currentTrackingId.set(null);
      this.isTracking.set(false);

      console.log('[LocationTracking] Stopped tracking session');
    } catch (error) {
      console.error('[LocationTracking] Error stopping tracking:', error);
    }
  }

  /**
   * Get active tracking sessions for a booking
   * @param bookingId Booking ID
   * @returns Observable of tracking sessions
   */
  getActiveTracking(bookingId: string): Observable<TrackingSession[]> {
    // Poll every 3 seconds for live updates
    return interval(3000).pipe(
      switchMap(() =>
        from(
          this.supabaseClient
            .rpc('get_active_tracking_for_booking', {
              p_booking_id: bookingId,
            })
            .then(({ data, error }) => {
              if (error) throw error;
              return (data as TrackingSession[]) || [];
            }),
        ),
      ),
    );
  }

  /**
   * Subscribe to real-time location updates using Supabase Realtime
   * @param bookingId Booking ID
   * @param callback Callback function for updates
   */
  subscribeToLocationUpdates(
    bookingId: string,
    callback: (tracking: TrackingSession[]) => void,
  ): () => void {
    const channel = this.supabaseClient
      .channel(`booking-tracking-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'booking_location_tracking',
          filter: `booking_id=eq.${bookingId}`,
        },
        async () => {
          // Fetch latest tracking data
          const { data } = await this.supabaseClient.rpc('get_active_tracking_for_booking', {
            p_booking_id: bookingId,
          });
          callback((data as TrackingSession[]) || []);
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug(`[LocationTracking] Subscribed to tracking for booking ${bookingId}`);
        }
      });

    // Return cleanup function
    return () => {
      channel.unsubscribe();
    };
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @returns Distance in meters
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Estimate arrival time based on current location and destination
   * @param currentLat Current latitude
   * @param currentLon Current longitude
   * @param destLat Destination latitude
   * @param destLon Destination longitude
   * @param currentSpeed Current speed in m/s (optional)
   * @returns ETA in minutes
   */
  estimateArrivalTime(
    currentLat: number,
    currentLon: number,
    destLat: number,
    destLon: number,
    currentSpeed?: number,
  ): number {
    const distance = this.calculateDistance(currentLat, currentLon, destLat, destLon);

    // Use current speed if available, otherwise assume average city speed (30 km/h = 8.33 m/s)
    const speed = currentSpeed && currentSpeed > 0 ? currentSpeed : 8.33;

    const timeInSeconds = distance / speed;
    return Math.ceil(timeInSeconds / 60); // Return minutes
  }

  /**
   * Check if user has granted location permissions
   */
  async checkLocationPermission(): Promise<boolean> {
    if (!this.isBrowser || !navigator.geolocation) {
      console.warn('[LocationTracking] Geolocation not supported');
      return false;
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state === 'granted';
    } catch {
      // Fallback: try to get location once
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
        );
      });
    }
  }

  /**
   * Request location permission from user
   */
  async requestLocationPermission(): Promise<boolean> {
    if (!this.isBrowser || !navigator.geolocation) {
      return false;
    }
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => resolve(true),
        (error) => {
          console.error('[LocationTracking] Permission denied:', error);
          resolve(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
        },
      );
    });
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Start watching user's location with Geolocation API
   */
  private startWatchingLocation(trackingId: string): void {
    if (!this.isBrowser || !navigator.geolocation) {
      console.error('[LocationTracking] Geolocation not supported');
      return;
    }

    // Watch position with high accuracy
    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location: LocationUpdate = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined,
        };

        this.updateLocation(trackingId, location);
      },
      (error) => {
        console.error('[LocationTracking] Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );

    console.log('[LocationTracking] Started watching location');
  }

  /**
   * Stop watching user's location
   */
  private stopWatchingLocation(): void {
    if (this.watchId !== null && this.isBrowser && navigator.geolocation) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.updateInterval) {
      this.updateInterval.unsubscribe();
      this.updateInterval = null;
    }

    console.log('[LocationTracking] Stopped watching location');
  }

  /**
   * Update location in database
   */
  private async updateLocation(trackingId: string, location: LocationUpdate): Promise<void> {
    try {
      const { error } = await this.supabaseClient.rpc('update_location', {
        p_tracking_id: trackingId,
        p_latitude: location.latitude,
        p_longitude: location.longitude,
        p_accuracy: location.accuracy,
        p_heading: location.heading,
        p_speed: location.speed,
      });

      if (error) throw error;

      console.log('[LocationTracking] Location updated:', {
        lat: location.latitude.toFixed(6),
        lon: location.longitude.toFixed(6),
        accuracy: location.accuracy?.toFixed(1),
      });
    } catch (error) {
      console.error('[LocationTracking] Error updating location:', error);
    }
  }

  // ============================================================================
  // GETTERS
  // ============================================================================

  get trackingId() {
    return this.currentTrackingId.asReadonly();
  }

  get tracking() {
    return this.isTracking.asReadonly();
  }
}
