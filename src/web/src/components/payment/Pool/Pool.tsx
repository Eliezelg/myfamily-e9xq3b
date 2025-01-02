import React, { useCallback, useEffect, useMemo } from 'react'; // ^18.2.0
import { formatCurrency } from 'intl-number-format'; // ^1.0.0

import {
  PoolContainer,
  BalanceSection,
  PaymentMethodsSection,
  TransactionsSection
} from './Pool.styles';
import Button from '../../common/Button/Button';
import { usePayment } from '../../../hooks/usePayment';
import {
  IFamilyPool,
  IPayment,
  PaymentMethod,
  PaymentStatus
} from '../../../interfaces/payment.interface';

interface PoolProps {
  familyId: string;
  onTopUpSuccess?: () => void;
  preferredCurrency: string;
  onUtilizationChange?: (utilization: number) => void;
}

const Pool: React.FC<PoolProps> = React.memo(({
  familyId,
  onTopUpSuccess,
  preferredCurrency,
  onUtilizationChange
}) => {
  // Initialize payment hook with enhanced features
  const {
    familyPool,
    transactions,
    isLoading,
    topUpPool,
    refreshPool,
    utilization,
    error
  } = usePayment(familyId);

  // Format currency based on user preferences
  const formatPoolAmount = useCallback((amount: number, currency: string) => {
    return formatCurrency(amount, {
      currency,
      locale: document.documentElement.lang || 'en-US',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }, []);

  // Calculate next charge date
  const nextChargeDate = useMemo(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1);
    return date.toLocaleDateString();
  }, []);

  // Handle pool top-up with enhanced error handling
  const handleTopUp = useCallback(async (
    amount: number,
    method: PaymentMethod
  ) => {
    try {
      await topUpPool(amount, method, preferredCurrency);
      onTopUpSuccess?.();
      await refreshPool();
    } catch (error) {
      console.error('[Pool] Top-up failed:', error);
    }
  }, [topUpPool, preferredCurrency, onTopUpSuccess, refreshPool]);

  // Monitor pool utilization
  useEffect(() => {
    if (utilization !== undefined) {
      onUtilizationChange?.(utilization);
    }
  }, [utilization, onUtilizationChange]);

  // Refresh pool data periodically
  useEffect(() => {
    const intervalId = setInterval(refreshPool, 60000);
    return () => clearInterval(intervalId);
  }, [refreshPool]);

  // Render balance section with enhanced formatting
  const renderBalanceSection = (pool: IFamilyPool | null) => (
    <BalanceSection>
      <h2>Family Pool Balance</h2>
      <div className="balance-amount">
        {pool ? formatPoolAmount(pool.balance, pool.currency) : '---'}
      </div>
      <div className="next-charge">
        Next Charge: {formatPoolAmount(70, preferredCurrency)} on {nextChargeDate}
      </div>
      {utilization < 70 && (
        <div className="utilization-warning">
          Pool utilization is low ({utilization}%). Consider adding funds.
        </div>
      )}
    </BalanceSection>
  );

  // Render payment methods section
  const renderPaymentMethods = () => (
    <PaymentMethodsSection>
      <h3>Payment Methods</h3>
      <div className="payment-method">
        <input
          type="radio"
          id="stripe"
          name="payment-method"
          value={PaymentMethod.STRIPE}
          defaultChecked
        />
        <label htmlFor="stripe">Credit Card (International)</label>
      </div>
      <div className="payment-method">
        <input
          type="radio"
          id="tranzillia"
          name="payment-method"
          value={PaymentMethod.TRANZILLIA}
        />
        <label htmlFor="tranzillia">Local Payment (Israel)</label>
      </div>
      <Button
        variant="primary"
        size="medium"
        onClick={() => handleTopUp(100, PaymentMethod.STRIPE)}
        loading={isLoading}
        fullWidth
      >
        Top Up Pool
      </Button>
    </PaymentMethodsSection>
  );

  // Render transaction history with enhanced formatting
  const renderTransactions = (transactions: IPayment[]) => (
    <TransactionsSection>
      <h3>Recent Transactions</h3>
      <table className="transaction-list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="transaction-item">
              <td className="date">
                {new Date(tx.createdAt).toLocaleDateString()}
              </td>
              <td>{tx.metadata.type || 'Payment'}</td>
              <td className={`amount ${tx.amount > 0 ? 'positive' : 'negative'}`}>
                {formatPoolAmount(tx.amount, tx.currency)}
              </td>
              <td>{tx.status === PaymentStatus.COMPLETED ? '✓' : '⋯'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TransactionsSection>
  );

  // Handle error states
  if (error) {
    return (
      <PoolContainer>
        <div className="error-message">
          Failed to load pool information. Please try again.
        </div>
      </PoolContainer>
    );
  }

  return (
    <PoolContainer>
      {renderBalanceSection(familyPool)}
      {renderPaymentMethods()}
      {renderTransactions(transactions)}
    </PoolContainer>
  );
});

// Display name for debugging
Pool.displayName = 'Pool';

export default Pool;