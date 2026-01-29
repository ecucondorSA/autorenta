#!/usr/bin/env node

/**
 * Cookie Encryption/Decryption Helper
 * 
 * Encripta y desencripta cookies de sesión antes de guardar en Supabase
 */

import crypto from 'crypto';
import 'dotenv/config';
import fs from 'fs/promises';

const ENCRYPTION_KEY = process.env.COOKIE_ENCRYPTION_KEY || 'autorenta-marketing-2026-secret-key-32chars!';
const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Deriva una key de 32 bytes desde string
 */
function deriveKey(password) {
    return crypto.createHash('sha256').update(password).digest();
}

/**
 * Encripta cookies
 */
export function encryptCookies(cookies) {
    try {
        const key = deriveKey(ENCRYPTION_KEY);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        const cookiesString = JSON.stringify(cookies);
        let encrypted = cipher.update(cookiesString, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Combinar IV + encrypted data
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
}

/**
 * Desencripta cookies
 */
export function decryptCookies(encryptedData) {
    try {
        const key = deriveKey(ENCRYPTION_KEY);
        const parts = encryptedData.split(':');

        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return JSON.parse(decrypted);
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
}

/**
 * Encripta archivo de cookies
 */
async function encryptCookiesFile(inputPath, outputPath) {
    try {
        const cookiesData = await fs.readFile(inputPath, 'utf-8');
        const cookies = JSON.parse(cookiesData);

        const encrypted = encryptCookies(cookies);

        if (outputPath) {
            await fs.writeFile(outputPath, encrypted, 'utf-8');
            console.log(`✅ Encrypted cookies saved to: ${outputPath}`);
        }

        return encrypted;
    } catch (error) {
        throw new Error(`Failed to encrypt file: ${error.message}`);
    }
}

/**
 * Desencripta archivo de cookies
 */
async function decryptCookiesFile(inputPath, outputPath) {
    try {
        const encryptedData = await fs.readFile(inputPath, 'utf-8');
        const cookies = decryptCookies(encryptedData);

        if (outputPath) {
            await fs.writeFile(outputPath, JSON.stringify(cookies, null, 2), 'utf-8');
            console.log(`✅ Decrypted cookies saved to: ${outputPath}`);
        }

        return cookies;
    } catch (error) {
        throw new Error(`Failed to decrypt file: ${error.message}`);
    }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    const inputPath = process.argv[3];
    const outputPath = process.argv[4];

    if (!command || !inputPath) {
        console.log(`
Usage:
  node encrypt-cookies.js encrypt <input.json> [output.txt]
  node encrypt-cookies.js decrypt <input.txt> [output.json]

Examples:
  # Encrypt cookies
  node encrypt-cookies.js encrypt cookies/persona-001.json cookies/persona-001.encrypted

  # Decrypt cookies
  node encrypt-cookies.js decrypt cookies/persona-001.encrypted cookies/persona-001-decrypted.json

Environment Variables:
  COOKIE_ENCRYPTION_KEY - Custom encryption key (default: built-in key)
    `);
        process.exit(1);
    }

    const execute = async () => {
        try {
            if (command === 'encrypt') {
                const encrypted = await encryptCookiesFile(inputPath, outputPath);
                if (!outputPath) {
                    console.log('\nEncrypted data:');
                    console.log(encrypted);
                }
            } else if (command === 'decrypt') {
                const cookies = await decryptCookiesFile(inputPath, outputPath);
                if (!outputPath) {
                    console.log('\nDecrypted cookies:');
                    console.log(JSON.stringify(cookies, null, 2));
                }
            } else {
                console.error(`❌ Unknown command: ${command}`);
                process.exit(1);
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    };

    execute();
}
