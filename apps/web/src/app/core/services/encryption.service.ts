import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * EncryptionService: Secure AES-256-GCM encryption for sensitive tokens
 *
 * Uses Web Crypto API for client-side encryption.
 * Perfect for encrypting MercadoPago tokens before storing in database.
 *
 * Security Properties:
 * - AES-256-GCM: Authenticated encryption (detects tampering)
 * - Random IV per encryption: Prevents pattern attacks
 * - PBKDF2: Strong key derivation (100k iterations)
 * - No external dependencies: Uses native browser crypto
 *
 * Format: [salt(16)] || [iv(12)] || [authTag(16)] || [ciphertext] → Base64
 */
@Injectable({
  providedIn: 'root',
})
export class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly SALT_LENGTH = 16;
  private readonly IV_LENGTH = 12;
  private readonly TAG_LENGTH = 128;
  private readonly PBKDF2_ITERATIONS = 100000;

  constructor() {
    if (!environment.encryptionKey) {
      console.warn(
        'EncryptionService: ENCRYPTION_KEY not found in environment. Tokens will not be encrypted.',
      );
    }
  }

  /**
   * Encrypt plaintext token with AES-256-GCM
   * @param plaintext - Token to encrypt
   * @returns Base64-encoded encrypted data with salt, IV, and authTag
   */
  async encrypt(plaintext: string): Promise<string> {
    try {
      const encryptionKey = environment.encryptionKey;
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not configured');
      }

      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Derive encryption key from master key + salt
      const key = await this.deriveKey(encryptionKey, salt);

      // Convert plaintext to bytes
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);

      // Encrypt with GCM (includes authentication tag)
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        data
      );

      // Combine: salt || iv || encryptedData (which includes authTag)
      const combined = new Uint8Array(
        salt.length + iv.length + encryptedData.byteLength
      );
      combined.set(salt, 0);
      combined.set(iv, salt.length);
      combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

      // Convert to Base64 for storage
      return this.arrayBufferToBase64(combined);
    } catch (error) {
      throw new Error(`Failed to encrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Decrypt encrypted token
   * @param encrypted - Base64-encoded encrypted data
   * @returns Decrypted plaintext token
   */
  async decrypt(encrypted: string): Promise<string> {
    try {
      const encryptionKey = environment.encryptionKey;
      if (!encryptionKey) {
        throw new Error('ENCRYPTION_KEY not configured');
      }

      // Decode from Base64
      const combined = this.base64ToArrayBuffer(encrypted);

      // Extract salt, iv, and ciphertext
      const salt = combined.slice(0, this.SALT_LENGTH);
      const iv = combined.slice(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const ciphertext = combined.slice(this.SALT_LENGTH + this.IV_LENGTH);

      // Derive same key from master key + salt
      const key = await this.deriveKey(encryptionKey, salt);

      // Decrypt
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        ciphertext
      );

      // Convert bytes back to string
      const decoder = new TextDecoder();
      return decoder.decode(decryptedData);
    } catch (error) {
      throw new Error(`Failed to decrypt token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Derive encryption key from master key + salt using PBKDF2
   * @private
   */
  private async deriveKey(
    masterKey: string,
    salt: Uint8Array
  ): Promise<CryptoKey> {
    // Import master key as base key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(masterKey),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive key with PBKDF2
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as BufferSource,
        iterations: this.PBKDF2_ITERATIONS,
        hash: 'SHA-256',
      },
      baseKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH,
      },
      false, // Key cannot be exported
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Convert Uint8Array to Base64 string for storage
   * @private
   */
  private arrayBufferToBase64(buffer: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 string back to Uint8Array
   * @private
   */
  private base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
}
