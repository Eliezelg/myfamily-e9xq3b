import { ImageService } from '../../src/services/image.service';
import { sharpConfig } from '../../src/config/sharp.config';
import sharp from 'sharp'; // ^0.31.0
import { StorageService } from '../../src/services/storage.service';
import { Logger } from '../../../shared/utils/logger.util';
import { join } from 'path';
import { readFileSync } from 'fs';

// Test constants aligned with print production specifications
const TEST_CONSTANTS = {
  PRINT_DPI: 300,
  MIN_DIMENSION: 100,
  MAX_DIMENSION: 4096,
  BLEED_MM: 3,
  QUALITY: {
    WEB: 85,
    PRINT: 95
  },
  COLOR_PROFILE: 'Fogra39',
  SUPPORTED_FORMATS: ['jpeg', 'jpg', 'png', 'webp']
};

// Mock implementations
jest.mock('../../src/services/storage.service');
jest.mock('../../../shared/utils/logger.util');

describe('ImageService', () => {
  let imageService: ImageService;
  let mockStorageService: jest.Mocked<StorageService>;
  let mockLogger: jest.Mocked<Logger>;
  let testImageBuffers: { [key: string]: Buffer };

  beforeEach(async () => {
    // Initialize mocks
    mockStorageService = new StorageService() as jest.Mocked<StorageService>;
    mockLogger = Logger.getInstance({
      service: 'ImageService',
      level: 'info',
      enableConsole: false,
      enableFile: false,
      enableElk: false
    }) as jest.Mocked<Logger>;

    // Create test image buffers
    testImageBuffers = {
      jpeg: await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      }).jpeg().toBuffer(),
      png: await sharp({
        create: {
          width: 1000,
          height: 1000,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      }).png().toBuffer(),
      corrupt: Buffer.from('corrupt image data')
    };

    // Initialize ImageService
    imageService = new ImageService(mockLogger, mockStorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Image Validation', () => {
    it('should validate supported image formats', async () => {
      const result = await imageService.processImage(testImageBuffers.jpeg, {
        format: 'jpeg',
        forPrint: false
      });
      expect(result.format).toBe('jpeg');
      expect(result.data).toBeDefined();
    });

    it('should reject corrupt images', async () => {
      await expect(
        imageService.processImage(testImageBuffers.corrupt, {
          format: 'jpeg',
          forPrint: false
        })
      ).rejects.toThrow();
    });

    it('should validate minimum dimensions', async () => {
      const smallImage = await sharp({
        create: {
          width: 50,
          height: 50,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      }).jpeg().toBuffer();

      await expect(
        imageService.processImage(smallImage, {
          format: 'jpeg',
          forPrint: false
        })
      ).rejects.toThrow(/dimensions below minimum/);
    });

    it('should validate maximum dimensions', async () => {
      const largeImage = await sharp({
        create: {
          width: 5000,
          height: 5000,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      }).jpeg().toBuffer();

      await expect(
        imageService.processImage(largeImage, {
          format: 'jpeg',
          forPrint: false
        })
      ).rejects.toThrow(/dimensions exceed maximum/);
    });
  });

  describe('Print Preparation', () => {
    it('should convert to CMYK with Fogra39 profile', async () => {
      const result = await imageService.prepareForPrint(testImageBuffers.jpeg);
      const metadata = await sharp(result.data).metadata();
      
      expect(result.metadata.colorSpace).toBe('cmyk');
      expect(result.metadata.profile).toBe('Fogra39');
    });

    it('should set correct DPI for print', async () => {
      const result = await imageService.prepareForPrint(testImageBuffers.jpeg);
      expect(result.metadata.dpi).toBe(TEST_CONSTANTS.PRINT_DPI);
    });

    it('should maintain high quality for print output', async () => {
      const result = await imageService.prepareForPrint(testImageBuffers.jpeg);
      expect(result.quality).toBe(TEST_CONSTANTS.QUALITY.PRINT);
    });

    it('should handle bleed area requirements', async () => {
      const result = await imageService.prepareForPrint(testImageBuffers.jpeg, {
        withBleed: true
      });
      const metadata = await sharp(result.data).metadata();
      
      // Verify dimensions include bleed area
      expect(metadata.width).toBeGreaterThan(1000);
      expect(metadata.height).toBeGreaterThan(1000);
    });
  });

  describe('Web Optimization', () => {
    it('should optimize JPEG images with correct quality settings', async () => {
      const result = await imageService.optimizeForWeb(testImageBuffers.jpeg);
      expect(result.quality).toBe(TEST_CONSTANTS.QUALITY.WEB);
    });

    it('should resize images for web delivery', async () => {
      const result = await imageService.optimizeForWeb(testImageBuffers.jpeg, {
        width: 800
      });
      expect(result.width).toBe(800);
      expect(result.height).toBe(800); // Maintains aspect ratio
    });

    it('should convert to sRGB color space', async () => {
      const result = await imageService.optimizeForWeb(testImageBuffers.jpeg);
      expect(result.metadata.colorSpace).toBe('srgb');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty buffers', async () => {
      await expect(
        imageService.processImage(Buffer.alloc(0), {
          format: 'jpeg',
          forPrint: false
        })
      ).rejects.toThrow('Invalid image buffer');
    });

    it('should handle invalid format conversion', async () => {
      await expect(
        imageService.processImage(testImageBuffers.jpeg, {
          format: 'invalid',
          forPrint: false
        })
      ).rejects.toThrow();
    });

    it('should log processing errors', async () => {
      await expect(
        imageService.processImage(testImageBuffers.corrupt, {
          format: 'jpeg',
          forPrint: false
        })
      ).rejects.toThrow();
      
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Performance', () => {
    it('should process large images within timeout', async () => {
      const largeImage = await sharp({
        create: {
          width: 4000,
          height: 3000,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      }).jpeg().toBuffer();

      await expect(
        imageService.processImage(largeImage, {
          format: 'jpeg',
          forPrint: true
        })
      ).resolves.toBeDefined();
    }, 10000); // 10s timeout for large image processing
  });
});