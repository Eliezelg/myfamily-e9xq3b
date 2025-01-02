/**
 * Enhanced content controller implementing comprehensive content management
 * with print-ready validation, multi-language support, and security features
 * @version 1.0.0
 */

// External imports
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UsePipes,
  Request,
  HttpStatus,
  BadRequestException
} from '@nestjs/common'; // ^9.0.0
import { AuthGuard, RoleGuard } from '@nestjs/passport'; // ^9.0.0
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger'; // ^6.0.0
import { RateLimit } from '@nestjs/throttler'; // ^4.0.0

// Internal imports
import { ContentModel, ContentType, ContentStatus } from '../models/content.model';
import { ImageService } from '../services/image.service';
import { StorageService } from '../services/storage.service';
import { TranslationService } from '../services/translation.service';
import { Logger } from '../../../shared/utils/logger.util';

// Global constants
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_DPI = 300;
const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'zh'];
const RATE_LIMIT_WINDOW = 3600;
const RATE_LIMIT_MAX = 1000;

@Controller('content')
@ApiTags('content')
@UseGuards(AuthGuard('jwt'), RoleGuard)
@UseInterceptors(LoggingInterceptor)
@UsePipes(ValidationPipe)
export class ContentController {
  constructor(
    private readonly imageService: ImageService,
    private readonly storageService: StorageService,
    private readonly translationService: TranslationService,
    private readonly logger: Logger
  ) {
    this.logger = Logger.getInstance({
      service: 'ContentController',
      level: 'info',
      enableConsole: true,
      enableFile: true,
      enableElk: true
    });
  }

  /**
   * Upload and process new content with print-ready validation
   */
  @Post('upload')
  @RateLimit({
    windowMs: RATE_LIMIT_WINDOW * 1000,
    max: RATE_LIMIT_MAX
  })
  @ApiOperation({ summary: 'Upload new content with print validation' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Content processed and validated' })
  @ApiSecurity('jwt')
  async uploadContent(
    @Body() uploadDto: UploadContentDto,
    @Request() request: any
  ): Promise<ContentResponse> {
    try {
      const { content, type, familyId, metadata } = uploadDto;

      // Validate content size
      if (content.length > MAX_UPLOAD_SIZE) {
        throw new BadRequestException(`Content size exceeds maximum limit of ${MAX_UPLOAD_SIZE} bytes`);
      }

      let processedContent: Buffer;
      let contentMetadata: any = {};

      if (type === ContentType.PHOTO) {
        // Process image with print-ready validation
        const processedImage = await this.imageService.processImage(content, {
          forPrint: true,
          quality: 95,
          withBleed: true,
          iccProfile: 'Fogra39'
        });

        // Validate image quality for print
        if (processedImage.metadata.dpi < MIN_DPI) {
          throw new BadRequestException(`Image resolution must be at least ${MIN_DPI} DPI for print quality`);
        }

        processedContent = processedImage.data;
        contentMetadata = {
          ...metadata,
          qualityMetrics: {
            resolution: processedImage.metadata.dpi,
            colorSpace: processedImage.metadata.colorSpace,
            dimensions: {
              width: processedImage.width,
              height: processedImage.height
            },
            fileSize: processedImage.metadata.size
          }
        };
      }

      // Upload processed content to storage
      const contentUrl = await this.storageService.uploadContent(
        processedContent || content,
        familyId,
        type,
        contentMetadata
      );

      // Create content record
      const contentRecord = new ContentModel({
        type,
        url: contentUrl,
        familyId,
        creatorId: request.user.id,
        metadata: {
          ...contentMetadata,
          originalLanguage: metadata.originalLanguage || 'en'
        },
        status: ContentStatus.READY
      });

      await contentRecord.save();

      // Handle translations if needed
      if (metadata.text && metadata.originalLanguage) {
        const translations = await this.translationService.batchTranslate(
          SUPPORTED_LANGUAGES.filter(lang => lang !== metadata.originalLanguage)
            .map(targetLanguage => ({
              content: metadata.text,
              targetLanguage,
              sourceLanguage: metadata.originalLanguage
            }))
        );

        if (translations.successCount > 0) {
          contentRecord.translations = translations.results.map(result => ({
            language: result.targetLanguage,
            text: result.translatedText,
            translatedAt: new Date()
          }));
          await contentRecord.save();
        }
      }

      this.logger.info('Content uploaded successfully', {
        contentId: contentRecord.id,
        type,
        familyId,
        metadata: contentMetadata
      });

      return {
        id: contentRecord.id,
        url: contentUrl,
        type,
        status: ContentStatus.READY,
        metadata: contentMetadata,
        translations: contentRecord.translations
      };

    } catch (error) {
      this.logger.error('Content upload failed', {}, error);
      throw error;
    }
  }

  /**
   * Retrieve content by ID with access validation
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Content retrieved successfully' })
  @ApiSecurity('jwt')
  async getContent(
    @Param('id') id: string,
    @Request() request: any
  ): Promise<ContentResponse> {
    try {
      const content = await ContentModel.findById(id);
      
      if (!content) {
        throw new NotFoundException('Content not found');
      }

      // Validate family access
      if (content.familyId !== request.user.familyId) {
        throw new ForbiddenException('Access denied to content');
      }

      // Generate signed URL for content access
      const signedUrl = await this.storageService.generateSignedUrl(content.url);

      return {
        id: content.id,
        url: signedUrl,
        type: content.type,
        status: content.status,
        metadata: content.metadata,
        translations: content.translations
      };

    } catch (error) {
      this.logger.error('Content retrieval failed', {}, error);
      throw error;
    }
  }

  /**
   * Delete content by ID with security validation
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete content by ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Content deleted successfully' })
  @ApiSecurity('jwt')
  async deleteContent(
    @Param('id') id: string,
    @Request() request: any
  ): Promise<void> {
    try {
      const content = await ContentModel.findById(id);
      
      if (!content) {
        throw new NotFoundException('Content not found');
      }

      // Validate family access and creator permissions
      if (content.familyId !== request.user.familyId || 
          (content.creatorId !== request.user.id && request.user.role !== 'FAMILY_ADMIN')) {
        throw new ForbiddenException('Insufficient permissions to delete content');
      }

      // Delete from storage
      await this.storageService.deleteContent(content.url, content.familyId);

      // Delete content record
      await content.remove();

      this.logger.info('Content deleted successfully', {
        contentId: id,
        familyId: content.familyId
      });

    } catch (error) {
      this.logger.error('Content deletion failed', {}, error);
      throw error;
    }
  }
}