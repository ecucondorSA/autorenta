import { BeaconProtocol, BeaconMessageType } from './beacon-protocol';

describe('BeaconProtocol', () => {
  let protocol: BeaconProtocol;

  beforeEach(() => {
    protocol = new BeaconProtocol();
  });

  it('should encode and decode a valid SOS message correctly', () => {
    // Arrange
    const originalMessage = {
      type: BeaconMessageType.SOS,
      bookingIdHash: 'a1b2c3d4e5f67890', // 16 hex chars = 8 bytes
      latitude: -34.603722, // Buenos Aires Obelisco roughly
      longitude: -58.381592,
      timestamp: 1706640000,
    };

    // Act
    const encoded = protocol.encode(originalMessage);
    const decoded = protocol.decode(encoded);

    // Assert
    expect(decoded).not.toBeNull();
    expect(decoded?.type).toBe(originalMessage.type);
    expect(decoded?.bookingIdHash).toBe(originalMessage.bookingIdHash);

    // Float precision might vary slightly, use closeTo
    expect(decoded?.latitude).toBeCloseTo(originalMessage.latitude, 4);
    expect(decoded?.longitude).toBeCloseTo(originalMessage.longitude, 4);

    expect(decoded?.timestamp).toBe(originalMessage.timestamp);
  });

  it('should return null for invalid magic bytes', () => {
    const valid = protocol.encode({
      type: BeaconMessageType.THEFT,
      bookingIdHash: '1111111111111111',
      latitude: 0,
      longitude: 0,
      timestamp: 1000,
    });

    // Corrupt the magic bytes (first 2 bytes)
    valid[0] = 0x00;
    valid[1] = 0x00;

    const decoded = protocol.decode(valid);
    expect(decoded).toBeNull();
  });

  it('should return null for invalid checksum', () => {
    const valid = protocol.encode({
      type: BeaconMessageType.THEFT,
      bookingIdHash: '1111111111111111',
      latitude: 0,
      longitude: 0,
      timestamp: 1000,
    });

    // Corrupt the payload (e.g. latitude)
    valid[11] = 0xff;

    const decoded = protocol.decode(valid);
    expect(decoded).toBeNull();
  });

  it('should handle UUID truncation/padding correctly', () => {
    // Case 1: Too short -> Pad with 0
    const shortHash = 'a1b2';
    const encodedShort = protocol.encode({
      type: BeaconMessageType.SOS,
      bookingIdHash: shortHash,
      latitude: 0,
      longitude: 0,
      timestamp: 0,
    });
    const decodedShort = protocol.decode(encodedShort);
    expect(decodedShort?.bookingIdHash).toBe('a1b2000000000000');

    // Case 2: Too long -> Truncate
    const longHash = 'a1b2c3d4e5f6789012345678';
    const encodedLong = protocol.encode({
      type: BeaconMessageType.SOS,
      bookingIdHash: longHash,
      latitude: 0,
      longitude: 0,
      timestamp: 0,
    });
    const decodedLong = protocol.decode(encodedLong);
    expect(decodedLong?.bookingIdHash).toBe('a1b2c3d4e5f67890');
  });
});
