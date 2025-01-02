/**
 * @fileoverview Unit tests for LayoutService ensuring print-ready gazette generation
 * @version 1.0.0
 */

import { describe, beforeEach, test, expect, jest } from '@jest/globals';
import PDFKit from 'pdfkit';
import Sharp from 'sharp';
import { UUID } from 'crypto';

import { LayoutService } from '../../src/services/layout.service';
import { 
  GazetteLayout, 
  PageSize, 
  ColorSpace, 
  BindingType,
  DEFAULT_RESOLUTION,
  DEFAULT_BLEED 
} from '../../../../shared/interfaces/gazette.interface';
import { GazetteModel } from '../../src/models/gazette.model';

// Mock external dependencies
jest.mock('pdfkit');
jest.mock('sharp');
jest.mock('../../src/models/gazette.model');

describe('LayoutService', () => {
  let layoutService: LayoutService;
  let mockGazetteModel: jest.Mocked<GazetteModel>;
  let mockPDF: jest.Mocked<typeof PDFKit>;
  let mockSharp: jest.Mocked<typeof Sharp>;

  const testGazetteId: UUID = '123e4567-e89b-12d3-a456-426614174000';
  
  const testLayout: GazetteLayout = {
    pageSize: PageSize.A4,
    colorSpace: ColorSpace.CMYK,
    resolution: DEFAULT_RESOLUTION,
    bleed: DEFAULT_BLEED,
    binding: BindingType.PERFECT
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock gazette model
    mockGazetteModel = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<GazetteModel>;

    // Mock PDF generation
    mockPDF = {
      image: jest.fn(),
      rect: jest.fn().mockReturnThis(),
      fillColor: jest.fn().mockReturnThis(),
      fill: jest.fn(),
      moveTo: jest.fn().mockReturnThis(),
      lineTo: jest.fn().mockReturnThis(),
      stroke: jest.fn(),
      on: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<typeof PDFKit>;

    // Mock Sharp image processing
    mockSharp = jest.fn().mockReturnValue({
      resize: jest.fn().mockReturnThis(),
      withMetadata: jest.fn().mockReturnThis(),
      toColorspace: jest.fn().mockReturnThis(),
      jpeg: jest.fn().mockReturnThis(),
      toBuffer: jest.fn().mockResolvedValue(Buffer.from('test')),
    });

    // Initialize service with mocks
    layoutService = new LayoutService(mockGazetteModel);
  });

  describe('generateLayout', () => {
    test('should generate a print-ready layout with correct specifications', async () => {
      // Arrange
      const mockContent = [
        {
          id: '123' as UUID,
          type: 'image',
          buffer: Buffer.from('test'),
          dimensions: { width: 1000, height: 1000 }
        }
      ];

      mockGazetteModel.findById.mockResolvedValue({
        id: testGazetteId,
        contentIds: [mockContent[0].id],
        layout: testLayout
      });

      // Act
      const result = await layoutService.generateLayout(testGazetteId);

      // Assert
      expect(result).toBeDefined();
      expect(PDFKit).toHaveBeenCalledWith(expect.objectContaining({
        size: [
          (210 + DEFAULT_BLEED * 2) * 2.83465,
          (297 + DEFAULT_BLEED * 2) * 2.83465
        ],
        colorSpace: 'cmyk'
      }));
      expect(mockPDF.image).toHaveBeenCalled();
    });

    test('should throw error when gazette not found', async () => {
      // Arrange
      mockGazetteModel.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(layoutService.generateLayout(testGazetteId))
        .rejects
        .toThrow('Gazette not found');
    });
  });

  describe('validateLayout', () => {
    test('should validate correct print specifications', async () => {
      // Act
      const result = await layoutService.validateLayout(testLayout);

      // Assert
      expect(result).toBe(true);
    });

    test('should reject invalid page size', async () => {
      // Arrange
      const invalidLayout = { ...testLayout, pageSize: 'Letter' as PageSize };

      // Act & Assert
      await expect(layoutService.validateLayout(invalidLayout))
        .rejects
        .toThrow('Only A4 format is supported for print production');
    });

    test('should reject invalid color space', async () => {
      // Arrange
      const invalidLayout = { ...testLayout, colorSpace: 'RGB' as ColorSpace };

      // Act & Assert
      await expect(layoutService.validateLayout(invalidLayout))
        .rejects
        .toThrow('CMYK color space is required for print production');
    });

    test('should reject insufficient resolution', async () => {
      // Arrange
      const invalidLayout = { ...testLayout, resolution: 200 };

      // Act & Assert
      await expect(layoutService.validateLayout(invalidLayout))
        .rejects
        .toThrow(`Minimum resolution of ${DEFAULT_RESOLUTION} DPI required`);
    });

    test('should reject insufficient bleed', async () => {
      // Arrange
      const invalidLayout = { ...testLayout, bleed: 2 };

      // Act & Assert
      await expect(layoutService.validateLayout(invalidLayout))
        .rejects
        .toThrow(`Minimum bleed of ${DEFAULT_BLEED}mm required`);
    });
  });

  describe('optimizeImages', () => {
    test('should optimize images for print quality', async () => {
      // Arrange
      const mockImage = {
        id: '123' as UUID,
        type: 'image',
        buffer: Buffer.from('test'),
        dimensions: { width: 1000, height: 1000 }
      };

      // Act
      const result = await (layoutService as any).optimizeImages([mockImage]);

      // Assert
      expect(Sharp).toHaveBeenCalledWith(mockImage.buffer);
      expect(Sharp().resize).toHaveBeenCalledWith({
        width: Math.round(mockImage.dimensions.width * (DEFAULT_RESOLUTION / 72)),
        height: Math.round(mockImage.dimensions.height * (DEFAULT_RESOLUTION / 72)),
        fit: 'inside'
      });
      expect(Sharp().toColorspace).toHaveBeenCalledWith('cmyk');
      expect(Sharp().jpeg).toHaveBeenCalledWith({
        quality: 100,
        chromaSubsampling: '4:4:4'
      });
    });
  });

  describe('calculateContentPlacement', () => {
    test('should calculate optimal content placement with safe zones', async () => {
      // Arrange
      const mockContent = [
        {
          id: '123' as UUID,
          type: 'image',
          buffer: Buffer.from('test'),
          dimensions: { width: 1000, height: 1000 }
        },
        {
          id: '456' as UUID,
          type: 'image',
          buffer: Buffer.from('test'),
          dimensions: { width: 1000, height: 1000 }
        }
      ];

      // Act
      const result = await (layoutService as any).calculateContentPlacement(mockContent);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        safeZone: true,
        x: expect.any(Number),
        y: expect.any(Number),
        width: expect.any(Number),
        height: expect.any(Number)
      });
      expect(result[1].x).toBeGreaterThan(result[0].x);
    });
  });
});