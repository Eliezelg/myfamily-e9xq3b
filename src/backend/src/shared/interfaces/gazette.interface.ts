/**
 * @fileoverview Defines comprehensive interfaces and types for gazette functionality
 * @version 1.0.0
 */

// External imports
// crypto@latest - Type-safe unique identifier implementation
import { UUID } from 'crypto';

/**
 * Represents the complete lifecycle states of a gazette
 */
export enum GazetteStatus {
  DRAFT = 'DRAFT',
  PROCESSING = 'PROCESSING',
  READY_FOR_PRINT = 'READY_FOR_PRINT',
  PRINTING = 'PRINTING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  ERROR = 'ERROR'
}

/**
 * ISO 216 standard compliant page sizes
 */
export enum PageSize {
  A4 = 'A4' // 210×297mm
}

/**
 * Professional print color space using Fogra39 profile
 */
export enum ColorSpace {
  CMYK = 'CMYK'
}

/**
 * Professional binding specifications for durability
 */
export enum BindingType {
  PERFECT = 'PERFECT'
}

/**
 * Global constants for print specifications
 */
export const DEFAULT_RESOLUTION = 300; // DPI
export const DEFAULT_BLEED = 3; // mm

/**
 * Comprehensive layout specifications for print-ready gazette production
 */
export interface GazetteLayout {
  /**
   * ISO 216 standard page size
   */
  pageSize: PageSize;

  /**
   * Professional print color space specification
   */
  colorSpace: ColorSpace;

  /**
   * Print resolution in DPI (minimum 300)
   */
  resolution: number;

  /**
   * Bleed area in millimeters
   */
  bleed: number;

  /**
   * Professional binding type
   */
  binding: BindingType;
}

/**
 * Core interface defining the complete structure of a gazette
 */
export interface Gazette {
  /**
   * Unique identifier for the gazette
   */
  id: UUID;

  /**
   * Reference to the owning family
   */
  familyId: UUID;

  /**
   * Current status in the gazette lifecycle
   */
  status: GazetteStatus;

  /**
   * Print-ready layout specifications
   */
  layout: GazetteLayout;

  /**
   * References to included content items
   */
  contentIds: UUID[];

  /**
   * URL to the generated gazette PDF (null if not yet generated)
   */
  generatedUrl: string | null;

  /**
   * Timestamp of gazette creation
   */
  createdAt: Date;

  /**
   * Timestamp of last gazette update
   */
  updatedAt: Date;
}