/**
 * @fileoverview Content data model with comprehensive validation and quality assurance
 * @version 1.0.0
 */

// External imports
import { Schema, model, Document, Model } from 'mongoose'; // ^6.9.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0

// Internal imports
import { Gazette } from '../../../shared/interfaces/gazette.interface';
import { IUser } from '../../../shared/interfaces/user.interface';

// Global constants
export const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'zh'];
export const MAX_CONTENT_SIZE = 10485760; // 10MB
export const MIN_IMAGE_RESOLUTION = 300;
export const PRINT_DPI_REQUIREMENT = 300;
export const COLOR_SPACE_PROFILE = 'Fogra39';

/**
 * Content types supported by the platform
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
 * Image quality metrics interface for print-ready validation
 */
interface ImageQualityMetrics {
  resolution: number;
  colorSpace: string;
  fileSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  aspectRatio: number;
}

/**
 * Print specifications interface aligned with gazette requirements
 */
interface PrintSpecifications {
  dpi: number;
  colorProfile: string;
  bleed: number;
  printSize: {
    width: number;
    height: number;
  };
}

/**
 * Content translation interface supporting multiple languages
 */
interface ContentTranslation {
  language: string;
  text: string;
  translatedAt: Date;
  validatedAt?: Date;
}

/**
 * Content metadata interface for enhanced content management
 */
interface ContentMetadata {
  title?: string;
  description?: string;
  tags: string[];
  location?: {
    latitude: number;
    longitude: number;
    name: string;
  };
  captureDate?: Date;
  originalLanguage: string;
}

/**
 * Core content interface with comprehensive type safety
 */
export interface IContent extends Document {
  id: string;
  type: ContentType;
  url: string;
  creatorId: string;
  familyId: string;
  metadata: ContentMetadata;
  translations: ContentTranslation[];
  status: ContentStatus;
  gazetteIds: string[];
  qualityMetrics?: ImageQualityMetrics;
  printSpecifications?: PrintSpecifications;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Enhanced Mongoose schema for content with comprehensive validation
 */
const contentSchema = new Schema<IContent>({
  id: {
    type: String,
    default: uuidv4,
    unique: true,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(ContentType),
    required: true
  },
  url: {
    type: String,
    required: true,
    validate: {
      validator: (v: string) => /^https?:\/\/.+/.test(v),
      message: 'URL must be a valid HTTP/HTTPS URL'
    }
  },
  creatorId: {
    type: String,
    required: true,
    ref: 'User'
  },
  familyId: {
    type: String,
    required: true,
    ref: 'Family'
  },
  metadata: {
    title: String,
    description: String,
    tags: [String],
    location: {
      latitude: Number,
      longitude: Number,
      name: String
    },
    captureDate: Date,
    originalLanguage: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      required: true
    }
  },
  translations: [{
    language: {
      type: String,
      enum: SUPPORTED_LANGUAGES,
      required: true
    },
    text: {
      type: String,
      required: true
    },
    translatedAt: {
      type: Date,
      default: Date.now
    },
    validatedAt: Date
  }],
  status: {
    type: String,
    enum: Object.values(ContentStatus),
    default: ContentStatus.PENDING
  },
  gazetteIds: [{
    type: String,
    ref: 'Gazette'
  }],
  qualityMetrics: {
    resolution: Number,
    colorSpace: String,
    fileSize: Number,
    dimensions: {
      width: Number,
      height: Number
    },
    aspectRatio: Number
  },
  printSpecifications: {
    dpi: {
      type: Number,
      min: PRINT_DPI_REQUIREMENT
    },
    colorProfile: {
      type: String,
      enum: [COLOR_SPACE_PROFILE]
    },
    bleed: Number,
    printSize: {
      width: Number,
      height: Number
    }
  }
}, {
  timestamps: true,
  versionKey: true
});

// Optimized indexes for frequent queries
contentSchema.index({ familyId: 1, createdAt: -1 });
contentSchema.index({ status: 1, type: 1 });
contentSchema.index({ 'metadata.tags': 1 });
contentSchema.index({ gazetteIds: 1 });

// Validation middleware for image content
contentSchema.pre('save', async function(next) {
  if (this.type === ContentType.PHOTO) {
    if (!this.qualityMetrics || this.qualityMetrics.resolution < MIN_IMAGE_RESOLUTION) {
      throw new Error(`Image resolution must be at least ${MIN_IMAGE_RESOLUTION} DPI`);
    }
    if (this.qualityMetrics.fileSize > MAX_CONTENT_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_CONTENT_SIZE} bytes`);
    }
  }
  next();
});

// Virtual for content age calculation
contentSchema.virtual('age').get(function() {
  return Date.now() - this.createdAt.getTime();
});

// Export the enhanced Mongoose model
export const ContentModel = model<IContent>('Content', contentSchema);