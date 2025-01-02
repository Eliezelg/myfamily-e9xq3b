/**
 * Storage Utility Module
 * Provides secure browser storage operations for MyFamily platform
 * @version 1.0.0
 */

import CryptoJS from 'crypto-js'; // v4.1.1
import { IAuthUser } from '../interfaces/auth.interface';

// Storage configuration constants
const STORAGE_PREFIX = 'myfamily_';
const AUTH_TOKEN_KEY = `${STORAGE_PREFIX}auth_token`;
const USER_PREFERENCES_KEY = `${STORAGE_PREFIX}user_prefs`;
const ENCRYPTION_KEY = process.env.REACT_APP_STORAGE_ENCRYPTION_KEY || 'MyFamily_SecureStorage';

/**
 * Generic storage operation interface for type safety
 */
interface IStorageOperation {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Encrypts data using AES encryption
 * @param data - Data to encrypt
 * @returns Encrypted string
 */
const encryptData = (data: any): string => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
};

/**
 * Decrypts encrypted data
 * @param encryptedData - Encrypted string to decrypt
 * @returns Decrypted data or null if decryption fails
 */
const decryptData = (encryptedData: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, ENCRYPTION_KEY);
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

/**
 * Stores data in browser storage with optional encryption
 * @param key - Storage key
 * @param value - Value to store
 * @param useSession - Use sessionStorage instead of localStorage
 * @param encrypt - Whether to encrypt the data
 */
export const setItem = <T>(
  key: string,
  value: T,
  useSession: boolean = false,
  encrypt: boolean = false
): void => {
  try {
    const storage: IStorageOperation = useSession ? sessionStorage : localStorage;
    const dataToStore = encrypt ? encryptData(value) : JSON.stringify(value);
    storage.setItem(`${STORAGE_PREFIX}${key}`, dataToStore);
  } catch (error) {
    console.error('Storage operation failed:', error);
  }
};

/**
 * Retrieves data from browser storage with automatic decryption if needed
 * @param key - Storage key
 * @param useSession - Use sessionStorage instead of localStorage
 * @param encrypted - Whether the data is encrypted
 * @returns Retrieved data or null if not found
 */
export const getItem = <T>(
  key: string,
  useSession: boolean = false,
  encrypted: boolean = false
): T | null => {
  try {
    const storage: IStorageOperation = useSession ? sessionStorage : localStorage;
    const data = storage.getItem(`${STORAGE_PREFIX}${key}`);
    
    if (!data) return null;
    
    if (encrypted) {
      return decryptData(data);
    }
    
    return JSON.parse(data);
  } catch (error) {
    console.error('Storage retrieval failed:', error);
    return null;
  }
};

/**
 * Removes item from browser storage
 * @param key - Storage key
 * @param useSession - Use sessionStorage instead of localStorage
 */
export const removeItem = (key: string, useSession: boolean = false): void => {
  const storage: IStorageOperation = useSession ? sessionStorage : localStorage;
  storage.removeItem(`${STORAGE_PREFIX}${key}`);
};

/**
 * Stores authentication JWT token securely
 * @param token - JWT token to store
 */
export const setAuthToken = (token: string): void => {
  setItem(AUTH_TOKEN_KEY, token, false, true);
};

/**
 * Retrieves stored authentication token
 * @returns Decrypted JWT token or null if not found
 */
export const getAuthToken = (): string | null => {
  return getItem<string>(AUTH_TOKEN_KEY, false, true);
};

/**
 * Clears all authentication related data from storage
 */
export const clearAuthData = (): void => {
  removeItem(AUTH_TOKEN_KEY);
  removeItem('user');
  sessionStorage.clear();
};

/**
 * Stores user preferences in local storage
 * @param preferences - User preference settings
 */
export const setUserPreferences = (preferences: Record<string, any>): void => {
  const existingPrefs = getItem<Record<string, any>>(USER_PREFERENCES_KEY) || {};
  const updatedPrefs = { ...existingPrefs, ...preferences };
  setItem(USER_PREFERENCES_KEY, updatedPrefs, false, true);
};

/**
 * Retrieves user preferences from storage
 * @returns User preferences or null if not found
 */
export const getUserPreferences = (): Record<string, any> | null => {
  return getItem<Record<string, any>>(USER_PREFERENCES_KEY, false, true);
};

/**
 * Validates storage availability
 * @returns boolean indicating if storage is available
 */
export const isStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Clears all application storage data
 * Use with caution - will remove all stored data
 */
export const clearAllStorage = (): void => {
  localStorage.clear();
  sessionStorage.clear();
};