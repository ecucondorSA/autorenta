/**
 * WebAuthn/Passkeys Utilities for Supabase Edge Functions
 *
 * Implementación usando Web Crypto API nativo de Deno
 * Compatible con @simplewebauthn/browser en el frontend
 */

// ============================================
// TYPES
// ============================================

export interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout?: number;
  excludeCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: AuthenticatorTransport[];
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    residentKey?: 'discouraged' | 'preferred' | 'required';
    requireResidentKey?: boolean;
    userVerification?: 'required' | 'preferred' | 'discouraged';
  };
  attestation?: 'none' | 'indirect' | 'direct' | 'enterprise';
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string;
    type: 'public-key';
    transports?: AuthenticatorTransport[];
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

export type AuthenticatorTransport = 'usb' | 'ble' | 'nfc' | 'internal' | 'hybrid';

export interface RegistrationCredentialJSON {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    clientDataJSON: string;
    attestationObject: string;
    transports?: AuthenticatorTransport[];
  };
  clientExtensionResults: Record<string, unknown>;
  authenticatorAttachment?: 'platform' | 'cross-platform';
}

export interface AuthenticationCredentialJSON {
  id: string;
  rawId: string;
  type: 'public-key';
  response: {
    clientDataJSON: string;
    authenticatorData: string;
    signature: string;
    userHandle?: string;
  };
  clientExtensionResults: Record<string, unknown>;
  authenticatorAttachment?: 'platform' | 'cross-platform';
}

export interface PasskeyRecord {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string | null;
  transports: string[] | null;
  device_name: string | null;
  last_used_at: string | null;
  created_at: string;
}

// ============================================
// CONFIGURATION
// ============================================

export const RP_NAME = 'Autorentar';
export const RP_ID = Deno.env.get('WEBAUTHN_RP_ID') || 'autorentar.com';
export const ORIGIN = Deno.env.get('WEBAUTHN_ORIGIN') || 'https://autorentar.com';

// En desarrollo, permitir localhost
const ALLOWED_ORIGINS = [
  'https://autorentar.com',
  'https://www.autorentar.com',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
];

// ============================================
// BASE64URL UTILITIES
// ============================================

export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(base64url: string): Uint8Array {
  const base64 = base64url
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const padLength = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(padLength);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ============================================
// CHALLENGE GENERATION
// ============================================

export function generateChallenge(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return base64UrlEncode(buffer);
}

// ============================================
// REGISTRATION OPTIONS
// ============================================

export interface GenerateRegistrationOptionsParams {
  userId: string;
  userName: string;
  userDisplayName: string;
  excludeCredentialIds?: string[];
}

export function generateRegistrationOptions(
  params: GenerateRegistrationOptionsParams
): PublicKeyCredentialCreationOptionsJSON {
  const { userId, userName, userDisplayName, excludeCredentialIds = [] } = params;

  const challenge = generateChallenge();

  const options: PublicKeyCredentialCreationOptionsJSON = {
    challenge,
    rp: {
      name: RP_NAME,
      id: RP_ID,
    },
    user: {
      id: base64UrlEncode(new TextEncoder().encode(userId)),
      name: userName,
      displayName: userDisplayName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },   // ES256 (ECDSA w/ SHA-256)
      { type: 'public-key', alg: -257 }, // RS256 (RSASSA-PKCS1-v1_5 w/ SHA-256)
    ],
    timeout: 60000, // 60 segundos
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
    attestation: 'none', // No necesitamos attestation para este caso de uso
  };

  // Excluir credenciales existentes para evitar registros duplicados
  if (excludeCredentialIds.length > 0) {
    options.excludeCredentials = excludeCredentialIds.map((id) => ({
      id,
      type: 'public-key' as const,
      transports: ['internal', 'hybrid'] as AuthenticatorTransport[],
    }));
  }

  return options;
}

// ============================================
// AUTHENTICATION OPTIONS
// ============================================

export interface GenerateAuthenticationOptionsParams {
  allowCredentialIds?: string[];
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

export function generateAuthenticationOptions(
  params: GenerateAuthenticationOptionsParams = {}
): PublicKeyCredentialRequestOptionsJSON {
  const { allowCredentialIds = [], userVerification = 'preferred' } = params;

  const challenge = generateChallenge();

  const options: PublicKeyCredentialRequestOptionsJSON = {
    challenge,
    timeout: 60000,
    rpId: RP_ID,
    userVerification,
  };

  if (allowCredentialIds.length > 0) {
    options.allowCredentials = allowCredentialIds.map((id) => ({
      id,
      type: 'public-key' as const,
      transports: ['internal', 'hybrid'] as AuthenticatorTransport[],
    }));
  }

  return options;
}

// ============================================
// VERIFICATION UTILITIES
// ============================================

interface ClientData {
  type: string;
  challenge: string;
  origin: string;
  crossOrigin?: boolean;
}

export function parseClientDataJSON(clientDataJSON: string): ClientData {
  const json = new TextDecoder().decode(base64UrlDecode(clientDataJSON));
  return JSON.parse(json);
}

export function verifyClientData(
  clientData: ClientData,
  expectedChallenge: string,
  expectedType: 'webauthn.create' | 'webauthn.get'
): { verified: boolean; error?: string } {
  // Verificar tipo
  if (clientData.type !== expectedType) {
    return { verified: false, error: `Invalid type: expected ${expectedType}, got ${clientData.type}` };
  }

  // Verificar challenge
  if (clientData.challenge !== expectedChallenge) {
    return { verified: false, error: 'Challenge mismatch' };
  }

  // Verificar origin
  if (!ALLOWED_ORIGINS.includes(clientData.origin)) {
    return { verified: false, error: `Invalid origin: ${clientData.origin}` };
  }

  return { verified: true };
}

// ============================================
// ATTESTATION PARSING (Simplified)
// ============================================

interface ParsedAttestationObject {
  fmt: string;
  authData: Uint8Array;
  attStmt: Record<string, unknown>;
}

export function parseAttestationObject(attestationObjectB64: string): ParsedAttestationObject {
  const attestationObject = base64UrlDecode(attestationObjectB64);

  // CBOR decoding (simplified - only handles our expected format)
  // For production, use a proper CBOR library
  const decoded = decodeCBOR(attestationObject);

  return {
    fmt: decoded.fmt as string,
    authData: decoded.authData as Uint8Array,
    attStmt: decoded.attStmt as Record<string, unknown>,
  };
}

// Simplified CBOR decoder for WebAuthn attestation objects
function decodeCBOR(data: Uint8Array): Record<string, unknown> {
  let offset = 0;

  function readByte(): number {
    return data[offset++];
  }

  function readBytes(length: number): Uint8Array {
    const bytes = data.slice(offset, offset + length);
    offset += length;
    return bytes;
  }

  function decode(): unknown {
    const byte = readByte();
    const majorType = byte >> 5;
    const additionalInfo = byte & 0x1f;

    // Read length
    let length: number;
    if (additionalInfo < 24) {
      length = additionalInfo;
    } else if (additionalInfo === 24) {
      length = readByte();
    } else if (additionalInfo === 25) {
      length = (readByte() << 8) | readByte();
    } else if (additionalInfo === 26) {
      length = (readByte() << 24) | (readByte() << 16) | (readByte() << 8) | readByte();
    } else {
      throw new Error(`Unsupported CBOR additional info: ${additionalInfo}`);
    }

    switch (majorType) {
      case 0: // Unsigned integer
        return length;
      case 2: // Byte string
        return readBytes(length);
      case 3: // Text string
        return new TextDecoder().decode(readBytes(length));
      case 4: { // Array
        const arr: unknown[] = [];
        for (let i = 0; i < length; i++) {
          arr.push(decode());
        }
        return arr;
      }
      case 5: { // Map
        const map: Record<string, unknown> = {};
        for (let i = 0; i < length; i++) {
          const key = decode() as string;
          const value = decode();
          map[key] = value;
        }
        return map;
      }
      default:
        throw new Error(`Unsupported CBOR major type: ${majorType}`);
    }
  }

  return decode() as Record<string, unknown>;
}

// ============================================
// AUTH DATA PARSING
// ============================================

interface ParsedAuthData {
  rpIdHash: Uint8Array;
  flags: {
    userPresent: boolean;
    userVerified: boolean;
    attestedCredentialData: boolean;
    extensionData: boolean;
  };
  counter: number;
  attestedCredentialData?: {
    aaguid: Uint8Array;
    credentialId: Uint8Array;
    credentialPublicKey: Uint8Array;
  };
}

export function parseAuthData(authData: Uint8Array): ParsedAuthData {
  let offset = 0;

  // RP ID Hash (32 bytes)
  const rpIdHash = authData.slice(offset, offset + 32);
  offset += 32;

  // Flags (1 byte)
  const flagsByte = authData[offset++];
  const flags = {
    userPresent: !!(flagsByte & 0x01),
    userVerified: !!(flagsByte & 0x04),
    attestedCredentialData: !!(flagsByte & 0x40),
    extensionData: !!(flagsByte & 0x80),
  };

  // Counter (4 bytes, big-endian)
  const counter = (authData[offset] << 24) | (authData[offset + 1] << 16) |
                  (authData[offset + 2] << 8) | authData[offset + 3];
  offset += 4;

  const result: ParsedAuthData = { rpIdHash, flags, counter };

  // Attested Credential Data (optional)
  if (flags.attestedCredentialData) {
    // AAGUID (16 bytes)
    const aaguid = authData.slice(offset, offset + 16);
    offset += 16;

    // Credential ID Length (2 bytes, big-endian)
    const credentialIdLength = (authData[offset] << 8) | authData[offset + 1];
    offset += 2;

    // Credential ID
    const credentialId = authData.slice(offset, offset + credentialIdLength);
    offset += credentialIdLength;

    // Credential Public Key (COSE format, rest of authData minus extensions)
    const credentialPublicKey = authData.slice(offset);

    result.attestedCredentialData = {
      aaguid,
      credentialId,
      credentialPublicKey,
    };
  }

  return result;
}

// ============================================
// SIGNATURE VERIFICATION
// ============================================

export async function verifySignature(
  publicKeyB64: string,
  signatureB64: string,
  dataToVerify: Uint8Array
): Promise<boolean> {
  try {
    const publicKeyBytes = base64UrlDecode(publicKeyB64);
    const signature = base64UrlDecode(signatureB64);

    // Parse COSE public key and import
    const cryptoKey = await importCOSEPublicKey(publicKeyBytes);

    // Verify signature
    const verified = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      cryptoKey,
      signature,
      dataToVerify
    );

    return verified;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

async function importCOSEPublicKey(coseKey: Uint8Array): Promise<CryptoKey> {
  // Parse COSE key (simplified for ES256)
  const decoded = decodeCBOR(coseKey) as Record<number, unknown>;

  // COSE key parameters for ES256
  // 1: kty (key type) = 2 (EC)
  // 3: alg = -7 (ES256)
  // -1: crv = 1 (P-256)
  // -2: x coordinate
  // -3: y coordinate

  const x = decoded[-2] as Uint8Array;
  const y = decoded[-3] as Uint8Array;

  // Create uncompressed EC point (0x04 || x || y)
  const publicKeyRaw = new Uint8Array(65);
  publicKeyRaw[0] = 0x04;
  publicKeyRaw.set(x, 1);
  publicKeyRaw.set(y, 33);

  // Import as CryptoKey
  return crypto.subtle.importKey(
    'raw',
    publicKeyRaw,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );
}

// ============================================
// HELPERS
// ============================================

export function getDeviceType(
  authenticatorAttachment?: 'platform' | 'cross-platform'
): string {
  if (authenticatorAttachment === 'platform') {
    return 'platform'; // Built-in (Touch ID, Face ID, Windows Hello)
  }
  if (authenticatorAttachment === 'cross-platform') {
    return 'cross-platform'; // Security key, phone as authenticator
  }
  return 'unknown';
}

export function generateDeviceName(userAgent?: string): string {
  if (!userAgent) return 'Dispositivo desconocido';

  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('Linux')) return 'Linux';

  return 'Dispositivo';
}
