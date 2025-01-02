/**
 * @fileoverview Gazette model implementation using Prisma ORM with comprehensive validation
 * @version 1.0.0
 */

import { PrismaClient } from '@prisma/client'; // ^4.9.0
import { 
  Gazette, 
  GazetteStatus, 
  GazetteLayout,
  PageSize,
  ColorSpace,
  BindingType,
  DEFAULT_RESOLUTION,
  DEFAULT_BLEED
} from '../../../shared/interfaces/gazette.interface';
import { UUID } from 'crypto';

/**
 * Interface for pagination options
 */
interface PaginationOptions {
  cursor?: UUID;
  take: number;
}

/**
 * Interface for paginated gazette results
 */
interface PaginatedGazettes {
  items: Gazette[];
  total: number;
  hasMore: boolean;
  nextCursor?: UUID;
}

/**
 * Gazette model class implementing comprehensive data management with validation
 */
export class GazetteModel {
  private readonly prisma: PrismaClient;
  private readonly CACHE_TTL = 300; // 5 minutes cache duration

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Validates gazette layout specifications against print requirements
   */
  private validateLayout(layout: GazetteLayout): void {
    if (layout.pageSize !== PageSize.A4) {
      throw new Error('Invalid page size: Only A4 format is supported');
    }

    if (layout.colorSpace !== ColorSpace.CMYK) {
      throw new Error('Invalid color space: CMYK is required for print production');
    }

    if (layout.resolution < DEFAULT_RESOLUTION) {
      throw new Error(`Invalid resolution: Minimum ${DEFAULT_RESOLUTION} DPI required`);
    }

    if (layout.bleed < DEFAULT_BLEED) {
      throw new Error(`Invalid bleed: Minimum ${DEFAULT_BLEED}mm required`);
    }

    if (layout.binding !== BindingType.PERFECT) {
      throw new Error('Invalid binding: Perfect binding is required');
    }
  }

  /**
   * Creates a new gazette with comprehensive validation
   */
  async create(gazetteData: Omit<Gazette, 'id' | 'createdAt' | 'updatedAt'>): Promise<Gazette> {
    // Validate layout specifications
    this.validateLayout(gazetteData.layout);

    // Validate content requirements
    if (!gazetteData.contentIds.length) {
      throw new Error('Gazette must contain at least one content item');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Verify all content items exist and belong to the family
        const contentCount = await tx.content.count({
          where: {
            id: { in: gazetteData.contentIds },
            familyId: gazetteData.familyId
          }
        });

        if (contentCount !== gazetteData.contentIds.length) {
          throw new Error('Invalid content items specified');
        }

        // Create gazette with initial status
        const gazette = await tx.gazette.create({
          data: {
            familyId: gazetteData.familyId,
            status: GazetteStatus.DRAFT,
            layout: gazetteData.layout,
            contentIds: gazetteData.contentIds,
            generatedUrl: null
          },
          include: {
            family: true,
            contents: true
          }
        });

        return gazette;
      });
    } catch (error) {
      throw new Error(`Failed to create gazette: ${error.message}`);
    }
  }

  /**
   * Retrieves a gazette by ID with caching support
   */
  async findById(id: UUID): Promise<Gazette | null> {
    const cacheKey = `gazette:${id}`;

    try {
      // Check cache first
      const cached = await this.prisma.redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Query database with index optimization
      const gazette = await this.prisma.gazette.findUnique({
        where: { id },
        include: {
          family: true,
          contents: true
        }
      });

      if (gazette) {
        // Cache the result
        await this.prisma.redis.setex(
          cacheKey,
          this.CACHE_TTL,
          JSON.stringify(gazette)
        );
      }

      return gazette;
    } catch (error) {
      throw new Error(`Failed to retrieve gazette: ${error.message}`);
    }
  }

  /**
   * Updates gazette status with transition validation
   */
  async updateStatus(id: UUID, status: GazetteStatus): Promise<Gazette> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const gazette = await tx.gazette.findUnique({
          where: { id }
        });

        if (!gazette) {
          throw new Error('Gazette not found');
        }

        // Validate status transition
        const validTransitions = {
          [GazetteStatus.DRAFT]: [GazetteStatus.PROCESSING],
          [GazetteStatus.PROCESSING]: [GazetteStatus.READY_FOR_PRINT, GazetteStatus.ERROR],
          [GazetteStatus.READY_FOR_PRINT]: [GazetteStatus.PRINTING],
          [GazetteStatus.PRINTING]: [GazetteStatus.SHIPPED, GazetteStatus.ERROR],
          [GazetteStatus.SHIPPED]: [GazetteStatus.DELIVERED, GazetteStatus.ERROR]
        };

        if (!validTransitions[gazette.status]?.includes(status)) {
          throw new Error(`Invalid status transition from ${gazette.status} to ${status}`);
        }

        // Update status with optimistic locking
        const updated = await tx.gazette.update({
          where: {
            id,
            version: gazette.version // Optimistic locking
          },
          data: {
            status,
            version: { increment: 1 }
          },
          include: {
            family: true,
            contents: true
          }
        });

        // Invalidate cache
        await this.prisma.redis.del(`gazette:${id}`);

        return updated;
      });
    } catch (error) {
      throw new Error(`Failed to update gazette status: ${error.message}`);
    }
  }

  /**
   * Retrieves all gazettes for a family with pagination
   */
  async findByFamilyId(
    familyId: UUID,
    options: PaginationOptions
  ): Promise<PaginatedGazettes> {
    try {
      const [items, total] = await Promise.all([
        this.prisma.gazette.findMany({
          where: { familyId },
          take: options.take + 1, // Take one extra to determine if there are more
          cursor: options.cursor ? { id: options.cursor } : undefined,
          orderBy: { createdAt: 'desc' },
          include: {
            family: true,
            contents: true
          }
        }),
        this.prisma.gazette.count({
          where: { familyId }
        })
      ]);

      const hasMore = items.length > options.take;
      const nextCursor = hasMore ? items[options.take - 1].id : undefined;

      return {
        items: items.slice(0, options.take),
        total,
        hasMore,
        nextCursor
      };
    } catch (error) {
      throw new Error(`Failed to retrieve family gazettes: ${error.message}`);
    }
  }
}