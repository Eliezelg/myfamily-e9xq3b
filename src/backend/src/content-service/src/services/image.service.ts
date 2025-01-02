import sharp from 'sharp'; // ^0.31.0
import { injectable } from 'inversify';
import { sharpConfig } from '../config/sharp.config';
import { StorageService } from './storage.service';
import { Logger } from '../../../shared/utils/logger.util';
import { WorkerPool } from '../utils/worker.pool';

// Constants for image processing
const MAX_IMAGE_DIMENSION = 4096;
const MIN_IMAGE_DIMENSION = 100;
const SUPPORTED_FORMATS = ['jpeg', 'jpg', 'png', 'webp'];
const QUALITY_THRESHOLDS = {
  web: 85,
  print: 95,
  minimum: 70
};

/**
 * Interface for image processing options
 */
interface ImageProcessingOptions {
  format: string;
  width?: number;
  height?: number;
  forPrint: boolean;
  quality?: number;
  withBleed?: boolean;
  iccProfile?: string;
}

/**
 * Interface for processed image result
 */
interface ProcessedImage {
  data: Buffer;
  format: string;
  width: number;
  height: number;
  quality: number;
  metadata: {
    dpi?: number;
    colorSpace?: string;
    profile?: string;
    size: number;
  };
}

/**
 * Enhanced service class for image processing operations
 */
@injectable()
export class ImageService {
  private readonly logger: Logger;
  private readonly storageService: StorageService;
  private readonly iccProfiles: Map<string, sharp.ICC>;
  private readonly processingPool: WorkerPool;

  constructor(
    logger: Logger,
    storageService: StorageService
  ) {
    this.logger = logger;
    this.storageService = storageService;
    this.iccProfiles = new Map();
    this.processingPool = new WorkerPool(4); // Initialize worker pool with 4 threads
    this.initializeIccProfiles();
  }

  /**
   * Initialize ICC profiles for color management
   */
  private async initializeIccProfiles(): Promise<void> {
    try {
      // Load Fogra39 profile for CMYK print output
      const fogra39Profile = await sharp.icc.load(sharpConfig.iccProfiles.fogra39);
      this.iccProfiles.set('Fogra39', fogra39Profile);

      // Load sRGB profile for web output
      const srgbProfile = await sharp.icc.load(sharpConfig.iccProfiles.srgb);
      this.iccProfiles.set('sRGB', srgbProfile);
    } catch (error) {
      this.logger.error('Failed to load ICC profiles', {}, error as Error);
      throw new Error('ICC profile initialization failed');
    }
  }

  /**
   * Process image with comprehensive validation and optimization
   */
  public async processImage(
    imageBuffer: Buffer,
    options: ImageProcessingOptions
  ): Promise<ProcessedImage> {
    try {
      // Validate input
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error('Invalid image buffer');
      }

      // Create Sharp instance with input validation
      const image = sharp(imageBuffer, {
        failOnError: true,
        limitInputPixels: MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION
      });

      // Get image metadata for validation
      const metadata = await image.metadata();
      this.validateImageMetadata(metadata);

      // Configure processing pipeline based on output type
      const pipeline = options.forPrint
        ? await this.configurePrintPipeline(image, options)
        : await this.configureWebPipeline(image, options);

      // Process image
      const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

      // Generate result with comprehensive metadata
      const result: ProcessedImage = {
        data,
        format: info.format,
        width: info.width,
        height: info.height,
        quality: options.quality || QUALITY_THRESHOLDS.web,
        metadata: {
          dpi: metadata.density,
          colorSpace: metadata.space,
          profile: options.iccProfile,
          size: data.length
        }
      };

      this.logger.info('Image processed successfully', {
        format: result.format,
        dimensions: `${result.width}x${result.height}`,
        size: result.metadata.size
      });

      return result;
    } catch (error) {
      this.logger.error('Image processing failed', {}, error as Error);
      throw error;
    }
  }

  /**
   * Configure pipeline for print-ready output
   */
  private async configurePrintPipeline(
    image: sharp.Sharp,
    options: ImageProcessingOptions
  ): Promise<sharp.Sharp> {
    const printConfig = sharpConfig.printPreset;
    
    return image
      .resize({
        width: options.width,
        height: options.height,
        fit: 'inside',
        withoutEnlargement: true
      })
      .icc(this.iccProfiles.get('Fogra39'))
      .toColorspace('cmyk')
      .jpeg({
        quality: QUALITY_THRESHOLDS.print,
        chromaSubsampling: '4:4:4',
        force: true
      });
  }

  /**
   * Configure pipeline for web-optimized output
   */
  private async configureWebPipeline(
    image: sharp.Sharp,
    options: ImageProcessingOptions
  ): Promise<sharp.Sharp> {
    return image
      .resize({
        width: options.width || MAX_IMAGE_DIMENSION,
        height: options.height || MAX_IMAGE_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true
      })
      .icc(this.iccProfiles.get('sRGB'))
      .toColorspace('srgb')
      .jpeg({
        ...sharpConfig.jpeg,
        quality: options.quality || QUALITY_THRESHOLDS.web
      });
  }

  /**
   * Validate image metadata against requirements
   */
  private validateImageMetadata(metadata: sharp.Metadata): void {
    if (!metadata.width || !metadata.height) {
      throw new Error('Invalid image dimensions');
    }

    if (metadata.width > MAX_IMAGE_DIMENSION || metadata.height > MAX_IMAGE_DIMENSION) {
      throw new Error(`Image dimensions exceed maximum limit of ${MAX_IMAGE_DIMENSION}px`);
    }

    if (metadata.width < MIN_IMAGE_DIMENSION || metadata.height < MIN_IMAGE_DIMENSION) {
      throw new Error(`Image dimensions below minimum requirement of ${MIN_IMAGE_DIMENSION}px`);
    }

    if (!SUPPORTED_FORMATS.includes(metadata.format || '')) {
      throw new Error(`Unsupported image format: ${metadata.format}`);
    }
  }

  /**
   * Optimize image for web delivery
   */
  public async optimizeForWeb(
    imageBuffer: Buffer,
    options: Partial<ImageProcessingOptions> = {}
  ): Promise<ProcessedImage> {
    return this.processImage(imageBuffer, {
      format: 'jpeg',
      forPrint: false,
      quality: QUALITY_THRESHOLDS.web,
      ...options
    });
  }

  /**
   * Prepare image for print output
   */
  public async prepareForPrint(
    imageBuffer: Buffer,
    options: Partial<ImageProcessingOptions> = {}
  ): Promise<ProcessedImage> {
    return this.processImage(imageBuffer, {
      format: 'jpeg',
      forPrint: true,
      quality: QUALITY_THRESHOLDS.print,
      withBleed: true,
      iccProfile: 'Fogra39',
      ...options
    });
  }
}