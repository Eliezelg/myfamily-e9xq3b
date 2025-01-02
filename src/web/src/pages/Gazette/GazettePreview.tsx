import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next'; // ^12.0.0
import { useNavigate, useParams } from 'react-router-dom'; // ^6.8.0

import { Preview } from '../../components/gazette/Preview/Preview';
import { useGazette } from '../../hooks/useGazette';

// Print production constants
const PRINT_SPECS = {
  pageWidth: 210, // A4 width in mm
  pageHeight: 297, // A4 height in mm
  bleed: 3, // Standard bleed in mm
  colorProfile: 'Fogra39', // Professional print color profile
  dpi: 300, // Print resolution
  safeArea: 5 // Safe area margin in mm
} as const;

// Navigation and zoom constants
const INITIAL_PAGE = 1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const DEFAULT_ZOOM = 1.0;

/**
 * GazettePreview component providing interactive preview interface
 * with professional print specifications and responsive design
 */
const GazettePreview: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gazetteId } = useParams<{ gazetteId: string }>();

  // Local state management
  const [currentPage, setCurrentPage] = useState(INITIAL_PAGE);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Custom hook for gazette operations
  const {
    gazette,
    previewUrl,
    isLoading,
    error,
    performance,
    getPreview,
    validatePrintSpecs,
    approveForPrint
  } = useGazette(gazetteId || '');

  // Load preview on mount and page change
  useEffect(() => {
    if (gazetteId) {
      getPreview(gazetteId);
    }
  }, [gazetteId, currentPage]);

  /**
   * Enhanced page navigation with analytics
   */
  const handlePageChange = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= (gazette?.layout?.totalPages || 1)) {
      setCurrentPage(pageNumber);
      // Track page navigation for analytics
      window.dispatchEvent(new CustomEvent('gazettePreviewPageChange', {
        detail: { gazetteId, page: pageNumber }
      }));
    }
  }, [gazetteId, gazette]);

  /**
   * Enhanced zoom control with smooth transitions
   */
  const handleZoomChange = useCallback((newZoom: number) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setZoom(clampedZoom);
    // Track zoom changes for analytics
    window.dispatchEvent(new CustomEvent('gazettePreviewZoom', {
      detail: { gazetteId, zoom: clampedZoom }
    }));
  }, [gazetteId]);

  /**
   * Print approval workflow with validation
   */
  const handlePrintApproval = useCallback(async () => {
    if (!gazette) return;

    try {
      // Validate print specifications
      const isValid = await validatePrintSpecs(gazette.layout);
      if (!isValid) {
        throw new Error(t('gazette.preview.errors.invalidSpecs'));
      }

      // Approve for print
      await approveForPrint(gazette.id);
      
      // Track successful approval
      window.dispatchEvent(new CustomEvent('gazettePrintApproved', {
        detail: { gazetteId: gazette.id }
      }));

      // Navigate to confirmation
      navigate(`/gazette/${gazette.id}/confirmation`);
    } catch (error: any) {
      console.error('Print approval failed:', error);
      // Handle error state
    }
  }, [gazette, validatePrintSpecs, approveForPrint, navigate, t]);

  /**
   * Handle keyboard shortcuts
   */
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          handlePageChange(currentPage - 1);
          break;
        case 'ArrowRight':
          handlePageChange(currentPage + 1);
          break;
        case '+':
          handleZoomChange(zoom + 0.1);
          break;
        case '-':
          handleZoomChange(zoom - 0.1);
          break;
        case 'p':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setIsPrintModalOpen(true);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPage, zoom, handlePageChange, handleZoomChange]);

  // Error state rendering
  if (error) {
    return (
      <div role="alert" className="gazette-preview-error">
        <h2>{t('gazette.preview.errorTitle')}</h2>
        <p>{error.message}</p>
        <button onClick={() => navigate(-1)}>
          {t('common.actions.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="gazette-preview-container">
      <h1>{t('gazette.preview.title')}</h1>

      {/* Print specifications info */}
      <div className="print-specs-info" aria-label={t('gazette.preview.printSpecs')}>
        <p>{t('gazette.preview.format', { format: 'A4' })}</p>
        <p>{t('gazette.preview.resolution', { dpi: PRINT_SPECS.dpi })}</p>
        <p>{t('gazette.preview.bleed', { bleed: PRINT_SPECS.bleed })}</p>
      </div>

      {/* Main preview component */}
      <Preview
        gazette={gazette}
        previewUrl={previewUrl}
        currentPage={currentPage}
        zoom={zoom}
        isLoading={isLoading}
        printSpec={{
          pageWidth: PRINT_SPECS.pageWidth,
          pageHeight: PRINT_SPECS.pageHeight,
          bleed: PRINT_SPECS.bleed,
          colorProfile: PRINT_SPECS.colorProfile,
          dpi: PRINT_SPECS.dpi,
          safeArea: PRINT_SPECS.safeArea
        }}
        onPageChange={handlePageChange}
        onZoomChange={handleZoomChange}
        onPrintRequest={() => setIsPrintModalOpen(true)}
        accessibility={{
          ariaLabels: {
            preview: t('gazette.preview.ariaLabel'),
            nextPage: t('gazette.preview.nextPage'),
            prevPage: t('gazette.preview.prevPage'),
            zoomIn: t('gazette.preview.zoomIn'),
            zoomOut: t('gazette.preview.zoomOut')
          },
          keyboardShortcuts: true,
          highContrast: false
        }}
      />

      {/* Print approval modal */}
      {isPrintModalOpen && (
        <div 
          className="print-modal"
          role="dialog"
          aria-labelledby="print-modal-title"
        >
          <h2 id="print-modal-title">{t('gazette.preview.confirmPrint')}</h2>
          <div className="print-modal-content">
            <p>{t('gazette.preview.printWarning')}</p>
            <div className="print-modal-actions">
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="button-secondary"
              >
                {t('common.actions.cancel')}
              </button>
              <button 
                onClick={handlePrintApproval}
                className="button-primary"
              >
                {t('gazette.preview.approve')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance metrics (development only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="performance-metrics">
          <p>Generation Time: {performance.generationTime}ms</p>
          <p>Preview Load Time: {performance.previewLoadTime}ms</p>
          <p>Validation Time: {performance.validationTime}ms</p>
        </div>
      )}
    </div>
  );
};

export default GazettePreview;