/**
 * Vehicle Tracking Service
 *
 * Provides continuous GPS tracking of vehicles during active rentals.
 * This is critical for LATAM markets where vehicle theft and fraud are concerns.
 *
 * Features:
 * - Continuous location updates during rental period
 * - Background tracking support (via Capacitor)
 * - Geofencing alerts
 * - Speed monitoring
 * - Battery level tracking
 * - Location history for dispute resolution
 *
 * Usage:
 * ```typescript
 * // Start tracking when rental begins
 * await vehicleTrackingService.startRentalTracking(bookingId);
 *
 * // Stop when rental ends
 * await vehicleTrackingService.stopRentalTracking();
 *
 * // Get latest location
 * const location = vehicleTrackingService.currentLocation();
 *
 * // Subscribe to alerts
 * vehicleTrackingService.alerts$.subscribe(alert => handleAlert(alert));
 * ```
 */

import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, WatchPositionCallback } from '@capacitor/geolocation';
import { Subject, interval, Subscription, BehaviorSubject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { SupabaseClientService } from '@core/services/infrastructure/supabase-client.service';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// =============================================================================
// TYPES
// =============================================================================

export interface VehicleLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;  // m/s
  timestamp: Date;
}

export interface TrackingAlert {
  type: 'geofence_exit' | 'geofence_enter' | 'speed_limit' | 'low_battery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface TrackingSettings {
  tracking_enabled: boolean;
  tracking_interval_seconds: number;
  background_tracking_enabled: boolean;
  geofencing_enabled: boolean;
  speed_alert_enabled: boolean;
  speed_limit_kmh: number;
}

export interface TrackingStatus {
  isTracking: boolean;
  bookingId: string | null;
  lastUpdate: Date | null;
  batteryLevel: number | null;
  isBackgroundMode: boolean;
  errorMessage: string | null;
}

// =============================================================================
// SERVICE
// =============================================================================

@Injectable({
  providedIn: 'root',
})
export class VehicleTrackingService {
  private readonly supabaseService = inject(SupabaseClientService);
  private readonly logger = inject(LoggerService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly isNative = Capacitor.isNativePlatform();

  // State
  private readonly _currentLocation = signal<VehicleLocation | null>(null);
  private readonly _trackingStatus = signal<TrackingStatus>({
    isTracking: false,
    bookingId: null,
    lastUpdate: null,
    batteryLevel: null,
    isBackgroundMode: false,
    errorMessage: null
  });
  private readonly _settings = signal<TrackingSettings | null>(null);

  // Public state accessors
  readonly currentLocation = this._currentLocation.asReadonly();
  readonly trackingStatus = this._trackingStatus.asReadonly();
  readonly settings = this._settings.asReadonly();

  readonly isTracking = computed(() => this._trackingStatus().isTracking);
  readonly hasError = computed(() => this._trackingStatus().errorMessage !== null);

  // Alerts stream
  private readonly _alerts$ = new Subject<TrackingAlert>();
  readonly alerts$ = this._alerts$.asObservable();

  // Private state
  private watchId: string | null = null;
  private updateInterval: Subscription | null = null;
  private activeBookingId: string | null = null;
  private destroy$ = new Subject<void>();

  // Battery monitoring
  private batteryLevel: number | null = null;
  private isCharging = false;

  // =============================================================================
  // PUBLIC METHODS
  // =============================================================================

  /**
   * Start continuous tracking for an active rental
   */
  async startRentalTracking(bookingId: string): Promise<boolean> {
    if (!this.isBrowser) {
      this.logger.warn('[VehicleTracking] Not in browser environment');
      return false;
    }

    if (this._trackingStatus().isTracking) {
      this.logger.warn('[VehicleTracking] Already tracking');
      return true;
    }

    try {
      this.logger.info('[VehicleTracking] Starting rental tracking for booking:', bookingId);

      // Check and request permissions
      const hasPermission = await this.checkAndRequestPermission();
      if (!hasPermission) {
        this.updateStatus({ errorMessage: 'Location permission denied' });
        return false;
      }

      // Load tracking settings
      await this.loadSettings(bookingId);

      // Start watching position
      await this.startWatching(bookingId);

      // Start periodic updates to server
      this.startPeriodicUpdates(bookingId);

      // Start battery monitoring
      this.startBatteryMonitoring();

      this.activeBookingId = bookingId;
      this.updateStatus({
        isTracking: true,
        bookingId,
        errorMessage: null
      });

      return true;
    } catch (error) {
      this.logger.error('[VehicleTracking] Failed to start tracking:', error);
      this.updateStatus({
        isTracking: false,
        errorMessage: error instanceof Error ? error.message : 'Failed to start tracking'
      });
      return false;
    }
  }

  /**
   * Stop tracking when rental ends
   */
  async stopRentalTracking(): Promise<void> {
    this.logger.info('[VehicleTracking] Stopping rental tracking');

    // Stop watching position
    if (this.watchId !== null) {
      if (this.isNative) {
        await Geolocation.clearWatch({ id: this.watchId });
      } else if ('geolocation' in navigator) {
        navigator.geolocation.clearWatch(parseInt(this.watchId, 10));
      }
      this.watchId = null;
    }

    // Stop periodic updates
    if (this.updateInterval) {
      this.updateInterval.unsubscribe();
      this.updateInterval = null;
    }

    // Reset state
    this.activeBookingId = null;
    this._currentLocation.set(null);
    this.updateStatus({
      isTracking: false,
      bookingId: null,
      lastUpdate: null,
      errorMessage: null
    });
  }

  /**
   * Get latest location from server
   */
  async getLatestLocation(bookingId: string): Promise<VehicleLocation | null> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .rpc('get_vehicle_latest_location', { p_booking_id: bookingId });

      if (error || !data?.success) {
        return null;
      }

      return {
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(data.recorded_at)
      };
    } catch (error) {
      this.logger.error('[VehicleTracking] Failed to get latest location:', error);
      return null;
    }
  }

  /**
   * Get location history for a booking
   */
  async getLocationHistory(
    bookingId: string,
    limit = 100,
    offset = 0
  ): Promise<{ locations: VehicleLocation[]; total: number }> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .rpc('get_vehicle_location_history', {
          p_booking_id: bookingId,
          p_limit: limit,
          p_offset: offset
        });

      if (error || !data?.success) {
        return { locations: [], total: 0 };
      }

      const locations = data.locations.map((loc: Record<string, unknown>) => ({
        latitude: loc.latitude as number,
        longitude: loc.longitude as number,
        speed: loc.speed as number | undefined,
        heading: loc.heading as number | undefined,
        timestamp: new Date(loc.recorded_at as string)
      }));

      return { locations, total: data.total };
    } catch (error) {
      this.logger.error('[VehicleTracking] Failed to get location history:', error);
      return { locations: [], total: 0 };
    }
  }

  /**
   * Get unacknowledged alerts for a booking
   */
  async getUnacknowledgedAlerts(bookingId: string): Promise<TrackingAlert[]> {
    try {
      const { data, error } = await this.supabaseService.getClient()
        .from('geofence_alerts')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('acknowledged', false)
        .order('created_at', { ascending: false });

      if (error || !data) return [];

      return data.map(alert => ({
        type: alert.alert_type as TrackingAlert['type'],
        severity: alert.severity as TrackingAlert['severity'],
        message: this.getAlertMessage(alert.alert_type, alert),
        data: {
          distance_km: alert.distance_from_center ? alert.distance_from_center / 1000 : undefined,
          speed_kmh: alert.speed_at_alert ? alert.speed_at_alert * 3.6 : undefined
        },
        timestamp: new Date(alert.created_at)
      }));
    } catch (error) {
      this.logger.error('[VehicleTracking] Failed to get alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, notes?: string): Promise<boolean> {
    try {
      const { error } = await this.supabaseService.getClient()
        .from('geofence_alerts')
        .update({
          acknowledged: true,
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: (await this.supabaseService.getClient().auth.getUser()).data.user?.id,
          resolution_notes: notes
        })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      this.logger.error('[VehicleTracking] Failed to acknowledge alert:', error);
      return false;
    }
  }

  /**
   * Check if tracking is available
   */
  isTrackingAvailable(): boolean {
    if (!this.isBrowser) return false;
    return 'geolocation' in navigator || this.isNative;
  }

  // =============================================================================
  // PRIVATE METHODS
  // =============================================================================

  private async checkAndRequestPermission(): Promise<boolean> {
    try {
      if (this.isNative) {
        const permission = await Geolocation.checkPermissions();
        if (permission.location !== 'granted') {
          const request = await Geolocation.requestPermissions();
          return request.location === 'granted';
        }
        return true;
      }

      // Browser
      const result = await navigator.permissions.query({ name: 'geolocation' });
      if (result.state === 'granted') return true;
      if (result.state === 'denied') return false;

      // Prompt user
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 10000 }
        );
      });
    } catch (error) {
      this.logger.error('[VehicleTracking] Permission check failed:', error);
      return false;
    }
  }

  private async loadSettings(bookingId: string): Promise<void> {
    try {
      const { data } = await this.supabaseService.getClient()
        .from('booking_tracking_settings')
        .select('*')
        .eq('booking_id', bookingId)
        .single();

      if (data) {
        this._settings.set(data as TrackingSettings);
      } else {
        // Use defaults
        this._settings.set({
          tracking_enabled: true,
          tracking_interval_seconds: 300,
          background_tracking_enabled: true,
          geofencing_enabled: true,
          speed_alert_enabled: true,
          speed_limit_kmh: 120
        });
      }
    } catch (error) {
      this.logger.warn('[VehicleTracking] Failed to load settings, using defaults');
      this._settings.set({
        tracking_enabled: true,
        tracking_interval_seconds: 300,
        background_tracking_enabled: true,
        geofencing_enabled: true,
        speed_alert_enabled: true,
        speed_limit_kmh: 120
      });
    }
  }

  private async startWatching(bookingId: string): Promise<void> {
    const options = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 0
    };

    if (this.isNative) {
      this.watchId = await Geolocation.watchPosition(options, (position, err) => {
        if (err) {
          this.logger.warn('[VehicleTracking] Position error:', err);
          return;
        }
        if (position) {
          this.handlePositionUpdate(position);
        }
      });
    } else {
      const id = navigator.geolocation.watchPosition(
        (position) => this.handlePositionUpdate(position),
        (error) => this.logger.warn('[VehicleTracking] Position error:', error),
        options
      );
      this.watchId = id.toString();
    }
  }

  private handlePositionUpdate(position: Position | GeolocationPosition): void {
    const coords = position.coords;
    const location: VehicleLocation = {
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy ?? undefined,
      altitude: coords.altitude ?? undefined,
      heading: coords.heading ?? undefined,
      speed: coords.speed ?? undefined,
      timestamp: new Date(position.timestamp)
    };

    this._currentLocation.set(location);
    this.updateStatus({ lastUpdate: location.timestamp });
  }

  private startPeriodicUpdates(bookingId: string): void {
    const intervalSeconds = this._settings()?.tracking_interval_seconds ?? 300;

    // Send immediately, then periodically
    this.sendLocationUpdate(bookingId);

    this.updateInterval = interval(intervalSeconds * 1000)
      .pipe(
        takeUntil(this.destroy$),
        filter(() => this._trackingStatus().isTracking)
      )
      .subscribe(() => {
        this.sendLocationUpdate(bookingId);
      });
  }

  private async sendLocationUpdate(bookingId: string): Promise<void> {
    const location = this._currentLocation();
    if (!location) {
      this.logger.debug('[VehicleTracking] No location to send');
      return;
    }

    try {
      const { data: session } = await this.supabaseService.getClient().auth.getSession();
      if (!session.session) {
        this.logger.warn('[VehicleTracking] No auth session');
        return;
      }

      const response = await fetch(
        `${import.meta.env['VITE_SUPABASE_URL'] || ''}/functions/v1/vehicle-location-update`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.session.access_token}`
          },
          body: JSON.stringify({
            booking_id: bookingId,
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: location.accuracy,
            altitude: location.altitude,
            heading: location.heading,
            speed: location.speed,
            source: this.isNative ? 'app' : 'app',
            battery_level: this.batteryLevel,
            is_charging: this.isCharging,
            network_type: this.getNetworkType()
          })
        }
      );

      const result = await response.json();

      if (!result.success) {
        this.logger.warn('[VehicleTracking] Server rejected update:', result.error);
        return;
      }

      // Handle any alerts from server
      if (result.alerts && result.alerts.length > 0) {
        for (const alert of result.alerts) {
          this._alerts$.next({
            ...alert,
            timestamp: new Date()
          });
        }
      }

    } catch (error) {
      this.logger.error('[VehicleTracking] Failed to send location update:', error);
    }
  }

  private startBatteryMonitoring(): void {
    if (!this.isBrowser || !('getBattery' in navigator)) return;

    (navigator as Navigator & { getBattery(): Promise<BatteryManager> })
      .getBattery()
      .then((battery: BatteryManager) => {
        this.batteryLevel = Math.round(battery.level * 100);
        this.isCharging = battery.charging;

        battery.addEventListener('levelchange', () => {
          this.batteryLevel = Math.round(battery.level * 100);
        });
        battery.addEventListener('chargingchange', () => {
          this.isCharging = battery.charging;
        });

        this.updateStatus({ batteryLevel: this.batteryLevel });
      })
      .catch(() => {
        // Battery API not available
      });
  }

  private getNetworkType(): string | undefined {
    if (!this.isBrowser) return undefined;

    const connection = (navigator as Navigator & {
      connection?: { effectiveType?: string; type?: string };
    }).connection;

    if (connection) {
      return connection.effectiveType || connection.type;
    }
    return undefined;
  }

  private updateStatus(partial: Partial<TrackingStatus>): void {
    this._trackingStatus.update(current => ({ ...current, ...partial }));
  }

  private getAlertMessage(type: string, alert: Record<string, unknown>): string {
    switch (type) {
      case 'exit':
        return `Vehículo salió de la zona permitida`;
      case 'enter':
        return `Vehículo entró a zona restringida`;
      case 'speed_limit':
        return `Velocidad excesiva: ${Math.round((alert.speed_at_alert as number) * 3.6)} km/h`;
      default:
        return `Alerta de tracking: ${type}`;
    }
  }

  /**
   * Clean up on service destroy
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRentalTracking();
  }
}

// Battery Manager interface (partial)
interface BatteryManager extends EventTarget {
  charging: boolean;
  level: number;
  addEventListener(type: 'levelchange' | 'chargingchange', listener: EventListener): void;
}
