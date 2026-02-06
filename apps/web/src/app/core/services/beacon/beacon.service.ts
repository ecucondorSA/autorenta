import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';
import { Platform, ToastController } from '@ionic/angular';
import { Capacitor } from '@capacitor/core';
import { SupabaseClientService } from '../infrastructure/supabase-client.service';
import { environment } from '../../../../environments/environment';
import { BeaconProtocol, BeaconMessage, BeaconMessageType } from './beacon-protocol';

// Types from @capgo/capacitor-bluetooth-low-energy
interface BleDevice {
  deviceId: string;
  name: string | null;
  rssi?: number;
  manufacturerData?: string;
  serviceUuids?: string[];
}

interface DeviceScannedEvent {
  device: BleDevice;
}

// Lazy load the BLE plugin to avoid errors on web
let BluetoothLowEnergy: typeof import('@capgo/capacitor-bluetooth-low-energy').BluetoothLowEnergy | null = null;
let KeepAwake: typeof import('@capacitor-community/keep-awake').KeepAwake | null = null;

export type BeaconMode = 'idle' | 'broadcasting' | 'scanning' | 'both';
export type BeaconServiceStatus = 'uninitialized' | 'initializing' | 'ready' | 'error';

export interface DetectedBeacon {
  message: BeaconMessage;
  rssi: number;
  deviceId: string;
  detectedAt: Date;
}

/**
 * BeaconService: Orchestrates BLE advertising and scanning for AutoRenta Mesh
 *
 * Features:
 * - Broadcasting: Emit SOS/THEFT/CRASH signals as BLE advertisements
 * - Scanning: Detect nearby AutoRenta beacons and relay to backend
 * - Platform-aware: Full background on Android, foreground-only on iOS
 * - Battery-optimized: Duty cycling for scanning mode
 */
@Injectable({
  providedIn: 'root',
})
export class BeaconService {
  private readonly protocol = inject(BeaconProtocol);
  private readonly platform = inject(Platform);
  private readonly ngZone = inject(NgZone);
  private readonly supabase = inject(SupabaseClientService);
  private readonly toastCtrl = inject(ToastController);
  private readonly logger = inject(LoggerService);

  // Debug toast counter to track activity
  private deviceCount = 0;

  // State signals
  private readonly _status = signal<BeaconServiceStatus>('uninitialized');
  private readonly _mode = signal<BeaconMode>('idle');
  private readonly _isScanning = signal(false);
  private readonly _isBroadcasting = signal(false);
  private readonly _lastError = signal<string | null>(null);
  private readonly _detectedBeacons = signal<DetectedBeacon[]>([]);

  // Public computed signals
  readonly status = this._status.asReadonly();
  readonly mode = this._mode.asReadonly();
  readonly isScanning = this._isScanning.asReadonly();
  readonly isBroadcasting = this._isBroadcasting.asReadonly();
  readonly lastError = this._lastError.asReadonly();
  readonly detectedBeacons = this._detectedBeacons.asReadonly();

  readonly isReady = computed(() => this._status() === 'ready');
  readonly isAndroid = computed(() => Capacitor.getPlatform() === 'android');
  readonly isIOS = computed(() => Capacitor.getPlatform() === 'ios');
  readonly isNative = computed(() => Capacitor.isNativePlatform());

  // Constants
  private readonly AR_SERVICE_UUID = '0000AABB-0000-1000-8000-00805F9B34FB';
  private readonly AR_CHARACTERISTIC_UUID = '0000AAB1-0000-1000-8000-00805F9B34FB';
  private readonly SCAN_DURATION_MS = 10000; // 10 seconds
  private readonly SCAN_INTERVAL_MS = 300000; // 5 minutes
  private scanIntervalId: ReturnType<typeof setInterval> | null = null;
  private currentBroadcastPayload: Uint8Array | null = null;
  private scanListener: (() => void) | null = null;

  /**
   * Initialize the BLE plugin and request permissions
   * Must be called before any other method
   */
  async initialize(): Promise<boolean> {
    if (!this.isNative()) {
      this.logger.warn('[BeaconService] BLE not available on web platform');
      this._status.set('error');
      this._lastError.set('BLE not available on web');
      return false;
    }

    this._status.set('initializing');

    try {
      // Lazy load plugins
      const bleModule = await import('@capgo/capacitor-bluetooth-low-energy');
      BluetoothLowEnergy = bleModule.BluetoothLowEnergy;

      const keepAwakeModule = await import('@capacitor-community/keep-awake');
      KeepAwake = keepAwakeModule.KeepAwake;

      // Request permissions on Android
      if (this.isAndroid()) {
        await BluetoothLowEnergy.requestPermissions();
      }

      // Initialize in peripheral mode (for broadcasting)
      await BluetoothLowEnergy.initialize({ mode: 'peripheral' });

      this._status.set('ready');
      this.logger.debug('[BeaconService] Initialized successfully');
      this.showDebugToast('✅ BLE Plugin inicializado', 'success');
      return true;
    } catch (error) {
      this.logger.error('[BeaconService] Initialization failed:', error);
      this._status.set('error');
      this._lastError.set(error instanceof Error ? error.message : 'Unknown error');
      this.showDebugToast(`❌ BLE Error: ${error instanceof Error ? error.message : 'Unknown'}`, 'danger');
      return false;
    }
  }

  /**
   * Start broadcasting an emergency beacon
   * On iOS, this also enables keep-awake to maintain foreground state
   */
  async startBroadcasting(
    type: BeaconMessageType,
    bookingIdHash: string,
    latitude: number,
    longitude: number
  ): Promise<boolean> {
    if (!this.isReady() || !BluetoothLowEnergy) {
      this.logger.error('[BeaconService] Not ready to broadcast');
      return false;
    }

    try {
      // Create the beacon message
      const message: BeaconMessage = {
        type,
        bookingIdHash,
        latitude,
        longitude,
        timestamp: Math.floor(Date.now() / 1000),
      };

      // Encode to binary
      const payload = this.protocol.encode(message);
      this.logger.debug('[BeaconService] Broadcasting payload:', this.uint8ArrayToHex(payload));

      // On iOS, keep screen awake
      if (this.isIOS() && KeepAwake) {
        await KeepAwake.keepAwake();
        this.logger.debug('[BeaconService] Keep-awake enabled for iOS');
      }

      // Start Android foreground service for background operation
      if (this.isAndroid()) {
        try {
          await BluetoothLowEnergy.startForegroundService({
            title: 'AutoRenta SOS Activo',
            body: 'Emitiendo señal de emergencia...',
          });
          this.logger.debug('[BeaconService] Foreground service started');
        } catch (fgError) {
          this.logger.warn('[BeaconService] Foreground service not available:', fgError);
        }
      }

      // Store current payload for when devices connect and read
      this.currentBroadcastPayload = payload;

      // Start advertising our service UUID
      // Note: The plugin doesn't support custom manufacturer data in advertisements
      // Scanners will need to connect and read our characteristic to get the beacon data
      await BluetoothLowEnergy.startAdvertising({
        name: `AR-${BeaconMessageType[type]}`,
        services: [this.AR_SERVICE_UUID],
        includeName: true,
      });

      this._isBroadcasting.set(true);
      this._mode.set(this._isScanning() ? 'both' : 'broadcasting');
      this.logger.debug('[BeaconService] Broadcasting started:', BeaconMessageType[type]);

      return true;
    } catch (error) {
      this.logger.error('[BeaconService] Failed to start broadcasting:', error);
      this._lastError.set(error instanceof Error ? error.message : 'Broadcast failed');
      return false;
    }
  }

  /**
   * Stop broadcasting
   */
  async stopBroadcasting(): Promise<void> {
    if (!BluetoothLowEnergy) return;

    try {
      await BluetoothLowEnergy.stopAdvertising();

      // Disable keep-awake on iOS
      if (this.isIOS() && KeepAwake) {
        await KeepAwake.allowSleep();
      }

      // Stop foreground service on Android if not scanning
      if (this.isAndroid() && !this._isScanning()) {
        try {
          await BluetoothLowEnergy.stopForegroundService();
        } catch {
          // Ignore if not available
        }
      }

      this._isBroadcasting.set(false);
      this._mode.set(this._isScanning() ? 'scanning' : 'idle');
      this.logger.debug('[BeaconService] Broadcasting stopped');
    } catch (error) {
      this.logger.error('[BeaconService] Failed to stop broadcasting:', error);
    }
  }

  /**
   * Start scanning for nearby AutoRenta beacons
   * Uses duty cycling to save battery (scan 10s, sleep 5min)
   */
  async startScanning(continuous = false): Promise<boolean> {
    if (!BluetoothLowEnergy) {
      // Try to initialize if not ready
      const initialized = await this.initialize();
      if (!initialized) {
        this.logger.error('[BeaconService] Failed to initialize for scanning');
        return false;
      }
    }

    this.logger.debug('[BeaconService] Starting scan mode...');

    // Ensure plugin is loaded
    if (!BluetoothLowEnergy) {
      this.logger.error('[BeaconService] BLE plugin not loaded after init');
      return false;
    }

    const ble = BluetoothLowEnergy; // TypeScript now knows it's non-null

    // Re-initialize in central mode for scanning
    // Note: This may fail if already broadcasting, which is OK
    try {
      await ble.initialize({ mode: 'central' });
      this.logger.debug('[BeaconService] Initialized in central mode');
    } catch (initError) {
      this.logger.debug('[BeaconService] Central init skipped (may already be active):', initError);
    }

    try {
      // Start foreground service on Android for background scanning
      if (this.isAndroid()) {
        try {
          await ble.startForegroundService({
            title: 'AutoRenta Mesh Activo',
            body: 'Protegiendo la comunidad...',
          });
        } catch {
          // Ignore
        }
      }

      // Set up scan result listener
      const handle = await ble.addListener(
        'deviceScanned',
        (event: DeviceScannedEvent) => {
          this.ngZone.run(() => {
            this.processScannedDevice(event.device);
          });
        }
      );
      this.scanListener = () => handle.remove();

      // Start the scan
      await this.performScan();

      this._isScanning.set(true);
      this._mode.set(this._isBroadcasting() ? 'both' : 'scanning');

      // Set up duty cycling if continuous
      if (continuous) {
        this.scanIntervalId = setInterval(() => {
          this.performScan();
        }, this.SCAN_INTERVAL_MS);
        this.logger.debug('[BeaconService] Continuous scanning enabled (duty cycling)');
      }

      return true;
    } catch (error) {
      this.logger.error('[BeaconService] Failed to start scanning:', error);
      this._lastError.set(error instanceof Error ? error.message : 'Scan failed');
      return false;
    }
  }

  /**
   * Perform a single scan cycle
   */
  private async performScan(): Promise<void> {
    if (!BluetoothLowEnergy) {
      this.logger.error('[BeaconService] ❌ BLE plugin not available for scan!');
      return;
    }

    this.logger.debug('[BeaconService] 📡📡📡 STARTING SCAN CYCLE 📡📡📡');

    try {
      // Start scanning for ALL nearby BLE devices
      // No filters - find everything
      await BluetoothLowEnergy.startScan({
        allowDuplicates: true,
      });

      this.logger.debug('[BeaconService] ✅ SCAN STARTED - Listening for devices...');
      this.deviceCount = 0;
      this.showDebugToast('📡 Escaneando BLE (10s)...', 'primary');

      // Stop after duration
      setTimeout(async () => {
        try {
          await BluetoothLowEnergy?.stopScan();
          this.logger.debug('[BeaconService] ⏹️ Scan cycle complete');
          this.showDebugToast(`⏹️ Scan completo: ${this.deviceCount} dispositivos`, this.deviceCount > 0 ? 'success' : 'warning');
        } catch {
          // Ignore stop errors
        }
      }, this.SCAN_DURATION_MS);
    } catch (error) {
      this.logger.error('[BeaconService] ❌ Scan error:', error);
    }
  }

  /**
   * Process a scanned device and extract AutoRenta beacon data
   * V3: Debug mode - log ALL devices, detect AR-* beacons
   */
  private async processScannedDevice(device: BleDevice): Promise<void> {
    if (!BluetoothLowEnergy) return;

    // DEBUG: Log ALL devices found during scan - OFF for production to save battery
    // this.logger.debug('[BeaconService] 🔍 DEVICE FOUND:', device.name || 'unnamed', 'RSSI:', device.rssi, 'ID:', device.deviceId);
    this.deviceCount++;

    // Show toast for first 3 devices found (avoid spam)
    // if (this.deviceCount <= 3) {
    //   this.showDebugToast(`🔍 #${this.deviceCount}: ${device.name || 'sin nombre'}`, 'primary');
    // }

    // Check if this looks like an AutoRenta beacon (name starts with AR-)
    if (!device.name?.startsWith('AR-')) {
      return;
    }

    this.logger.debug('[BeaconService] 🚨🚨🚨 AUTORENTA BEACON DETECTED! 🚨🚨🚨');
    this.logger.debug('[BeaconService] Device:', device.name, 'RSSI:', device.rssi, 'ID:', device.deviceId);

    // Show prominent toast for AutoRenta beacon
    this.showDebugToast(`🚨 ¡BEACON ${device.name} DETECTADO!`, 'danger');

    // Also try alert for maximum visibility
    try {
      if (typeof alert !== 'undefined') {
        alert(`¡BEACON DETECTADO!\n${device.name}\nRSSI: ${device.rssi}`);
      }
    } catch { /* ignore */ }

    // Extract beacon type from name (e.g., "AR-SOS" -> SOS)
    const typeName = device.name.replace('AR-', '');
    let beaconType: BeaconMessageType = BeaconMessageType.SOS;

    if (typeName === 'THEFT') beaconType = BeaconMessageType.THEFT;
    else if (typeName === 'CRASH') beaconType = BeaconMessageType.CRASH;

    // Create a synthetic beacon message from the advertisement
    // Note: Without GATT connection, we can't get the full payload (location, bookingId)
    // So we use the device ID as a unique identifier
    const message: BeaconMessage = {
      type: beaconType,
      bookingIdHash: device.deviceId.slice(0, 16), // Use device ID as pseudo-hash
      latitude: 0, // Unknown without GATT
      longitude: 0, // Unknown without GATT
      timestamp: Math.floor(Date.now() / 1000),
    };

    const detected: DetectedBeacon = {
      message,
      rssi: device.rssi ?? -100,
      deviceId: device.deviceId,
      detectedAt: new Date(),
    };

    // Add to detected list (deduplicate by deviceId)
    this._detectedBeacons.update((beacons) => {
      const existing = beacons.findIndex(
        (b) => b.deviceId === device.deviceId
      );
      if (existing >= 0) {
        // Update existing
        const updated = [...beacons];
        updated[existing] = detected;
        return updated;
      } else {
        // Add new (keep last 20)
        return [...beacons, detected].slice(-20);
      }
    });

    this.logger.debug('[BeaconService] ✅ Beacon detected and registered:', BeaconMessageType[beaconType]);

    // Relay to backend
    await this.relayToBackend(detected);
  }

  /**
   * Stop scanning
   */
  async stopScanning(): Promise<void> {
    if (this.scanIntervalId) {
      clearInterval(this.scanIntervalId);
      this.scanIntervalId = null;
    }

    // Remove scan listener
    if (this.scanListener) {
      this.scanListener();
      this.scanListener = null;
    }

    if (!BluetoothLowEnergy) return;

    try {
      await BluetoothLowEnergy.stopScan();

      // Stop foreground service if not broadcasting
      if (this.isAndroid() && !this._isBroadcasting()) {
        try {
          await BluetoothLowEnergy.stopForegroundService();
        } catch {
          // Ignore
        }
      }

      this._isScanning.set(false);
      this._mode.set(this._isBroadcasting() ? 'broadcasting' : 'idle');
      this.logger.debug('[BeaconService] Scanning stopped');
    } catch (error) {
      this.logger.error('[BeaconService] Failed to stop scanning:', error);
    }
  }

  /**
   * Relay detected beacon to Supabase backend
   */
  private async relayToBackend(detected: DetectedBeacon): Promise<void> {
    try {
      // Get current scout location
      const position = await this.getCurrentPosition();

      // Re-encode the beacon message for transmission
      const payload = this.protocol.encode(detected.message);
      const payloadBase64 = this.uint8ArrayToBase64(payload);

      // Get access token from Supabase client
      const client = this.supabase.getClient();
      const { data: sessionData } = await client.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        this.logger.warn('[BeaconService] No auth session, skipping relay');
        return;
      }

      // Call the beacon-relay Edge Function
      const response = await fetch(
        `${environment.supabaseUrl}/functions/v1/beacon-relay`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'apikey': environment.supabaseAnonKey,
          },
          body: JSON.stringify({
            payload: payloadBase64,
            scout_location: {
              latitude: position?.coords.latitude ?? 0,
              longitude: position?.coords.longitude ?? 0,
            },
            rssi: detected.rssi,
            device_id: detected.deviceId,
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        this.logger.debug('[BeaconService] Relay successful:', result);
        if (result.points_earned) {
          this.logger.info(`[BeaconService] Scout earned ${result.points_earned} points!`);
        }
      } else {
        this.logger.error('[BeaconService] Relay failed:', result.error);
      }
    } catch (error) {
      this.logger.error('[BeaconService] Relay error:', error);
    }
  }

  /**
   * Get current GPS position
   */
  private getCurrentPosition(): Promise<GeolocationPosition | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  }

  /**
   * Cleanup on service destroy
   */
  async destroy(): Promise<void> {
    await this.stopBroadcasting();
    await this.stopScanning();
  }

  // --- Utility methods ---

  /**
   * Show a debug toast notification for visual feedback
   */
  private async showDebugToast(message: string, color: 'success' | 'warning' | 'danger' | 'primary' = 'primary'): Promise<void> {
    try {
      const toast = await this.toastCtrl.create({
        message,
        duration: 2000,
        position: 'top',
        color,
        cssClass: 'beacon-debug-toast',
      });
      await toast.present();
    } catch {
      // Ignore toast errors
    }
  }

  private uint8ArrayToHex(arr: Uint8Array): string {
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private uint8ArrayToBase64(arr: Uint8Array): string {
    return btoa(String.fromCharCode(...arr));
  }

  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
