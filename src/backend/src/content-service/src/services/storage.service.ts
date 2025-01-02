import { injectable } from 'inversify';
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'; // ^3.300.0
import { v4 as uuidv4 } from 'uuid'; // ^9.0.0
import { s3Client, s3Config } from '../config/s3.config';
import { Logger } from '../../../shared/utils/logger.util';
import { ContentType, ContentStatus, ContentMetadata } from '../models/content.model';

// Global constants for storage operations
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/heic'];
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

@injectable()
export class StorageService {
  private readonly logger: Logger;
  private readonly bucket: string;
  private readonly region: string;
  private readonly kmsKeyId: string;
  private readonly cdnDomain: string;

  constructor() {
    this.logger = Logger.getInstance({
      service: 'StorageService',
      level: 'info',
      enableConsole: true,
      enableFile: true,
      enableElk: true
    });

    // Initialize with S3 configuration
    this.bucket = s3Config.bucket;
    this.region = s3Config.region;
    this.kmsKeyId = s3Config.kmsKeyId || '';
    this.cdnDomain = s3Config.cloudFront.domain;

    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    if (!this.bucket || !this.region) {
      throw new Error('Invalid S3 configuration: bucket and region are required');
    }
    if (!this.kmsKeyId) {
      this.logger.warn('KMS key not configured, falling back to AWS managed keys');
    }
  }

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        this.logger.warn(`Operation failed, attempt ${attempt}/${MAX_RETRIES}`, {
          error: error.message,
          attempt
        });
        if (attempt < MAX_RETRIES) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt));
        }
      }
    }
    throw lastError!;
  }

  /**
   * Uploads content to S3 with server-side encryption and enhanced security
   */
  public async uploadContent(
    content: Buffer,
    familyId: string,
    contentType: ContentType,
    metadata: ContentMetadata
  ): Promise<string> {
    if (!content || content.length === 0) {
      throw new Error('Content buffer cannot be empty');
    }

    if (content.length > MAX_UPLOAD_SIZE) {
      throw new Error(`Content size exceeds maximum limit of ${MAX_UPLOAD_SIZE} bytes`);
    }

    const key = `${familyId}/${contentType.toLowerCase()}/${uuidv4()}`;
    const mimeType = contentType === ContentType.PHOTO ? 'image/jpeg' : 'text/plain';

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: content,
      ContentType: mimeType,
      ServerSideEncryption: 'aws:kms',
      SSEKMSKeyId: this.kmsKeyId,
      Metadata: {
        familyId,
        contentType,
        originalLanguage: metadata.originalLanguage,
        createdAt: new Date().toISOString()
      },
      TagSet: [
        { Key: 'familyId', Value: familyId },
        { Key: 'contentType', Value: contentType }
      ]
    });

    await this.retryOperation(async () => {
      await s3Client.send(command);
      
      // Verify upload with HeadObject
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key
      });
      await s3Client.send(headCommand);
    });

    this.logger.info('Content uploaded successfully', {
      key,
      familyId,
      contentType,
      size: content.length
    });

    return this.generateContentUrl(key);
  }

  /**
   * Retrieves content from S3 with access validation
   */
  public async getContent(key: string, familyId: string): Promise<Buffer> {
    if (!key || !familyId) {
      throw new Error('Key and familyId are required');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    const response = await this.retryOperation(async () => {
      const result = await s3Client.send(command);
      
      // Validate family access
      const metadata = result.Metadata || {};
      if (metadata.familyId !== familyId) {
        throw new Error('Access denied: Content belongs to different family');
      }

      return result;
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as any) {
      chunks.push(chunk);
    }

    this.logger.info('Content retrieved successfully', {
      key,
      familyId,
      contentType: response.ContentType
    });

    return Buffer.concat(chunks);
  }

  /**
   * Securely deletes content from S3 with validation
   */
  public async deleteContent(key: string, familyId: string): Promise<void> {
    if (!key || !familyId) {
      throw new Error('Key and familyId are required');
    }

    // Verify ownership before deletion
    const headCommand = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key
    });

    await this.retryOperation(async () => {
      const headResponse = await s3Client.send(headCommand);
      const metadata = headResponse.Metadata || {};
      
      if (metadata.familyId !== familyId) {
        throw new Error('Access denied: Content belongs to different family');
      }

      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      await s3Client.send(deleteCommand);
    });

    this.logger.info('Content deleted successfully', {
      key,
      familyId
    });
  }

  /**
   * Generates secure CDN URL for content access
   */
  private generateContentUrl(key: string): string {
    if (!this.cdnDomain) {
      return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
    }
    return `https://${this.cdnDomain}/${key}`;
  }
}