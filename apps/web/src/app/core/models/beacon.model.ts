/**
 * AutoRenta Mesh (Project Beacon) - Type Definitions
 *
 * This module defines the types for the BLE-based emergency beacon system.
 */

/**
 * Types of emergency alerts that can be broadcast
 */
export enum BeaconAlertType {
  /** General emergency / panic button */
  SOS = 'SOS',
  /** Vehicle theft reported */
  THEFT = 'THEFT',
  /** Crash/accident detected */
  CRASH = 'CRASH',
  /** Suspicious silence (vehicle not responding) */
  SILENT = 'SILENT',
}

/**
 * Status of a security event in the backend
 */
export enum SecurityEventStatus {
  /** Event is active and being monitored */
  ACTIVE = 'ACTIVE',
  /** Event has been resolved */
  RESOLVED = 'RESOLVED',
  /** Event was a false alarm */
  FALSE_ALARM = 'FALSE_ALARM',
}

/**
 * A security event stored in the database
 */
export interface SecurityEvent {
  id: string;
  booking_id?: string;
  car_id?: string;
  user_id: string;
  alert_type: BeaconAlertType;
  source_location: {
    latitude: number;
    longitude: number;
  };
  detected_by: string[]; // User IDs of scouts who detected
  status: SecurityEventStatus;
  created_at: string;
  resolved_at?: string;
}

/**
 * A beacon relay record (when a scout detects and reports a beacon)
 */
export interface BeaconRelay {
  id: string;
  security_event_id: string;
  scout_id: string;
  scout_location: {
    latitude: number;
    longitude: number;
  };
  rssi: number; // Signal strength
  relayed_at: string;
}

/**
 * Request payload for the beacon-relay Edge Function
 */
export interface BeaconRelayRequest {
  /** Raw beacon payload (base64 encoded) */
  payload: string;
  /** Scout's current location */
  scout_location: {
    latitude: number;
    longitude: number;
  };
  /** Signal strength of detected beacon */
  rssi: number;
  /** Scout's device ID (for deduplication) */
  device_id: string;
}

/**
 * Response from the beacon-relay Edge Function
 */
export interface BeaconRelayResponse {
  success: boolean;
  event_id?: string;
  message?: string;
  /** Whether this scout earned reward points */
  points_earned?: number;
}

/**
 * Beacon service configuration
 */
export interface BeaconConfig {
  /** Whether beacon mesh is enabled */
  enabled: boolean;
  /** How often to scan (in milliseconds) */
  scanIntervalMs: number;
  /** How long each scan lasts (in milliseconds) */
  scanDurationMs: number;
  /** Whether to show foreground notification on Android */
  showForegroundNotification: boolean;
  /** Notification title for foreground service */
  foregroundNotificationTitle: string;
  /** Notification body for foreground service */
  foregroundNotificationBody: string;
}

/**
 * Default beacon configuration
 */
export const DEFAULT_BEACON_CONFIG: BeaconConfig = {
  enabled: false, // Disabled by default, enable via feature flag
  scanIntervalMs: 5 * 60 * 1000, // 5 minutes
  scanDurationMs: 10 * 1000, // 10 seconds
  showForegroundNotification: true,
  foregroundNotificationTitle: 'AutoRenta Mesh Activo',
  foregroundNotificationBody: 'Protegiendo la comunidad AutoRenta',
};
