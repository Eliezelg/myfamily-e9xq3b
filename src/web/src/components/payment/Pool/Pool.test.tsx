import React from 'react'; // ^18.2.0
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'; // ^13.4.0
import userEvent from '@testing-library/user-event'; // ^14.0.0
import { jest, describe, it, beforeEach, expect } from '@jest/globals'; // ^29.0.0

import Pool from './Pool';
import { usePayment } from '../../../hooks/usePayment';
import { PaymentMethod, PaymentStatus } from '../../../interfaces/payment.interface';

// Mock usePayment hook
jest.mock('../../../hooks/usePayment');

// Mock family pool data
const mockFamilyPool = {
  familyId: 'test-family-id',
  balance: 100,
  currency: 'USD',
  lastTopUpDate: '2024-01-01T00:00:00.000Z',
  autoTopUp: false,
  autoTopUpThreshold: 50,
  autoTopUpAmount: 100,
  utilization: 0.7
};

// Mock transactions data
const mockTransactions = [
  {
    id: 'tx-1',
    familyId: 'test-family-id',
    amount: 50,
    currency: 'USD',
    method: PaymentMethod.STRIPE,
    status: PaymentStatus.COMPLETED,
    metadata: { type: 'TOP_UP' },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z'
  },
  {
    id: 'tx-2',
    familyId: 'test-family-id',
    amount: -70,
    currency: 'USD',
    method: PaymentMethod.POOL,
    status: PaymentStatus.COMPLETED,
    metadata: { type: 'GAZETTE_PAYMENT' },
    createdAt: '2024-01-02T00:00:00.000Z',
    updatedAt: '2024-01-02T00:00:00.000Z'
  }
];

describe('Pool Component', () => {
  // Setup default mock implementation
  beforeEach(() => {
    (usePayment as jest.Mock).mockReturnValue({
      familyPool: mockFamilyPool,
      transactions: mockTransactions,
      isLoading: false,
      topUpPool: jest.fn(),
      refreshPool: jest.fn(),
      error: null,
      utilization: 70
    });
  });

  it('should render pool balance correctly', () => {
    render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="USD"
        onUtilizationChange={jest.fn()}
      />
    );

    // Check balance display
    expect(screen.getByText(/Family Pool Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/\$100\.00/)).toBeInTheDocument();
    expect(screen.getByText(/Next Charge/i)).toBeInTheDocument();
  });

  it('should handle different currencies correctly', () => {
    const currencies = [
      { code: 'ILS', symbol: '₪', amount: 350 },
      { code: 'EUR', symbol: '€', amount: 85 },
      { code: 'GBP', symbol: '£', amount: 75 }
    ];

    currencies.forEach(({ code, symbol, amount }) => {
      (usePayment as jest.Mock).mockReturnValue({
        familyPool: { ...mockFamilyPool, balance: amount, currency: code },
        transactions: mockTransactions,
        isLoading: false,
        error: null
      });

      render(
        <Pool
          familyId="test-family-id"
          preferredCurrency={code}
          onUtilizationChange={jest.fn()}
        />
      );

      expect(screen.getByText(new RegExp(`${symbol}${amount}`))).toBeInTheDocument();
    });
  });

  it('should display transaction history correctly', () => {
    render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="USD"
        onUtilizationChange={jest.fn()}
      />
    );

    const transactionList = screen.getByRole('table');
    expect(transactionList).toBeInTheDocument();

    // Check transaction details
    mockTransactions.forEach(tx => {
      const row = screen.getByText(new RegExp(tx.metadata.type)).closest('tr');
      expect(row).toBeInTheDocument();
      
      if (row) {
        const amount = within(row).getByText(
          new RegExp(`\\${tx.amount > 0 ? '+' : '-'}\\$${Math.abs(tx.amount)}`)
        );
        expect(amount).toBeInTheDocument();
        expect(amount).toHaveClass(tx.amount > 0 ? 'positive' : 'negative');
      }
    });
  });

  it('should handle top-up operations correctly', async () => {
    const mockTopUpPool = jest.fn();
    (usePayment as jest.Mock).mockReturnValue({
      familyPool: mockFamilyPool,
      transactions: mockTransactions,
      isLoading: false,
      topUpPool: mockTopUpPool,
      error: null
    });

    const onTopUpSuccess = jest.fn();

    render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="USD"
        onTopUpSuccess={onTopUpSuccess}
        onUtilizationChange={jest.fn()}
      />
    );

    // Trigger top-up
    const topUpButton = screen.getByText(/Top Up Pool/i);
    await userEvent.click(topUpButton);

    // Verify top-up was called with correct parameters
    expect(mockTopUpPool).toHaveBeenCalledWith(100, PaymentMethod.STRIPE, 'USD');
    await waitFor(() => {
      expect(onTopUpSuccess).toHaveBeenCalled();
    });
  });

  it('should handle loading states correctly', () => {
    (usePayment as jest.Mock).mockReturnValue({
      familyPool: mockFamilyPool,
      transactions: mockTransactions,
      isLoading: true,
      error: null
    });

    render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="USD"
        onUtilizationChange={jest.fn()}
      />
    );

    const topUpButton = screen.getByText(/Top Up Pool/i);
    expect(topUpButton).toBeDisabled();
  });

  it('should handle error states correctly', () => {
    const errorMessage = 'Failed to load pool information';
    (usePayment as jest.Mock).mockReturnValue({
      familyPool: null,
      transactions: [],
      isLoading: false,
      error: new Error(errorMessage)
    });

    render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="USD"
        onUtilizationChange={jest.fn()}
      />
    );

    expect(screen.getByText(/Failed to load pool information/i)).toBeInTheDocument();
  });

  it('should handle utilization warnings correctly', () => {
    (usePayment as jest.Mock).mockReturnValue({
      familyPool: mockFamilyPool,
      transactions: mockTransactions,
      isLoading: false,
      error: null,
      utilization: 65
    });

    const onUtilizationChange = jest.fn();

    render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="USD"
        onUtilizationChange={onUtilizationChange}
      />
    );

    expect(screen.getByText(/Pool utilization is low/i)).toBeInTheDocument();
    expect(onUtilizationChange).toHaveBeenCalledWith(65);
  });

  it('should be accessible', async () => {
    const { container } = render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="USD"
        onUtilizationChange={jest.fn()}
      />
    );

    // Check ARIA labels and roles
    expect(screen.getByRole('table')).toHaveAttribute('aria-label', 'Transaction History');
    expect(screen.getByRole('button', { name: /Top Up Pool/i })).toBeInTheDocument();

    // Check keyboard navigation
    const paymentMethods = screen.getAllByRole('radio');
    await userEvent.tab();
    expect(paymentMethods[0]).toHaveFocus();
    await userEvent.tab();
    expect(paymentMethods[1]).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Top Up Pool/i })).toHaveFocus();
  });

  it('should support RTL languages', () => {
    document.documentElement.lang = 'he';
    document.documentElement.dir = 'rtl';

    render(
      <Pool
        familyId="test-family-id"
        preferredCurrency="ILS"
        onUtilizationChange={jest.fn()}
      />
    );

    // Check RTL text alignment
    const balanceSection = screen.getByText(/Family Pool Balance/i).parentElement;
    expect(balanceSection).toHaveStyle({ textAlign: 'right' });

    // Reset document settings
    document.documentElement.lang = 'en';
    document.documentElement.dir = 'ltr';
  });
});