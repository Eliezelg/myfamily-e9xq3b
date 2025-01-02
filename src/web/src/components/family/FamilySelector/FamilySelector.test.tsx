import React from 'react'; // ^18.2.0
import { render, screen, within, waitFor } from '@testing-library/react'; // ^13.4.0
import userEvent from '@testing-library/user-event'; // ^14.4.3
import '@testing-library/jest-dom/extend-expect'; // ^5.16.5
import { ThemeProvider } from 'styled-components';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import FamilySelector from './FamilySelector';
import { theme } from '../../../styles/theme.styles';
import { FamilyStatus } from '../../../interfaces/family.interface';
import * as familyHooks from '../../../hooks/useFamily';

// Mock the useFamily hook
jest.mock('../../../hooks/useFamily');

// Mock i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: { [key: string]: string } = {
        'family.selector.label': 'Select Family',
        'family.selector.placeholder': 'Choose a family',
        'family.selector.list': 'Family List',
        'family.pool.utilization': `${params?.value}% pool utilization`
      };
      return translations[key] || key;
    },
    i18n: {
      dir: () => 'ltr',
      language: 'en'
    }
  })
}));

// Test data
const mockFamilies = [
  {
    id: 'family-1',
    name: 'Test Family 1',
    status: FamilyStatus.ACTIVE,
    poolUtilization: 0.75,
    members: []
  },
  {
    id: 'family-2',
    name: 'Test Family 2',
    status: FamilyStatus.ACTIVE,
    poolUtilization: 0.45,
    members: []
  },
  {
    id: 'family-3',
    name: 'Test Family 3',
    status: FamilyStatus.SUSPENDED,
    poolUtilization: 0.20,
    members: []
  }
];

describe('FamilySelector', () => {
  // Setup mock store and hooks
  const mockSetCurrentFamily = jest.fn();
  const mockOnFamilyChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (familyHooks.useFamily as jest.Mock).mockReturnValue({
      families: mockFamilies,
      currentFamily: mockFamilies[0],
      setCurrentFamily: mockSetCurrentFamily,
      loading: false,
      error: null
    });
  });

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={configureStore({ reducer: {} })}>
        <ThemeProvider theme={theme}>
          <FamilySelector {...props} />
        </ThemeProvider>
      </Provider>
    );
  };

  describe('Rendering', () => {
    it('should render with current family selected', () => {
      renderComponent();
      expect(screen.getByRole('button')).toHaveTextContent('Test Family 1');
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should render placeholder when no family is selected', () => {
      (familyHooks.useFamily as jest.Mock).mockReturnValue({
        families: mockFamilies,
        currentFamily: null,
        setCurrentFamily: mockSetCurrentFamily,
        loading: false,
        error: null
      });
      renderComponent();
      expect(screen.getByRole('button')).toHaveTextContent('Choose a family');
    });

    it('should render loading state correctly', () => {
      (familyHooks.useFamily as jest.Mock).mockReturnValue({
        families: [],
        currentFamily: null,
        setCurrentFamily: mockSetCurrentFamily,
        loading: true,
        error: null
      });
      renderComponent();
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should hide metrics when showMetrics is false', () => {
      renderComponent({ showMetrics: false });
      expect(screen.queryByText('75%')).not.toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should open dropdown on button click', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getAllByRole('option')).toHaveLength(3);
    });

    it('should select family on click', async () => {
      renderComponent({ onFamilyChange: mockOnFamilyChange });
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByText('Test Family 2'));
      
      expect(mockSetCurrentFamily).toHaveBeenCalledWith(mockFamilies[1]);
      expect(mockOnFamilyChange).toHaveBeenCalledWith(mockFamilies[1]);
    });

    it('should not select suspended families', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button'));
      await userEvent.click(screen.getByText('Test Family 3'));
      
      expect(mockSetCurrentFamily).not.toHaveBeenCalled();
      expect(mockOnFamilyChange).not.toHaveBeenCalled();
    });

    it('should close dropdown when clicking outside', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      await userEvent.click(document.body);
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should handle arrow key navigation', async () => {
      renderComponent();
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      const listbox = screen.getByRole('listbox');
      await userEvent.keyboard('[ArrowDown]');
      expect(within(listbox).getAllByRole('option')[0]).toHaveFocus();
      
      await userEvent.keyboard('[ArrowDown]');
      expect(within(listbox).getAllByRole('option')[1]).toHaveFocus();
    });

    it('should close with escape key', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      
      await userEvent.keyboard('[Escape]');
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });

    it('should select with enter key', async () => {
      renderComponent({ onFamilyChange: mockOnFamilyChange });
      await userEvent.click(screen.getByRole('button'));
      await userEvent.keyboard('[ArrowDown]');
      await userEvent.keyboard('[ArrowDown]');
      await userEvent.keyboard('[Enter]');
      
      expect(mockSetCurrentFamily).toHaveBeenCalledWith(mockFamilies[1]);
      expect(mockOnFamilyChange).toHaveBeenCalledWith(mockFamilies[1]);
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes', () => {
      renderComponent();
      const button = screen.getByRole('button');
      
      expect(button).toHaveAttribute('aria-haspopup', 'listbox');
      expect(button).toHaveAttribute('aria-expanded', 'false');
      expect(button).toHaveAttribute('aria-label', 'Select Family');
    });

    it('should handle custom aria-label', () => {
      renderComponent({ ariaLabel: 'Custom Label' });
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom Label');
    });

    it('should indicate selected option', async () => {
      renderComponent();
      await userEvent.click(screen.getByRole('button'));
      
      const options = screen.getAllByRole('option');
      expect(options[0]).toHaveAttribute('aria-selected', 'true');
      expect(options[1]).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('RTL Support', () => {
    beforeEach(() => {
      jest.mock('react-i18next', () => ({
        useTranslation: () => ({
          t: (key: string) => key,
          i18n: {
            dir: () => 'rtl',
            language: 'he'
          }
        })
      }));
    });

    it('should render in RTL mode', () => {
      renderComponent();
      const container = screen.getByTestId('family-selector');
      expect(container).toHaveStyle({ direction: 'rtl' });
    });
  });
});