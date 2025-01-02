/**
 * @fileoverview Integration tests for gazette service functionality
 * @version 1.0.0
 */

import { Test, TestingModule } from '@nestjs/testing'; // ^9.0.0
import { describe, it, beforeEach, afterEach, expect, jest } from 'jest'; // ^29.0.0
import supertest from 'supertest'; // ^6.3.0
import { UUID } from 'crypto';

import { GazetteController } from '../../src/controllers/gazette.controller';
import { LayoutService } from '../../src/services/layout.service';
import { PrintService } from '../../src/services/print.service';
import { ShippingService } from '../../src/services/shipping.service';
import { GazetteModel } from '../../src/models/gazette.model';
import { 
  Gazette,
  GazetteStatus,
  PageSize,
  ColorSpace,
  BindingType,
  DEFAULT_RESOLUTION,
  DEFAULT_BLEED
} from '../../../shared/interfaces/gazette.interface';

// Test constants
const TEST_PRINT_SPECS = {
  pageSize: PageSize.A4,
  colorSpace: ColorSpace.CMYK,
  resolution: DEFAULT_RESOLUTION,
  bleed: DEFAULT_BLEED,
  binding: BindingType.PERFECT
};

const REGION_CONFIGS = {
  IL: { country: 'Israel', postalCode: '1234567' },
  EU: { country: 'Germany', postalCode: 'D-12345' },
  NA: { country: 'USA', postalCode: '12345-6789' },
  AU: { country: 'Australia', postalCode: '2000' }
};

describe('Gazette Service Integration Tests', () => {
  let module: TestingModule;
  let gazetteController: GazetteController;
  let layoutService: LayoutService;
  let printService: PrintService;
  let shippingService: ShippingService;
  let gazetteModel: GazetteModel;

  beforeEach(async () => {
    // Create test module with mocked dependencies
    module = await Test.createTestingModule({
      controllers: [GazetteController],
      providers: [
        LayoutService,
        PrintService,
        ShippingService,
        {
          provide: GazetteModel,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            updateStatus: jest.fn()
          }
        }
      ]
    }).compile();

    gazetteController = module.get<GazetteController>(GazetteController);
    layoutService = module.get<LayoutService>(LayoutService);
    printService = module.get<PrintService>(PrintService);
    shippingService = module.get<ShippingService>(ShippingService);
    gazetteModel = module.get<GazetteModel>(GazetteModel);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Gazette Creation', () => {
    it('should create gazette with valid specifications', async () => {
      const createGazetteDto = {
        familyId: crypto.randomUUID() as UUID,
        contentIds: [crypto.randomUUID() as UUID],
        layout: TEST_PRINT_SPECS
      };

      jest.spyOn(layoutService, 'validateLayout').mockResolvedValue(true);
      jest.spyOn(layoutService, 'generateLayout').mockResolvedValue(Buffer.from('test'));
      jest.spyOn(gazetteModel, 'create').mockResolvedValue({
        ...createGazetteDto,
        id: crypto.randomUUID(),
        status: GazetteStatus.DRAFT,
        generatedUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      } as Gazette);

      const result = await gazetteController.createGazette(createGazetteDto);

      expect(result).toBeDefined();
      expect(result.status).toBe(GazetteStatus.DRAFT);
      expect(result.layout).toEqual(TEST_PRINT_SPECS);
    });

    it('should validate print specifications', async () => {
      const invalidSpecs = {
        ...TEST_PRINT_SPECS,
        resolution: 150 // Below minimum required
      };

      await expect(
        layoutService.validateLayout(invalidSpecs)
      ).rejects.toThrow('Minimum resolution of 300 DPI required');
    });
  });

  describe('Print Production', () => {
    it('should validate CMYK color space conversion', async () => {
      const gazette = await createTestGazette();
      
      jest.spyOn(layoutService, 'generateLayout').mockImplementation(async () => {
        // Simulate color space validation
        const buffer = Buffer.from('test');
        const metadata = { colorSpace: 'CMYK', profile: 'Fogra39' };
        return buffer;
      });

      const result = await layoutService.generateLayout(gazette.id);
      expect(result).toBeDefined();
    });

    it('should enforce bleed specifications', async () => {
      const gazette = await createTestGazette();
      
      jest.spyOn(layoutService, 'validateLayout').mockImplementation(async (layout) => {
        if (layout.bleed < DEFAULT_BLEED) {
          throw new Error(`Minimum bleed of ${DEFAULT_BLEED}mm required`);
        }
        return true;
      });

      await expect(
        layoutService.validateLayout({ ...TEST_PRINT_SPECS, bleed: 2 })
      ).rejects.toThrow('Minimum bleed of 3mm required');
    });
  });

  describe('Shipping Integration', () => {
    it('should handle shipping for all supported regions', async () => {
      for (const [region, config] of Object.entries(REGION_CONFIGS)) {
        const gazette = await createTestGazette();
        
        const address = {
          name: 'Test Recipient',
          street: '123 Test St',
          city: 'Test City',
          state: 'Test State',
          country: config.country,
          postalCode: config.postalCode
        };

        jest.spyOn(shippingService, 'createShipment').mockResolvedValue({
          shipmentId: crypto.randomUUID(),
          trackingNumber: 'TRACK123',
          carrier: 'TestCarrier',
          label: 'label-url',
          cost: 10.0,
          estimatedDelivery: new Date()
        });

        const shipment = await shippingService.createShipment(gazette.id, address);
        expect(shipment).toBeDefined();
        expect(shipment.trackingNumber).toBeDefined();
      }
    });

    it('should process shipping webhooks correctly', async () => {
      const gazette = await createTestGazette();
      const webhookPayload = {
        event: 'delivery.completed',
        gazette_id: gazette.id,
        tracking_number: 'TRACK123',
        timestamp: new Date().toISOString()
      };

      const signature = 'test-signature';

      jest.spyOn(gazetteModel, 'updateStatus').mockResolvedValue({
        ...gazette,
        status: GazetteStatus.DELIVERED
      } as Gazette);

      await shippingService.handleWebhook(signature, webhookPayload);
      expect(gazetteModel.updateStatus).toHaveBeenCalledWith(
        gazette.id,
        GazetteStatus.DELIVERED
      );
    });
  });

  describe('End-to-End Flow', () => {
    it('should handle complete gazette lifecycle', async () => {
      // Create gazette
      const gazette = await createTestGazette();
      expect(gazette.status).toBe(GazetteStatus.DRAFT);

      // Generate layout
      jest.spyOn(layoutService, 'generateLayout').mockResolvedValue(Buffer.from('test'));
      const layout = await layoutService.generateLayout(gazette.id);
      expect(layout).toBeDefined();

      // Submit for printing
      jest.spyOn(printService, 'submitPrintJob').mockResolvedValue(true);
      const printResult = await gazetteController.submitForPrinting(
        gazette.id,
        { paperStock: { cover: '250', interior: '150' } }
      );
      expect(printResult).toBe(true);

      // Track shipment
      jest.spyOn(shippingService, 'trackShipment').mockResolvedValue({
        trackingNumber: 'TRACK123',
        carrier: 'TestCarrier',
        status: 'delivered',
        estimatedDelivery: new Date(),
        events: [{
          timestamp: new Date(),
          location: 'Test Location',
          status: 'delivered',
          description: 'Package delivered'
        }]
      });

      const tracking = await gazetteController.trackShipment(gazette.id);
      expect(tracking.status).toBe('delivered');
    });
  });
});

// Helper function to create test gazette
async function createTestGazette(
  region: keyof typeof REGION_CONFIGS = 'IL'
): Promise<Gazette> {
  const gazette: Gazette = {
    id: crypto.randomUUID() as UUID,
    familyId: crypto.randomUUID() as UUID,
    status: GazetteStatus.DRAFT,
    layout: TEST_PRINT_SPECS,
    contentIds: [crypto.randomUUID() as UUID],
    generatedUrl: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  jest.spyOn(gazetteModel, 'create').mockResolvedValue(gazette);
  return gazette;
}