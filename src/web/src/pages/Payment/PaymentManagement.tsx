import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { withErrorBoundary } from 'react-error-boundary';
import { CircularProgress } from '@mui/material';
import { track } from '@amplitude/analytics-browser';

// Internal components
import Pool from '../../components/payment/Pool/Pool';
import Transaction from '../../components/payment/Transaction/Transaction';

// Hooks and services
import { usePayment } from '../../hooks/usePayment';

// Styled components
import {
  PaymentContainer,
  LoadingContainer,
  ErrorContainer,
  RetryButton,
  UtilizationAlert
} from './PaymentManagement.styles';

/**
 * Enhanced Payment Management page component with comprehensive error handling,
 * accessibility support, and real-time updates.
 */
const PaymentManagement: React.FC = () => {
  // Hooks
  const { t, i18n } = useTranslation();
  const isRTL = i18n.dir() === 'rtl';

  // Payment management hook with enhanced features
  const {
    familyPool,
    transactions,
    isLoading,
    error,
    utilization,
    topUpPool,
    refreshPool,
    paymentStatus
  } = usePayment('current-family-id', {
    autoRefresh: true,
    refreshInterval: 60000,
    validateOnChange: true
  });

  // Local state for UI management
  const [showUtilizationAlert, setShowUtilizationAlert] = useState<boolean>(false);

  /**
   * Enhanced callback handler for successful pool top-up
   */
  const handleTopUpSuccess = useCallback(async (amount: number, currency: string) => {
    try {
      // Track successful top-up in analytics
      track('Pool Top-Up', {
        amount,
        currency,
        status: 'success'
      });

      // Refresh pool data and show success message
      await refreshPool();

      // Announce success to screen readers
      const message = t('payment.topup.success', { amount, currency });
      const announcement = new CustomEvent('announce', { detail: message });
      document.dispatchEvent(announcement);
    } catch (error) {
      console.error('[PaymentManagement] Top-up success handler failed:', error);
    }
  }, [refreshPool, t]);

  /**
   * Monitor pool utilization and show alerts when necessary
   */
  useEffect(() => {
    if (utilization < 70 && !showUtilizationAlert) {
      setShowUtilizationAlert(true);
      
      // Announce low utilization to screen readers
      const message = t('payment.utilization.low', { utilization });
      const announcement = new CustomEvent('announce', { detail: message });
      document.dispatchEvent(announcement);
    } else if (utilization >= 70 && showUtilizationAlert) {
      setShowUtilizationAlert(false);
    }
  }, [utilization, showUtilizationAlert, t]);

  /**
   * Handle keyboard navigation for accessibility
   */
  const handleKeyPress = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const target = event.target as HTMLElement;
      target.click();
    }
  }, []);

  /**
   * Render loading state with accessible indicator
   */
  if (isLoading) {
    return (
      <LoadingContainer>
        <CircularProgress
          aria-label={t('payment.loading')}
          role="progressbar"
          size={40}
        />
      </LoadingContainer>
    );
  }

  /**
   * Render error state with retry option
   */
  if (error) {
    return (
      <ErrorContainer role="alert" aria-live="assertive">
        <p>{t('payment.error.message')}</p>
        <RetryButton
          onClick={refreshPool}
          onKeyPress={handleKeyPress}
          aria-label={t('payment.error.retry')}
        >
          {t('payment.error.retryButton')}
        </RetryButton>
      </ErrorContainer>
    );
  }

  return (
    <PaymentContainer
      dir={isRTL ? 'rtl' : 'ltr'}
      role="main"
      aria-label={t('payment.title')}
    >
      {showUtilizationAlert && (
        <UtilizationAlert
          role="alert"
          aria-live="polite"
        >
          {t('payment.utilization.alert', { utilization })}
        </UtilizationAlert>
      )}

      <Pool
        familyId="current-family-id"
        onTopUpSuccess={handleTopUpSuccess}
        preferredCurrency={familyPool?.currency || 'USD'}
        onUtilizationChange={(value) => {
          track('Pool Utilization Changed', { value });
        }}
      />

      <section
        aria-label={t('payment.transactions.title')}
        className="transactions-section"
      >
        <h2>{t('payment.transactions.title')}</h2>
        {transactions.map((transaction) => (
          <Transaction
            key={transaction.id}
            transaction={transaction}
            isRTL={isRTL}
            onClick={(tx) => {
              track('Transaction Clicked', {
                id: tx.id,
                amount: tx.amount,
                status: tx.status
              });
            }}
          />
        ))}
      </section>
    </PaymentContainer>
  );
};

// Error boundary wrapper with analytics tracking
const PaymentManagementWithErrorBoundary = withErrorBoundary(PaymentManagement, {
  fallback: (
    <ErrorContainer role="alert">
      <h2>{t('payment.error.critical')}</h2>
      <p>{t('payment.error.refresh')}</p>
    </ErrorContainer>
  ),
  onError: (error) => {
    track('Payment Management Error', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default PaymentManagementWithErrorBoundary;