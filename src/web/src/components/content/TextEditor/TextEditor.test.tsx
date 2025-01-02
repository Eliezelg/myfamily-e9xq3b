import React from 'react';
import { render, fireEvent, waitFor, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import TextEditor from './TextEditor';
import { validateGazetteContent } from '../../../utils/validation.util';
import { ContentType } from '../../../interfaces/content.interface';

// Mock dependencies
jest.mock('../../../utils/validation.util');
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TextEditor Component', () => {
  // Test setup
  const mockOnChange = jest.fn();
  const mockOnValidationError = jest.fn();
  const defaultProps = {
    content: '',
    language: 'en' as const,
    onChange: mockOnChange,
    onValidationError: mockOnValidationError,
    maxLength: 500,
    placeholder: 'Enter text',
    isRTL: false,
    ariaLabel: 'Text editor'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (validateGazetteContent as jest.Mock).mockImplementation(() => true);
  });

  describe('Initialization and Rendering', () => {
    it('should render with default props', () => {
      render(<TextEditor {...defaultProps} />);
      
      expect(screen.getByRole('application')).toBeInTheDocument();
      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should initialize with provided content', () => {
      const content = 'Initial content';
      render(<TextEditor {...defaultProps} content={content} />);
      
      expect(screen.getByRole('textbox')).toHaveTextContent(content);
    });
  });

  describe('Text Editing Functionality', () => {
    it('should handle text input and trigger onChange', async () => {
      const user = userEvent.setup();
      render(<TextEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      await user.type(editor, 'Test content');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalledWith('Test content');
      });
    });

    it('should enforce character limit', async () => {
      const user = userEvent.setup();
      render(<TextEditor {...defaultProps} maxLength={10} />);
      
      const editor = screen.getByRole('textbox');
      await user.type(editor, 'This is a very long text');
      
      expect(mockOnValidationError).toHaveBeenCalled();
    });
  });

  describe('Formatting Controls', () => {
    it('should apply bold formatting', async () => {
      const user = userEvent.setup();
      render(<TextEditor {...defaultProps} />);
      
      const boldButton = screen.getByRole('button', { name: /editor.toolbar.bold/i });
      await user.click(boldButton);
      
      expect(boldButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('should apply italic formatting', async () => {
      const user = userEvent.setup();
      render(<TextEditor {...defaultProps} />);
      
      const italicButton = screen.getByRole('button', { name: /editor.toolbar.italic/i });
      await user.click(italicButton);
      
      expect(italicButton).toHaveAttribute('aria-pressed', 'true');
    });
  });

  describe('RTL Support', () => {
    it('should apply RTL text direction for Hebrew', () => {
      render(<TextEditor {...defaultProps} language="he" isRTL={true} />);
      
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('dir', 'rtl');
      expect(editor).toHaveAttribute('lang', 'he');
    });

    it('should load Noto Sans Hebrew font for RTL content', () => {
      render(<TextEditor {...defaultProps} language="he" isRTL={true} />);
      
      const editorContent = screen.getByRole('textbox').parentElement;
      expect(editorContent).toHaveStyle({
        fontFamily: expect.stringContaining('Noto Sans Hebrew')
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<TextEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      expect(editor).toHaveAttribute('aria-label', defaultProps.ariaLabel);
      expect(editor).toHaveAttribute('aria-multiline', 'true');
      expect(editor).toHaveAttribute('aria-required', 'true');
    });

    it('should announce validation errors', async () => {
      render(<TextEditor {...defaultProps} />);
      
      (validateGazetteContent as jest.Mock).mockImplementation(() => {
        throw new Error('Validation error');
      });
      
      const editor = screen.getByRole('textbox');
      fireEvent.input(editor, { target: { textContent: 'Invalid content' } });
      
      const errorMessage = await screen.findByRole('status');
      expect(errorMessage).toHaveTextContent(/editor.validation.error/i);
    });
  });

  describe('Content Validation', () => {
    it('should validate content on change', async () => {
      const user = userEvent.setup();
      render(<TextEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      await user.type(editor, 'Valid content');
      
      expect(validateGazetteContent).toHaveBeenCalledWith(expect.objectContaining({
        type: ContentType.TEXT,
        metadata: expect.objectContaining({
          description: 'Valid content',
          originalLanguage: 'en'
        })
      }));
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Content too long');
      (validateGazetteContent as jest.Mock).mockImplementation(() => {
        throw validationError;
      });
      
      render(<TextEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      fireEvent.input(editor, { target: { textContent: 'Invalid content' } });
      
      expect(mockOnValidationError).toHaveBeenCalledWith(validationError.message);
    });
  });

  describe('Autosave Functionality', () => {
    it('should autosave content after delay', async () => {
      jest.useFakeTimers();
      render(<TextEditor {...defaultProps} />);
      
      const editor = screen.getByRole('textbox');
      fireEvent.input(editor, { target: { textContent: 'Autosave test' } });
      
      jest.advanceTimersByTime(1000);
      
      expect(mockOnChange).toHaveBeenCalledWith('Autosave test');
      jest.useRealTimers();
    });
  });

  describe('Typography Compliance', () => {
    it('should apply correct font family based on language', () => {
      render(<TextEditor {...defaultProps} />);
      
      const editorContent = screen.getByRole('textbox').parentElement;
      expect(editorContent).toHaveStyle({
        fontFamily: expect.stringContaining('Roboto')
      });
    });

    it('should maintain consistent line height', () => {
      render(<TextEditor {...defaultProps} />);
      
      const editorContent = screen.getByRole('textbox').parentElement;
      expect(editorContent).toHaveStyle({
        lineHeight: '1.5'
      });
    });
  });
});