import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import '@testing-library/jest-dom';
import Transaction from './Transaction';
import { IPayment, PaymentStatus, PaymentMethod } from '../../../interfaces/payment.interface';
import { formatCurrency, formatDate } from '../../../utils/format.util';

// Mock the react-i18next hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      if (key.startsWith('transaction.status.')) {
        return key.split('.')[2].toUpperCase();
      }
      if (key === 'transaction.aria.details') {
        return `Transaction: ${params.amount} on ${params.date} - ${params.status}`;
      }
      if (key === 'transaction.aria.amount') {
        return `Amount: ${params.amount}`;
      }
      if (key === 'transaction.aria.status') {
        return `Status: ${params.status}`;
      }
      if (key === 'transaction.aria.date') {
        return `Date: ${params.date}`;
      }
      return key;
    }
  })
}));

// Mock the formatting utilities
jest.mock('../../../utils/format.util', () => ({
  formatCurrency: jest.fn(),
  formatDate: jest.fn()
}));

describe('Transaction Component', () => {
  const mockTransaction: IPayment = {
    id: 'test-transaction-id',
    familyId: 'test-family-id',
    amount: 100,
    currency: 'USD',
    method: PaymentMethod.STRIPE,
    status: PaymentStatus.COMPLETED,
    metadata: {
      type: 'payment',
      receiptUrl: 'https://example.com/receipt'
    },
    createdAt: new Date('2024-01-01T12:00:00Z'),
    updatedAt: new Date('2024-01-01T12:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (formatCurrency as jest.Mock).mockReturnValue('$100.00');
    (formatDate as jest.Mock).mockReturnValue('Jan 1, 2024');
  });

  describe('Rendering Tests', () => {
    test('renders transaction details correctly', () => {
      render(<Transaction transaction={mockTransaction} />);
      
      expect(screen.getByText('-$100.00')).toBeInTheDocument();
      expect(screen.getByText('COMPLETED')).toBeInTheDocument();
      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    });

    test('applies correct status color', () => {
      render(<Transaction transaction={mockTransaction} />);
      
      const statusElement = screen.getByText('COMPLETED');
      expect(statusElement).toHaveStyle({ color: expect.any(String) });
    });

    test('handles different payment statuses', () => {
      const statuses = Object.values(PaymentStatus);
      
      statuses.forEach(status => {
        const transaction = { ...mockTransaction, status };
        const { rerender } = render(<Transaction transaction={transaction} />);
        
        expect(screen.getByText(status)).toBeInTheDocument();
        rerender(<></>);
      });
    });

    test('formats credit transactions with plus sign', () => {
      const creditTransaction = {
        ...mockTransaction,
        metadata: { ...mockTransaction.metadata, type: 'refund' }
      };
      
      render(<Transaction transaction={creditTransaction} />);
      expect(screen.getByText('+$100.00')).toBeInTheDocument();
    });
  });

  describe('Interaction Tests', () => {
    test('calls onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<Transaction transaction={mockTransaction} onClick={handleClick} />);
      
      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledWith(mockTransaction);
    });

    test('supports keyboard navigation', () => {
      const handleClick = jest.fn();
      render(<Transaction transaction={mockTransaction} onClick={handleClick} />);
      
      const button = screen.getByRole('button');
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledWith(mockTransaction);
      
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });
  });

  describe('Accessibility Tests', () => {
    test('has correct ARIA attributes', () => {
      render(<Transaction transaction={mockTransaction} />);
      
      const transactionElement = screen.getByRole('button');
      expect(transactionElement).toHaveAttribute('aria-label');
      expect(transactionElement.getAttribute('aria-label')).toContain('$100.00');
    });

    test('maintains focus states', () => {
      render(<Transaction transaction={mockTransaction} />);
      
      const transactionElement = screen.getByRole('button');
      transactionElement.focus();
      expect(transactionElement).toHaveFocus();
    });

    test('provides descriptive labels for screen readers', () => {
      render(<Transaction transaction={mockTransaction} />);
      
      expect(screen.getByLabelText(/Amount:/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Status:/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Date:/)).toBeInTheDocument();
    });
  });

  describe('RTL Support Tests', () => {
    test('renders correctly in RTL mode', () => {
      render(<Transaction transaction={mockTransaction} isRTL={true} />);
      
      const container = screen.getByRole('button');
      expect(container).toHaveAttribute('dir', 'rtl');
    });

    test('formats currency correctly in RTL mode', () => {
      render(<Transaction transaction={mockTransaction} isRTL={true} />);
      
      expect(formatCurrency).toHaveBeenCalledWith(
        mockTransaction.amount,
        mockTransaction.currency,
        'he'
      );
    });

    test('formats date correctly in RTL mode', () => {
      render(<Transaction transaction={mockTransaction} isRTL={true} />);
      
      expect(formatDate).toHaveBeenCalledWith(
        expect.any(Date),
        'PP',
        'he'
      );
    });
  });

  describe('Responsive Design Tests', () => {
    test('maintains layout at different viewport sizes', () => {
      const { container } = render(<Transaction transaction={mockTransaction} />);
      
      // Test mobile viewport
      window.innerWidth = 375;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toMatchSnapshot();
      
      // Test desktop viewport
      window.innerWidth = 1024;
      fireEvent(window, new Event('resize'));
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});