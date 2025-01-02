/**
 * Mobile-optimized Gazette Preview Screen
 * Version: 1.0.0
 * 
 * Provides touch-optimized interface for gazette preview, layout selection,
 * and print validation with enhanced accessibility features.
 */

import React, { useState, useEffect, useCallback, useRef, memo } from 'react'; // ^18.2.0
import {
  View,
  ScrollView,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
  Platform
} from 'react-native'; // ^0.71+
import WebView from 'react-native-webview'; // ^13.0.0

import SafeAreaViewWrapper from '../../components/common/SafeAreaView/SafeAreaView';
import { useGazette } from '../../../../src/hooks/useGazette';
import {
  IGazette,
  LayoutStyle,
  PrintQualityResult
} from '../../../../src/interfaces/gazette.interface';
import { scale, moderateScale, verticalScale } from '../../styles/responsive';

interface GazettePreviewScreenProps {
  navigation: any;
  route: {
    params: {
      familyId: string;
      gazetteId?: string;
    };
  };
}

const GazettePreviewScreen: React.FC<GazettePreviewScreenProps> = memo(({ navigation, route }) => {
  // Extract parameters
  const { familyId, gazetteId } = route.params;

  // Initialize gazette hook
  const {
    gazette,
    previewUrl,
    isLoading,
    generateGazette,
    getPreview,
    validatePrintSpecs
  } = useGazette(familyId);

  // Local state management
  const [selectedLayout, setSelectedLayout] = useState<LayoutStyle>(LayoutStyle.CLASSIC);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [validationStatus, setValidationStatus] = useState<PrintQualityResult | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const webViewRef = useRef<WebView>(null);

  // Load gazette preview on mount or layout change
  useEffect(() => {
    const loadPreview = async () => {
      if (gazetteId) {
        await getPreview(gazetteId);
      }
    };
    loadPreview();
  }, [gazetteId, selectedLayout]);

  // Handle layout style selection with animation
  const handleLayoutChange = useCallback(async (style: LayoutStyle) => {
    try {
      // Animate selection
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();

      setSelectedLayout(style);

      // Generate new gazette with selected layout
      const newGazette = await generateGazette(familyId, {
        style,
        pageSize: 'A4',
        colorSpace: 'CMYK',
        resolution: 300,
        bleed: 3,
        binding: 'PERFECT'
      });

      // Validate print specifications
      const isValid = await validatePrintSpecs(newGazette.layout);
      setValidationStatus(isValid ? 'VALID' : 'INVALID');

      // Animate preview appearance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
    } catch (error) {
      console.error('Layout change failed:', error);
    }
  }, [familyId, generateGazette, validatePrintSpecs]);

  // Handle zoom gestures
  const handleZoomGesture = useCallback((event: any) => {
    const newZoom = Math.max(0.5, Math.min(3, zoomLevel * event.scale));
    setZoomLevel(newZoom);
  }, [zoomLevel]);

  // Render layout selection buttons
  const renderLayoutOptions = () => (
    <View style={styles.layoutContainer}>
      {Object.values(LayoutStyle).map((style) => (
        <TouchableOpacity
          key={style}
          style={[
            styles.layoutButton,
            selectedLayout === style && styles.layoutButtonSelected
          ]}
          onPress={() => handleLayoutChange(style)}
          accessibilityLabel={`Select ${style.toLowerCase()} layout`}
          accessibilityRole="button"
        >
          <Text style={styles.layoutButtonText}>{style}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaViewWrapper>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Text style={styles.backButton}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Gazette Preview</Text>
        </View>

        {/* Preview Area */}
        <Animated.View
          style={[
            styles.previewContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {isLoading ? (
            <ActivityIndicator size="large" color="#2196F3" />
          ) : previewUrl ? (
            <WebView
              ref={webViewRef}
              source={{ uri: previewUrl }}
              style={styles.webView}
              onMessage={(event) => console.log('WebView message:', event.nativeEvent.data)}
              scrollEnabled={true}
              bounces={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              scalesPageToFit={true}
              accessibilityLabel="Gazette preview"
            />
          ) : (
            <Text style={styles.noPreviewText}>No preview available</Text>
          )}
        </Animated.View>

        {/* Layout Selection */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.layoutScroll}
        >
          {renderLayoutOptions()}
        </ScrollView>

        {/* Print Validation Status */}
        {validationStatus && (
          <View style={styles.validationContainer}>
            <Text style={[
              styles.validationText,
              validationStatus === 'VALID' ? styles.validText : styles.invalidText
            ]}>
              {validationStatus === 'VALID' ? 'Ready for Print' : 'Print Validation Failed'}
            </Text>
          </View>
        )}
      </View>
    </SafeAreaViewWrapper>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  backButton: {
    fontSize: moderateScale(24),
    marginRight: scale(16)
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '600'
  },
  previewContainer: {
    flex: 1,
    margin: scale(16),
    borderRadius: scale(8),
    overflow: 'hidden',
    backgroundColor: '#F5F5F5'
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent'
  },
  noPreviewText: {
    textAlign: 'center',
    padding: scale(20),
    color: '#757575'
  },
  layoutScroll: {
    maxHeight: verticalScale(60),
    paddingHorizontal: scale(16)
  },
  layoutContainer: {
    flexDirection: 'row',
    paddingVertical: verticalScale(8)
  },
  layoutButton: {
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    marginRight: scale(8),
    borderRadius: scale(20),
    backgroundColor: '#F0F0F0'
  },
  layoutButtonSelected: {
    backgroundColor: '#2196F3'
  },
  layoutButtonText: {
    color: '#000000',
    fontSize: moderateScale(14),
    fontWeight: '500'
  },
  validationContainer: {
    padding: scale(16),
    alignItems: 'center'
  },
  validationText: {
    fontSize: moderateScale(14),
    fontWeight: '500'
  },
  validText: {
    color: '#4CAF50'
  },
  invalidText: {
    color: '#F44336'
  }
});

// Set display name for debugging
GazettePreviewScreen.displayName = 'GazettePreviewScreen';

export default GazettePreviewScreen;