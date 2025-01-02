/**
 * @fileoverview Family-related interfaces and types for MyFamily platform
 * Implements comprehensive family management with enhanced tracking and customization
 * @version 1.0.0
 */

import { UserRole } from '../../../backend/src/shared/interfaces/user.interface';
import { IFamilyPool } from '../../../backend/src/shared/interfaces/payment.interface';
import { UUID } from 'crypto'; // v20.11.1+

/**
 * Family account status aligned with system status codes
 */
export enum FamilyStatus {
  ACTIVE = 'ACTIVE',           // Fully operational account
  PROCESSING = 'PROCESSING',   // Content being prepared
  SUSPENDED = 'SUSPENDED',     // Payment or compliance hold
  ARCHIVED = 'ARCHIVED',       // Inactive account
  MAINTENANCE = 'MAINTENANCE'  // System upgrade
}

/**
 * Supported languages across the platform
 * Implements multi-language support requirement
 */
export type SupportedLanguages =
  | 'en'    // English
  | 'he'    // Hebrew
  | 'ar'    // Arabic
  | 'ru'    // Russian
  | 'es'    // Spanish
  | 'fr'    // French
  | 'de'    // German
  | 'pt';   // Portuguese

/**
 * Supported currencies for family pool management
 */
export type SupportedCurrencies = 'ILS' | 'USD' | 'EUR' | 'AUD';

/**
 * Gazette delivery frequency options
 */
export enum GazetteFrequency {
  MONTHLY = 'MONTHLY',
  BIMONTHLY = 'BIMONTHLY',
  QUARTERLY = 'QUARTERLY'
}

/**
 * Core family interface with comprehensive tracking capabilities
 */
export interface IFamily {
  id: UUID;                                    // Unique family identifier
  name: string;                                // Family display name
  status: FamilyStatus;                        // Current family status
  members: ReadonlyArray<IFamilyMember>;       // Family member list
  pool: IFamilyPool;                          // Family payment pool
  settings: IFamilySettings;                   // Family preferences
  createdAt: Date;                            // Account creation timestamp
  updatedAt: Date;                            // Last update timestamp
  lastGazetteDate: Date | null;               // Last gazette generation date
}

/**
 * Enhanced family member interface with activity tracking
 */
export interface IFamilyMember {
  id: UUID;                                    // Member identifier
  userId: UUID;                                // Associated user ID
  role: UserRole;                              // Member's role in family
  joinedAt: Date;                              // Membership start date
  lastActiveAt: Date;                          // Last activity timestamp
}

/**
 * Comprehensive family settings interface
 */
export interface IFamilySettings {
  language: SupportedLanguages;                // Primary family language
  timezone: string;                            // Family timezone (IANA format)
  gazetteFrequency: GazetteFrequency;         // Gazette delivery schedule
  autoRenew: boolean;                          // Automatic renewal setting
  contentNotifications: boolean;               // Content update notifications
  preferredCurrency: SupportedCurrencies;      // Family pool currency
}

/**
 * Type guard to check if a string is a valid FamilyStatus
 */
export const isFamilyStatus = (status: string): status is FamilyStatus => {
  return Object.values(FamilyStatus).includes(status as FamilyStatus);
};

/**
 * Type guard to check if a string is a valid SupportedLanguage
 */
export const isSupportedLanguage = (lang: string): lang is SupportedLanguages => {
  return ['en', 'he', 'ar', 'ru', 'es', 'fr', 'de', 'pt'].includes(lang);
};

/**
 * Type guard to check if a string is a valid GazetteFrequency
 */
export const isGazetteFrequency = (freq: string): freq is GazetteFrequency => {
  return Object.values(GazetteFrequency).includes(freq as GazetteFrequency);
};