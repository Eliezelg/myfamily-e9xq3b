import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { useGesture } from 'react-use-gesture'; // ^9.1.3

import {
  PreviewContainer,
  PreviewContent,
  NavigationControls,
  ZoomControls,
  PageIndicator,
  SafeAreaGuide,
  BleedAreaGuide,
  TouchGestureHandler
} from './Preview.styles';

import { IGazette, PrintSpecification } from '../../../interfaces/gazette.interface';
import { gazetteService } from '../../../services/gazette.service';

// Constants for zoom and print specifications
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.1;
const DEFAULT_ZOOM = 1.0;
const PRINT_DPI = 300;
const BLEED_MM = 3;
const PAGE_DIMENSIONS = {
  width: 210,
  height: 297,
  units: 'mm'
} as const;

// Component interfaces
interface PreviewProps {
  gazette: IGazette;
  onPageChange?: (page: number) => void;
  onZoomChange?: (zoom: number) => void;
  onPrintRequest?: () => void;
  onError?: (error: PreviewError) => void;
  isRTL?: boolean;
  accessibility?: AccessibilityConfig;
  printSpec?: PrintSpecification;
}

interface PreviewError {
  code: string;
  message: string;
  details?: any;
}

interface AccessibilityConfig {
  ariaLabels: Record<string, string>;
  keyboardShortcuts: boolean;
  highContrast: boolean;
}

interface PreviewState {
  currentPage: number;
  totalPages: number;
  zoom: number;
  loading: boolean;
  previewUrl: string | null;
  error: PreviewError | null;
}

const Preview: React.FC<PreviewProps> = ({
  gazette,
  onPageChange,
  onZoomChange,
  onPrintRequest,
  onError,
  isRTL = false,
  accessibility = {
    ariaLabels: {},
    keyboardShortcuts: true,
    highContrast: false
  },
  printSpec
}) => {
  const { t } = useTranslation();
  const previewRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [state, setState] = useState<PreviewState>({
    currentPage: 1,
    totalPages: 1,
    zoom: DEFAULT_ZOOM,
    loading: true,
    previewUrl: null,
    error: null
  });

  // Touch gesture handling
  const bind = useGesture({
    onPinch: ({ offset: [scale] }) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));
      handleZoomChange(newZoom);
    },
    onDrag: ({ movement: [x], direction: [xDir] }) => {
      if (Math.abs(x) > 50) {
        handlePageChange(xDir > 0 ? -1 : 1);
      }
    }
  });

  // Load preview content
  useEffect(() => {
    loadPreview();
  }, [gazette.id, state.currentPage]);

  const loadPreview = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      const previewUrl = await gazetteService.getGazettePreview(gazette.id, {
        quality: 'high',
        page: state.currentPage,
        zoom: state.zoom
      });

      setState(prev => ({
        ...prev,
        previewUrl,
        loading: false,
        error: null
      }));
    } catch (error: any) {
      const previewError: PreviewError = {
        code: 'PREVIEW_LOAD_ERROR',
        message: error.message
      };
      
      setState(prev => ({
        ...prev,
        loading: false,
        error: previewError
      }));
      
      onError?.(previewError);
    }
  };

  // Page navigation handling
  const handlePageChange = useCallback((delta: number) => {
    setState(prev => {
      const newPage = Math.max(1, Math.min(prev.totalPages, prev.currentPage + delta));
      if (newPage !== prev.currentPage) {
        onPageChange?.(newPage);
        return { ...prev, currentPage: newPage };
      }
      return prev;
    });
  }, [onPageChange]);

  // Zoom handling
  const handleZoomChange = useCallback((newZoom: number) => {
    setState(prev => {
      const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
      onZoomChange?.(clampedZoom);
      return { ...prev, zoom: clampedZoom };
    });
  }, [onZoomChange]);

  // Keyboard navigation
  useEffect(() => {
    if (!accessibility.keyboardShortcuts) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePageChange(isRTL ? 1 : -1);
          break;
        case 'ArrowRight':
          handlePageChange(isRTL ? -1 : 1);
          break;
        case '+':
          handleZoomChange(state.zoom + ZOOM_STEP);
          break;
        case '-':
          handleZoomChange(state.zoom - ZOOM_STEP);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [accessibility.keyboardShortcuts, handlePageChange, handleZoomChange, isRTL, state.zoom]);

  // Print preparation
  const handlePrintRequest = useCallback(() => {
    if (printSpec && printSpec.resolution < PRINT_DPI) {
      const error: PreviewError = {
        code: 'PRINT_RESOLUTION_ERROR',
        message: t('gazette.preview.errors.lowResolution'),
        details: { required: PRINT_DPI, current: printSpec.resolution }
      };
      onError?.(error);
      return;
    }
    onPrintRequest?.();
  }, [printSpec, onPrintRequest, onError, t]);

  return (
    <PreviewContainer
      ref={previewRef}
      dir={isRTL ? 'rtl' : 'ltr'}
      role="region"
      aria-label={accessibility.ariaLabels.preview || t('gazette.preview.ariaLabel')}
      {...bind()}
    >
      {state.loading && (
        <div role="progressbar" aria-label={t('gazette.preview.loading')}>
          {t('gazette.preview.loading')}
        </div>
      )}

      {state.error && (
        <div role="alert" aria-live="assertive">
          {state.error.message}
        </div>
      )}

      {state.previewUrl && (
        <PreviewContent
          zoom={state.zoom}
          style={{
            backgroundImage: `url(${state.previewUrl})`,
            filter: accessibility.highContrast ? 'contrast(1.5)' : 'none'
          }}
          aria-label={t('gazette.preview.pageContent', { page: state.currentPage })}
        >
          <SafeAreaGuide aria-hidden="true" />
          <BleedAreaGuide aria-hidden="true" />
        </PreviewContent>
      )}

      <NavigationControls>
        <button
          onClick={() => handlePageChange(-1)}
          disabled={state.currentPage === 1}
          aria-label={t('gazette.preview.previousPage')}
        >
          {isRTL ? '→' : '←'}
        </button>

        <PageIndicator>
          {t('gazette.preview.pageIndicator', {
            current: state.currentPage,
            total: state.totalPages
          })}
        </PageIndicator>

        <button
          onClick={() => handlePageChange(1)}
          disabled={state.currentPage === state.totalPages}
          aria-label={t('gazette.preview.nextPage')}
        >
          {isRTL ? '←' : '→'}
        </button>
      </NavigationControls>

      <ZoomControls>
        <button
          onClick={() => handleZoomChange(state.zoom - ZOOM_STEP)}
          disabled={state.zoom <= MIN_ZOOM}
          aria-label={t('gazette.preview.zoomOut')}
        >
          -
        </button>
        <button
          onClick={() => handleZoomChange(state.zoom + ZOOM_STEP)}
          disabled={state.zoom >= MAX_ZOOM}
          aria-label={t('gazette.preview.zoomIn')}
        >
          +
        </button>
      </ZoomControls>

      <button
        onClick={handlePrintRequest}
        disabled={!!state.error || state.loading}
        aria-label={t('gazette.preview.printRequest')}
      >
        {t('gazette.preview.print')}
      </button>
    </PreviewContainer>
  );
};

export default Preview;