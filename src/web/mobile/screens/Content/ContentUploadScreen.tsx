/**
 * @fileoverview Enhanced mobile screen component for content upload with print quality validation
 * Supports multi-language content, image quality assessment, and gazette-ready validation
 * @version 1.0.0
 * @package MyFamily Mobile
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native'; // v0.71+
import { useTranslation, Trans } from 'react-i18next'; // v22.0.0
import { launchImageLibrary } from 'react-native-image-picker'; // v5.0.0

// Internal imports
import { useContent } from '../../../../src/hooks/useContent';
import { IContent } from '../../../../src/interfaces/content.interface';
import { KeyboardAvoidingView } from '../../components/common/KeyboardAvoidingView/KeyboardAvoidingView';
import { SafeAreaView } from '../../components/common/SafeAreaView/SafeAreaView';
import { TouchableRipple } from '../../components/common/TouchableRipple/TouchableRipple';
import { isIOS } from '../../utils/platform.util';

// Constants
const MAX_IMAGE_SIZE = 10485760; // 10MB
const MIN_IMAGE_RESOLUTION = 300;
const MIN_DPI = 300;
const SUPPORTED_LANGUAGES = ['en', 'he', 'fr', 'es', 'de', 'ru', 'ar', 'zh'];
const SUPPORTED_COLOR_SPACES = ['RGB', 'CMYK'];

interface ContentUploadScreenProps {
  navigation: any;
}

const ContentUploadScreen: React.FC<ContentUploadScreenProps> = ({ navigation }) => {
  // Hooks
  const { t } = useTranslation();
  const { handleUpload, uploadProgress, validateImageQuality } = useContent();

  // State management
  const [selectedImage, setSelectedImage] = useState<any>(null);
  const [description, setDescription] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [printQualityMetrics, setPrintQualityMetrics] = useState<any>(null);

  /**
   * Enhanced image selection handler with print quality validation
   */
  const handleImageSelect = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 1,
        maxWidth: 4096,
        maxHeight: 4096,
        includeBase64: false,
        includeExtra: true,
      });

      if (result.assets && result.assets[0]) {
        const image = result.assets[0];

        // Validate image size
        if (image.fileSize && image.fileSize > MAX_IMAGE_SIZE) {
          throw new Error(t('errors.imageTooLarge'));
        }

        setIsValidating(true);
        setValidationError(null);

        // Validate image quality for print
        const qualityMetrics = await validateImageQuality({
          uri: image.uri!,
          width: image.width!,
          height: image.height!,
          type: image.type!,
        });

        if (qualityMetrics.dpi < MIN_DPI) {
          throw new Error(t('errors.lowResolution'));
        }

        setPrintQualityMetrics(qualityMetrics);
        setSelectedImage(image);
      }
    } catch (error) {
      setValidationError((error as Error).message);
    } finally {
      setIsValidating(false);
    }
  }, [t, validateImageQuality]);

  /**
   * Enhanced upload submission handler with quality checks
   */
  const handleUploadSubmit = useCallback(async () => {
    if (!selectedImage || !description.trim()) {
      setValidationError(t('errors.missingFields'));
      return;
    }

    try {
      await handleUpload({
        file: selectedImage,
        type: 'PHOTO',
        metadata: {
          description,
          originalLanguage: selectedLanguage,
          width: selectedImage.width,
          height: selectedImage.height,
          size: selectedImage.fileSize,
          mimeType: selectedImage.type,
          dpi: printQualityMetrics.dpi,
          colorSpace: printQualityMetrics.colorSpace,
          quality: printQualityMetrics.quality,
        },
      });

      navigation.goBack();
    } catch (error) {
      setValidationError((error as Error).message);
    }
  }, [selectedImage, description, selectedLanguage, printQualityMetrics, handleUpload, navigation, t]);

  return (
    <SafeAreaView edges respectRTL>
      <KeyboardAvoidingView behavior={isIOS() ? 'padding' : 'height'}>
        <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            {/* Image Selection Area */}
            <TouchableRipple
              onPress={handleImageSelect}
              style={styles.imageSelector}
              accessibilityLabel={t('accessibility.selectImage')}
            >
              {selectedImage ? (
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.selectedImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Text style={styles.placeholderText}>
                    {t('content.selectImage')}
                  </Text>
                </View>
              )}
            </TouchableRipple>

            {/* Validation Status */}
            {isValidating && (
              <View style={styles.validationContainer}>
                <ActivityIndicator size="small" color="#2196F3" />
                <Text style={styles.validationText}>
                  {t('content.validating')}
                </Text>
              </View>
            )}

            {/* Print Quality Metrics */}
            {printQualityMetrics && (
              <View style={styles.metricsContainer}>
                <Text style={styles.metricsTitle}>
                  {t('content.printQuality')}
                </Text>
                <Text style={styles.metricItem}>
                  {t('content.resolution')}: {printQualityMetrics.dpi} DPI
                </Text>
                <Text style={styles.metricItem}>
                  {t('content.colorSpace')}: {printQualityMetrics.colorSpace}
                </Text>
                <Text style={styles.metricItem}>
                  {t('content.quality')}: {printQualityMetrics.quality}%
                </Text>
              </View>
            )}

            {/* Error Display */}
            {validationError && (
              <Text style={styles.errorText}>{validationError}</Text>
            )}

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
                <Text style={styles.progressText}>{uploadProgress}%</Text>
              </View>
            )}

            {/* Submit Button */}
            <TouchableRipple
              onPress={handleUploadSubmit}
              style={[
                styles.submitButton,
                (!selectedImage || !description) && styles.submitButtonDisabled,
              ]}
              disabled={!selectedImage || !description || isValidating}
              accessibilityLabel={t('accessibility.upload')}
            >
              <Text style={styles.submitButtonText}>
                {t('content.upload')}
              </Text>
            </TouchableRipple>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  imageSelector: {
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#757575',
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  validationText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  metricsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  metricItem: {
    fontSize: 14,
    color: '#424242',
    marginVertical: 4,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    marginTop: 8,
  },
  progressContainer: {
    marginTop: 16,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    textAlign: 'right',
  },
  submitButton: {
    marginTop: 24,
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#BDBDBD',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ContentUploadScreen;