/**
 * @fileoverview Enhanced gazette controller implementing comprehensive gazette operations
 * with professional print and shipping integration
 * @version 1.0.0
 */

import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  UseInterceptors,
  Logger,
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException
} from '@nestjs/common'; // ^9.0.0
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery, 
  ApiParam 
} from '@nestjs/swagger'; // ^6.0.0
import { UUID } from 'crypto';

import { LayoutService } from '../services/layout.service';
import { PrintService } from '../services/print.service';
import { ShippingService } from '../services/shipping.service';
import { 
  Gazette, 
  GazetteStatus, 
  PageSize,
  ColorSpace,
  BindingType,
  DEFAULT_RESOLUTION,
  DEFAULT_BLEED
} from '../../../shared/interfaces/gazette.interface';

interface CreateGazetteDto {
  familyId: UUID;
  contentIds: UUID[];
  layout: {
    pageSize: PageSize;
    colorSpace: ColorSpace;
    resolution: number;
    bleed: number;
    binding: BindingType;
  };
}

interface PrintOptionsDto {
  paperStock?: {
    cover: string;
    interior: string;
  };
  priority?: boolean;
}

interface DetailedTrackingInfo {
  status: GazetteStatus;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: Date;
  events: Array<{
    timestamp: Date;
    location: string;
    status: string;
    description: string;
  }>;
}

@Controller('gazettes')
@ApiTags('gazettes')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class GazetteController {
  private readonly logger = new Logger(GazetteController.name);

  constructor(
    private readonly layoutService: LayoutService,
    private readonly printService: PrintService,
    private readonly shippingService: ShippingService
  ) {}

  /**
   * Creates a new gazette with comprehensive validation
   */
  @Post()
  @ApiOperation({ summary: 'Create new gazette with validation' })
  @ApiResponse({ status: 201, description: 'Gazette created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 422, description: 'Content validation failed' })
  async createGazette(@Body() createGazetteDto: CreateGazetteDto): Promise<Gazette> {
    try {
      // Validate layout specifications
      const isLayoutValid = await this.layoutService.validateLayout(createGazetteDto.layout);
      if (!isLayoutValid) {
        throw new UnprocessableEntityException('Invalid layout specifications');
      }

      // Generate initial layout for validation
      const layoutBuffer = await this.layoutService.generateLayout(createGazetteDto.contentIds);
      if (!layoutBuffer) {
        throw new UnprocessableEntityException('Failed to generate layout');
      }

      // Create gazette with validated specifications
      const gazette: Gazette = {
        id: crypto.randomUUID(),
        familyId: createGazetteDto.familyId,
        status: GazetteStatus.DRAFT,
        layout: createGazetteDto.layout,
        contentIds: createGazetteDto.contentIds,
        generatedUrl: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.logger.log(`Created gazette ${gazette.id} for family ${gazette.familyId}`);
      return gazette;
    } catch (error) {
      this.logger.error(`Failed to create gazette: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves gazette details with enhanced status information
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get gazette with detailed status' })
  @ApiResponse({ status: 200, description: 'Gazette found' })
  @ApiResponse({ status: 404, description: 'Gazette not found' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async getGazette(@Param('id') id: UUID): Promise<Gazette> {
    try {
      // Check print status if applicable
      if (gazette.status === GazetteStatus.PRINTING) {
        const printStatus = await this.printService.checkPrintStatus(id);
        gazette.status = printStatus;
      }

      // Check shipping status if applicable
      if (gazette.status === GazetteStatus.SHIPPED) {
        const trackingInfo = await this.shippingService.trackShipment(id);
        if (trackingInfo.status === 'delivered') {
          gazette.status = GazetteStatus.DELIVERED;
        }
      }

      return gazette;
    } catch (error) {
      this.logger.error(`Failed to retrieve gazette ${id}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Submits gazette for printing with enhanced quality validation
   */
  @Put(':id/print')
  @ApiOperation({ summary: 'Submit gazette for printing with validation' })
  @ApiResponse({ status: 200, description: 'Print job submitted' })
  @ApiResponse({ status: 400, description: 'Invalid print specifications' })
  @ApiResponse({ status: 422, description: 'Quality validation failed' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async submitForPrinting(
    @Param('id') id: UUID,
    @Body() printOptions: PrintOptionsDto
  ): Promise<boolean> {
    try {
      // Validate print readiness
      const isPrintReady = await this.printService.validatePrintReadiness(id);
      if (!isPrintReady) {
        throw new UnprocessableEntityException('Gazette not ready for printing');
      }

      // Submit print job
      const submitted = await this.printService.submitPrintJob(id);
      if (!submitted) {
        throw new UnprocessableEntityException('Failed to submit print job');
      }

      this.logger.log(`Submitted gazette ${id} for printing`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to submit gazette ${id} for printing: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieves detailed shipment tracking information
   */
  @Get(':id/tracking')
  @ApiOperation({ summary: 'Track gazette shipment with details' })
  @ApiResponse({ status: 200, description: 'Tracking info retrieved' })
  @ApiResponse({ status: 404, description: 'Tracking not available' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  async trackShipment(@Param('id') id: UUID): Promise<DetailedTrackingInfo> {
    try {
      const trackingInfo = await this.shippingService.trackShipment(id);
      if (!trackingInfo) {
        throw new NotFoundException('Tracking information not available');
      }

      this.logger.log(`Retrieved tracking info for gazette ${id}`);
      return trackingInfo;
    } catch (error) {
      this.logger.error(`Failed to retrieve tracking info for gazette ${id}: ${error.message}`);
      throw error;
    }
  }
}