/**
 * @fileoverview Test suite for the Layout component
 * Version: 1.0.0
 * Tests print specifications compliance and layout functionality
 */

import React from 'react'; // v18.2.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // v13.4.0
import { expect, describe, it, beforeEach, afterEach } from '@jest/globals'; // v29.3.0
import { axe, toHaveNoViolations } from '@axe-core/react'; // v4.7.0
import Layout from './Layout';
import { IGazette, IGazetteLayout, LayoutStyle, PageSize, ColorSpace } from '../../../interfaces/gazette.interface';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock gazette data for testing
const mockGazette: IGazette = {
  id: 'test-gazette-id' as any,
  familyId: 'test-family-id' as any,
  status: 'DRAFT',
  layout: {
    pageSize: PageSize.A4,
    colorSpace: ColorSpace.CMYK,
    resolution: 300,
    bleed: 3,
    binding: 'PERFECT',
    style: LayoutStyle.CLASSIC
  },
  contentIds: ['content-1', 'content-2'],
  generatedUrl: null,
  previewUrl: null,
  createdAt: new Date(),
  updatedAt: new Date()
};

// Helper function to render Layout with test props
const renderLayout = (
  customGazette: Partial<IGazette> = {},
  isPreview: boolean = false,
  onLayoutChange?: (layout: IGazetteLayout) => void
) => {
  const gazette = { ...mockGazette, ...customGazette };
  return render(
    <Layout
      gazette={gazette}
      isPreview={isPreview}
      onLayoutChange={onLayoutChange}
    />
  );
};

describe('Layout Component', () => {
  // Print Specifications Tests
  describe('Print Specifications', () => {
    it('should render with correct A4 dimensions', () => {
      const { container } = renderLayout();
      const pageContainer = container.querySelector('[data-testid="gazette-layout"]');
      
      expect(pageContainer).toHaveStyle({
        width: '210mm',
        height: '297mm'
      });
    });

    it('should implement 3mm bleed area', () => {
      const { container } = renderLayout();
      const bleedArea = container.querySelector('.PrinterMarks');
      
      expect(bleedArea).toHaveStyle({
        top: '-3mm',
        right: '-3mm',
        bottom: '-3mm',
        left: '-3mm'
      });
    });

    it('should apply CMYK color space for print', () => {
      const { container } = renderLayout();
      const layout = container.querySelector('[data-testid="gazette-layout"]');
      
      expect(layout).toHaveStyle({
        colorProfile: 'Fogra39',
        colorSpace: 'cmyk'
      });
    });

    it('should maintain 300 DPI resolution', () => {
      const { container } = renderLayout();
      const contentArea = container.querySelector('.ContentArea');
      
      expect(contentArea).toHaveStyle({
        imageResolution: '300dpi'
      });
    });
  });

  // Layout Styles Tests
  describe('Layout Styles', () => {
    it('should render Classic layout correctly', () => {
      const { container } = renderLayout({
        layout: { ...mockGazette.layout, style: LayoutStyle.CLASSIC }
      });
      
      const grid = container.querySelector('.MuiGrid-container');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: '16px'
      });
    });

    it('should render Modern layout correctly', () => {
      const { container } = renderLayout({
        layout: { ...mockGazette.layout, style: LayoutStyle.MODERN }
      });
      
      const grid = container.querySelector('.MuiGrid-container');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: '24px'
      });
    });

    it('should render Compact layout correctly', () => {
      const { container } = renderLayout({
        layout: { ...mockGazette.layout, style: LayoutStyle.COMPACT }
      });
      
      const grid = container.querySelector('.MuiGrid-container');
      expect(grid).toHaveStyle({
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: '8px'
      });
    });
  });

  // Responsive Behavior Tests
  describe('Responsive Behavior', () => {
    beforeEach(() => {
      // Reset viewport before each test
      global.innerWidth = 1024;
      global.innerHeight = 768;
      global.dispatchEvent(new Event('resize'));
    });

    it('should scale correctly on mobile devices', async () => {
      global.innerWidth = 375;
      global.dispatchEvent(new Event('resize'));
      
      const { container } = renderLayout({}, true);
      const layout = container.querySelector('[data-testid="gazette-layout"]');
      
      await waitFor(() => {
        expect(layout).toHaveStyle({
          transform: 'scale(0.4)'
        });
      });
    });

    it('should scale correctly on tablet devices', async () => {
      global.innerWidth = 768;
      global.dispatchEvent(new Event('resize'));
      
      const { container } = renderLayout({}, true);
      const layout = container.querySelector('[data-testid="gazette-layout"]');
      
      await waitFor(() => {
        expect(layout).toHaveStyle({
          transform: 'scale(0.6)'
        });
      });
    });

    it('should scale correctly on desktop devices', async () => {
      const { container } = renderLayout({}, true);
      const layout = container.querySelector('[data-testid="gazette-layout"]');
      
      await waitFor(() => {
        expect(layout).toHaveStyle({
          transform: 'scale(0.8)'
        });
      });
    });
  });

  // Preview Mode Tests
  describe('Preview Mode', () => {
    it('should show safe area indicators in preview mode', () => {
      const { container } = renderLayout({}, true);
      const safeArea = container.querySelector('.SafeAreaIndicator');
      
      expect(safeArea).toBeInTheDocument();
      expect(safeArea).toHaveStyle({
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      });
    });

    it('should hide safe area indicators when not in preview mode', () => {
      const { container } = renderLayout({}, false);
      const safeArea = container.querySelector('.SafeAreaIndicator');
      
      expect(safeArea).not.toBeInTheDocument();
    });
  });

  // Accessibility Tests
  describe('Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderLayout();
      const results = await axe(container);
      
      expect(results).toHaveNoViolations();
    });

    it('should support RTL layout', () => {
      document.documentElement.setAttribute('dir', 'rtl');
      const { container } = renderLayout();
      const contentArea = container.querySelector('.ContentArea');
      
      expect(contentArea).toHaveStyle({
        direction: 'rtl'
      });
      
      // Cleanup
      document.documentElement.removeAttribute('dir');
    });
  });

  // Layout Change Callback Tests
  describe('Layout Change Callback', () => {
    it('should call onLayoutChange when layout updates', () => {
      const onLayoutChange = jest.fn();
      renderLayout({}, false, onLayoutChange);
      
      expect(onLayoutChange).toHaveBeenCalledWith(expect.objectContaining({
        resolution: 300,
        bleed: 3
      }));
    });
  });

  // Error Handling Tests
  describe('Error Handling', () => {
    it('should handle missing content gracefully', () => {
      const { container } = renderLayout({
        contentIds: []
      });
      
      const grid = container.querySelector('.MuiGrid-container');
      expect(grid).toBeEmptyDOMElement();
    });
  });
});