/**
 * @fileoverview Content-related TypeScript interfaces for MyFamily platform
 * @version 1.0.0
 */

// External imports
// Using native crypto UUID type for content identifiers
import { UUID } from 'crypto'; // version: latest

/**
 * Supported content types in the platform
 */
export enum ContentType {
    PHOTO = 'PHOTO',
    TEXT = 'TEXT'
}

/**
 * Content processing status states
 */
export enum ContentStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    READY = 'READY',
    ERROR = 'ERROR'
}

/**
 * Global constants for content validation
 */
export const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'zh'] as const;
export const MAX_CONTENT_SIZE = 10485760; // 10MB in bytes
export const MIN_IMAGE_RESOLUTION = 300; // DPI
export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/tiff'] as const;
export const SUPPORTED_COLOR_SPACES = ['RGB', 'CMYK'] as const;
export const MIN_IMAGE_QUALITY = 85;

/**
 * Interface for content metadata with print-ready requirements
 */
export interface IContentMetadata {
    description: string;
    originalLanguage: typeof SUPPORTED_LANGUAGES[number];
    width: number;
    height: number;
    size: number;
    mimeType: typeof SUPPORTED_MIME_TYPES[number];
    dpi: number;
    colorSpace: typeof SUPPORTED_COLOR_SPACES[number];
    quality: number;
}

/**
 * Interface for content translations with status tracking
 */
export interface IContentTranslation {
    language: typeof SUPPORTED_LANGUAGES[number];
    description: string;
    status: 'PENDING' | 'COMPLETED' | 'ERROR';
    lastUpdated: Date;
}

/**
 * Main content interface with enhanced validation and print readiness tracking
 */
export interface IContent {
    /** Unique identifier for the content */
    id: UUID;
    
    /** Type of content (photo or text) */
    type: ContentType;
    
    /** URL to access the content */
    url: string;
    
    /** ID of the user who created the content */
    creatorId: UUID;
    
    /** ID of the family this content belongs to */
    familyId: UUID;
    
    /** Detailed metadata about the content */
    metadata: IContentMetadata;
    
    /** Available translations for the content */
    translations: IContentTranslation[];
    
    /** Current processing status */
    status: ContentStatus;
    
    /** IDs of gazettes where this content appears */
    gazetteIds: UUID[];
    
    /** Content creation timestamp */
    createdAt: Date;
    
    /** Last update timestamp */
    updatedAt: Date;
    
    /** Array of processing error messages if any */
    processingErrors: string[];
    
    /** Flag indicating if content meets print requirements */
    printReady: boolean;
}