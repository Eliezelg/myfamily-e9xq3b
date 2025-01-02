/**
 * @fileoverview Core encryption and hashing utilities for MyFamily platform
 * Implements AES-256-GCM encryption and bcrypt hashing for secure data handling
 * @version 1.0.0
 */

import crypto from 'crypto';
// @version 2.4.3
import bcrypt from 'bcryptjs';

// Encryption constants
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_ROUNDS = 12;

/**
 * Encrypts data using AES-256-GCM with a secure initialization vector
 * @param data - Data to encrypt (string or Buffer)
 * @param key - Encryption key
 * @returns Promise resolving to encrypted data and IV
 * @throws Error if encryption fails
 */
export async function encrypt(
  data: string | Buffer,
  key: string
): Promise<{ encryptedData: string; iv: string }> {
  try {
    // Generate random initialization vector
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create cipher with key and IV
    const cipher = crypto.createCipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(key),
      iv
    );

    // Encrypt the data
    const encrypted = Buffer.concat([
      cipher.update(typeof data === 'string' ? Buffer.from(data) : data),
      cipher.final()
    ]);

    // Get auth tag for GCM mode
    const authTag = cipher.getAuthTag();

    // Combine encrypted data with auth tag and convert to base64
    const encryptedData = Buffer.concat([encrypted, authTag]).toString('base64');
    
    return {
      encryptedData,
      iv: iv.toString('base64')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts AES-256-GCM encrypted data using provided key and IV
 * @param encryptedData - Base64 encoded encrypted data
 * @param key - Decryption key
 * @param iv - Base64 encoded initialization vector
 * @returns Promise resolving to decrypted data
 * @throws Error if decryption fails
 */
export async function decrypt(
  encryptedData: string,
  key: string,
  iv: string
): Promise<string> {
  try {
    // Decode the base64 IV and encrypted data
    const decodedIv = Buffer.from(iv, 'base64');
    const encryptedBuffer = Buffer.from(encryptedData, 'base64');

    // Split encrypted data and auth tag
    const authTag = encryptedBuffer.slice(-16);
    const encrypted = encryptedBuffer.slice(0, -16);

    // Create decipher
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      Buffer.from(key),
      decodedIv
    );

    // Set auth tag
    decipher.setAuthTag(authTag);

    // Decrypt the data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString();
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Hashes a password using bcrypt with configurable salt rounds
 * @param password - Password to hash
 * @returns Promise resolving to hashed password
 * @throws Error if hashing fails
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
}

/**
 * Verifies a password against its hash
 * @param password - Password to verify
 * @param hash - Stored password hash
 * @returns Promise resolving to boolean indicating if password matches
 * @throws Error if verification fails
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
}

/**
 * Generates a cryptographically secure random key
 * @param length - Length of the key in bytes
 * @returns Promise resolving to base64 encoded secure random key
 * @throws Error if key generation fails
 */
export async function generateSecureKey(length: number): Promise<string> {
  try {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(length, (err, buffer) => {
        if (err) reject(new Error(`Key generation failed: ${err.message}`));
        resolve(buffer.toString('base64'));
      });
    });
  } catch (error) {
    throw new Error(`Key generation failed: ${error.message}`);
  }
}