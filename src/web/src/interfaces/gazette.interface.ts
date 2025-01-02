/**
 * @fileoverview Defines TypeScript interfaces and types for gazette functionality
 * Version: 1.0.0
 * Print Production Standards Compliant: ISO 216, Fogra39
 */

// External imports
// @ts-ignore - UUID type from crypto module
import { UUID } from 'crypto'; // version: latest

/**
 * Main interface defining the comprehensive structure of a gazette
 * Includes metadata, content references, and layout specifications
 */
export interface IGazette {
    id: UUID;
    familyId: UUID;
    status: GazetteStatus;
    layout: IGazetteLayout;
    contentIds: UUID[];
    generatedUrl: string | null;
    previewUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Enumeration of possible gazette statuses throughout its lifecycle
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
 * Interface defining professional print-ready gazette layout specifications
 * Compliant with commercial printing standards
 */
export interface IGazetteLayout {
    pageSize: PageSize;
    colorSpace: ColorSpace;
    resolution: number;  // DPI
    bleed: number;      // millimeters
    binding: BindingType;
    style: LayoutStyle;
}

/**
 * Supported page sizes (ISO 216 standard)
 * Currently standardized on A4 (210×297mm)
 */
export enum PageSize {
    A4 = 'A4'  // 210×297mm
}

/**
 * Supported color spaces for professional printing
 * Using CMYK with Fogra39 color profile
 */
export enum ColorSpace {
    CMYK = 'CMYK'  // Fogra39 profile
}

/**
 * Supported binding types for gazette production
 */
export enum BindingType {
    PERFECT = 'PERFECT'
}

/**
 * Available gazette layout styles
 */
export enum LayoutStyle {
    CLASSIC = 'CLASSIC',
    MODERN = 'MODERN',
    COMPACT = 'COMPACT'
}

/**
 * Default values for gazette production
 */
export const DEFAULT_RESOLUTION = 300;  // Standard print resolution (DPI)
export const DEFAULT_BLEED = 3;         // Standard bleed margin (mm)
export const DEFAULT_LAYOUT_STYLE = LayoutStyle.CLASSIC;