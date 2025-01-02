import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import '@testing-library/jest-dom';

import PhotoGrid from './PhotoGrid';
import { IContent, ContentType, ContentStatus } from '../../../interfaces/content.interface';

// Test constants
const TEST_PHOTO_URL = 'https://example.com/test-photo.jpg';
const VIEWPORT_SIZES = {
  mobile: { width: 320, height: 568 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1024, height: 768 }
};

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));
window.IntersectionObserver = mockIntersectionObserver;

// Mock ResizeObserver
window.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// Helper function to create mock photo content
const createMockPhoto = (id: string, status = ContentStatus.READY, overrides = {}): IContent => ({
  id: id as any, // Type assertion for UUID
  type: ContentType.PHOTO,
  url: TEST_PHOTO_URL,
  creatorId: 'creator123' as any,
  familyId: 'family123' as any,
  metadata: {
    description: 'Test photo',
    originalLanguage: 'en',
    width: 1200,
    height: 800,
    size: 1024000,
    mimeType: 'image/jpeg',
    dpi: 300,
    colorSpace: 'RGB',
    quality: 90,
    printReady: true,
    ...overrides.metadata
  },
  translations: [],
  status,
  gazetteIds: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  processingErrors: [],
  printReady: true,
  ...overrides
});

// Mock photos array
const MOCK_PHOTOS = [
  createMockPhoto('photo1'),
  createMockPhoto('photo2'),
  createMockPhoto('photo3')
];

describe('PhotoGrid Component', () => {
  // Common test setup
  const mockOnSelect = jest.fn();
  const mockOnError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Rendering', () => {
    test('renders photos in correct grid layout', () => {
      const { container } = render(
        <PhotoGrid photos={MOCK_PHOTOS} />
      );
      
      const gridContainer = container.firstChild;
      expect(gridContainer).toHaveStyle({
        display: 'grid'
      });
      expect(screen.getAllByRole('button')).toHaveLength(MOCK_PHOTOS.length);
    });

    test('implements responsive design breakpoints', () => {
      Object.values(VIEWPORT_SIZES).forEach(size => {
        window.innerWidth = size.width;
        window.innerHeight = size.height;
        window.dispatchEvent(new Event('resize'));
        
        const { container } = render(<PhotoGrid photos={MOCK_PHOTOS} />);
        const gridContainer = container.firstChild;
        
        // Verify grid columns based on viewport
        if (size.width < 768) {
          expect(gridContainer).toHaveStyle({
            'grid-template-columns': 'repeat(2, 1fr)'
          });
        } else if (size.width < 1024) {
          expect(gridContainer).toHaveStyle({
            'grid-template-columns': 'repeat(3, 1fr)'
          });
        } else {
          expect(gridContainer).toHaveStyle({
            'grid-template-columns': 'repeat(4, 1fr)'
          });
        }
      });
    });

    test('supports RTL layout direction', () => {
      const { container } = render(
        <div dir="rtl">
          <PhotoGrid photos={MOCK_PHOTOS} />
        </div>
      );
      
      expect(container.firstChild).toHaveStyle({
        direction: 'inherit'
      });
    });
  });

  describe('Interaction Behavior', () => {
    test('handles photo selection correctly', async () => {
      render(
        <PhotoGrid
          photos={MOCK_PHOTOS}
          selectable={true}
          onSelect={mockOnSelect}
          selectedIds={['photo1']}
        />
      );

      const photoItems = screen.getAllByRole('button');
      expect(photoItems[0]).toHaveAttribute('aria-selected', 'true');
      
      await userEvent.click(photoItems[1]);
      expect(mockOnSelect).toHaveBeenCalledWith('photo2');
    });

    test('supports keyboard navigation', async () => {
      render(
        <PhotoGrid
          photos={MOCK_PHOTOS}
          selectable={true}
          onSelect={mockOnSelect}
        />
      );

      const photoItems = screen.getAllByRole('button');
      photoItems[0].focus();

      await userEvent.keyboard('{Enter}');
      expect(mockOnSelect).toHaveBeenCalledWith('photo1');

      await userEvent.keyboard('{Tab}');
      expect(photoItems[1]).toHaveFocus();
    });
  });

  describe('Performance', () => {
    test('implements virtual scrolling correctly', async () => {
      const manyPhotos = Array.from({ length: 50 }, (_, i) => 
        createMockPhoto(`photo${i}`)
      );

      render(
        <PhotoGrid
          photos={manyPhotos}
          virtualScrolling={true}
        />
      );

      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(screen.getAllByRole('button').length).toBeLessThan(manyPhotos.length);
    });

    test('optimizes image loading', async () => {
      render(<PhotoGrid photos={MOCK_PHOTOS} />);

      const images = screen.getAllByRole('img');
      expect(images[0]).toHaveAttribute('loading', 'lazy');
      
      // Simulate image load
      fireEvent.load(images[0]);
      expect(images[0]).toHaveClass('loaded');
    });
  });

  describe('Accessibility', () => {
    test('provides correct ARIA attributes', () => {
      render(<PhotoGrid photos={MOCK_PHOTOS} />);

      expect(screen.getByRole('grid')).toHaveAttribute('aria-label', 'Photo grid');
      
      const photoItems = screen.getAllByRole('button');
      photoItems.forEach(item => {
        expect(item).toHaveAttribute('aria-label');
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    test('maintains proper focus management', async () => {
      render(
        <PhotoGrid
          photos={MOCK_PHOTOS}
          selectable={true}
        />
      );

      const photoItems = screen.getAllByRole('button');
      
      await userEvent.tab();
      expect(photoItems[0]).toHaveFocus();

      await userEvent.keyboard('{Tab}');
      expect(photoItems[1]).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    test('handles loading errors gracefully', async () => {
      render(
        <PhotoGrid
          photos={MOCK_PHOTOS}
          onError={mockOnError}
        />
      );

      const firstImage = screen.getAllByRole('img')[0];
      fireEvent.error(firstImage);

      expect(mockOnError).toHaveBeenCalledWith(
        expect.any(Error)
      );
    });

    test('displays appropriate error states', () => {
      const errorPhoto = createMockPhoto('error1', ContentStatus.ERROR);
      render(
        <PhotoGrid
          photos={[errorPhoto]}
          errorFallback={<div>Error loading image</div>}
        />
      );

      expect(screen.getByText('Error loading image')).toBeInTheDocument();
    });
  });
});