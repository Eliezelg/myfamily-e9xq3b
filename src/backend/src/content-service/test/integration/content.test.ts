import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as AWSMock from 'aws-sdk-mock';
import * as fs from 'fs/promises';
import * as path from 'path';

// Internal imports
import { ContentController } from '../../src/controllers/content.controller';
import { ImageService } from '../../src/services/image.service';
import { StorageService } from '../../src/services/storage.service';
import { TranslationService } from '../../src/services/translation.service';
import { Logger } from '../../../shared/utils/logger.util';
import { ContentType, ContentStatus } from '../../src/models/content.model';

// Test fixtures paths
const TEST_IMAGES = {
  VALID_PRINT: './test/fixtures/print-quality/valid-300dpi.jpg',
  INVALID_DPI: './test/fixtures/print-quality/low-dpi.jpg',
  INVALID_COLOR: './test/fixtures/print-quality/rgb-only.jpg',
  OVERSIZED: './test/fixtures/print-quality/oversized.jpg'
};

// Print requirements constants
const PRINT_REQUIREMENTS = {
  MIN_DPI: 300,
  COLOR_SPACE: 'CMYK',
  BLEED_MM: 3,
  MAX_SIZE: 10 * 1024 * 1024 // 10MB
};

describe('ContentService Integration Tests', () => {
  let app: INestApplication;
  let testModule: TestingModule;
  let mockS3: jest.Mock;
  let mockTranslate: jest.Mock;

  beforeAll(async () => {
    // Mock AWS S3 operations
    AWSMock.mock('S3', 'putObject', (params: any, callback: Function) => {
      callback(null, { ETag: 'mockETag' });
    });

    AWSMock.mock('S3', 'getObject', (params: any, callback: Function) => {
      callback(null, { Body: Buffer.from('mockContent') });
    });

    // Create test module
    testModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [
        ImageService,
        StorageService,
        TranslationService,
        Logger,
        {
          provide: 'CONFIG',
          useValue: {
            storage: {
              bucket: 'test-bucket',
              region: 'us-east-1'
            }
          }
        }
      ]
    }).compile();

    app = testModule.createNestApplication();
    await app.init();

    // Initialize mocks
    mockS3 = jest.fn();
    mockTranslate = jest.fn();
  });

  afterAll(async () => {
    AWSMock.restore('S3');
    await app.close();
  });

  describe('Content Upload and Processing', () => {
    it('should successfully upload and process print-ready image', async () => {
      const imageBuffer = await fs.readFile(TEST_IMAGES.VALID_PRINT);
      
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .attach('content', imageBuffer, 'test-image.jpg')
        .field('type', ContentType.PHOTO)
        .field('familyId', 'test-family-id')
        .expect(201);

      expect(response.body).toMatchObject({
        type: ContentType.PHOTO,
        status: ContentStatus.READY,
        metadata: {
          qualityMetrics: {
            resolution: expect.any(Number),
            colorSpace: PRINT_REQUIREMENTS.COLOR_SPACE,
            dimensions: {
              width: expect.any(Number),
              height: expect.any(Number)
            }
          }
        }
      });

      expect(response.body.metadata.qualityMetrics.resolution).toBeGreaterThanOrEqual(PRINT_REQUIREMENTS.MIN_DPI);
    });

    it('should reject image with insufficient DPI', async () => {
      const imageBuffer = await fs.readFile(TEST_IMAGES.INVALID_DPI);
      
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .attach('content', imageBuffer, 'low-dpi.jpg')
        .field('type', ContentType.PHOTO)
        .field('familyId', 'test-family-id')
        .expect(400);

      expect(response.body.message).toContain(`Image resolution must be at least ${PRINT_REQUIREMENTS.MIN_DPI} DPI`);
    });

    it('should convert RGB image to CMYK for print', async () => {
      const imageBuffer = await fs.readFile(TEST_IMAGES.INVALID_COLOR);
      
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .attach('content', imageBuffer, 'rgb-image.jpg')
        .field('type', ContentType.PHOTO)
        .field('familyId', 'test-family-id')
        .expect(201);

      expect(response.body.metadata.qualityMetrics.colorSpace).toBe(PRINT_REQUIREMENTS.COLOR_SPACE);
    });

    it('should reject oversized images', async () => {
      const imageBuffer = await fs.readFile(TEST_IMAGES.OVERSIZED);
      
      await request(app.getHttpServer())
        .post('/content/upload')
        .attach('content', imageBuffer, 'oversized.jpg')
        .field('type', ContentType.PHOTO)
        .field('familyId', 'test-family-id')
        .expect(400);
    });
  });

  describe('Storage Integration', () => {
    it('should store content with encryption', async () => {
      const imageBuffer = await fs.readFile(TEST_IMAGES.VALID_PRINT);
      
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .attach('content', imageBuffer, 'test-image.jpg')
        .field('type', ContentType.PHOTO)
        .field('familyId', 'test-family-id')
        .expect(201);

      expect(response.body.url).toMatch(/^https:\/\//);
      
      // Verify S3 encryption
      const mockS3Call = mockS3.mock.calls[0][0];
      expect(mockS3Call.ServerSideEncryption).toBe('aws:kms');
    });

    it('should enforce access control on content retrieval', async () => {
      await request(app.getHttpServer())
        .get('/content/invalid-family-id/test-content-id')
        .expect(403);
    });
  });

  describe('Translation Integration', () => {
    it('should translate content metadata to supported languages', async () => {
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .field('type', ContentType.TEXT)
        .field('familyId', 'test-family-id')
        .field('content', 'Hello World')
        .field('metadata', JSON.stringify({
          originalLanguage: 'en',
          text: 'Hello World'
        }))
        .expect(201);

      expect(response.body.translations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            language: expect.any(String),
            text: expect.any(String),
            translatedAt: expect.any(String)
          })
        ])
      );
    });

    it('should handle translation failures gracefully', async () => {
      mockTranslate.mockRejectedValueOnce(new Error('Translation service unavailable'));

      await request(app.getHttpServer())
        .post('/content/upload')
        .field('type', ContentType.TEXT)
        .field('familyId', 'test-family-id')
        .field('content', 'Hello World')
        .field('metadata', JSON.stringify({
          originalLanguage: 'en',
          text: 'Hello World'
        }))
        .expect(201);
    });
  });

  describe('Print Quality Validation', () => {
    it('should validate image dimensions for A4 print', async () => {
      const imageBuffer = await fs.readFile(TEST_IMAGES.VALID_PRINT);
      
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .attach('content', imageBuffer, 'test-image.jpg')
        .field('type', ContentType.PHOTO)
        .field('familyId', 'test-family-id')
        .expect(201);

      const { width, height } = response.body.metadata.qualityMetrics.dimensions;
      const aspectRatio = width / height;
      expect(aspectRatio).toBeCloseTo(210/297, 2); // A4 aspect ratio
    });

    it('should verify bleed area requirements', async () => {
      const imageBuffer = await fs.readFile(TEST_IMAGES.VALID_PRINT);
      
      const response = await request(app.getHttpServer())
        .post('/content/upload')
        .attach('content', imageBuffer, 'test-image.jpg')
        .field('type', ContentType.PHOTO)
        .field('familyId', 'test-family-id')
        .expect(201);

      expect(response.body.metadata.printSpecifications.bleed).toBe(PRINT_REQUIREMENTS.BLEED_MM);
    });
  });
});