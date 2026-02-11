import { Injectable, inject, signal, computed } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';

// Web Bluetooth API type declarations (not in standard TypeScript lib yet)
declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
    };
  }

  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
    acceptAllDevices?: boolean;
  }

  interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }

  type BluetoothServiceUUID = string | number;

  interface BluetoothDevice extends EventTarget {
    id: string;
    name?: string;
    gatt?: BluetoothRemoteGATTServer;
    addEventListener(type: 'gattserverdisconnected', listener: () => void): void;
  }

  interface BluetoothRemoteGATTServer {
    device: BluetoothDevice;
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(service: BluetoothServiceUUID): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    device: BluetoothDevice;
    uuid: string;
    isPrimary: boolean;
    getCharacteristic(
      characteristic: BluetoothServiceUUID,
    ): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  interface BluetoothRemoteGATTCharacteristic {
    service: BluetoothRemoteGATTService;
    uuid: string;
    properties: BluetoothCharacteristicProperties;
    value?: DataView;
    readValue(): Promise<DataView>;
    writeValue(value: BufferSource): Promise<void>;
  }

  interface BluetoothCharacteristicProperties {
    broadcast: boolean;
    read: boolean;
    writeWithoutResponse: boolean;
    write: boolean;
    notify: boolean;
    indicate: boolean;
    authenticatedSignedWrites: boolean;
    reliableWrite: boolean;
    writableAuxiliaries: boolean;
  }
}

export type BluetoothConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';
export type LockState = 'locked' | 'unlocking' | 'unlocked' | 'locking';

@Injectable({
  providedIn: 'root',
})
export class BluetoothKeyService {
  private readonly logger = inject(LoggerService);

  // Signals
  connectionState = signal<BluetoothConnectionState>('disconnected');
  lockState = signal<LockState>('locked');
  batteryLevel = signal<number | null>(null);
  deviceName = signal<string | null>(null);
  error = signal<string | null>(null);

  // Computed
  isConnected = computed(() => this.connectionState() === 'connected');

  // Internal state
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;

  // Standard BLE Services (Simulated for this demo, would be specific per manufacturer)
  private readonly SERVICE_UUID = '00001802-0000-1000-8000-00805f9b34fb'; // Immediate Alert or Custom
  private readonly CHARACTERISTIC_UUID = '00002a06-0000-1000-8000-00805f9b34fb'; // Alert Level

  async connect() {
    this.error.set(null);
    this.connectionState.set('connecting');

    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth is not available in this browser.');
      }

      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['battery_service'] }], // Placeholder: typically manufacturer specific
        optionalServices: [this.SERVICE_UUID, 'battery_service'],
        acceptAllDevices: false,
      });

      if (!this.device) {
        throw new Error('No device selected');
      }

      this.device.addEventListener('gattserverdisconnected', this.disconnectHandler);
      this.server = await this.device.gatt!.connect();

      this.deviceName.set(this.device.name || 'Unknown Car');
      this.connectionState.set('connected');

      // Read initial battery if available
      this.readBatteryLevel();
    } catch (err: unknown) {
      console.error('Bluetooth connection failed', err);
      const message = err instanceof Error ? err.message : String(err);
      this.error.set(message || 'Connection failed');
      this.connectionState.set('error');
    }
  }

  disconnect() {
    if (this.device) {
      this.device.removeEventListener('gattserverdisconnected', this.disconnectHandler);
      if (this.device.gatt?.connected) {
        this.device.gatt.disconnect();
      }
    }
    this.handleDisconnection();
  }

  async toggleLock() {
    if (!this.isConnected()) {
      this.error.set('Not connected to vehicle');
      return;
    }

    const currentState = this.lockState();
    const newState = currentState === 'locked' ? 'unlocked' : 'locked';
    const transitionState = currentState === 'locked' ? 'unlocking' : 'locking';

    this.lockState.set(transitionState);

    try {
      // Simulate hardware delay / GATT write
      // In real implementation: await characteristic.writeValue(command);
      await new Promise((resolve) => setTimeout(resolve, 1500));

      this.lockState.set(newState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.error.set('Failed to toggle lock: ' + message);
      this.lockState.set(currentState); // Revert
    }
  }

  private readonly disconnectHandler = () => this.handleDisconnection();

  private handleDisconnection() {
    this.connectionState.set('disconnected');
    this.deviceName.set(null);
    this.device = null;
    this.server = null;
  }

  private async readBatteryLevel() {
    try {
      if (!this.server) return;
      const service = await this.server.getPrimaryService('battery_service');
      const characteristic = await service.getCharacteristic('battery_level');
      const value = await characteristic.readValue();
      const level = value.getUint8(0);
      this.batteryLevel.set(level);
    } catch (e) {
      this.logger.warn('Could not read battery level', 'BluetoothKeyService', e);
    }
  }
}
