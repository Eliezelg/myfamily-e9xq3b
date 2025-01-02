import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest, expect } from '@jest/globals';
import MatchMediaMock from 'jest-matchmedia-mock';
import { ThemeProvider } from '@mui/material';

import Preview from './Preview';
import { IGazette, GazetteStatus, PrintSpecification } from '../../../interfaces/gazette.interface';
import { theme } from '../../../styles/theme.styles';

// Mock gazette service
jest.mock('../../../services/gazette.service', () => ({
  gazetteService: {
    getGazettePreview: jest.fn().mockResolvedValue('test-preview-url')
  }
}));

// Mock data setup
const mockGazette: IGazette = {
  id: 'test-gazette-id',
  familyId: 'test-family-id',
  status: GazetteStatus.READY_FOR_PRINT,
  layout: {
    pageSize: 'A4',
    colorSpace: 'CMYK',
    resolution: 300,
    bleed: 3,
    binding: 'PERFECT',
    style: 'CLASSIC'
  },
  contentIds: ['content-1', 'content-2'],
  generatedUrl: null,
  previewUrl: 'test-preview-url',
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockPrintSpec: PrintSpecification = {
  pageSize: 'A4',
  dimensions: {
    width: 210,
    height: 297,
    units: 'mm'
  },
  colorSpace: 'CMYK',
  resolution: 300,
  bleed: 3,
  binding: 'PERFECT',
  paperStock: {
    interior: '150gsm',
    cover: '250gsm'
  }
};

const mockHandlers = {
  onPageChange: jest.fn(),
  onZoomChange: jest.fn(),
  onPrintRequest: jest.fn(),
  onError: jest.fn()
};

// Viewport sizes for responsive testing
const viewportSizes = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 }
};

let matchMedia: MatchMediaMock;

// Custom render with theme provider
const renderWithTheme = (ui: React.ReactNode) => {
  return render(
    <ThemeProvider theme={theme}>
      {ui}
    </ThemeProvider>
  );
};

describe('Preview Component', () => {
  beforeEach(() => {
    matchMedia = new MatchMediaMock();
    jest.clearAllMocks();
  });

  afterEach(() => {
    matchMedia.clear();
  });

  it('should render preview component correctly', async () => {
    renderWithTheme(
      <Preview
        gazette={mockGazette}
        printSpec={mockPrintSpec}
        {...mockHandlers}
      />
    );

    // Verify initial render
    expect(screen.getByRole('region')).toBeInTheDocument();
    expect(screen.getByLabelText(/gazette preview/i)).toBeInTheDocument();

    // Verify navigation controls
    expect(screen.getByLabelText(/previous page/i)).toBeDisabled();
    expect(screen.getByLabelText(/next page/i)).toBeInTheDocument();
    expect(screen.getByText(/1/)).toBeInTheDocument();

    // Verify zoom controls
    expect(screen.getByLabelText(/zoom out/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zoom in/i)).toBeInTheDocument();

    // Verify print specifications display
    const previewContent = screen.getByLabelText(/page content/i);
    expect(previewContent).toHaveStyle({
      width: '210mm',
      height: '297mm'
    });
  });

  it('should handle page navigation correctly', async () => {
    renderWithTheme(
      <Preview
        gazette={mockGazette}
        printSpec={mockPrintSpec}
        {...mockHandlers}
      />
    );

    // Test next page navigation
    const nextButton = screen.getByLabelText(/next page/i);
    await userEvent.click(nextButton);
    expect(mockHandlers.onPageChange).toHaveBeenCalledWith(2);

    // Test keyboard navigation
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(mockHandlers.onPageChange).toHaveBeenCalledWith(2);

    // Test previous page navigation
    const prevButton = screen.getByLabelText(/previous page/i);
    await userEvent.click(prevButton);
    expect(mockHandlers.onPageChange).toHaveBeenCalledWith(1);
  });

  it('should handle zoom controls correctly', async () => {
    renderWithTheme(
      <Preview
        gazette={mockGazette}
        printSpec={mockPrintSpec}
        {...mockHandlers}
      />
    );

    // Test zoom in
    const zoomInButton = screen.getByLabelText(/zoom in/i);
    await userEvent.click(zoomInButton);
    expect(mockHandlers.onZoomChange).toHaveBeenCalledWith(1.1);

    // Test zoom out
    const zoomOutButton = screen.getByLabelText(/zoom out/i);
    await userEvent.click(zoomOutButton);
    expect(mockHandlers.onZoomChange).toHaveBeenCalledWith(0.9);

    // Test keyboard zoom controls
    fireEvent.keyDown(window, { key: '+' });
    expect(mockHandlers.onZoomChange).toHaveBeenCalled();
    fireEvent.keyDown(window, { key: '-' });
    expect(mockHandlers.onZoomChange).toHaveBeenCalled();
  });

  it('should handle touch gestures correctly', async () => {
    renderWithTheme(
      <Preview
        gazette={mockGazette}
        printSpec={mockPrintSpec}
        {...mockHandlers}
      />
    );

    const previewRegion = screen.getByRole('region');

    // Test swipe gesture
    fireEvent.touchStart(previewRegion, { touches: [{ clientX: 0, clientY: 0 }] });
    fireEvent.touchMove(previewRegion, { touches: [{ clientX: -100, clientY: 0 }] });
    fireEvent.touchEnd(previewRegion);

    await waitFor(() => {
      expect(mockHandlers.onPageChange).toHaveBeenCalled();
    });

    // Test pinch gesture
    fireEvent.touchStart(previewRegion, {
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 100, clientY: 0 }
      ]
    });
    fireEvent.touchMove(previewRegion, {
      touches: [
        { clientX: 0, clientY: 0 },
        { clientX: 200, clientY: 0 }
      ]
    });
    fireEvent.touchEnd(previewRegion);

    await waitFor(() => {
      expect(mockHandlers.onZoomChange).toHaveBeenCalled();
    });
  });

  it('should be responsive across different viewports', async () => {
    // Test mobile viewport
    matchMedia.useMediaQuery({ query: `(max-width: ${viewportSizes.mobile.width}px)` });
    const { rerender } = renderWithTheme(
      <Preview
        gazette={mockGazette}
        printSpec={mockPrintSpec}
        {...mockHandlers}
      />
    );

    expect(screen.getByRole('region')).toHaveStyle({
      transform: 'scale(0.5)'
    });

    // Test tablet viewport
    matchMedia.useMediaQuery({ query: `(min-width: ${viewportSizes.tablet.width}px)` });
    rerender(
      <ThemeProvider theme={theme}>
        <Preview
          gazette={mockGazette}
          printSpec={mockPrintSpec}
          {...mockHandlers}
        />
      </ThemeProvider>
    );

    expect(screen.getByRole('region')).toHaveStyle({
      transform: 'scale(0.75)'
    });
  });

  it('should handle errors correctly', async () => {
    const errorGazette = {
      ...mockGazette,
      status: GazetteStatus.ERROR
    };

    renderWithTheme(
      <Preview
        gazette={errorGazette}
        printSpec={mockPrintSpec}
        {...mockHandlers}
      />
    );

    // Verify error message display
    const errorMessage = await screen.findByRole('alert');
    expect(errorMessage).toBeInTheDocument();

    // Verify print button is disabled
    const printButton = screen.getByLabelText(/print request/i);
    expect(printButton).toBeDisabled();
  });

  it('should be accessible', async () => {
    renderWithTheme(
      <Preview
        gazette={mockGazette}
        printSpec={mockPrintSpec}
        {...mockHandlers}
        accessibility={{
          ariaLabels: {
            preview: 'Gazette preview area',
            nextPage: 'Go to next page',
            prevPage: 'Go to previous page'
          },
          keyboardShortcuts: true,
          highContrast: true
        }}
      />
    );

    // Test keyboard navigation
    const previewRegion = screen.getByRole('region');
    previewRegion.focus();
    
    fireEvent.keyDown(previewRegion, { key: 'ArrowRight' });
    expect(mockHandlers.onPageChange).toHaveBeenCalled();

    // Verify ARIA labels
    expect(screen.getByLabelText('Gazette preview area')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to next page')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to previous page')).toBeInTheDocument();

    // Verify high contrast mode
    const previewContent = screen.getByLabelText(/page content/i);
    expect(previewContent).toHaveStyle({
      filter: 'contrast(1.5)'
    });
  });
});