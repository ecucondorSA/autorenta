import { Injectable, inject } from '@angular/core';
import { LoggerService } from '@core/services/infrastructure/logger.service';

export enum BeaconMessageType {
  SOS = 0x01,
  THEFT = 0x02,
  CRASH = 0x03,
}

export interface BeaconMessage {
  type: BeaconMessageType;
  bookingIdHash: string; // 8 bytes hex representation
  latitude: number;
  longitude: number;
  timestamp: number;
}

/**
 * AR-Protocol: AutoRenta Binary Protocol for BLE Advertising
 * Optimized for < 27 bytes payload to fit in Legacy Advertising Packets
 *
 * Structure (25 Bytes):
 * [0-1]   Magic 'AR' (0x41 0x52)
 * [2]     Type (0x01=SOS, 0x02=THEFT, 0x03=CRASH)
 * [3-10]  Booking ID Hash (First 8 bytes of UUID)
 * [11-14] Latitude (Float32)
 * [15-18] Longitude (Float32)
 * [19-22] Timestamp (Uint32 - Epoch Seconds)
 * [23-24] CRC16 (Checksum)
 */
@Injectable({
  providedIn: 'root',
})
export class BeaconProtocol {
  private readonly logger = inject(LoggerService);
  private readonly MAGIC_BYTE_1 = 0x41; // 'A'
  private readonly MAGIC_BYTE_2 = 0x52; // 'R'

  /**
   * Encodes a message into a raw Uint8Array (byte array)
   */
  encode(message: BeaconMessage): Uint8Array {
    const buffer = new ArrayBuffer(25);
    const view = new DataView(buffer);

    // 1. Magic Bytes (Offset 0-1)
    view.setUint8(0, this.MAGIC_BYTE_1);
    view.setUint8(1, this.MAGIC_BYTE_2);

    // 2. Type (Offset 2)
    view.setUint8(2, message.type);

    // 3. Booking ID Hash (Offset 3-10) - 8 Bytes
    // Assuming input is a hex string. We pad or truncate to ensure 8 bytes (16 hex chars).
    const idBytes = this.hexToBytes(message.bookingIdHash.padEnd(16, '0').slice(0, 16));
    for (let i = 0; i < 8; i++) {
      view.setUint8(3 + i, idBytes[i] ?? 0);
    }

    // 4. Coordinates (Offset 11-18) - Float32
    view.setFloat32(11, message.latitude);
    view.setFloat32(15, message.longitude);

    // 5. Timestamp (Offset 19-22) - Uint32
    view.setUint32(19, message.timestamp);

    // 6. CRC16 (Offset 23-24)
    // Calculate CRC over the first 23 bytes
    const payloadForCrc = new Uint8Array(buffer, 0, 23);
    const crc = this.calculateCRC16(payloadForCrc);
    view.setUint16(23, crc);

    return new Uint8Array(buffer);
  }

  /**
   * Decodes a raw byte array into a structured message
   * Returns null if invalid magic bytes or checksum failure
   */
  decode(data: Uint8Array | DataView): BeaconMessage | null {
    const view =
      data instanceof DataView ? data : new DataView(data.buffer, data.byteOffset, data.byteLength);

    if (view.byteLength < 25) {
      this.logger.warn('Packet too short', 'BeaconProtocol', view.byteLength);
      return null;
    }

    // 1. Validate Magic Bytes
    if (view.getUint8(0) !== this.MAGIC_BYTE_1 || view.getUint8(1) !== this.MAGIC_BYTE_2) {
      // Not an AutoRenta packet
      return null;
    }

    // 2. Validate CRC
    const storedCrc = view.getUint16(23);
    const payloadForCrc = new Uint8Array(view.buffer, view.byteOffset, 23);
    const calculatedCrc = this.calculateCRC16(payloadForCrc);

    if (storedCrc !== calculatedCrc) {
      this.logger.warn('Invalid Checksum', 'BeaconProtocol');
      return null;
    }

    // 3. Decode Fields
    const type = view.getUint8(2) as BeaconMessageType;

    // Decode ID Hash
    const idBytes = new Uint8Array(view.buffer, view.byteOffset + 3, 8);
    const bookingIdHash = this.bytesToHex(idBytes);

    const latitude = view.getFloat32(11);
    const longitude = view.getFloat32(15);
    const timestamp = view.getUint32(19);

    return {
      type,
      bookingIdHash,
      latitude,
      longitude,
      timestamp,
    };
  }

  // --- Helpers ---

  /**
   * Standard CRC-16-CCITT implementation
   */
  private calculateCRC16(data: Uint8Array): number {
    let crc = 0xffff;
    const polynomial = 0x1021;

    for (let i = 0; i < data.length; i++) {
      crc ^= data[i] << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) {
          crc = (crc << 1) ^ polynomial;
        } else {
          crc = crc << 1;
        }
      }
    }
    return crc & 0xffff;
  }

  private hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(Math.ceil(hex.length / 2));
    for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
    return bytes;
  }

  private bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
}
