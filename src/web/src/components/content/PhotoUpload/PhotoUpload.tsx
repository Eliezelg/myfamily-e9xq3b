/**
 * PhotoUpload Component
 * Enterprise-grade photo upload component with print-ready validation,
 * accessibility features, and internationalization support
 * @version 1.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'; // v18.2.0
import { useDropzone } from 'react-dropzone'; // v14.2.0
import { useTranslation } from 'react-i18next'; // v22.0.0

// Styled components
import {
  UploadContainer,
  DropZone,
  PreviewGrid,
  ProgressBar,
  ErrorMessage,
  AccessibleAlert,
  PreviewItem,
  PreviewActions
} from './PhotoUpload.styles';

// Services and utilities
import ContentService from '../../../services/content.service';
import { validatePhotoUpload } from '../../../utils/validation.util';

// Constants and interfaces
import {
  ContentType,
  IContent,
  MAX_CONTENT_SIZE,
  MIN_IMAGE_RESOLUTION,
  SUPPORTED_MIME_TYPES,
  SUPPORTED_COLOR_SPACES
} from '../../../interfaces/content.interface';

interface PhotoUploadProps {
  onUploadComplete: (uploadedPhotos: IContent[]) => void;
  onError: (error: Error) => void;
  onProgress: (progress: number) => void;
  maxPhotos: number;
  familyId: string;
  allowedFileTypes?: string[];
  maxFileSize?: number;
  minResolution?: number;
}

const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onUploadComplete,
  onError,
  onProgress,
  maxPhotos,
  familyId,
  allowedFileTypes = SUPPORTED_MIME_TYPES,
  maxFileSize = MAX_CONTENT_SIZE,
  minResolution = MIN_IMAGE_RESOLUTION
}) => {
  const { t } = useTranslation();
  const contentService = useRef(new ContentService({
    baseURL: process.env.REACT_APP_API_URL,
    maxRetries: 3,
    chunkSize: 1024 * 1024
  }));

  // State management
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedContent, setUploadedContent] = useState<IContent[]>([]);

  // Cleanup function for file previews
  useEffect(() => {
    return () => {
      files.forEach(file => URL.revokeObjectURL(URL.createObjectURL(file)));
    };
  }, [files]);

  // Progress tracking
  useEffect(() => {
    const handleProgress = (event: CustomEvent) => {
      const { fileId, progress } = event.detail;
      setUploadProgress(prev => ({
        ...prev,
        [fileId]: progress
      }));
      
      // Calculate and emit overall progress
      const totalProgress = Object.values(uploadProgress).reduce((a, b) => a + b, 0) / files.length;
      onProgress(totalProgress);
    };

    window.addEventListener('contentUploadProgress', handleProgress as EventListener);
    return () => window.removeEventListener('contentUploadProgress', handleProgress as EventListener);
  }, [files.length, onProgress, uploadProgress]);

  // File validation and processing
  const validateFile = async (file: File): Promise<boolean> => {
    try {
      await validatePhotoUpload({
        file,
        maxSize: maxFileSize,
        allowedTypes: allowedFileTypes,
        minResolution,
        supportedColorSpaces: SUPPORTED_COLOR_SPACES
      });
      return true;
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [file.name]: error instanceof Error ? error.message : t('upload.error.validation')
      }));
      return false;
    }
  };

  // Dropzone configuration
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (files.length + acceptedFiles.length > maxPhotos) {
      onError(new Error(t('upload.error.tooManyFiles', { max: maxPhotos })));
      return;
    }

    const validFiles: File[] = [];
    for (const file of acceptedFiles) {
      const isValid = await validateFile(file);
      if (isValid) validFiles.push(file);
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [files.length, maxPhotos, onError, t]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: allowedFileTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize: maxFileSize,
    disabled: isUploading
  });

  // File upload handling
  const handleUpload = async () => {
    setIsUploading(true);
    const uploadedFiles: IContent[] = [];

    try {
      for (const file of files) {
        const content = await contentService.current.uploadContent(
          file,
          ContentType.PHOTO,
          {
            familyId,
            description: file.name,
            originalLanguage: 'en'
          }
        );
        uploadedFiles.push(content);
      }

      setUploadedContent(uploadedFiles);
      onUploadComplete(uploadedFiles);
      setFiles([]);
      setUploadProgress({});
    } catch (error) {
      onError(error instanceof Error ? error : new Error(t('upload.error.generic')));
    } finally {
      setIsUploading(false);
    }
  };

  // File removal handling
  const handleRemoveFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[files[index].name];
      return newErrors;
    });
  };

  return (
    <UploadContainer role="region" aria-label={t('upload.area.label')}>
      <DropZone
        {...getRootProps()}
        isDragActive={isDragActive}
        hasError={Object.keys(errors).length > 0}
        aria-busy={isUploading}
      >
        <input {...getInputProps()} aria-label={t('upload.input.label')} />
        <p>{t('upload.dropzone.text')}</p>
        <small>
          {t('upload.requirements', {
            types: allowedFileTypes.join(', '),
            size: maxFileSize / (1024 * 1024),
            resolution: minResolution
          })}
        </small>
      </DropZone>

      {Object.keys(errors).length > 0 && (
        <ErrorMessage role="alert">
          <ul>
            {Object.entries(errors).map(([fileName, error]) => (
              <li key={fileName}>{`${fileName}: ${error}`}</li>
            ))}
          </ul>
        </ErrorMessage>
      )}

      {files.length > 0 && (
        <>
          <PreviewGrid role="list" aria-label={t('upload.preview.label')}>
            {files.map((file, index) => (
              <PreviewItem key={file.name} role="listitem">
                <img
                  src={URL.createObjectURL(file)}
                  alt={t('upload.preview.alt', { name: file.name })}
                  loading="lazy"
                />
                <PreviewActions>
                  <button
                    onClick={() => handleRemoveFile(index)}
                    aria-label={t('upload.remove.label', { name: file.name })}
                    disabled={isUploading}
                  >
                    {t('upload.remove.button')}
                  </button>
                </PreviewActions>
              </PreviewItem>
            ))}
          </PreviewGrid>

          <ProgressBar
            progress={Object.values(uploadProgress).reduce((a, b) => a + b, 0) / files.length}
            aria-valuenow={uploadProgress[files[0]?.name] || 0}
            aria-valuemin={0}
            aria-valuemax={100}
            hasError={Object.keys(errors).length > 0}
          />

          <button
            onClick={handleUpload}
            disabled={isUploading || files.length === 0 || Object.keys(errors).length > 0}
            aria-busy={isUploading}
          >
            {isUploading ? t('upload.uploading') : t('upload.button')}
          </button>
        </>
      )}

      <AccessibleAlert
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {isUploading && t('upload.progress', { count: files.length })}
      </AccessibleAlert>
    </UploadContainer>
  );
};

export default PhotoUpload;