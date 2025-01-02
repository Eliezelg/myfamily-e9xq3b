/**
 * ContentUpload Page Component
 * Provides a comprehensive content upload interface for family gazette content
 * with print quality validation and accessibility features
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // v22.0.0
import { useNavigate, useParams } from 'react-router-dom'; // v6.8.0

// Internal components
import PhotoUpload from '../../components/content/PhotoUpload/PhotoUpload';
import TextEditor from '../../components/content/TextEditor/TextEditor';

// Hooks and utilities
import { useContent } from '../../hooks/useContent';

// Constants and interfaces
import {
  ContentType,
  IContent,
  MAX_CONTENT_SIZE,
  MIN_IMAGE_RESOLUTION,
  SUPPORTED_LANGUAGES,
  SUPPORTED_MIME_TYPES
} from '../../interfaces/content.interface';

// Styled components
import {
  UploadContainer,
  ContentTypeSelector,
  ValidationMessage,
  ProgressIndicator,
  UploadActions,
  AccessibilityAnnouncer
} from './ContentUpload.styles';

const MAX_PHOTOS_PER_GAZETTE = 28;
const SUPPORTED_RTL_LANGUAGES = ['he', 'ar', 'yi'];

const ContentUpload: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { familyId } = useParams<{ familyId: string }>();

  // Content management hook
  const {
    handleUpload,
    handleTranslate,
    uploadProgress,
    error: uploadError
  } = useContent(familyId!, {
    validatePrintQuality: true,
    autoRefresh: true
  });

  // Local state
  const [contentType, setContentType] = useState<ContentType>(ContentType.PHOTO);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isUploading, setIsUploading] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string>('');

  // Check if current language is RTL
  const isRTL = SUPPORTED_RTL_LANGUAGES.includes(selectedLanguage);

  // Handle content type change
  const handleContentTypeChange = useCallback((type: ContentType) => {
    setContentType(type);
    setValidationMessage('');
  }, []);

  // Handle photo upload completion
  const handlePhotoUploadComplete = useCallback(async (uploadedPhotos: IContent[]) => {
    try {
      setIsUploading(true);
      
      // Translate content for all supported languages
      for (const photo of uploadedPhotos) {
        await handleTranslate(photo.id, SUPPORTED_LANGUAGES);
      }

      navigate(`/family/${familyId}/dashboard`);
    } catch (error) {
      setValidationMessage(t('upload.error.translation'));
    } finally {
      setIsUploading(false);
    }
  }, [familyId, handleTranslate, navigate, t]);

  // Handle text content submission
  const handleTextContentSubmit = useCallback(async (content: string) => {
    try {
      setIsUploading(true);

      const uploadedContent = await handleUpload(content, {
        type: ContentType.TEXT,
        language: selectedLanguage,
        familyId
      });

      await handleTranslate(uploadedContent.id, SUPPORTED_LANGUAGES);
      navigate(`/family/${familyId}/dashboard`);
    } catch (error) {
      setValidationMessage(t('upload.error.submission'));
    } finally {
      setIsUploading(false);
    }
  }, [familyId, handleUpload, handleTranslate, navigate, selectedLanguage, t]);

  // Handle validation errors
  const handleValidationError = useCallback((error: string) => {
    setValidationMessage(error);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setValidationMessage('');
      setIsUploading(false);
    };
  }, []);

  return (
    <UploadContainer
      role="main"
      aria-label={t('upload.page.title')}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <h1>{t('upload.page.title')}</h1>

      <ContentTypeSelector role="radiogroup" aria-label={t('upload.type.select')}>
        <button
          role="radio"
          aria-checked={contentType === ContentType.PHOTO}
          onClick={() => handleContentTypeChange(ContentType.PHOTO)}
        >
          {t('upload.type.photo')}
        </button>
        <button
          role="radio"
          aria-checked={contentType === ContentType.TEXT}
          onClick={() => handleContentTypeChange(ContentType.TEXT)}
        >
          {t('upload.type.text')}
        </button>
      </ContentTypeSelector>

      {contentType === ContentType.PHOTO ? (
        <PhotoUpload
          onUploadComplete={handlePhotoUploadComplete}
          onError={handleValidationError}
          onProgress={setIsUploading}
          maxPhotos={MAX_PHOTOS_PER_GAZETTE}
          familyId={familyId!}
          allowedFileTypes={SUPPORTED_MIME_TYPES}
          maxFileSize={MAX_CONTENT_SIZE}
          minResolution={MIN_IMAGE_RESOLUTION}
        />
      ) : (
        <TextEditor
          language={selectedLanguage}
          onChange={handleTextContentSubmit}
          isRTL={isRTL}
          ariaLabel={t('upload.text.editor')}
          onValidationError={handleValidationError}
        />
      )}

      {validationMessage && (
        <ValidationMessage
          role="alert"
          aria-live="polite"
          hasError={!!uploadError}
        >
          {validationMessage}
        </ValidationMessage>
      )}

      {isUploading && (
        <ProgressIndicator
          progress={uploadProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={uploadProgress}
          aria-label={t('upload.progress.label')}
        />
      )}

      <UploadActions>
        <button
          onClick={() => navigate(`/family/${familyId}/dashboard`)}
          disabled={isUploading}
          aria-label={t('upload.cancel')}
        >
          {t('upload.cancel')}
        </button>
      </UploadActions>

      <AccessibilityAnnouncer
        role="status"
        aria-live="polite"
        className="sr-only"
      >
        {isUploading ? t('upload.progress.uploading') : ''}
        {uploadError ? t('upload.error.generic') : ''}
      </AccessibilityAnnouncer>
    </UploadContainer>
  );
};

export default ContentUpload;