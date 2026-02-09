/**
 * AutoRenta Mesh - Beacon Services
 *
 * This module provides BLE-based emergency beacon functionality.
 *
 * @example
 * ```typescript
 * import { BeaconService, BeaconProtocol, BeaconMessageType } from '@core/services/beacon';
 *
 * // Initialize the beacon service
 * await beaconService.initialize();
 *
 * // Start broadcasting an SOS
 * await beaconService.startBroadcasting(
 *   BeaconMessageType.SOS,
 *   bookingIdHash,
 *   latitude,
 *   longitude
 * );
 *
 * // Start scanning for nearby beacons
 * await beaconService.startScanning(true); // continuous mode
 * ```
 */

export {
  BeaconService,
  type BeaconMode,
  type BeaconServiceStatus,
  type DetectedBeacon,
} from './beacon.service';
export { BeaconProtocol, BeaconMessageType, type BeaconMessage } from './beacon-protocol';
