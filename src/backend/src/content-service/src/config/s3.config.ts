import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3'; // v3.300.0
import { S3Config } from '../../../shared/interfaces/config.interface';

/**
 * Default configuration constants for S3 storage
 */
export const DEFAULT_BUCKET_NAME = 'myfamily-content';
export const DEFAULT_REGION = 'us-east-1';
export const DEFAULT_STORAGE_CLASS = 'INTELLIGENT_TIERING';

/**
 * Creates an enhanced S3 configuration with security and performance settings
 * @returns {S3Config} Enhanced S3 configuration object
 */
const createS3Config = (): S3Config => {
  // Load and validate required environment variables
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const kmsKeyId = process.env.AWS_KMS_KEY_ID;
  const cdnDomain = process.env.CLOUDFRONT_DOMAIN;

  if (!accessKeyId || !secretAccessKey) {
    throw new Error('AWS credentials are required but not provided');
  }

  return {
    bucket: process.env.AWS_BUCKET_NAME || DEFAULT_BUCKET_NAME,
    region: process.env.AWS_REGION || DEFAULT_REGION,
    accessKeyId,
    secretAccessKey,
    kmsKeyId: kmsKeyId || undefined,
    endpoint: process.env.AWS_ENDPOINT,
    encryption: true,
    cloudFront: {
      enabled: Boolean(cdnDomain),
      domain: cdnDomain || ''
    }
  };
};

/**
 * Enhanced S3 client configuration with security and performance optimizations
 */
const s3ClientConfig: S3ClientConfig = {
  region: process.env.AWS_REGION || DEFAULT_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  },
  serverSideEncryption: 'aws:kms',
  bucketKeyEnabled: true,
  useAccelerateEndpoint: true,
  forcePathStyle: false,
  customUserAgent: 'MyFamily/1.0',
  maxAttempts: 3,
  // Configure intelligent tiering and lifecycle policies
  defaultStorageClass: DEFAULT_STORAGE_CLASS,
  // Enhanced security headers
  requestHandler: {
    metadata: {
      'x-amz-server-side-encryption': 'aws:kms',
      'x-amz-server-side-encryption-aws-kms-key-id': process.env.AWS_KMS_KEY_ID
    }
  }
};

/**
 * Configured S3 client instance with enhanced security and performance settings
 */
export const s3Client = new S3Client(s3ClientConfig);

/**
 * Enhanced S3 configuration object with security and CDN settings
 */
export const s3Config = createS3Config();

/**
 * Default export of the configured S3 client for direct usage
 */
export default s3Client;