import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import PhotoUpload from './PhotoUpload';
import { validatePhotoUpload } from '../../../utils/validation.util';
import ContentService from '../../../services/content.service';
import { ContentType } from '../../../interfaces/content.interface';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock content service and validation utility
jest.mock('../../../services/content.service');
jest.mock('../../../utils/validation.util');

// Mock file creation utility
const createMockFile = (
  name: string,
  size: number,
  type: string,
  resolution = 300,
  colorSpace = 'CMYK'
): File => {
  const file = new File([''], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  Object.defineProperty(file, 'resolution', { value: resolution });
  Object.defineProperty(file, 'colorSpace', { value: colorSpace });
  return file;
};

describe('PhotoUpload Component', () => {
  const mockOnUploadComplete = jest.fn();
  const mockOnError = jest.fn();
  const mockOnProgress = jest.fn();
  const defaultProps = {
    onUploadComplete: mockOnUploadComplete,
    onError: mockOnError,
    onProgress: mockOnProgress,
    maxPhotos: 28,
    familyId: 'test-family-id'
  };

  // Mock files for testing
  const validPhoto = createMockFile('valid.jpg', 5242880, 'image/jpeg');
  const invalidSizePhoto = createMockFile('large.jpg', 15728640, 'image/jpeg');
  const invalidTypePhoto = createMockFile('invalid.gif', 5242880, 'image/gif');
  const lowResPhoto = createMockFile('lowres.jpg', 5242880, 'image/jpeg', 72);
  const invalidColorSpacePhoto = createMockFile('rgb.jpg', 5242880, 'image/jpeg', 300, 'RGB');

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset validation mock
    (validatePhotoUpload as jest.Mock).mockImplementation(async (file) => {
      if (file === invalidSizePhoto) throw new Error('File size exceeds limit');
      if (file === invalidTypePhoto) throw new Error('Invalid file type');
      if (file === lowResPhoto) throw new Error('Resolution below minimum');
      if (file === invalidColorSpacePhoto) throw new Error('Invalid color space');
      return true;
    });
  });

  test('renders upload area with accessibility attributes', async () => {
    const { container } = render(<PhotoUpload {...defaultProps} />);
    
    // Check accessibility
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    
    // Verify ARIA attributes
    const uploadArea = screen.getByRole('region');
    expect(uploadArea).toHaveAttribute('aria-label');
    
    const dropzone = screen.getByText(/drag photos here/i);
    expect(dropzone).toBeInTheDocument();
  });

  test('handles drag and drop file upload', async () => {
    render(<PhotoUpload {...defaultProps} />);
    
    const dropzone = screen.getByText(/drag photos here/i).parentElement!;
    
    // Simulate drag and drop
    fireEvent.dragEnter(dropzone);
    expect(dropzone).toHaveStyle({ opacity: '0.6' });
    
    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: {
          files: [validPhoto]
        }
      });
    });
    
    // Verify preview is shown
    const preview = await screen.findByRole('list');
    expect(preview).toBeInTheDocument();
  });

  test('validates photo quality requirements', async () => {
    render(<PhotoUpload {...defaultProps} />);
    
    // Test invalid resolution
    await act(async () => {
      fireEvent.drop(screen.getByText(/drag photos here/i).parentElement!, {
        dataTransfer: {
          files: [lowResPhoto]
        }
      });
    });
    
    expect(await screen.findByRole('alert')).toHaveTextContent(/resolution below minimum/i);
    
    // Test invalid color space
    await act(async () => {
      fireEvent.drop(screen.getByText(/drag photos here/i).parentElement!, {
        dataTransfer: {
          files: [invalidColorSpacePhoto]
        }
      });
    });
    
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid color space/i);
  });

  test('enforces file size and type restrictions', async () => {
    render(<PhotoUpload {...defaultProps} />);
    
    // Test file size limit
    await act(async () => {
      fireEvent.drop(screen.getByText(/drag photos here/i).parentElement!, {
        dataTransfer: {
          files: [invalidSizePhoto]
        }
      });
    });
    
    expect(await screen.findByRole('alert')).toHaveTextContent(/file size exceeds limit/i);
    
    // Test file type restriction
    await act(async () => {
      fireEvent.drop(screen.getByText(/drag photos here/i).parentElement!, {
        dataTransfer: {
          files: [invalidTypePhoto]
        }
      });
    });
    
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid file type/i);
  });

  test('tracks upload progress', async () => {
    const mockUploadContent = jest.fn().mockImplementation(() => {
      window.dispatchEvent(new CustomEvent('contentUploadProgress', {
        detail: { fileId: 'test', progress: 50 }
      }));
      return Promise.resolve({ id: 'test', type: ContentType.PHOTO });
    });
    
    (ContentService as jest.Mock).mockImplementation(() => ({
      uploadContent: mockUploadContent
    }));
    
    render(<PhotoUpload {...defaultProps} />);
    
    // Upload valid file
    await act(async () => {
      fireEvent.drop(screen.getByText(/drag photos here/i).parentElement!, {
        dataTransfer: {
          files: [validPhoto]
        }
      });
    });
    
    const uploadButton = screen.getByRole('button', { name: /upload/i });
    await act(async () => {
      fireEvent.click(uploadButton);
    });
    
    expect(mockOnProgress).toHaveBeenCalledWith(50);
  });

  test('supports keyboard navigation and screen readers', async () => {
    render(<PhotoUpload {...defaultProps} />);
    
    const dropzone = screen.getByText(/drag photos here/i).parentElement!;
    
    // Test keyboard focus
    await userEvent.tab();
    expect(dropzone).toHaveFocus();
    
    // Test keyboard upload
    await userEvent.keyboard('{enter}');
    const input = screen.getByLabelText(/upload/i);
    expect(input).toBeInTheDocument();
    
    // Verify screen reader text
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
  });

  test('handles multiple file upload within limits', async () => {
    render(<PhotoUpload {...defaultProps} />);
    
    // Try to upload more than maximum allowed
    const files = Array(29).fill(validPhoto);
    
    await act(async () => {
      fireEvent.drop(screen.getByText(/drag photos here/i).parentElement!, {
        dataTransfer: {
          files
        }
      });
    });
    
    expect(mockOnError).toHaveBeenCalledWith(expect.any(Error));
    expect(mockOnError.mock.calls[0][0].message).toMatch(/too many files/i);
  });

  test('allows removal of uploaded files', async () => {
    render(<PhotoUpload {...defaultProps} />);
    
    // Upload a file
    await act(async () => {
      fireEvent.drop(screen.getByText(/drag photos here/i).parentElement!, {
        dataTransfer: {
          files: [validPhoto]
        }
      });
    });
    
    // Find and click remove button
    const removeButton = await screen.findByRole('button', { name: /remove/i });
    await userEvent.click(removeButton);
    
    // Verify file is removed
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});